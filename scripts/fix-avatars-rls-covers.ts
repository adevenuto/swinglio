import "dotenv/config";
import postgres from "postgres";

const directUrl = process.env.DIRECT_URL!;
if (!directUrl) {
  console.error("Set DIRECT_URL in .env before running this script.");
  process.exit(1);
}

const sql = postgres(directUrl);

async function main() {
  // Drop the old narrow policies
  const drops = [
    `DROP POLICY IF EXISTS "avatars_auth_insert" ON storage.objects`,
    `DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects`,
    `DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects`,
  ];

  for (const stmt of drops) {
    await sql.unsafe(stmt);
    console.log("OK:", stmt);
  }

  // Recreate with broader match: {uid}.jpg OR {uid}-cover.jpg
  const creates = [
    `CREATE POLICY "avatars_auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (name = (auth.uid()::text || '.jpg') OR name = (auth.uid()::text || '-cover.jpg')))`,
    `CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (name = (auth.uid()::text || '.jpg') OR name = (auth.uid()::text || '-cover.jpg')))`,
    `CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (name = (auth.uid()::text || '.jpg') OR name = (auth.uid()::text || '-cover.jpg')))`,
  ];

  for (const stmt of creates) {
    await sql.unsafe(stmt);
    console.log("OK:", stmt.slice(0, 60) + "...");
  }

  await sql.end();
  console.log("Done — RLS policies updated for cover photo support.");
}

main();
