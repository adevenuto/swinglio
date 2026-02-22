import "dotenv/config";
import postgres from "postgres";
import {
  type TeeboxEnrichment,
  RateLimitError,
  buildLayoutFromApi,
  findBestMatch,
} from "./lib/enrich-course";

// Imports all courses from the Golf Course API via pagination.
// Usage: npx tsx scripts/import-courses.ts [startPage] [maxPages]

const sql = postgres(process.env.DIRECT_URL!);

const GOLF_API_KEY = process.env.GOLF_COURSE_API_KEY;
const GOLF_API_BASE = "https://api.golfcourseapi.com/v1";
const DELAY_MS = 1100; // Slightly over 1s to stay safe on rate limits

const START_PAGE = parseInt(process.argv[2] || "1", 10);
const MAX_PAGES = parseInt(process.argv[3] || "0", 10); // 0 = unlimited

// ---- API types ----

type ApiTee = {
  tee_name: string;
  course_rating: number;
  slope_rating: number;
  bogey_rating: number;
  total_yards: number;
  total_meters: number;
  number_of_holes: number;
  par_total: number;
  front_course_rating: number;
  front_slope_rating: number;
  back_course_rating: number;
  back_slope_rating: number;
  holes: { par: number; yardage: number; handicap: number }[];
};

type ApiCourse = {
  id: number;
  club_name: string;
  course_name: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  tees: {
    male?: ApiTee[];
    female?: ApiTee[];
  };
};

// ---- Lookup maps ----

type StateRow = { id: number; name: string; abbr: string };
type CityRow = { id: number; state_id: number; name: string };
type CourseRow = {
  id: number;
  api_course_id: number | null;
  name: string;
  state: string | null;
  layout_data: string | null;
};

// Maps keyed by lowercase names for fast lookup
const statesByName = new Map<string, StateRow>();
const citiesByKey = new Map<string, CityRow>(); // key = "cityname|state_id"
const coursesByApiId = new Map<number, CourseRow>();
const coursesByNameState = new Map<string, CourseRow>(); // key = normalized "name|state"

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/golf\s*(club|course|links)/gi, "")
    .replace(/country\s*club/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

// ---- Lookup helpers ----

async function getOrCreateState(
  stateName: string,
  abbr?: string,
): Promise<StateRow> {
  const key = stateName.toLowerCase();
  const existing = statesByName.get(key);
  if (existing) return existing;

  // Also check by abbreviation
  if (abbr) {
    for (const s of statesByName.values()) {
      if (s.abbr.toLowerCase() === abbr.toLowerCase()) return s;
    }
  }

  // Create new state
  const stateAbbr = abbr || stateName.substring(0, 2).toUpperCase();
  const [row] = await sql`
    INSERT INTO states (name, abbr) VALUES (${stateName}, ${stateAbbr})
    RETURNING id, name, abbr
  `;
  const state: StateRow = { id: row.id, name: row.name, abbr: row.abbr };
  statesByName.set(key, state);
  return state;
}

async function getOrCreateCity(
  cityName: string,
  stateId: number,
): Promise<CityRow> {
  const key = `${cityName.toLowerCase()}|${stateId}`;
  const existing = citiesByKey.get(key);
  if (existing) return existing;

  // Create new city
  const [row] = await sql`
    INSERT INTO cities (name, state_id) VALUES (${cityName}, ${stateId})
    RETURNING id, name, state_id
  `;
  const city: CityRow = { id: row.id, state_id: row.state_id, name: row.name };
  citiesByKey.set(key, city);
  return city;
}

function findExistingCourse(
  apiCourse: ApiCourse,
): CourseRow | null {
  // 1. Try by api_course_id
  const byApiId = coursesByApiId.get(apiCourse.id);
  if (byApiId) return byApiId;

  // 2. Fallback: match by normalized name + state
  const nameKey = `${normalizeForMatch(apiCourse.course_name)}|${(apiCourse.location.state || "").toLowerCase()}`;
  const byName = coursesByNameState.get(nameKey);
  if (byName) return byName;

  return null;
}

// ---- Tee processing ----

function extractTeeboxes(apiCourse: ApiCourse): TeeboxEnrichment[] {
  const allTees: ApiTee[] = [
    ...(apiCourse.tees?.male || []),
    ...(apiCourse.tees?.female || []),
  ];
  const seenNames = new Set<string>();
  const result: TeeboxEnrichment[] = [];

  for (const t of allTees) {
    const key = t.tee_name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    result.push({
      name: t.tee_name,
      slope: t.slope_rating,
      courseRating: t.course_rating,
      totalYardage: t.total_yards,
      holes: t.holes?.length
        ? t.holes.map((h) => ({
            par: h.par,
            yardage: h.yardage,
            handicap: h.handicap,
          }))
        : undefined,
    });
  }

  return result;
}

// ---- Main ----

async function main() {
  if (!GOLF_API_KEY) {
    console.error("Set GOLF_COURSE_API_KEY in .env before running.");
    process.exit(1);
  }

  console.log(
    `Starting import from page ${START_PAGE}${MAX_PAGES ? `, max ${MAX_PAGES} pages` : ", unlimited pages"}`,
  );
  console.log("");

  // Pre-fetch lookup data
  console.log("Loading lookup data...");

  const stateRows = await sql`SELECT id, name, abbr FROM states`;
  for (const s of stateRows) {
    statesByName.set(s.name.toLowerCase(), {
      id: s.id,
      name: s.name,
      abbr: s.abbr,
    });
  }
  console.log(`  ${stateRows.length} states loaded`);

  const cityRows = await sql`SELECT id, name, state_id FROM cities`;
  for (const c of cityRows) {
    citiesByKey.set(`${c.name.toLowerCase()}|${c.state_id}`, {
      id: c.id,
      state_id: c.state_id,
      name: c.name,
    });
  }
  console.log(`  ${cityRows.length} cities loaded`);

  const courseRows = await sql`
    SELECT id, api_course_id, name, state, layout_data FROM courses
  `;
  for (const c of courseRows) {
    const row: CourseRow = {
      id: c.id,
      api_course_id: c.api_course_id,
      name: c.name,
      state: c.state,
      layout_data: c.layout_data,
    };
    if (c.api_course_id) {
      coursesByApiId.set(c.api_course_id, row);
    }
    const nameKey = `${normalizeForMatch(c.name)}|${(c.state || "").toLowerCase()}`;
    // Only store first match per name+state (avoid overwriting)
    if (!coursesByNameState.has(nameKey)) {
      coursesByNameState.set(nameKey, row);
    }
  }
  console.log(`  ${courseRows.length} courses loaded`);
  console.log("");

  // Stats
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let pagesProcessed = 0;
  let lastPage = START_PAGE;

  for (let page = START_PAGE; ; page++) {
    if (MAX_PAGES && pagesProcessed >= MAX_PAGES) break;

    try {
      const url = `${GOLF_API_BASE}/courses?page=${page}`;
      const res = await fetch(url, {
        headers: { Authorization: `Key ${GOLF_API_KEY}` },
      });

      if (res.status === 429) {
        console.log(`\nRATE LIMITED on page ${page}. Resume with: npx tsx scripts/import-courses.ts ${page}`);
        break;
      }

      if (!res.ok) {
        console.error(`API error on page ${page}: ${res.status} ${res.statusText}`);
        break;
      }

      const data = await res.json();
      const courses: ApiCourse[] = data.courses || [];

      if (courses.length === 0) {
        console.log(`\nPage ${page} returned 0 courses — end of catalog.`);
        break;
      }

      console.log(`Page ${page}: ${courses.length} courses`);

      for (const apiCourse of courses) {
        try {
          const loc = apiCourse.location || {};
          const label = `  [API#${apiCourse.id}] ${apiCourse.course_name}`;

          // Skip if no location info
          if (!loc.state && !loc.country) {
            console.log(`${label} -- SKIP (no location)`);
            skipped++;
            continue;
          }

          // Get or create state
          const stateName = loc.state || loc.country || "Unknown";
          const state = await getOrCreateState(stateName);

          // Get or create city
          const cityName = loc.city || "Unknown";
          const city = await getOrCreateCity(cityName, state.id);

          // Build layout_data from API tees
          const teeboxes = extractTeeboxes(apiCourse);
          const existing = findExistingCourse(apiCourse);
          const layoutData =
            teeboxes.length > 0
              ? buildLayoutFromApi(teeboxes, existing?.layout_data)
              : existing?.layout_data || null;

          const courseData = {
            name: apiCourse.course_name,
            street: loc.address || null,
            state: state.abbr,
            city_id: city.id,
            state_id: state.id,
            lat: loc.latitude || null,
            lng: loc.longitude || null,
            layout_data: layoutData,
            api_course_id: apiCourse.id,
            enriched_at: sql`now()`,
            updated_at: sql`now()`,
          };

          if (existing) {
            // Update existing course
            await sql`
              UPDATE courses SET
                name = ${courseData.name},
                street = ${courseData.street},
                state = ${courseData.state},
                city_id = ${courseData.city_id},
                state_id = ${courseData.state_id},
                lat = ${courseData.lat},
                lng = ${courseData.lng},
                layout_data = ${courseData.layout_data},
                api_course_id = ${courseData.api_course_id},
                enriched_at = now(),
                updated_at = now()
              WHERE id = ${existing.id}
            `;

            // Update in-memory maps
            const updatedRow: CourseRow = {
              ...existing,
              api_course_id: apiCourse.id,
              name: courseData.name,
              state: courseData.state,
              layout_data: courseData.layout_data,
            };
            coursesByApiId.set(apiCourse.id, updatedRow);

            console.log(
              `${label} -- UPDATED (local#${existing.id}, ${teeboxes.length} tees)`,
            );
            updated++;
          } else {
            // Insert new course
            const [row] = await sql`
              INSERT INTO courses (name, street, state, postal_code, city_id, state_id, lat, lng, layout_data, api_course_id, enriched_at)
              VALUES (${courseData.name}, ${courseData.street}, ${courseData.state}, ${null}, ${courseData.city_id}, ${courseData.state_id}, ${courseData.lat}, ${courseData.lng}, ${courseData.layout_data}, ${courseData.api_course_id}, now())
              RETURNING id
            `;

            // Update in-memory maps
            const newRow: CourseRow = {
              id: row.id,
              api_course_id: apiCourse.id,
              name: courseData.name,
              state: courseData.state,
              layout_data: courseData.layout_data,
            };
            coursesByApiId.set(apiCourse.id, newRow);

            console.log(
              `${label} -- INSERTED (local#${row.id}, ${teeboxes.length} tees)`,
            );
            inserted++;
          }
        } catch (err: unknown) {
          if (err instanceof RateLimitError) throw err;
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            `  [API#${apiCourse.id}] ${apiCourse.course_name} -- ERROR: ${msg}`,
          );
          errors++;
        }
      }

      pagesProcessed++;
      lastPage = page;

      // Delay between pages
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    } catch (err: unknown) {
      if (err instanceof RateLimitError) {
        console.log(
          `\nRATE LIMITED on page ${page}. Resume with: npx tsx scripts/import-courses.ts ${page}`,
        );
        break;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\nFatal error on page ${page}: ${msg}`);
      break;
    }
  }

  // Final counts
  const [{ count: totalCourses }] = await sql`
    SELECT count(*)::int as count FROM courses
  `;
  const [{ count: apiCourses }] = await sql`
    SELECT count(*)::int as count FROM courses WHERE api_course_id IS NOT NULL
  `;

  console.log(`\n--- Summary ---`);
  console.log(`Pages processed: ${pagesProcessed} (${START_PAGE}–${lastPage})`);
  console.log(`Inserted:  ${inserted}`);
  console.log(`Updated:   ${updated}`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`Errors:    ${errors}`);
  console.log(`\nTotal courses in DB: ${totalCourses}`);
  console.log(`With api_course_id:  ${apiCourses}`);
  if (pagesProcessed > 0) {
    console.log(`\nResume from page ${lastPage + 1} if needed.`);
  }

  await sql.end();
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
