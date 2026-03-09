import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DIRECT_URL!);

async function main() {
  console.log("Creating delete_user_account RPC function...");

  await sql`
    CREATE OR REPLACE FUNCTION delete_user_account()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      uid uuid := auth.uid();
    BEGIN
      -- Delete scores for this user
      DELETE FROM scores WHERE golfer_id = uid;

      -- Delete friend relationships
      DELETE FROM friends WHERE requester_id = uid OR recipient_id = uid;

      -- Delete rounds created by this user that have no other players' scores
      DELETE FROM rounds
      WHERE creator_id = uid
        AND NOT EXISTS (
          SELECT 1 FROM scores s WHERE s.round_id = rounds.id AND s.golfer_id != uid
        );

      -- Delete profile
      DELETE FROM profiles WHERE id = uid;

      -- Delete auth user
      DELETE FROM auth.users WHERE id = uid;
    END;
    $$
  `;

  console.log("Done! delete_user_account function created.");
  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
