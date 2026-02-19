import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!serviceRoleKey || serviceRoleKey === "your-service-role-key-here") {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY in .env before running this script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function generatePassword(email: string): string {
  const local = email.split("@")[0];
  return `${local}@1234`;
}

async function main() {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (error) {
    console.error("Failed to list users:", error.message);
    process.exit(1);
  }

  const users = data.users;
  console.log(`Found ${users.length} auth users\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    if (!user.email) {
      console.log(`${user.id} — SKIP (no email)`);
      skipped++;
      continue;
    }

    const newPassword = generatePassword(user.email);
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error(`${user.email} — ERROR: ${updateError.message}`);
      errors++;
    } else {
      console.log(`${user.email} — updated`);
      updated++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Errors:   ${errors}`);
}

main();
