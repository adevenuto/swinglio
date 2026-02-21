import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DIRECT_URL!);

async function main() {
  console.log("Setting up auto-profile creation trigger...");

  // 1. Create the trigger function
  await sql`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    BEGIN
      INSERT INTO public.profiles (id, email, created_at, updated_at)
      VALUES (NEW.id, NEW.email, now(), now())
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `;
  console.log("Created handle_new_user() function.");

  // 2. Create the trigger on auth.users
  await sql`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`;
  await sql`
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()
  `;
  console.log("Created on_auth_user_created trigger.");

  // 3. Backfill existing auth users missing profiles
  const before = await sql`SELECT count(*) AS cnt FROM profiles`;
  console.log(`Profiles before backfill: ${before[0].cnt}`);

  await sql`
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    SELECT id, email, now(), now()
    FROM auth.users
    WHERE id NOT IN (SELECT id FROM public.profiles)
    ON CONFLICT (id) DO NOTHING
  `;

  const after = await sql`SELECT count(*) AS cnt FROM profiles`;
  const created = Number(after[0].cnt) - Number(before[0].cnt);
  console.log(`Profiles after backfill: ${after[0].cnt} (${created} new)`);

  await sql.end();
  console.log("Done!");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
