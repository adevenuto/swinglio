import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DIRECT_URL!);

async function main() {
  console.log("Creating nearby_courses RPC function...");

  await sql`
    CREATE OR REPLACE FUNCTION nearby_courses(
      user_lat double precision,
      user_lng double precision,
      result_limit int DEFAULT 10
    )
    RETURNS TABLE (
      id bigint,
      name varchar,
      street varchar,
      state varchar,
      postal_code varchar,
      lat double precision,
      lng double precision,
      layout_data text,
      distance_miles double precision
    )
    LANGUAGE sql STABLE
    AS $$
      SELECT
        c.id, c.name, c.street, c.state, c.postal_code, c.lat, c.lng, c.layout_data,
        3959 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(user_lat)) * cos(radians(c.lat)) *
            cos(radians(c.lng) - radians(user_lng)) +
            sin(radians(user_lat)) * sin(radians(c.lat))
          ))
        ) AS distance_miles
      FROM courses c
      WHERE c.lat IS NOT NULL AND c.lng IS NOT NULL
      ORDER BY distance_miles
      LIMIT result_limit;
    $$
  `;

  console.log("Done! nearby_courses function created.");
  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
