import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import postgres from "postgres";

const sql = postgres(process.env.DIRECT_URL!);

async function main() {
  // Read the CSV
  const csvPath = join(__dirname, "users.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n");

  // Skip header: "id";"first_name";"last_name";"email"
  const rows = lines.slice(1).map((line) => {
    const [, firstName, lastName, email] = line
      .split(";")
      .map((s) => s.replace(/"/g, "").trim());
    return { firstName, lastName, email };
  });

  console.log(`Found ${rows.length} users in CSV.`);

  let updated = 0;
  for (const row of rows) {
    if (!row.email || !row.firstName) continue;

    const result = await sql`
      UPDATE profiles
      SET first_name = ${row.firstName},
          last_name = ${row.lastName || null},
          updated_at = now()
      WHERE email = ${row.email}
        AND first_name IS NULL
    `;

    if (result.count > 0) {
      updated++;
    }
  }

  console.log(`Updated ${updated} profiles with names.`);

  // Also update the trigger to capture names from Google OAuth
  console.log("Updating handle_new_user trigger...");
  await sql`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    BEGIN
      INSERT INTO public.profiles (id, email, first_name, created_at, updated_at)
      VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        now(),
        now()
      )
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `;
  console.log("Trigger updated.");

  await sql.end();
  console.log("Done!");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
