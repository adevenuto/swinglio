import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DIRECT_URL!);

async function main() {
  const [{ count }] = await sql`SELECT count(*)::int as count FROM courses WHERE enriched_at IS NULL AND id < 5001`;
  console.log(`Unenriched courses before Medinah (id < 5001): ${count}`);
  await sql.end();
}

main();
