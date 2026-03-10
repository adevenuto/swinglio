import "dotenv/config";
import postgres from "postgres";

// Detects and fixes 9-hole courses that were imported with duplicated back 9.
// Usage: npx tsx scripts/fix-duplicated-9hole.ts [--dry-run]

const sql = postgres(process.env.DIRECT_URL!);
const DRY_RUN = process.argv.includes("--dry-run");

function isDuplicatedFront9(
  holes: Record<string, { par: string; length: string; handicap?: number }>,
): boolean {
  const keys = Object.keys(holes);
  if (keys.length !== 18) return false;

  for (let i = 1; i <= 9; i++) {
    const front = holes[`hole-${i}`];
    const back = holes[`hole-${i + 9}`];
    if (!front || !back) return false;
    if (
      front.par !== back.par ||
      front.length !== back.length ||
      front.handicap !== back.handicap
    ) return false;
  }
  return true;
}

async function main() {
  if (DRY_RUN) console.log("=== DRY RUN — no changes will be made ===\n");

  const courses = await sql`
    SELECT id, name, layout_data
    FROM courses
    WHERE layout_data IS NOT NULL
  `;

  console.log(`Checking ${courses.length} courses with layout_data...\n`);

  let fixed = 0;
  let skipped = 0;

  for (const course of courses) {
    let parsed: any;
    try {
      parsed = JSON.parse(course.layout_data);
    } catch {
      continue;
    }

    if (!parsed.teeboxes?.length) continue;

    // Check if ANY teebox has the duplication pattern
    const hasDupe = parsed.teeboxes.some((t: any) =>
      t.holes && isDuplicatedFront9(t.holes),
    );

    if (!hasDupe) {
      skipped++;
      continue;
    }

    console.log(`[${course.id}] ${course.name} — DUPLICATED 9-HOLE`);

    // Truncate each teebox to 9 holes
    for (const teebox of parsed.teeboxes) {
      if (!teebox.holes) continue;
      const holeKeys = Object.keys(teebox.holes);
      if (holeKeys.length !== 18) continue;

      // Remove holes 10-18
      for (let h = 10; h <= 18; h++) {
        delete teebox.holes[`hole-${h}`];
      }

      // Halve totalYardage if present
      if (teebox.totalYardage) {
        teebox.totalYardage = Math.round(teebox.totalYardage / 2);
      }
    }

    parsed.hole_count = 9;

    const newLayoutData = JSON.stringify(parsed);

    if (!DRY_RUN) {
      await sql`
        UPDATE courses
        SET layout_data = ${newLayoutData}, updated_at = now()
        WHERE id = ${course.id}
      `;
      console.log(`  → Fixed (9 holes, ${parsed.teeboxes.length} teeboxes)`);
    } else {
      console.log(`  → Would fix (9 holes, ${parsed.teeboxes.length} teeboxes)`);
    }

    fixed++;
  }

  console.log(`\n--- Summary ---`);
  console.log(`Checked:  ${courses.length}`);
  console.log(`Fixed:    ${fixed}`);
  console.log(`Skipped:  ${skipped} (no duplication detected)`);
  if (DRY_RUN && fixed > 0) {
    console.log(`\nRe-run without --dry-run to apply changes.`);
  }

  await sql.end();
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
