import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DIRECT_URL!);

const COLOR_MAP: Record<string, string> = {
  // Direct color names
  black: "#000000",
  blue: "#1565C0",
  white: "#FFFFFF",
  red: "#C62828",
  gold: "#F9A825",
  green: "#2E7D32",
  purple: "#6A1B9A",
  orange: "#FF8F00",
  brown: "#795548",
  yellow: "#FFEB3B",
  silver: "#9E9E9E",
  tan: "#D2B48C",
  teal: "#00897B",
  copper: "#B87333",
  // International
  azul: "#1565C0",
  rouge: "#C62828",
  blanc: "#FFFFFF",
  vermelho: "#C62828",
  bleu: "#1565C0",
  // Conventional positional names
  champions: "#000000",
  championship: "#000000",
  tournament: "#000000",
  back: "#000000",
  member: "#1565C0",
  mens: "#1565C0",
  regular: "#FFFFFF",
  middle: "#FFFFFF",
  forward: "#C62828",
  ladies: "#C62828",
  front: "#C62828",
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(l\)\s*$/, "")
    .replace(/\s*tees?\s*$/, "")
    .replace(/\s*\(w\)\s*$/, "")
    .trim();
}

function lookupColor(name: string): string | null {
  return COLOR_MAP[name] ?? null;
}

type TeeboxData = {
  order: number;
  name: string;
  color?: string;
  secondaryColor?: string;
  [key: string]: unknown;
};

type LayoutData = {
  teeboxes: TeeboxData[];
  hole_count: number;
};

async function main() {
  const BATCH_SIZE = 2000;

  const [{ count: totalCount }] = await sql`
    SELECT count(*)::int as count FROM courses WHERE layout_data IS NOT NULL
  `;
  console.log(`${totalCount} courses with layout_data, processing in batches of ${BATCH_SIZE}...\n`);

  let coursesUpdated = 0;
  let teeboxesMatched = 0;
  let teeboxesCombos = 0;
  let teeboxesSkipped = 0;
  let teeboxesAlreadyColored = 0;
  const unmatchedNames = new Map<string, number>();

  let offset = 0;
  while (offset < totalCount) {
    const rows = await sql`
      SELECT id, layout_data FROM courses
      WHERE layout_data IS NOT NULL
      ORDER BY id
      LIMIT ${BATCH_SIZE} OFFSET ${offset}
    `;
    if (rows.length === 0) break;
    console.log(`Batch ${Math.floor(offset / BATCH_SIZE) + 1}: ${rows.length} courses (offset ${offset})`);

  for (const row of rows) {
    let data: LayoutData;
    try {
      data = JSON.parse(row.layout_data);
    } catch {
      continue;
    }

    if (!data.teeboxes?.length) continue;

    let changed = false;

    for (const tb of data.teeboxes) {
      if (tb.color) {
        teeboxesAlreadyColored++;
        continue;
      }

      const normalized = normalizeName(tb.name || "");

      // Check for combo tee (e.g., "blue/white")
      if (normalized.includes("/")) {
        const parts = normalized.split("/").map((p) => p.trim());
        const primary = lookupColor(parts[0]);
        const secondary = parts[1] ? lookupColor(parts[1]) : null;

        if (primary) {
          tb.color = primary;
          if (secondary && secondary !== primary) {
            tb.secondaryColor = secondary;
          }
          teeboxesCombos++;
          changed = true;
          continue;
        }
      }

      // Direct match
      const color = lookupColor(normalized);
      if (color) {
        tb.color = color;
        teeboxesMatched++;
        changed = true;
      } else {
        teeboxesSkipped++;
        unmatchedNames.set(
          normalized,
          (unmatchedNames.get(normalized) || 0) + 1,
        );
      }
    }

    if (changed) {
      await sql`
        UPDATE courses
        SET layout_data = ${JSON.stringify(data)}, updated_at = now()
        WHERE id = ${row.id}
      `;
      coursesUpdated++;
    }
  }

    offset += BATCH_SIZE;
  }

  console.log("\n--- Summary ---");
  console.log(`Courses updated:      ${coursesUpdated}`);
  console.log(`Teeboxes matched:     ${teeboxesMatched}`);
  console.log(`Teeboxes combos:      ${teeboxesCombos}`);
  console.log(`Teeboxes skipped:     ${teeboxesSkipped}`);
  console.log(`Already had color:    ${teeboxesAlreadyColored}`);

  if (unmatchedNames.size > 0) {
    console.log(`\nTop 20 unmatched names:`);
    const sorted = [...unmatchedNames.entries()].sort((a, b) => b[1] - a[1]);
    sorted
      .slice(0, 20)
      .forEach(([name, count]) =>
        console.log(`  ${String(count).padStart(4)}  ${name}`),
      );
  }

  await sql.end();
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
