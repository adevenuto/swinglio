import "dotenv/config";
import fs from "fs";
import path from "path";
import postgres from "postgres";
import {
  type CourseInput,
  RateLimitError,
  applyTeeboxEnrichments,
  enrichCourse,
} from "./lib/enrich-course";

// Re-enriches courses missing slope/courseRating data using the improved
// multi-query search + address-aware matching in enrich-course.ts.
// Saves progress to a local file so subsequent runs skip already-processed courses.

const sql = postgres(process.env.DIRECT_URL!);

const GOLF_API_KEY = process.env.GOLF_COURSE_API_KEY;

const MAX_TOTAL = parseInt(process.argv[2] || "8000", 10);
const CHUNK_SIZE = 100;
const DELAY_MS = 1000;

const PROGRESS_FILE = path.join(__dirname, ".enrich-ratings-progress");

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
  if (trimmed.length <= 10) return true;
  if (/^#?\d+$/.test(trimmed)) return true;
  if (clubName && trimmed.toLowerCase() !== clubName.toLowerCase()) return true;
  return false;
}

function loadProgress(): number {
  try {
    const data = fs.readFileSync(PROGRESS_FILE, "utf-8").trim();
    const id = parseInt(data, 10);
    return isNaN(id) ? 0 : id;
  } catch {
    return 0;
  }
}

function saveProgress(lastId: number): void {
  fs.writeFileSync(PROGRESS_FILE, String(lastId), "utf-8");
}

async function main() {
  if (!GOLF_API_KEY) {
    console.error("Set GOLF_COURSE_API_KEY in .env before running.");
    process.exit(1);
  }

  if (process.argv.includes("--reset")) {
    try { fs.unlinkSync(PROGRESS_FILE); } catch {}
    console.log("Progress reset. Starting from the beginning.\n");
  }

  const startId = loadProgress();
  console.log(`Max courses: ${MAX_TOTAL}, chunk size: ${CHUNK_SIZE}`);
  console.log(`Resuming from course ID > ${startId}`);
  console.log("Target: courses missing slope/courseRating data\n");

  let updated = 0;
  let noMatch = 0;
  let noChange = 0;
  let errors = 0;
  let processed = 0;
  let lastId = startId;
  let rateLimited = false;

  while (processed < MAX_TOTAL && !rateLimited) {
    const chunk = await sql`
      SELECT c.id, c.name, c.street, c.state, c.postal_code, c.layout_data,
             c.lat, c.lng,
             ci.name as city_name, s.abbr as state_abbr
      FROM courses c
      LEFT JOIN cities ci ON ci.id = c.city_id
      LEFT JOIN states s ON s.id = c.state_id
      WHERE c.id > ${lastId}
        AND c.layout_data IS NOT NULL
        AND (
          c.layout_data NOT LIKE '%"slope":%'
          OR c.lat IS NULL
        )
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

        const result = await enrichCourse(input, GOLF_API_KEY);

        if (result.source === "none" || !result.teeboxEnrichments?.length) {
          console.log(`${label} -- NO MATCH`);
          noMatch++;
        } else {
          const hasSlope = result.teeboxEnrichments.some(
            (t) => t.slope != null,
          );
          const updatedLayout = hasSlope
            ? applyTeeboxEnrichments(
                course.layout_data,
                result.teeboxEnrichments,
              )
            : null;

          const layoutChanged =
            updatedLayout && updatedLayout !== course.layout_data;
          const needsLatLng =
            course.lat == null && result.lat != null;

          // Build updated name if the API course name is a generic identifier
          let updatedName = course.name;
          if (
            result.matchedCourseName &&
            isGenericCourseName(result.matchedCourseName, result.matchedClubName)
          ) {
            const suffix = result.matchedCourseName.trim();
            if (!course.name.includes(suffix)) {
              updatedName = `${course.name} ${suffix}`;
            }
          }

          const nameChanged = updatedName !== course.name;
          const needsApiId = result.apiCourseId != null;

          if (layoutChanged || needsLatLng || nameChanged || needsApiId) {
            await sql`
              UPDATE courses SET
                name = ${updatedName},
                layout_data = ${layoutChanged ? updatedLayout : course.layout_data},
                lat = COALESCE(${result.lat ?? null}, lat),
                lng = COALESCE(${result.lng ?? null}, lng),
                api_course_id = ${result.apiCourseId ?? null},
                updated_at = now()
              WHERE id = ${course.id}
            `;

            const teeCount = result.teeboxEnrichments.filter(
              (t) => t.slope != null,
            ).length;
            const parts = [];
            if (layoutChanged) parts.push(`${teeCount} tees with slope/rating`);
            if (needsLatLng) parts.push("lat/lng");
            if (nameChanged) parts.push(`renamed → "${updatedName}"`);
            if (needsApiId) parts.push(`api_id: ${result.apiCourseId}`);
            console.log(`${label} -- UPDATED (${parts.join(", ")})`);
            updated++;
          } else if (!hasSlope) {
            console.log(`${label} -- NO SLOPE DATA`);
            noMatch++;
          } else {
            console.log(`${label} -- NO CHANGE`);
            noChange++;
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

      saveProgress(lastId);
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  // Count remaining
  const [{ count: remaining }] = await sql`
    SELECT count(*)::int as count FROM courses
    WHERE layout_data IS NOT NULL
      AND (
        layout_data NOT LIKE '%"slope":%'
        OR lat IS NULL
      )
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
