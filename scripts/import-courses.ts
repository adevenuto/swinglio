import "dotenv/config";
import postgres from "postgres";
import {
  type TeeboxEnrichment,
  RateLimitError,
  buildLayoutFromApi,
  isDuplicated9Hole,
} from "./lib/enrich-course";

// Imports all courses from the Golf Course API via pagination.
// Usage:
//   npx tsx scripts/import-courses.ts --clean          # wipe + full import
//   npx tsx scripts/import-courses.ts [startPage]      # resume from page N
//   npx tsx scripts/import-courses.ts [startPage] [maxPages]

const sql = postgres(process.env.DIRECT_URL!);

const GOLF_API_KEY = process.env.GOLF_COURSE_API_KEY;
const GOLF_API_BASE = "https://api.golfcourseapi.com/v1";
const DELAY_MS = 1100; // Slightly over 1s to stay safe on rate limits

const IS_CLEAN = process.argv.includes("--clean");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const START_PAGE = parseInt(args[0] || "1", 10);
const MAX_PAGES = parseInt(args[1] || "0", 10); // 0 = unlimited

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

type CountryRow = { id: number; name: string; code: string | null };
type StateRow = { id: number; name: string; abbr: string; country_id: number | null };
type CityRow = { id: number; state_id: number; name: string };
type CourseRow = {
  id: number;
  api_course_id: number | null;
  club_name: string;
  course_name: string;
  state: string | null;
  layout_data: string | null;
};

// Maps keyed by lowercase names for fast lookup
const countriesByName = new Map<string, CountryRow>();
const statesByName = new Map<string, StateRow>();
const citiesByKey = new Map<string, CityRow>(); // key = "cityname|state_id"
const coursesByApiId = new Map<number, CourseRow>();

// ---- Lookup helpers ----

async function getOrCreateCountry(countryName: string): Promise<CountryRow> {
  const key = countryName.toLowerCase();
  const existing = countriesByName.get(key);
  if (existing) return existing;

  const code = countryName.length <= 10 ? countryName : null;
  const [row] = await sql`
    INSERT INTO countries (name, code) VALUES (${countryName}, ${code})
    RETURNING id, name, code
  `;
  const country: CountryRow = { id: row.id, name: row.name, code: row.code };
  countriesByName.set(key, country);
  return country;
}

async function getOrCreateState(
  stateName: string,
  abbr?: string,
  countryId?: number,
): Promise<StateRow> {
  const key = stateName.toLowerCase();
  const existing = statesByName.get(key);
  if (existing) return existing;

  // Also check by abbreviation (handles API returning "AL" instead of "Alabama")
  for (const s of statesByName.values()) {
    if (s.abbr.toLowerCase() === key) return s;
  }
  if (abbr) {
    for (const s of statesByName.values()) {
      if (s.abbr.toLowerCase() === abbr.toLowerCase()) return s;
    }
  }

  // Create new state
  const stateAbbr = abbr || stateName.substring(0, 2).toUpperCase();
  const [row] = await sql`
    INSERT INTO states (name, abbr, country_id) VALUES (${stateName}, ${stateAbbr}, ${countryId ?? null})
    RETURNING id, name, abbr, country_id
  `;
  const state: StateRow = { id: row.id, name: row.name, abbr: row.abbr, country_id: row.country_id };
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

function extractPostalCode(address: string | undefined): string | null {
  if (!address) return null;
  const match = address.match(/\b(\d{5}(?:-\d{4})?)\b/);
  return match ? match[1] : null;
}

// ---- Tee processing (male tees only) ----

function extractTeeboxes(apiCourse: ApiCourse): TeeboxEnrichment[] {
  const allTees: ApiTee[] = apiCourse.tees?.male || [];
  const seenNames = new Set<string>();
  const result: TeeboxEnrichment[] = [];

  for (const t of allTees) {
    const key = t.tee_name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    const mappedHoles = t.holes?.length
      ? t.holes.map((h) => ({
          par: h.par,
          yardage: h.yardage,
          handicap: h.handicap,
        }))
      : undefined;
    const is9Duped = mappedHoles ? isDuplicated9Hole(mappedHoles) : false;
    result.push({
      name: t.tee_name,
      slope: t.slope_rating,
      courseRating: t.course_rating,
      totalYardage: is9Duped
        ? Math.round(t.total_yards / 2)
        : t.total_yards,
      holes: is9Duped ? mappedHoles!.slice(0, 9) : mappedHoles,
    });
  }

  return result;
}

// ---- Clean wipe ----

async function cleanWipe() {
  console.log("CLEAN WIPE: deleting all course data in FK order...");
  await sql`DELETE FROM course_images`;
  console.log("  course_images deleted");
  await sql`DELETE FROM courses`;
  console.log("  courses deleted");
  await sql`DELETE FROM cities`;
  console.log("  cities deleted");
  await sql`DELETE FROM states`;
  console.log("  states deleted");
  await sql`DELETE FROM countries`;
  console.log("  countries deleted");
  console.log("Clean wipe complete.\n");
}

// ---- Main ----

async function main() {
  if (!GOLF_API_KEY) {
    console.error("Set GOLF_COURSE_API_KEY in .env before running.");
    process.exit(1);
  }

  if (IS_CLEAN) {
    await cleanWipe();
  }

  console.log(
    `Starting import from page ${START_PAGE}${MAX_PAGES ? `, max ${MAX_PAGES} pages` : ", unlimited pages"}`,
  );
  console.log("");

  // Pre-fetch lookup data
  console.log("Loading lookup data...");

  const countryRows = await sql`SELECT id, name, code FROM countries`;
  for (const c of countryRows) {
    countriesByName.set(c.name.toLowerCase(), {
      id: c.id,
      name: c.name,
      code: c.code,
    });
  }
  console.log(`  ${countryRows.length} countries loaded`);

  const stateRows = await sql`SELECT id, name, abbr, country_id FROM states`;
  for (const s of stateRows) {
    statesByName.set(s.name.toLowerCase(), {
      id: s.id,
      name: s.name,
      abbr: s.abbr,
      country_id: s.country_id,
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
    SELECT id, api_course_id, club_name, course_name, state, layout_data FROM courses
  `;
  for (const c of courseRows) {
    const row: CourseRow = {
      id: c.id,
      api_course_id: c.api_course_id,
      club_name: c.club_name,
      course_name: c.course_name,
      state: c.state,
      layout_data: c.layout_data,
    };
    if (c.api_course_id) {
      coursesByApiId.set(c.api_course_id, row);
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
          const label = `  [API#${apiCourse.id}] ${apiCourse.club_name} / ${apiCourse.course_name}`;

          // Skip if no location info
          if (!loc.state && !loc.country) {
            console.log(`${label} -- SKIP (no location)`);
            skipped++;
            continue;
          }

          // Get or create country
          const countryName = loc.country || "Unknown";
          const country = await getOrCreateCountry(countryName);

          // Get or create state
          const stateName = loc.state || loc.country || "Unknown";
          const state = await getOrCreateState(stateName, undefined, country.id);

          // Get or create city
          const cityName = loc.city || "Unknown";
          const city = await getOrCreateCity(cityName, state.id);

          // Build layout_data from API tees
          const teeboxes = extractTeeboxes(apiCourse);
          const existing = coursesByApiId.get(apiCourse.id) ?? null;
          const layoutData =
            teeboxes.length > 0
              ? buildLayoutFromApi(teeboxes, existing?.layout_data)
              : existing?.layout_data || null;

          const courseData = {
            course_name: apiCourse.course_name,
            club_name: apiCourse.club_name,
            street: loc.address || null,
            state: state.abbr,
            postal_code: extractPostalCode(loc.address),
            city_id: city.id,
            state_id: state.id,
            lat: loc.latitude || null,
            lng: loc.longitude || null,
            layout_data: layoutData,
            api_course_id: apiCourse.id,
          };

          if (existing) {
            // Update existing course
            await sql`
              UPDATE courses SET
                course_name = ${courseData.course_name},
                club_name = ${courseData.club_name},
                street = ${courseData.street},
                state = ${courseData.state},
                postal_code = ${courseData.postal_code},
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
              club_name: courseData.club_name,
              course_name: courseData.course_name,
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
              INSERT INTO courses (course_name, club_name, street, state, postal_code, city_id, state_id, lat, lng, layout_data, api_course_id, enriched_at)
              VALUES (${courseData.course_name}, ${courseData.club_name}, ${courseData.street}, ${courseData.state}, ${courseData.postal_code}, ${courseData.city_id}, ${courseData.state_id}, ${courseData.lat}, ${courseData.lng}, ${courseData.layout_data}, ${courseData.api_course_id}, now())
              RETURNING id
            `;

            // Update in-memory maps
            const newRow: CourseRow = {
              id: row.id,
              api_course_id: apiCourse.id,
              club_name: courseData.club_name,
              course_name: courseData.course_name,
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
