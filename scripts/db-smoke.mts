/**
 * Smoke test: migrate metadata check, read tables, optional write/delete test order.
 * Usage (with .env configured): pnpm exec tsx scripts/db-smoke.mts
 */
import "dotenv/config";
import postgres from "postgres";
import { createOrder } from "../server/db.ts";

const connectionString = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Configure DATABASE_URL or NEON_DATABASE_URL in .env");
  process.exit(1);
}

const isNeon = connectionString.includes("neon.tech");
const sql = postgres(connectionString, {
  max: 1,
  ssl: isNeon ? "require" : undefined,
  prepare: false,
  connect_timeout: 15,
});

async function main() {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('orders', 'users', 's3_files')
    ORDER BY table_name
  `;
  console.log(
    "Tables present:",
    tables.map((row) => row.table_name).join(", ") || "(none — run pnpm db:migrate)",
  );

  const counts = await sql`
    SELECT
      (SELECT count(*)::int FROM orders) AS orders,
      (SELECT count(*)::int FROM users) AS users,
      (SELECT count(*)::int FROM s3_files) AS s3_files
  `;
  console.log("Row counts:", counts[0]);

  const testOrder = await createOrder({
    name: "__smoke_test__",
    eventType: "Teste automatizado",
    guests: "1",
    category: "Smoke",
    details: "Registro temporário — pode apagar",
    desiredDate: null,
  });
  console.log("Created test order id:", testOrder.id);

  await sql`DELETE FROM orders WHERE id = ${testOrder.id}`;
  console.log("Deleted test order id:", testOrder.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
