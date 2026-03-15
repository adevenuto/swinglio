import "dotenv/config";
import postgres from "postgres";
import {
  type CourseInput,
  RateLimitError,
  applyTeeboxEnrichments,
  enrichCourse,
} from "./lib/enrich-course";

const sql = postgres(process.env.DIRECT_URL!);

const GOLF_API_KEY = process.env.GOLF_COURSE_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY;

// Find the batch size arg: skip flags (--*) and their values
const numericArg = process.argv.find((a, i) => {
  if (i < 2 || a.startsWith("--")) return false;
  // Skip if the previous arg is a flag that takes a value
  const prev = process.argv[i - 1];
  if (prev === "--reset-since") return false;
  return true;
});
const BATCH_SIZE = parseInt(numericArg || "50", 10);
const DELAY_MS = 1000;

/** Extract teebox names from layout_data JSON */
function parseTeeboxNames(layoutData: string | null): string[] {
  if (!layoutData) return [];
  try {
    const parsed = JSON.parse(layoutData);
    if (!parsed.teeboxes) return [];
    return parsed.teeboxes
      .map((t: { name?: string }) => t.name)
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

/** Check if the matched course name is a short/generic identifier that should be appended */
function isGenericCourseName(courseName: string, clubName?: string): boolean {
  const trimmed = courseName.trim();
  // Short identifiers: #1, #2, Course 1, etc.
  if (trimmed.length <= 10) return true;
  if (/^#?\d+$/.test(trimmed)) return true;
  // course_name differs from club_name (e.g., "Lake Course" vs "Medinah CC")
  if (clubName && trimmed.toLowerCase() !== clubName.toLowerCase()) return true;
  return false;
}

async function main() {
  if (!GOLF_API_KEY) {
    console.error(
      "Set GOLF_COURSE_API_KEY in .env before running.\n" +
        "Sign up free at https://golfcourseapi.com",
    );
    process.exit(1);
  }

  // --reset-since YYYY-MM-DD: clear enriched_at + api_course_id on courses enriched on/after that date
  const resetSinceIdx = process.argv.indexOf("--reset-since");
  if (resetSinceIdx !== -1) {
    const sinceDate = process.argv[resetSinceIdx + 1];
    if (!sinceDate || !/^\d{4}-\d{2}-\d{2}$/.test(sinceDate)) {
      console.error("Usage: --reset-since YYYY-MM-DD");
      process.exit(1);
    }
    const resetResult = await sql`
      UPDATE courses
      SET enriched_at = NULL, api_course_id = NULL
      WHERE enriched_at >= ${sinceDate}::date
        AND api_course_id IS NOT NULL
    `;
    console.log(`Reset ${resetResult.count} courses enriched since ${sinceDate}.\n`);
  }

  // --reset-multicourse: clear enriched_at on multi-course groups so they get re-processed
  if (process.argv.includes("--reset-multicourse")) {
    const resetResult = await sql`
      UPDATE courses SET enriched_at = NULL
      WHERE (name, city_id, state_id) IN (
        SELECT name, city_id, state_id FROM courses
        WHERE api_course_id IS NULL
        GROUP BY name, city_id, state_id
        HAVING count(*) > 1
      )
      AND api_course_id IS NULL
    `;
    console.log(`Reset enriched_at on ${resetResult.count} multi-course rows.\n`);
  }

  console.log(`Batch size: ${BATCH_SIZE}`);
  if (GOOGLE_API_KEY) {
    console.log("Google Geocoding fallback: enabled");
  }
  console.log("");

  // Fetch courses that haven't been enriched yet
  const courses = await sql`
    SELECT c.id, c.name, c.street, c.state, c.postal_code, c.layout_data,
           c.lat, c.lng,
           ci.name as city_name, s.abbr as state_abbr
    FROM courses c
    LEFT JOIN cities ci ON ci.id = c.city_id
    LEFT JOIN states s ON s.id = c.state_id
    WHERE c.enriched_at IS NULL
    ORDER BY c.id
    LIMIT ${BATCH_SIZE}
  `;

  if (courses.length === 0) {
    console.log("All courses have been enriched. Nothing to do.");
    await sql.end();
    return;
  }

  console.log(`Found ${courses.length} courses to enrich\n`);

  let enriched = 0;
  let noMatch = 0;
  let errors = 0;

  for (const course of courses) {
    const label = `[${course.id}] ${course.name}`;

    try {
      const teeboxNames = parseTeeboxNames(course.layout_data);
      const input: CourseInput = {
        name: course.name,
        street: course.street,
        state: course.state,
        postalCode: course.postal_code,
        cityName: course.city_name,
        stateAbbr: course.state_abbr,
        lat: course.lat,
        lng: course.lng,
        teeboxNames,
      };

      const result = await enrichCourse(input, GOLF_API_KEY, {
        googleApiKey: GOOGLE_API_KEY,
      });

      if (result.source === "none") {
        console.log(`${label} -- NO MATCH`);
        // Still mark enriched_at so we don't retry every run
        await sql`
          UPDATE courses SET enriched_at = now() WHERE id = ${course.id}
        `;
        noMatch++;
      } else {
        const updatedLayout = applyTeeboxEnrichments(
          course.layout_data,
          result.teeboxEnrichments,
        );

        // Build updated name if the API course name is a generic identifier
        let updatedName = course.name;
        if (
          result.matchedCourseName &&
          isGenericCourseName(result.matchedCourseName, result.matchedClubName)
        ) {
          const suffix = result.matchedCourseName.trim();
          // Only append if the name doesn't already contain this suffix
          if (!course.name.includes(suffix)) {
            updatedName = `${course.name} ${suffix}`;
          }
        }

        await sql`
          UPDATE courses SET
            name = ${updatedName},
            lat = COALESCE(${result.lat ?? null}, lat),
            lng = COALESCE(${result.lng ?? null}, lng),
            phone = COALESCE(${result.phone ?? null}, phone),
            website = COALESCE(${result.website ?? null}, website),
            layout_data = ${updatedLayout ?? course.layout_data},
            api_course_id = ${result.apiCourseId ?? null},
            enriched_at = now(),
            updated_at = now()
          WHERE id = ${course.id}
        `;

        const parts: string[] = [result.source];
        if (result.matchedCourseName) {
          parts.push(`matched: "${result.matchedCourseName}"`);
        }
        if (result.lat) parts.push(`${result.lat.toFixed(4)}, ${result.lng?.toFixed(4)}`);
        if (result.teeboxEnrichments?.length) {
          parts.push(`${result.teeboxEnrichments.length} tees`);
        }
        console.log(`${label} -- ENRICHED (${parts.join(", ")})`);
        enriched++;
      }
    } catch (err: unknown) {
      if (err instanceof RateLimitError) {
        console.log(`\n${label} -- RATE LIMITED. Stopping batch early.`);
        break;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${label} -- ERROR: ${msg}`);
      errors++;
    }

    // Rate limit delay
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  // Check how many remain
  const [{ count: remaining }] = await sql`
    SELECT count(*)::int as count FROM courses WHERE enriched_at IS NULL
  `;

  console.log(`\n--- Summary ---`);
  console.log(`Enriched: ${enriched}`);
  console.log(`No match: ${noMatch}`);
  console.log(`Errors:   ${errors}`);
  console.log(`Remaining: ${remaining}`);
  if (remaining > 0) {
    console.log(`\nRun again to process the next batch.`);
  }

  await sql.end();
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
