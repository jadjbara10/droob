/**
 * Quick seed - sample data for production testing
 * Run: npx tsx drizzle/quick-seed.ts
 */
import { db } from "../src/db/index.js";
import { stops, routes, governorates } from "./schema.js";
import { eq, sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Quick seeding sample data...");

  // Find Amman governorate
  const [gov] = await db.select().from(governorates).where(eq(governorates.code, "AM")).limit(1);
  if (!gov) {
    console.error("❌ Governorate 'AM' not found! Run seed-governorates.ts first.");
    process.exit(1);
  }
  console.log(`📍 Governorate: ${gov.name_ar}`);

  // Insert sample stops
  const stopsData = [
    { code: "AM-SMP-001", name_ar: "المحطة المركزية", name_en: "Central Station", lat: 31.9566, lng: 35.9457, governorate: "العاصمة", has_shelter: true },
    { code: "AM-SMP-002", name_ar: "محطة الرابية", name_en: "Al Rabia Station", lat: 31.9800, lng: 35.9200, governorate: "العاصمة", has_shelter: true },
    { code: "AM-SMP-003", name_ar: "محطة صويلح", name_en: "Sweileh Station", lat: 32.0300, lng: 35.8500, governorate: "العاصمة", has_shelter: true, is_terminal: true },
    { code: "AM-SMP-004", name_ar: "محطة الجامعة الأردنية", name_en: "University Station", lat: 31.9880, lng: 35.8720, governorate: "العاصمة" },
    { code: "AM-SMP-005", name_ar: "محطة عبدون", name_en: "Abdoun Station", lat: 31.9500, lng: 35.9000, governorate: "العاصمة", has_shelter: true },
  ];

  for (const s of stopsData) {
    const [existing] = await db.select({ id: stops.id }).from(stops).where(eq(stops.code, s.code)).limit(1);
    if (existing) {
      console.log(`   ⏭ ${s.name_ar} (exists)`);
      continue;
    }
    // No PostGIS on Railway — use lat/lng columns only, skip geom
    await db.insert(stops).values(s);
    console.log(`   🆕 ${s.name_ar}`);
  }

  // Insert a sample route
  const routeCode = "TEST-001";
  const [existingRoute] = await db.select({ id: routes.id }).from(routes).where(eq(routes.code, routeCode)).limit(1);
  if (!existingRoute) {
    await db.insert(routes).values({
      code: routeCode,
      name_ar: "خط تجريبي - المحطة المركزية إلى صويلح",
      name_en: "Test Route - Central to Sweileh",
      mode: "city_bus",
      color: "#3B82F6",
      base_fare: "0.350",
      is_active: true,
      path_geojson: {
        type: "LineString",
        coordinates: [[35.9457, 31.9566], [35.9200, 31.9800], [35.8500, 32.0300]]
      },
    });
    console.log("   🆕 Test route added");
  }

  const stopCount = await db.select({ count: sql<number>`count(*)` }).from(stops);
  console.log(`\n✅ Done! ${stopCount[0]?.count || 0} stops in database`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
