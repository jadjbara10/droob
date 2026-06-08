/**
 * Seed ALL 12 Jordan Governorates + Terminals
 * Run: npx tsx drizzle/seed-governorates.ts
 *
 * This seeds the foundational data: governorates, agencies, and terminals.
 * After running this, run seed-unified.ts for Amman routes/stops.
 * Then run seed-terminals.ts for terminal stops in all governorates.
 */

import { db } from "../src/db/index.js";
import { governorates, agencies } from "./schema.js";
import { eq } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════
// ALL 12 JORDAN GOVERNORATES
// ═══════════════════════════════════════════════════════════
const allGovernorates = [
  { name_ar: "العاصمة", name_en: "Amman", code: "AM", center_lat: 31.9566, center_lng: 35.9457 },
  { name_ar: "اربد", name_en: "Irbid", code: "IR", center_lat: 32.5556, center_lng: 35.8500 },
  { name_ar: "الزرقاء", name_en: "Zarqa", code: "ZA", center_lat: 32.0833, center_lng: 36.1000 },
  { name_ar: "البلقاء", name_en: "Balqa", code: "BA", center_lat: 32.0333, center_lng: 35.7333 },
  { name_ar: "المفرق", name_en: "Mafraq", code: "MA", center_lat: 32.3500, center_lng: 36.2000 },
  { name_ar: "جرش", name_en: "Jerash", code: "JA", center_lat: 32.2833, center_lng: 35.9000 },
  { name_ar: "عجلون", name_en: "Ajloun", code: "AJ", center_lat: 32.3333, center_lng: 35.7500 },
  { name_ar: "مادبا", name_en: "Madaba", code: "MD", center_lat: 31.7167, center_lng: 35.8000 },
  { name_ar: "الكرك", name_en: "Karak", code: "KA", center_lat: 31.1833, center_lng: 35.7000 },
  { name_ar: "الطفيلة", name_en: "Tafilah", code: "TA", center_lat: 30.8333, center_lng: 35.6000 },
  { name_ar: "معان", name_en: "Maan", code: "MN", center_lat: 30.2000, center_lng: 35.7333 },
  { name_ar: "العقبة", name_en: "Aqaba", code: "AQ", center_lat: 29.5319, center_lng: 35.0056 },
];

// ═══════════════════════════════════════════════════════════
// AGENCIES (المشغلون)
// ═══════════════════════════════════════════════════════════
const allAgencies = [
  { name_ar: "أمانة عمان الكبرى", name_en: "GAM", code: "GAM", mode: "city_bus", phone: "+962-6-4603500", website: "https://www.ammancity.gov.jo" },
  { name_ar: "الباص السريع", name_en: "BRT", code: "BRT", mode: "brt", phone: "", website: "https://www.ammancity.gov.jo" },
  { name_ar: "سرفيس", name_en: "Serveece", code: "SERV", mode: "serveece", phone: "", website: "" },
  { name_ar: "كوستر", name_en: "Coaster", code: "COAST", mode: "coaster", phone: "", website: "" },
  { name_ar: "JETT", name_en: "JETT", code: "JETT", mode: "intercity", phone: "+962-6-5665145", website: "https://www.jett.com.jo" },
  { name_ar: "شركة الرؤية", name_en: "Al Roya", code: "ROYA", mode: "intercity", phone: "", website: "" },
  { name_ar: "الناقل الوطني", name_en: "National Carrier", code: "NAT", mode: "intercity", phone: "", website: "" },
];

async function seed() {
  console.log("🚌 Seeding Droob — All 12 Governorates + Agencies\n");

  // ── Governorates ──
  console.log("📌 Governorates:");
  for (const g of allGovernorates) {
    const [existing] = await db.select({ id: governorates.id }).from(governorates).where(eq(governorates.code, g.code)).limit(1);
    if (existing) {
      console.log(`   ✅ ${g.name_ar} (${g.code}) — already exists`);
    } else {
      await db.insert(governorates).values(g);
      console.log(`   🆕 ${g.name_ar} (${g.code}) — added`);
    }
  }

  // ── Agencies ──
  console.log("\n🏢 Agencies:");
  for (const a of allAgencies) {
    const [existing] = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.code, a.code)).limit(1);
    if (existing) {
      console.log(`   ✅ ${a.name_ar} (${a.code}) — already exists`);
    } else {
      await db.insert(agencies).values(a);
      console.log(`   🆕 ${a.name_ar} (${a.code}) — added`);
    }
  }

  console.log("\n✅ Governorates & Agencies seeded successfully!");
  console.log("   Next: npx tsx drizzle/seed-unified.ts (routes & stops)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
