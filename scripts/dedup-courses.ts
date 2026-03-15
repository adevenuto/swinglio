import "dotenv/config";
import postgres from "postgres";

// Deduplicates courses in three phases:
//   Phase 1: Delete junk rows (tournament category labels)
//   Phase 2: Delete identical-layout duplicates (same name+city+state, no api_course_id)
//   Phase 3: Merge mixed dups (enriched + non-enriched, conservative)
//
// Usage:
//   npx tsx scripts/dedup-courses.ts            # dry-run (default)
//   npx tsx scripts/dedup-courses.ts --execute   # live

const sql = postgres(process.env.DIRECT_URL!);
const EXECUTE = process.argv.includes("--execute");

// ─── Counters ────────────────────────────────────────────────────────
const stats = {
  p1: { deleted: 0, skipped: 0 },
  p2: { deleted: 0, skipped: 0 },
  p3: { deleted: 0, skipped: 0, warnings: 0 },
};

// ─── Helpers ─────────────────────────────────────────────────────────

async function prefetchReferencedCourseIds(): Promise<Set<number>> {
  const [roundRefs, scoreRefs, imageRefs] = await Promise.all([
    sql`SELECT DISTINCT course_id FROM rounds`,
    sql`SELECT DISTINCT course_id FROM scores WHERE course_id IS NOT NULL`,
    sql`SELECT DISTINCT course_id FROM course_images`,
  ]);
  const ids = new Set<number>();
  for (const r of [...roundRefs, ...scoreRefs, ...imageRefs]) ids.add(r.course_id);
  return ids;
}

async function deleteCourse(
  id: number,
  label: string,
  referencedIds: Set<number>,
): Promise<"deleted" | "skipped"> {
  if (referencedIds.has(id)) {
    console.log(`  [${id}] "${label}" — SKIPPED (referenced by rounds/scores/images)`);
    return "skipped";
  }

  if (EXECUTE) {
    await sql`DELETE FROM courses WHERE id = ${id}`;
    console.log(`  [${id}] "${label}" — DELETED`);
  } else {
    console.log(`  [${id}] "${label}" — WOULD DELETE`);
  }
  return "deleted";
}

function extractTeeboxNames(layoutData: string | null): Set<string> | null {
  if (!layoutData) return null;
  try {
    const parsed = JSON.parse(layoutData);
    if (!parsed.teeboxes?.length) return null;
    const names = new Set<string>();
    for (const t of parsed.teeboxes) {
      if (t.name) names.add(t.name.toLowerCase());
    }
    return names.size > 0 ? names : null;
  } catch {
    return null;
  }
}

// ─── Phase 1: Junk Rows ─────────────────────────────────────────────

async function deleteJunkRows(referencedIds: Set<number>) {
  console.log("\nPhase 1: Junk Rows");

  const junkRows = await sql`
    SELECT id, name FROM courses
    WHERE name ~* '^(men|women|men and women|mixed|seniors?|juniors?|boys?|girls?)$'
       OR name ~ '^\d{4}$'
    ORDER BY id
  `;

  if (junkRows.length === 0) {
    console.log("  No junk rows found.");
    return;
  }

  for (const row of junkRows) {
    const result = await deleteCourse(row.id, row.name, referencedIds);
    stats.p1[result === "deleted" ? "deleted" : "skipped"]++;
  }
}

// ─── Phase 2: Identical-Layout Duplicates ────────────────────────────

async function deduplicateIdenticalLayouts(referencedIds: Set<number>) {
  console.log("\nPhase 2: Identical-Layout Duplicates");

  const groups = await sql`
    SELECT name, city_id, state_id FROM courses
    GROUP BY name, city_id, state_id
    HAVING count(*) > 1 AND count(api_course_id) = 0
  `;

  if (groups.length === 0) {
    console.log("  No identical-layout duplicate groups found.");
    return;
  }

  for (const group of groups) {
    const rows = await sql`
      SELECT id, name, layout_data FROM courses
      WHERE name = ${group.name}
        AND city_id = ${group.city_id}
        AND state_id = ${group.state_id}
      ORDER BY id
    `;

    // Check if all layout_data values are identical (including all-NULL)
    const allNull = rows.every((r: any) => r.layout_data === null);
    const allIdentical =
      allNull ||
      rows.every((r: any) => r.layout_data === rows[0].layout_data);

    if (!allIdentical) {
      console.log(`  "${group.name}" (city ${group.city_id}) — SKIP (layout_data differs)`);
      stats.p2.skipped += rows.length - 1;
      continue;
    }

    // Keep lowest ID, delete rest
    const [keeper, ...dupes] = rows;
    for (const dupe of dupes) {
      const result = await deleteCourse(dupe.id, dupe.name, referencedIds);
      stats.p2[result === "deleted" ? "deleted" : "skipped"]++;
    }
  }
}

// ─── Phase 3: Mixed Duplicates ───────────────────────────────────────

async function mergeMixedDups(referencedIds: Set<number>) {
  console.log("\nPhase 3: Mixed Duplicates");

  const groups = await sql`
    SELECT name, city_id, state_id FROM courses
    GROUP BY name, city_id, state_id
    HAVING count(*) > 1 AND count(api_course_id) = 1
  `;

  if (groups.length === 0) {
    console.log("  No mixed duplicate groups found.");
    return;
  }

  for (const group of groups) {
    const rows = await sql`
      SELECT id, name, layout_data, api_course_id FROM courses
      WHERE name = ${group.name}
        AND city_id = ${group.city_id}
        AND state_id = ${group.state_id}
      ORDER BY id
    `;

    const enriched = rows.find((r: any) => r.api_course_id !== null);
    const nonEnriched = rows.filter((r: any) => r.api_course_id === null);

    if (!enriched) continue; // shouldn't happen, but guard

    const keeperTeeboxes = extractTeeboxNames(enriched.layout_data);

    let skipGroup = false;
    for (const row of nonEnriched) {
      const rowTeeboxes = extractTeeboxNames(row.layout_data);

      // If non-enriched row has teeboxes not in the keeper → skip entire group
      if (rowTeeboxes && keeperTeeboxes) {
        const unique = [...rowTeeboxes].filter((n) => !keeperTeeboxes.has(n));
        if (unique.length > 0) {
          console.log(
            `  "${group.name}" (city ${group.city_id}) — SKIP (unique teeboxes in non-enriched row: ${unique.join(", ")})`,
          );
          stats.p3.warnings++;
          skipGroup = true;
          break;
        }
      } else if (rowTeeboxes && !keeperTeeboxes) {
        // Non-enriched has teeboxes but keeper doesn't — skip
        console.log(
          `  "${group.name}" (city ${group.city_id}) — SKIP (non-enriched has teeboxes, enriched does not)`,
        );
        stats.p3.warnings++;
        skipGroup = true;
        break;
      }
    }

    if (skipGroup) {
      stats.p3.skipped += nonEnriched.length;
      continue;
    }

    // Safe to delete non-enriched rows
    for (const row of nonEnriched) {
      const result = await deleteCourse(row.id, row.name, referencedIds);
      stats.p3[result === "deleted" ? "deleted" : "skipped"]++;
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  if (EXECUTE) {
    console.log("=== LIVE RUN — changes WILL be applied. ===");
  } else {
    console.log("=== DRY RUN — no changes. Pass --execute to apply. ===");
  }

  console.log("\nPre-fetching referenced course IDs...");
  const referencedIds = await prefetchReferencedCourseIds();
  console.log(`  ${referencedIds.size} course IDs referenced by rounds/scores/images.`);

  await deleteJunkRows(referencedIds);
  await deduplicateIdenticalLayouts(referencedIds);
  await mergeMixedDups(referencedIds);

  // Summary
  const totalDeleted = stats.p1.deleted + stats.p2.deleted + stats.p3.deleted;
  const totalSkipped = stats.p1.skipped + stats.p2.skipped + stats.p3.skipped;

  console.log("\n--- Summary ---");
  console.log(
    `Phase 1 (Junk):      ${stats.p1.deleted} deleted, ${stats.p1.skipped} skipped`,
  );
  console.log(
    `Phase 2 (Identical): ${stats.p2.deleted} deleted, ${stats.p2.skipped} skipped`,
  );
  console.log(
    `Phase 3 (Mixed):     ${stats.p3.deleted} deleted, ${stats.p3.skipped} skipped, ${stats.p3.warnings} warnings`,
  );
  console.log(
    `TOTAL:               ${totalDeleted} deleted, ${totalSkipped} skipped`,
  );

  await sql.end();
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
