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

async function main() {
  // Fetch all leagues with their owner_id
  const { data: leagues, error: leaguesErr } = await supabase
    .from("leagues")
    .select("id, owner_id");

  if (leaguesErr) {
    console.error("Failed to fetch leagues:", leaguesErr.message);
    process.exit(1);
  }

  if (!leagues || leagues.length === 0) {
    console.log("No leagues found. Nothing to migrate.");
    return;
  }

  let updated = 0;
  let errors = 0;

  for (const league of leagues) {
    const { error } = await supabase
      .from("league_users")
      .update({ role: "coordinator" })
      .eq("league_id", league.id)
      .eq("golfer_id", league.owner_id);

    if (error) {
      console.error(`League ${league.id} — ERROR: ${error.message}`);
      errors++;
    } else {
      console.log(`League ${league.id} — owner ${league.owner_id} set to coordinator`);
      updated++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Leagues processed: ${leagues.length}`);
  console.log(`Owner rows updated: ${updated}`);
  console.log(`Errors: ${errors}`);
}

main();
