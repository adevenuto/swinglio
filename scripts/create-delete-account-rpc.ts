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
      -- 1. Nullify attestations made by this user (preserves other players' attestation %)
      UPDATE attestations SET attester_id = NULL WHERE attester_id = uid;

      -- 2. Delete scores for this user
      DELETE FROM scores WHERE golfer_id = uid;

      -- 3. Delete friend relationships
      DELETE FROM friends WHERE requester_id = uid OR recipient_id = uid;

      -- 4. Nullify course image attribution
      UPDATE course_images SET uploaded_by = NULL WHERE uploaded_by = uid;

      -- 5. Transfer ownership of multi-player rounds to another participant
      UPDATE rounds
      SET creator_id = (
        SELECT s.golfer_id FROM scores s
        WHERE s.round_id = rounds.id
        LIMIT 1
      )
      WHERE creator_id = uid
        AND EXISTS (
          SELECT 1 FROM scores s WHERE s.round_id = rounds.id
        );

      -- 6. Delete attestations for orphan rounds about to be removed
      DELETE FROM attestations
      WHERE round_id IN (
        SELECT id FROM rounds WHERE creator_id = uid
      );

      -- 7. Delete orphan rounds (creator's rounds with no remaining scores)
      DELETE FROM rounds WHERE creator_id = uid;

      -- 8. Delete profile
      DELETE FROM profiles WHERE id = uid;

      -- 9. Delete auth user
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
