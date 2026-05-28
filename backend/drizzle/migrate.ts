/**
 * دروب Database Migration Runner
 * Usage: npm run db:migrate
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is required. Check your .env file.");
    process.exit(1);
  }

  console.log("🔄 بدء ترحيل قاعدة البيانات...");

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  await migrate(db, {
    migrationsFolder: "./drizzle/migrations",
  });

  console.log("✅ تم ترحيل قاعدة البيانات بنجاح");
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ فشل الترحيل:", err);
  process.exit(1);
});