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

type CsvUser = {
  old_id: number;
  first_name: string;
  last_name: string;
  email: string;
};

function parseCsv(filePath: string): CsvUser[] {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.trim().split("\n");
  // Skip header row
  return lines.slice(1).map((line) => {
    const parts = line.split(";").map((p) => p.replace(/^"|"$/g, "").trim());
    return {
      old_id: parseInt(parts[0], 10),
      first_name: parts[1],
      last_name: parts[2],
      email: parts[3],
    };
  });
}

function generateTempPassword(email: string): string {
  const local = email.split("@")[0];
  return `TempPass_${local}!2024`;
}

async function main() {
  const csvPath = resolve(__dirname, "users.csv");
  const users = parseCsv(csvPath);
  console.log(`Parsed ${users.length} users from CSV\n`);

  // Fetch all existing auth users upfront
  const { data: authData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error("Failed to list existing users:", listError.message);
    process.exit(1);
  }
  const existingByEmail = new Map(
    authData.users.map((u) => [u.email?.toLowerCase(), u.id])
  );

  let created = 0;
  let skippedExisting = 0;
  let skippedNoEmail = 0;
  let profilesInserted = 0;
  let errors = 0;

  for (const user of users) {
    const label = `[${user.old_id}] ${user.first_name} ${user.last_name}`;

    // Skip users with no email — can't create auth users
    if (!user.email) {
      console.log(`${label} — SKIP (no email)`);
      skippedNoEmail++;
      continue;
    }

    let supabaseUserId: string;
    const existing = existingByEmail.get(user.email.toLowerCase());

    if (existing) {
      // Auth user already exists — use their UUID
      console.log(`${label} — EXISTS (${user.email})`);
      supabaseUserId = existing;
      skippedExisting++;
    } else {
      // Create new auth user
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: generateTempPassword(user.email),
        email_confirm: true,
      });

      if (error) {
        console.error(`${label} — AUTH ERROR: ${error.message}`);
        errors++;
        continue;
      }

      supabaseUserId = data.user.id;
      console.log(`${label} — CREATED (${user.email})`);
      created++;
    }

    // Upsert profile row
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: supabaseUserId,
      old_id: user.old_id,
      first_name: user.first_name,
      last_name: user.last_name,
      role: "player",
      email: user.email,
    });

    if (profileError) {
      console.error(`${label} — PROFILE ERROR: ${profileError.message}`);
      errors++;
    } else {
      profilesInserted++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Auth users created:  ${created}`);
  console.log(`Auth users existing: ${skippedExisting}`);
  console.log(`Skipped (no email):  ${skippedNoEmail}`);
  console.log(`Profiles upserted:   ${profilesInserted}`);
  console.log(`Errors:              ${errors}`);
}

main();
