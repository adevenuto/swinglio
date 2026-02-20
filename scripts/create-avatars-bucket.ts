import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const directUrl = process.env.DIRECT_URL!;

if (!serviceRoleKey || serviceRoleKey === "your-service-role-key-here") {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY in .env before running this script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sql = postgres(directUrl);

async function main() {
  // Create the avatars bucket (public so URLs are accessible)
  const { data, error } = await supabase.storage.createBucket("avatars", {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  if (error) {
    if (error.message?.includes("already exists")) {
      console.log("Avatars bucket already exists.");
    } else {
      console.error("Failed to create bucket:", error.message);
      process.exit(1);
    }
  } else {
    console.log("Created avatars bucket:", data);
  }

  // Create RLS policies via direct SQL
  const policies = [
    `CREATE POLICY "avatars_public_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars')`,
    `CREATE POLICY "avatars_auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND name = (auth.uid()::text || '.jpg'))`,
    `CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND name = (auth.uid()::text || '.jpg'))`,
    `CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND name = (auth.uid()::text || '.jpg'))`,
  ];

  for (const policy of policies) {
    try {
      await sql.unsafe(policy);
      console.log("OK:", policy.slice(0, 60) + "...");
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log("Already exists:", policy.slice(0, 60) + "...");
      } else {
        console.error("Failed:", e.message);
      }
    }
  }

  await sql.end();
  console.log("Done.");
}

main();
