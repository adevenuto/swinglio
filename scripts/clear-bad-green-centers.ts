/**
 * clear-bad-green-centers.ts
 *
 * Phase 2 of the green-center mismatch fix. Removes wrong green-center data from
 * the courses flagged by scripts/lib/green-center-mismatch.ts (shared detection,
 * so this targets exactly the set the audit reports).
 *
 * For each course it deletes from layout_data: `greenCenters`, the stale
 * `golftraxx` match metadata, and any `greenCenterAttemptedAt` — leaving
 * teeboxes/hole_count intact. The app degrades gracefully (distance-to-pin badge
 * hides when greenCenters is absent — see app/gameplay.tsx).
 *
 * By default it clears the agreed CLEAR set (all flagged EXCEPT the 10–25km
 * borderline band) and writes the US subset's IDs to a handoff file so Phase 3
 * (re-scrape) knows which to repopulate.
 *
 * Usage:
 *   npx tsx scripts/clear-bad-green-centers.ts --dry-run     # preview, no writes
 *   npx tsx scripts/clear-bad-green-centers.ts               # clear the CLEAR set
 *   npx tsx scripts/clear-bad-green-centers.ts --ids 1,2,3   # clear specific IDs only
 *   npx tsx scripts/clear-bad-green-centers.ts --include-borderline  # also clear borderline
 *   npx tsx scripts/clear-bad-green-centers.ts --km 15       # override threshold
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import postgres from "postgres";
import {
  findMismatches,
  classifySets,
  isUS,
  FLAG_KM_DEFAULT,
  type Flagged,
} from "./lib/green-center-mismatch";

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

const DRY_RUN = process.argv.includes("--dry-run");
const INCLUDE_BORDERLINE = process.argv.includes("--include-borderline");
const IDS_ARG = getArg("--ids");
const kmArgIdx = process.argv.indexOf("--km");
const FLAG_KM = kmArgIdx !== -1 ? parseFloat(process.argv[kmArgIdx + 1]) : FLAG_KM_DEFAULT;

// Handoff file consumed by the Phase 3 re-scrape wrapper.
const RESCRAPE_FILE = path.join(__dirname, ".green-center-rescrape-ids.json");
const BACKUP_STAMP = new Date().toISOString().replace(/[:.]/g, "-");

const sql = postgres(process.env.DIRECT_URL!);

/** Remove the green-center keys from a layout_data JSON string. Returns the new
 *  string, or null if nothing changed / unparseable. */
function stripGreenData(layoutData: string | null): string | null {
  if (!layoutData) return null;
  let ld: Record<string, unknown>;
  try {
    ld = JSON.parse(layoutData);
  } catch {
    return null;
  }
  if (
    !("greenCenters" in ld) &&
    !("golftraxx" in ld) &&
    !("greenCenterAttemptedAt" in ld)
  ) {
    return null; // nothing to strip
  }
  delete ld.greenCenters;
  delete ld.golftraxx;
  delete ld.greenCenterAttemptedAt;
  return JSON.stringify(ld);
}

async function main() {
  console.log("=== Clear Bad Green Centers ===");
  if (DRY_RUN) console.log("** DRY RUN — no DB writes **");
  console.log("");

  // Determine the target set.
  let targets: Flagged[];
  let reScrapeIds: number[] = [];

  if (IDS_ARG) {
    const ids = IDS_ARG.split(",").map((s) => parseInt(s.trim(), 10)).filter(Boolean);
    const rows = await sql<Flagged["course"][]>`
      SELECT c.id, c.course_name, c.club_name, c.state, c.lat, c.lng,
             c.layout_data::text as layout_data, ci.name as city_name
      FROM courses c LEFT JOIN cities ci ON ci.id = c.city_id
      WHERE c.id = ANY(${ids})
    `;
    targets = rows.map((course) => ({
      course, medianLat: 0, medianLng: 0, distanceKm: null, reasons: ["manual --ids"],
    }));
    reScrapeIds = rows.filter((c) => isUS(c.lat, c.lng)).map((c) => c.id);
    console.log(`Targeting ${targets.length} course(s) from --ids.`);
  } else {
    const { flagged } = await findMismatches(sql, FLAG_KM);
    const { clearSet, borderline, reScrapeSet } = classifySets(flagged);
    targets = INCLUDE_BORDERLINE ? [...clearSet, ...borderline] : clearSet;
    reScrapeIds = (INCLUDE_BORDERLINE
      ? targets.filter((f) => isUS(f.course.lat, f.course.lng))
      : reScrapeSet
    ).map((f) => f.course.id);
    console.log(
      `Clear set: ${targets.length}` +
        (INCLUDE_BORDERLINE ? " (incl. borderline)" : " (excl. borderline)") +
        ` | US to re-scrape: ${reScrapeIds.length}`,
    );
  }
  console.log("");

  // Build the list of actual changes first (so we can back up before writing).
  const changes: { id: number; before: string; after: string }[] = [];
  let skipped = 0;
  for (const f of targets) {
    const newLayout = stripGreenData(f.course.layout_data);
    if (newLayout == null || f.course.layout_data == null) {
      skipped++;
      continue;
    }
    changes.push({ id: f.course.id, before: f.course.layout_data, after: newLayout });
  }

  if (DRY_RUN) {
    for (const c of changes.slice(0, 10)) console.log(`  would clear [${c.id}]`);
    console.log("");
    console.log(`Would clear: ${changes.length}`);
    console.log(`Skipped (nothing to strip): ${skipped}`);
    console.log(`\n(Dry run — would write ${reScrapeIds.length} US re-scrape IDs to ${RESCRAPE_FILE})`);
    await sql.end();
    return;
  }

  // Back up original layout_data for every course we're about to change — full
  // undo path (restore by writing `before` back to each id).
  const backupFile = path.join(__dirname, `.green-center-backup-${BACKUP_STAMP}.json`);
  fs.writeFileSync(
    backupFile,
    JSON.stringify(changes.map((c) => ({ id: c.id, layout_data: c.before }))),
  );
  console.log(`Backup of ${changes.length} courses written to ${backupFile}\n`);

  let cleared = 0;
  for (const c of changes) {
    await sql`
      UPDATE courses
      SET layout_data = ${c.after}, updated_at = now()
      WHERE id = ${c.id}
    `;
    cleared++;
    if (cleared % 200 === 0) console.log(`  ...cleared ${cleared}`);
  }

  console.log("");
  console.log(`Cleared: ${cleared}`);
  console.log(`Skipped (nothing to strip): ${skipped}`);

  fs.writeFileSync(RESCRAPE_FILE, JSON.stringify(reScrapeIds));
  console.log(`\nWrote ${reScrapeIds.length} US re-scrape IDs to ${RESCRAPE_FILE}`);
  console.log("Next: run Phase 3 re-scrape over those IDs.");

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
