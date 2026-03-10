import "dotenv/config";
import postgres from "postgres";
import {
  type CourseInput,
  RateLimitError,
  applyTeeboxEnrichments,
  enrichCourse,
} from "./lib/enrich-course";

// Re-enriches courses that already have lat/lng to backfill hole handicap data.
// Processes in chunks to avoid memory issues with large layout_data blobs.

const sql = postgres(process.env.DIRECT_URL!);

const GOLF_API_KEY = process.env.GOLF_COURSE_API_KEY;

const MAX_TOTAL = parseInt(process.argv[2] || "8000", 10);
const CHUNK_SIZE = 100;
const DELAY_MS = 1000;

async function main() {
  if (!GOLF_API_KEY) {
    console.error("Set GOLF_COURSE_API_KEY in .env before running.");
    process.exit(1);
  }

  console.log(`Max courses: ${MAX_TOTAL}, chunk size: ${CHUNK_SIZE}`);
  console.log("Target: courses with lat/lng but missing hole handicap data\n");

  let updated = 0;
  let noMatch = 0;
  let noChange = 0;
  let errors = 0;
  let processed = 0;
  let lastId = 0;
  let rateLimited = false;

  while (processed < MAX_TOTAL && !rateLimited) {
    // Fetch next chunk — use SQL to filter out courses that already have handicap
    // by checking if layout_data contains '"handicap":' (fast text check)
    const chunk = await sql`
      SELECT c.id, c.name, c.street, c.state, c.postal_code, c.layout_data,
             ci.name as city_name, s.abbr as state_abbr
      FROM courses c
      LEFT JOIN cities ci ON ci.id = c.city_id
      LEFT JOIN states s ON s.id = c.state_id
      WHERE c.enriched_at IS NOT NULL
        AND c.lat IS NOT NULL
        AND c.lng IS NOT NULL
        AND c.id > ${lastId}
        AND c.layout_data IS NOT NULL
        AND c.layout_data NOT LIKE '%"handicap":%'
      ORDER BY c.id
      LIMIT ${CHUNK_SIZE}
    `;

    if (chunk.length === 0) break;

    for (const course of chunk) {
      if (processed >= MAX_TOTAL || rateLimited) break;

      const label = `[${course.id}] ${course.name}`;
      lastId = course.id;
      processed++;

      try {
        const input: CourseInput = {
          name: course.name,
          street: course.street,
          state: course.state,
          postalCode: course.postal_code,
          cityName: course.city_name,
          stateAbbr: course.state_abbr,
        };

        const result = await enrichCourse(input, GOLF_API_KEY);

        if (result.source === "none" || !result.teeboxEnrichments?.length) {
          console.log(`${label} -- NO MATCH`);
          noMatch++;
        } else {
          const hasHandicaps = result.teeboxEnrichments.some(
            (t) => t.holes?.some((h) => h.handicap != null),
          );

          if (!hasHandicaps) {
            console.log(`${label} -- NO HANDICAP DATA`);
            noMatch++;
          } else {
            const updatedLayout = applyTeeboxEnrichments(
              course.layout_data,
              result.teeboxEnrichments,
            );

            if (updatedLayout && updatedLayout !== course.layout_data) {
              await sql`
                UPDATE courses SET
                  layout_data = ${updatedLayout},
                  updated_at = now()
                WHERE id = ${course.id}
              `;

              const teeCount = result.teeboxEnrichments.filter(
                (t) => t.holes?.some((h) => h.handicap != null),
              ).length;
              console.log(`${label} -- UPDATED (${teeCount} tees with handicaps)`);
              updated++;
            } else {
              console.log(`${label} -- NO CHANGE`);
              noChange++;
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof RateLimitError) {
          console.log(`\n${label} -- RATE LIMITED. Stopping.`);
          rateLimited = true;
          break;
        }
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`${label} -- ERROR: ${msg}`);
        errors++;
      }

      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  // Count remaining
  const [{ count: remaining }] = await sql`
    SELECT count(*)::int as count FROM courses
    WHERE enriched_at IS NOT NULL
      AND lat IS NOT NULL
      AND lng IS NOT NULL
      AND layout_data IS NOT NULL
      AND layout_data NOT LIKE '%"handicap":%'
  `;

  console.log(`\n--- Summary ---`);
  console.log(`Processed:  ${processed}`);
  console.log(`Updated:    ${updated}`);
  console.log(`No match:   ${noMatch}`);
  console.log(`No change:  ${noChange}`);
  console.log(`Errors:     ${errors}`);
  console.log(`Remaining:  ${remaining}`);
  if (remaining > 0) {
    console.log(`\nRun again to process the next batch.`);
  }

  await sql.end();
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
