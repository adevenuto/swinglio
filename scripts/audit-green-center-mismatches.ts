/**
 * audit-green-center-mismatches.ts
 *
 * Read-only audit that flags courses whose stored green centers almost certainly
 * belong to a DIFFERENT course (the wrong-course scraping bug — e.g. an Illinois
 * course that received a Florida course's green centers because of a similar name).
 *
 * Detection logic lives in scripts/lib/green-center-mismatch.ts (shared with the
 * clear script so they can't drift).
 *
 * Usage:
 *   npx tsx scripts/audit-green-center-mismatches.ts            # summary + table
 *   npx tsx scripts/audit-green-center-mismatches.ts --verbose  # list all flagged
 *   npx tsx scripts/audit-green-center-mismatches.ts --json     # flagged IDs as JSON
 *   npx tsx scripts/audit-green-center-mismatches.ts --km 15    # override threshold
 */

import "dotenv/config";
import postgres from "postgres";
import {
  findMismatches,
  classifySets,
  isUS,
  FLAG_KM_DEFAULT,
} from "./lib/green-center-mismatch";

const VERBOSE = process.argv.includes("--verbose");
const JSON_OUT = process.argv.includes("--json");
const kmArgIdx = process.argv.indexOf("--km");
const FLAG_KM = kmArgIdx !== -1 ? parseFloat(process.argv[kmArgIdx + 1]) : FLAG_KM_DEFAULT;

const sql = postgres(process.env.DIRECT_URL!);

async function main() {
  const { totalWithGreenCenters, evaluated, noReference, flagged } =
    await findMismatches(sql, FLAG_KM);

  if (JSON_OUT) {
    console.log(JSON.stringify(flagged.map((f) => f.course.id)));
    await sql.end();
    return;
  }

  const { borderline, clearSet, reScrapeSet } = classifySets(flagged);

  const tiers = { over1000: 0, t100to1000: 0, t25to100: 0, t10to25: 0, bboxOnly: 0 };
  for (const f of flagged) {
    const d = f.distanceKm;
    if (d == null) tiers.bboxOnly++;
    else if (d > 1000) tiers.over1000++;
    else if (d > 100) tiers.t100to1000++;
    else if (d > 25) tiers.t25to100++;
    else tiers.t10to25++;
  }
  const flaggedUS = flagged.filter((f) => isUS(f.course.lat, f.course.lng)).length;

  console.log("\n=== Green Center MISMATCH Audit ===\n");
  console.log(`Courses with greenCenters:              ${totalWithGreenCenters}`);
  console.log(`  Evaluated (had usable coords):        ${evaluated}`);
  console.log(`  Unjudgeable (no lat/lng & no bbox):   ${noReference}`);
  console.log(`  FLAGGED as likely wrong-course:       ${flagged.length}`);
  console.log(`  Distance threshold:                   ${FLAG_KM}km\n`);
  console.log("  Flagged by distance from course center:");
  console.log(`    > 1000 km (cross-region/intl):      ${tiers.over1000}`);
  console.log(`    100–1000 km:                        ${tiers.t100to1000}`);
  console.log(`    25–100 km:                          ${tiers.t25to100}`);
  console.log(`    10–25 km (borderline / review):     ${tiers.t10to25}`);
  console.log(`    no lat/lng — state bbox only:       ${tiers.bboxOnly}\n`);
  console.log(`  Flagged courses located in the US:    ${flaggedUS}`);
  console.log(`  Flagged courses international:         ${flagged.length - flaggedUS}\n`);
  console.log("  Remediation plan:");
  console.log(`    CLEAR set (all wrong, excl. borderline): ${clearSet.length}`);
  console.log(`      └─ of which US (to re-scrape):         ${reScrapeSet.length}`);
  console.log(`      └─ of which international (stay clear): ${clearSet.length - reScrapeSet.length}`);
  console.log(`    HOLD for manual review (borderline):     ${borderline.length}\n`);

  if (flagged.length > 0) {
    const shown = VERBOSE ? flagged : flagged.slice(0, 40);
    console.log(
      `--- Flagged courses (worst first${VERBOSE ? "" : `, showing ${shown.length} of ${flagged.length} — use --verbose for all`}) ---`,
    );
    for (const f of shown) {
      const c = f.course;
      const center =
        c.lat != null && c.lng != null
          ? `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`
          : "(no lat/lng)";
      console.log(
        `  [${c.id}] ${c.club_name || c.course_name}` +
          `${c.city_name ? ` — ${c.city_name}` : ""}, ${c.state ?? "?"}`,
      );
      console.log(
        `        course center: ${center}  |  green center: ${f.medianLat.toFixed(4)},${f.medianLng.toFixed(4)}`,
      );
      console.log(`        reason: ${f.reasons.join("; ")}`);
    }
    console.log("");
    console.log(`(Run with --json for the full flagged ID list.)`);
    console.log("");
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
