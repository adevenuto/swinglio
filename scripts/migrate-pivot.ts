import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DIRECT_URL!);

async function main() {
  console.log("Starting pivot migration...");

  // 1. Drop league_users table (depends on leagues)
  console.log("Dropping league_users table...");
  await sql`DROP TABLE IF EXISTS league_users CASCADE`;

  // 2. Drop leagues table
  console.log("Dropping leagues table...");
  await sql`DROP TABLE IF EXISTS leagues CASCADE`;

  // 3. Truncate rounds and scores (old data references leagues)
  console.log("Truncating scores and rounds...");
  await sql`TRUNCATE TABLE scores CASCADE`;
  await sql`TRUNCATE TABLE rounds CASCADE`;

  // 4. Modify rounds: drop league_id, add creator_id + teebox_data
  console.log("Updating rounds table...");
  // Drop league_id column if it exists
  await sql`ALTER TABLE rounds DROP COLUMN IF EXISTS league_id`;
  // Add creator_id
  await sql`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS creator_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES profiles(id)`;
  // Remove the default after adding (it was just to allow NOT NULL on existing rows)
  await sql`ALTER TABLE rounds ALTER COLUMN creator_id DROP DEFAULT`;
  // Add teebox_data
  await sql`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS teebox_data jsonb NOT NULL DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE rounds ALTER COLUMN teebox_data DROP DEFAULT`;

  // 5. Drop role column from profiles
  console.log("Dropping role column from profiles...");
  await sql`ALTER TABLE profiles DROP COLUMN IF EXISTS role`;

  // 6. Create friends table
  console.log("Creating friends table...");
  await sql`
    CREATE TABLE IF NOT EXISTS friends (
      id bigserial PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES profiles(id),
      friend_id uuid NOT NULL REFERENCES profiles(id),
      created_at timestamptz DEFAULT now()
    )
  `;

  // 7. Truncate profiles (keep only the user's own profile)
  // Get the user's ID first (the one with the actual avatar/data)
  const users = await sql`SELECT id, email FROM profiles WHERE avatar_url IS NOT NULL`;
  if (users.length > 0) {
    const keepIds = users.map((u) => u.id);
    console.log(`Keeping ${keepIds.length} profile(s) with avatars, deleting the rest...`);
    await sql`DELETE FROM profiles WHERE id != ALL(${keepIds})`;
  } else {
    console.log("No profiles with avatars found. Skipping profile cleanup.");
  }

  await sql.end();
  console.log("Done! Pivot migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
