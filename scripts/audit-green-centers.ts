/**
 * audit-green-centers.ts
 *
 * Read-only audit of which courses have green center data and which don't.
 *
 * Usage:
 *   npx tsx scripts/audit-green-centers.ts [--verbose]
 */

import "dotenv/config";
import postgres from "postgres";

const VERBOSE = process.argv.includes("--verbose");

const sql = postgres(process.env.DIRECT_URL!);

type CourseRow = {
  id: number;
  course_name: string;
  club_name: string | null;
  postal_code: string | null;
  layout_data: string | null;
};

type Category =
  | "has_green_centers"
  | "missing_has_golftraxx"
  | "missing_attempted_failed"
  | "missing_no_golftraxx"
  | "no_layout_data";

async function main() {
  const courses = await sql<CourseRow[]>`
    SELECT id, course_name, club_name, postal_code, layout_data::text
    FROM courses
    ORDER BY id
  `;

  const buckets: Record<Category, CourseRow[]> = {
    has_green_centers: [],
    missing_has_golftraxx: [],
    missing_attempted_failed: [],
    missing_no_golftraxx: [],
    no_layout_data: [],
  };

  let totalWithLayout = 0;

  for (const course of courses) {
    if (!course.layout_data) {
      buckets.no_layout_data.push(course);
      continue;
    }

    totalWithLayout++;

    let ld: Record<string, unknown>;
    try {
      ld = JSON.parse(course.layout_data);
    } catch {
      buckets.no_layout_data.push(course);
      continue;
    }

    const gc = ld.greenCenters as Record<string, unknown> | undefined;
    const hasGreenCenters = gc && typeof gc === "object" && Object.keys(gc).length > 0;

    if (hasGreenCenters) {
      buckets.has_green_centers.push(course);
    } else if (ld.greenCenterAttemptedAt) {
      buckets.missing_attempted_failed.push(course);
    } else if (ld.golftraxx) {
      buckets.missing_has_golftraxx.push(course);
    } else {
      buckets.missing_no_golftraxx.push(course);
    }
  }

  // Summary table
  console.log("\n=== Green Centers Audit ===\n");
  console.log(`Total courses:                          ${courses.length}`);
  console.log(`  With layout_data:                     ${totalWithLayout}`);
  console.log(`  No layout_data:                       ${buckets.no_layout_data.length}`);
  console.log("");
  console.log(`Has greenCenters:                       ${buckets.has_green_centers.length}`);
  console.log(`Missing — has golftraxx match:          ${buckets.missing_has_golftraxx.length}`);
  console.log(`Missing — attempted & failed:           ${buckets.missing_attempted_failed.length}`);
  console.log(`Missing — no golftraxx match:           ${buckets.missing_no_golftraxx.length}`);

  if (VERBOSE) {
    const labels: Record<Category, string> = {
      has_green_centers: "Has greenCenters",
      missing_has_golftraxx: "Missing — has golftraxx match (scrapeable)",
      missing_attempted_failed: "Missing — attempted & failed",
      missing_no_golftraxx: "Missing — no golftraxx match",
      no_layout_data: "No layout_data",
    };

    for (const [cat, label] of Object.entries(labels) as [Category, string][]) {
      const list = buckets[cat];
      if (list.length === 0) continue;
      console.log(`\n--- ${label} (${list.length}) ---`);
      for (const c of list) {
        console.log(`  [${c.id}] ${c.course_name}${c.club_name ? ` (${c.club_name})` : ""} — zip: ${c.postal_code ?? "N/A"}`);
      }
    }
  }

  console.log("");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
