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

const BATCH_SIZE = parseInt(process.argv[2] || "50", 10);
const DELAY_MS = 1000;

async function main() {
  if (!GOLF_API_KEY) {
    console.error(
      "Set GOLF_COURSE_API_KEY in .env before running.\n" +
        "Sign up free at https://golfcourseapi.com",
    );
    process.exit(1);
  }

  console.log(`Batch size: ${BATCH_SIZE}`);
  if (GOOGLE_API_KEY) {
    console.log("Google Geocoding fallback: enabled");
  }
  console.log("");

  // Fetch courses that haven't been enriched yet
  const courses = await sql`
    SELECT c.id, c.name, c.street, c.state, c.postal_code, c.layout_data,
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
      const input: CourseInput = {
        name: course.name,
        street: course.street,
        state: course.state,
        postalCode: course.postal_code,
        cityName: course.city_name,
        stateAbbr: course.state_abbr,
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

        await sql`
          UPDATE courses SET
            lat = COALESCE(${result.lat ?? null}, lat),
            lng = COALESCE(${result.lng ?? null}, lng),
            phone = COALESCE(${result.phone ?? null}, phone),
            website = COALESCE(${result.website ?? null}, website),
            layout_data = ${updatedLayout ?? course.layout_data},
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
