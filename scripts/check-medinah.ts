import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DIRECT_URL!);

async function main() {
  const rows = await sql`SELECT id, name, api_course_id, enriched_at FROM courses WHERE name ILIKE '%medinah%' ORDER BY id`;
  console.table(rows);
  await sql.end();
}

main();
