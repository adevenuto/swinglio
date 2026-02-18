import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!serviceRoleKey || serviceRoleKey === "your-service-role-key-here") {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY in .env before running this script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const COURSE_ID = 4736; // Billy Caldwell

type CsvScore = {
  id: number;
  golfer_id: number;
  score: number | null;
  course_name: string;
};

function parseCsv(filePath: string): CsvScore[] {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.trim().split("\n");
  return lines.slice(1).map((line) => {
    const parts = line.split(";").map((p) => p.replace(/^"|"$/g, "").trim());
    return {
      id: parseInt(parts[0], 10),
      golfer_id: parseInt(parts[1], 10),
      score: parts[2] ? parseInt(parts[2], 10) : null,
      course_name: parts[3],
    };
  });
}

async function main() {
  const csvPath = resolve(__dirname, "scores.csv");
  const rows = parseCsv(csvPath);
  console.log(`Parsed ${rows.length} scores from CSV\n`);

  // Fetch all profiles to map old_id → UUID
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, old_id");

  if (profileError) {
    console.error("Failed to fetch profiles:", profileError.message);
    process.exit(1);
  }

  const oldIdToUuid = new Map<number, string>();
  for (const p of profiles) {
    if (p.old_id != null) {
      oldIdToUuid.set(p.old_id, p.id);
    }
  }
  console.log(`Loaded ${oldIdToUuid.size} profile mappings (old_id → UUID)\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  // Batch insert in chunks of 500
  const BATCH_SIZE = 500;
  const toInsert: { golfer_id: string; score: number | null; course_id: number }[] = [];

  for (const row of rows) {
    const uuid = oldIdToUuid.get(row.golfer_id);
    if (!uuid) {
      console.log(`Score #${row.id} — SKIP (no profile for old_id=${row.golfer_id})`);
      skipped++;
      continue;
    }
    toInsert.push({
      golfer_id: uuid,
      score: row.score,
      course_id: COURSE_ID,
    });
  }

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("scores").insert(batch);
    if (error) {
      console.error(`Batch insert error (rows ${i}-${i + batch.length}):`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Scores inserted: ${inserted}`);
  console.log(`Skipped (no profile match): ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main();
