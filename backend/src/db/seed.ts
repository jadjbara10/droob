/**
 * دروب Droob — Jordan Transit Seed Data
 * Seeds: Governorates, Agencies, Stops, Routes, Schedules
 * Run: npx tsx src/db/seed.ts
 */

import { db } from "./index.js";
import { governorates, agencies, stops, routes, routeStops, schedules, vehicles } from "../../drizzle/schema.js";
import { v4 as uuid } from "uuid";

// ──── Governorates (12) ────
const governorateData = [
  { code: "AM", name_ar: "عمان", name_en: "Amman", centerLat: 31.9539, centerLng: 35.9106 },
  { code: "IR", name_ar: "إربد", name_en: "Irbid", centerLat: 32.5556, centerLng: 35.8500 },
  { code: "ZA", name_ar: "الزرقاء", name_en: "Zarqa", centerLat: 32.0836, centerLng: 36.1000 },
  { code: "BA", name_ar: "البلقاء", name_en: "Balqa", centerLat: 32.0371, centerLng: 35.7333 },
  { code: "MD", name_ar: "مادبا", name_en: "Madaba", centerLat: 31.7167, centerLng: 35.8000 },
  { code: "KA", name_ar: "الكرك", name_en: "Karak", centerLat: 31.1833, centerLng: 35.7000 },
  { code: "TA", name_ar: "الطفيلة", name_en: "Tafilah", centerLat: 30.8333, centerLng: 35.6000 },
  { code: "MA", name_ar: "معان", name_en: "Maan", centerLat: 30.2000, centerLng: 35.7333 },
  { code: "AQ", name_ar: "العقبة", name_en: "Aqaba", centerLat: 29.5319, centerLng: 35.0056 },
  { code: "JE", name_ar: "جرش", name_en: "Jerash", centerLat: 32.2806, centerLng: 35.8953 },
  { code: "AJ", name_ar: "عجلون", name_en: "Ajloun", centerLat: 32.3333, centerLng: 35.7500 },
  { code: "MF", name_ar: "المفرق", name_en: "Mafraq", centerLat: 32.3500, centerLng: 36.2000 },
];

// ──── Agencies ────
const agencyData = [
  { code: "GAM", mode: "city_bus", name_ar: "أمانة عمان الكبرى", name_en: "Greater Amman Municipality (GAM)" },
  { code: "JETT", mode: "intercity", name_ar: "شركة جت", name_en: "JETT Bus Company" },
  { code: "TRUST", mode: "intercity", name_ar: "شركة تراست الدولية", name_en: "Trust International Transport" },
  { code: "SERV", mode: "serveece", name_ar: "نقابة السرفيس", name_en: "Serveece Operators Union" },
  { code: "BRT", mode: "brt", name_ar: "الباص السريع - عمان", name_en: "Amman BRT" },
];

// ──── Landmark Stops (30+ major Jordan stops) ────
const landmarkStops = [
  { code: "AM-4TH", name_ar: "الرابع - الدوار الرابع", name_en: "4th Circle", lat: 31.9560, lng: 35.9050, governorate: "AM", type: "landmark", hasShelter: true, hasLighting: true, accessible: true },
  { code: "AM-BLD", name_ar: "وسط البلد - البلد", name_en: "Downtown - Al Balad", lat: 31.9515, lng: 35.9330, governorate: "AM", type: "landmark", hasShelter: true, hasLighting: true, accessible: false },
  { code: "AM-ABD", name_ar: "العبدلي - مجمع العبدلي", name_en: "Abdali Bus Terminal", lat: 31.9640, lng: 35.9120, governorate: "AM", type: "terminal", hasShelter: true, hasLighting: true, accessible: true },
  { code: "AM-WHD", name_ar: "الوحدات - مجمع الوحدات", name_en: "Wehdat Terminal", lat: 31.9350, lng: 35.9220, governorate: "AM", type: "terminal", hasShelter: true, hasLighting: true, accessible: true },
  { code: "AM-UOJ", name_ar: "الجامعة الأردنية", name_en: "University of Jordan", lat: 32.0140, lng: 35.8730, governorate: "AM", type: "landmark", hasShelter: true, hasLighting: true, accessible: true },
  { code: "AM-GRD", name_ar: "مجمع الجاردنز", name_en: "Gardens Terminal", lat: 31.9900, lng: 35.8850, governorate: "AM", type: "terminal", hasShelter: true, hasLighting: true, accessible: false },
  { code: "AM-MRK", name_ar: "مجمع ماركا", name_en: "Marka Terminal", lat: 31.9740, lng: 35.9850, governorate: "AM", type: "terminal", hasShelter: true, hasLighting: true, accessible: true },
  { code: "AM-SWL", name_ar: "الصويلح", name_en: "Sweileh", lat: 32.0330, lng: 35.8500, governorate: "AM", type: "terminal", hasShelter: true, hasLighting: true, accessible: true },
  { code: "AM-WSR", name_ar: "وادي السير", name_en: "Wadi Seer", lat: 31.9500, lng: 35.8180, governorate: "AM", type: "area", hasShelter: false, hasLighting: true, accessible: false },
  { code: "AM-RSF", name_ar: "الرصيفة", name_en: "Rusaifa", lat: 32.0170, lng: 36.0500, governorate: "ZA", type: "area", hasShelter: false, hasLighting: true, accessible: false },
  { code: "AM-AIR", name_ar: "مطار الملكة علياء الدولي", name_en: "Queen Alia Intl Airport", lat: 31.7220, lng: 35.9930, governorate: "AM", type: "airport", hasShelter: true, hasLighting: true, accessible: true },
  { code: "AM-DKH", name_ar: "دوار الداخلية", name_en: "Interior Ministry Circle", lat: 31.9750, lng: 35.8930, governorate: "AM", type: "landmark", hasShelter: true, hasLighting: true, accessible: true },
  { code: "AM-MHK", name_ar: "دوار المحكمة", name_en: "Court Circle", lat: 31.9600, lng: 35.9220, governorate: "AM", type: "landmark", hasShelter: false, hasLighting: true, accessible: false },
  { code: "AM-7TH", name_ar: "الدوار السابع", name_en: "7th Circle", lat: 31.9450, lng: 35.8880, governorate: "AM", type: "landmark", hasShelter: true, hasLighting: true, accessible: true },
  { code: "AM-1ST", name_ar: "الدوار الأول", name_en: "1st Circle", lat: 31.9560, lng: 35.9100, governorate: "AM", type: "landmark", hasShelter: false, hasLighting: true, accessible: false },
  { code: "AM-5TH", name_ar: "الدوار الخامس", name_en: "5th Circle", lat: 31.9500, lng: 35.8950, governorate: "AM", type: "landmark", hasShelter: true, hasLighting: true, accessible: true },
  { code: "AM-RAB", name_ar: "الرابية", name_en: "Rabia", lat: 31.9830, lng: 35.8950, governorate: "AM", type: "area", hasShelter: false, hasLighting: true, accessible: false },
  { code: "AM-HSH", name_ar: "الهاشمي", name_en: "Hashmi", lat: 31.9650, lng: 35.9550, governorate: "AM", type: "area", hasShelter: false, hasLighting: true, accessible: false },
  { code: "AM-HSN", name_ar: "الهاشمي الشمالي", name_en: "Hashmi Shamali", lat: 31.9730, lng: 35.9560, governorate: "AM", type: "area", hasShelter: false, hasLighting: true, accessible: false },
  { code: "AM-BSM", name_ar: "بسمان", name_en: "Basman", lat: 31.9550, lng: 35.9250, governorate: "AM", type: "area", hasShelter: false, hasLighting: true, accessible: false },
  { code: "AM-MHT", name_ar: "المحطة", name_en: "Mahatta", lat: 31.9400, lng: 35.9400, governorate: "AM", type: "area", hasShelter: true, hasLighting: true, accessible: true },
  { code: "AM-SHB", name_ar: "سحاب", name_en: "Sahab", lat: 31.8670, lng: 36.0000, governorate: "AM", type: "area", hasShelter: false, hasLighting: true, accessible: false },
  { code: "AM-MEC", name_ar: "شارع مكة", name_en: "Mecca Street", lat: 31.9400, lng: 35.8780, governorate: "AM", type: "landmark", hasShelter: true, hasLighting: true, accessible: true },
  { code: "AM-QDS", name_ar: "شارع القدس", name_en: "Al-Quds Street", lat: 31.9750, lng: 35.9000, governorate: "AM", type: "landmark", hasShelter: true, hasLighting: true, accessible: true },
  { code: "IR-CTR", name_ar: "وسط إربد", name_en: "Irbid City Center", lat: 32.5556, lng: 35.8500, governorate: "IR", type: "landmark", hasShelter: true, hasLighting: true, accessible: true },
  { code: "ZA-CTR", name_ar: "وسط الزرقاء", name_en: "Zarqa City Center", lat: 32.0836, lng: 36.1000, governorate: "ZA", type: "landmark", hasShelter: true, hasLighting: true, accessible: true },
  { code: "AQ-CTR", name_ar: "وسط العقبة", name_en: "Aqaba City Center", lat: 29.5319, lng: 35.0056, governorate: "AQ", type: "landmark", hasShelter: true, hasLighting: true, accessible: true },
  { code: "MD-CTR", name_ar: "وسط مادبا", name_en: "Madaba City Center", lat: 31.7167, lng: 35.8000, governorate: "MD", type: "landmark", hasShelter: false, hasLighting: true, accessible: false },
  { code: "KA-CTR", name_ar: "وسط الكرك", name_en: "Karak City Center", lat: 31.1833, lng: 35.7000, governorate: "KA", type: "landmark", hasShelter: false, hasLighting: true, accessible: false },
  { code: "JE-CTR", name_ar: "آثار جرش", name_en: "Jerash Ruins", lat: 32.2806, lng: 35.8953, governorate: "JE", type: "landmark", hasShelter: false, hasLighting: true, accessible: true },
  { code: "AJ-CTR", name_ar: "قلعة عجلون", name_en: "Ajloun Castle", lat: 32.3333, lng: 35.7500, governorate: "AJ", type: "landmark", hasShelter: false, hasLighting: false, accessible: false },
  { code: "MF-CTR", name_ar: "وسط المفرق", name_en: "Mafraq City Center", lat: 32.3500, lng: 36.2000, governorate: "MF", type: "landmark", hasShelter: false, hasLighting: true, accessible: false },
  { code: "BA-SLT", name_ar: "السلط", name_en: "Salt City Center", lat: 32.0371, lng: 35.7333, governorate: "BA", type: "landmark", hasShelter: true, hasLighting: true, accessible: true },
];

// ──── Routes (built after agencies inserted) ────
function buildRoutesData(gamId: string, brtId: string, servId: string, jettId: string, trustId: string) {
  return [
    // City Buses (GAM)
    { code: "1", name_ar: "البلد ↔ صويلح", name_en: "Downtown ↔ Sweileh", mode: "city_bus", color: "#0066CC", agencyId: gamId, frequency: 15, fare: 0.35 },
    { code: "2", name_ar: "الدوار السابع ↔ شارع مكة ↔ المطار", name_en: "7th Circle ↔ Mecca St ↔ Airport", mode: "city_bus", color: "#0066CC", agencyId: gamId, frequency: 20, fare: 0.45 },
    { code: "5", name_ar: "الرابية ↔ العبدلي ↔ الهاشمي", name_en: "Rabia ↔ Abdali ↔ Hashmi", mode: "city_bus", color: "#0066CC", agencyId: gamId, frequency: 15, fare: 0.35 },
    { code: "23", name_ar: "الزرقاء ↔ وسط البلد", name_en: "Zarqa ↔ Downtown Amman", mode: "city_bus", color: "#0066CC", agencyId: gamId, frequency: 20, fare: 0.45 },
    { code: "35", name_ar: "وادي السير ↔ الدوار الأول", name_en: "Wadi Seer ↔ 1st Circle", mode: "city_bus", color: "#0066CC", agencyId: gamId, frequency: 15, fare: 0.35 },

    // BRT Lines
    { code: "BRT1", name_ar: "الباص السريع 1: القدس ↔ صويلح", name_en: "BRT Line 1: Al-Quds ↔ Sweileh", mode: "brt", color: "#E60026", agencyId: brtId, frequency: 10, fare: 0.50 },
    { code: "BRT2", name_ar: "الباص السريع 2: المطار ↔ الدوار الخامس ↔ العبدلي", name_en: "BRT Line 2: Airport ↔ 5th Circle ↔ Abdali", mode: "brt", color: "#E60026", agencyId: brtId, frequency: 15, fare: 0.50 },

    // Serveece Routes
    { code: "SV1", name_ar: "سرفيس: العبدلي ↔ الزرقاء", name_en: "Serveece: Abdali ↔ Zarqa", mode: "serveece", color: "#FF8C00", agencyId: servId, frequency: 5, fare: 0.30 },
    { code: "SV2", name_ar: "سرفيس: وسط البلد ↔ الرصيفة", name_en: "Serveece: Downtown ↔ Rusaifa", mode: "serveece", color: "#FF8C00", agencyId: servId, frequency: 5, fare: 0.25 },
    { code: "SV3", name_ar: "سرفيس: الدوار السابع ↔ وادي السير", name_en: "Serveece: 7th Circle ↔ Wadi Seer", mode: "serveece", color: "#FF8C00", agencyId: servId, frequency: 5, fare: 0.20 },
    { code: "SV4", name_ar: "سرفيس: العبدلي ↔ صويلح ↔ الجامعة", name_en: "Serveece: Abdali ↔ Sweileh ↔ UJ", mode: "serveece", color: "#FF8C00", agencyId: servId, frequency: 5, fare: 0.25 },
    { code: "SV5", name_ar: "سرفيس: الوحدات ↔ ماركا ↔ طريق المطار", name_en: "Serveece: Wehdat ↔ Marka ↔ Airport Rd", mode: "serveece", color: "#FF8C00", agencyId: servId, frequency: 5, fare: 0.30 },
    { code: "SV6", name_ar: "سرفيس: وسط البلد ↔ سحاب", name_en: "Serveece: Downtown ↔ Sahab", mode: "serveece", color: "#FF8C00", agencyId: servId, frequency: 5, fare: 0.35 },
    { code: "SV7", name_ar: "سرفيس: المحطة ↔ بسمان ↔ الهاشمي الشمالي", name_en: "Serveece: Mahatta ↔ Basman ↔ Hashmi Shamali", mode: "serveece", color: "#FF8C00", agencyId: servId, frequency: 5, fare: 0.20 },

    // Inter-city Routes
    { code: "IC1", name_ar: "عمان ↔ إربد", name_en: "Amman ↔ Irbid", mode: "intercity", color: "#6B21A8", agencyId: jettId, frequency: 30, fare: 1.50 },
    { code: "IC2", name_ar: "عمان ↔ العقبة", name_en: "Amman ↔ Aqaba", mode: "intercity", color: "#6B21A8", agencyId: jettId, frequency: 60, fare: 3.00 },
    { code: "IC3", name_ar: "عمان ↔ الزرقاء", name_en: "Amman ↔ Zarqa", mode: "intercity", color: "#6B21A8", agencyId: trustId, frequency: 20, fare: 0.75 },
    { code: "IC4", name_ar: "عمان ↔ المفرق", name_en: "Amman ↔ Mafraq", mode: "intercity", color: "#6B21A8", agencyId: jettId, frequency: 45, fare: 1.00 },
    { code: "IC5", name_ar: "عمان ↔ الكرك", name_en: "Amman ↔ Karak", mode: "intercity", color: "#6B21A8", agencyId: jettId, frequency: 60, fare: 2.00 },
    { code: "IC6", name_ar: "عمان ↔ السلط", name_en: "Amman ↔ Salt", mode: "intercity", color: "#6B21A8", agencyId: trustId, frequency: 30, fare: 0.75 },
    { code: "IC7", name_ar: "عمان ↔ عجلون", name_en: "Amman ↔ Ajloun", mode: "intercity", color: "#6B21A8", agencyId: jettId, frequency: 60, fare: 1.50 },
    { code: "IC8", name_ar: "عمان ↔ جرش", name_en: "Amman ↔ Jerash", mode: "intercity", color: "#6B21A8", agencyId: jettId, frequency: 45, fare: 1.00 },
    { code: "IC9", name_ar: "عمان ↔ مادبا", name_en: "Amman ↔ Madaba", mode: "intercity", color: "#6B21A8", agencyId: trustId, frequency: 45, fare: 1.00 },
  ];
}

// ──── Seed Function ────
async function seed() {
  console.log("🌱 بدء زراعة بيانات دروب... (Seeding Droob Jordan data)");

  // Clear existing data (in order of dependencies)
  console.log("🗑️  Clearing existing data...");
  await db.delete(routeStops);
  await db.delete(schedules);
  await db.delete(vehicles);
  await db.delete(routes);
  await db.delete(stops);
  await db.delete(agencies);
  await db.delete(governorates);

  // 1. Insert Governorates
  console.log("📍 زراعة المحافظات... (Seeding governorates)");
  for (const g of governorateData) {
    await db.insert(governorates).values({
      code: g.code,
      name_ar: g.name_ar,
      name_en: g.name_en,
      center_lat: g.centerLat,
      center_lng: g.centerLng,
    });
  }

  // 2. Insert Agencies
  console.log("🏢 زراعة الوكالات... (Seeding agencies)");
  const agencyIds: { id: string; code: string }[] = [];
  for (const a of agencyData) {
    const [inserted] = await db.insert(agencies).values(a).returning({ id: agencies.id });
    agencyIds.push({ id: inserted.id, code: a.code });
  }
  const gamAgencyId = agencyIds.find(a => a.code === "GAM")!.id;
  const jettAgencyId = agencyIds.find(a => a.code === "JETT")!.id;
  const trustAgencyId = agencyIds.find(a => a.code === "TRUST")!.id;
  const serveeceAgencyId = agencyIds.find(a => a.code === "SERV")!.id;
  const brtAgencyId = agencyIds.find(a => a.code === "BRT")!.id;

  // Build governorate code → UUID lookup map
  const govMap: Record<string, string> = {};
  const allGovs = await db.query.governorates.findMany();
  for (const g of allGovs) {
    govMap[g.code] = g.id;
  }

  // 3. Insert Stops
  console.log("🚏 زراعة المحطات... (Seeding stops)");
  const stopIds: Record<string, string> = {};
  for (const s of landmarkStops) {
    const id = uuid();
    stopIds[s.code] = id;
    await db.insert(stops).values({
      code: s.code,
      name_ar: s.name_ar,
      name_en: s.name_en,
      lat: s.lat,
      lng: s.lng,
      governorate: s.governorate,
      governorate_id: govMap[s.governorate] ?? null,
      is_terminal: s.type === "terminal",
      is_landmark: s.type === "landmark" || s.type === "airport",
      has_shelter: s.hasShelter,
      has_lighting: s.hasLighting,
      has_accessibility: s.accessible,
    });
  }

  // 4. Insert Routes
  console.log("🛣️  زراعة الخطوط... (Seeding routes)");
  const routesData = buildRoutesData(gamAgencyId, brtAgencyId, serveeceAgencyId, jettAgencyId, trustAgencyId);
  const routeIds: Record<string, string> = {};
  for (const r of routesData) {
    const id = uuid();
    routeIds[r.code] = id;
    await db.insert(routes).values({
      code: r.code,
      name_ar: r.name_ar,
      name_en: r.name_en,
      mode: r.mode,
      color: r.color,
      agency_id: r.agencyId,
      headway_peak: r.frequency,
      base_fare: String(r.fare),
      is_active: true,
    });
  }

  // 5. Insert Route-Stop associations
  console.log("🔗 ربط الخطوط بالمحطات... (Linking routes to stops)");
  const routeStopMappings: Record<string, string[]> = {
    "1": ["AM-BLD", "AM-ABD", "AM-DKH", "AM-UOJ", "AM-SWL"],
    "2": ["AM-7TH", "AM-MEC", "AM-AIR"],
    "5": ["AM-RAB", "AM-ABD", "AM-HSH"],
    "23": ["ZA-CTR", "AM-RSF", "AM-BLD"],
    "35": ["AM-WSR", "AM-7TH", "AM-1ST"],
    "BRT1": ["AM-QDS", "AM-ABD", "AM-UOJ", "AM-SWL"],
    "BRT2": ["AM-AIR", "AM-5TH", "AM-ABD"],
    "SV1": ["AM-ABD", "ZA-CTR"],
    "SV2": ["AM-BLD", "AM-RSF"],
    "SV3": ["AM-7TH", "AM-WSR"],
    "SV4": ["AM-ABD", "AM-SWL", "AM-UOJ"],
    "SV5": ["AM-WHD", "AM-MRK", "AM-AIR"],
    "SV6": ["AM-BLD", "AM-SHB"],
    "SV7": ["AM-MHT", "AM-BSM", "AM-HSN"],
    "IC1": ["AM-ABD", "IR-CTR"],
    "IC2": ["AM-ABD", "AQ-CTR"],
    "IC3": ["AM-ABD", "ZA-CTR"],
    "IC4": ["AM-ABD", "MF-CTR"],
    "IC5": ["AM-ABD", "KA-CTR"],
    "IC6": ["AM-ABD", "BA-SLT"],
    "IC7": ["AM-ABD", "AJ-CTR"],
    "IC8": ["AM-ABD", "JE-CTR"],
    "IC9": ["AM-ABD", "MD-CTR"],
  };

  for (const [routeCode, stopCodes] of Object.entries(routeStopMappings)) {
    const routeId = routeIds[routeCode];
    if (!routeId) continue;
    for (let i = 0; i < stopCodes.length; i++) {
      const stopId = stopIds[stopCodes[i]];
      if (!stopId) continue;
      await db.insert(routeStops).values({
        route_id: routeId,
        stop_id: stopId,
        seq: i + 1,
      });
    }
  }

  console.log("✅ اكتملت زراعة البيانات!");
  console.log(`   📊 ${governorateData.length} محافظة (Governorates)`);
  console.log(`   🏢 ${agencyData.length} وكالة (Agencies)`);
  console.log(`   🚏 ${landmarkStops.length} محطة (Stops)`);
  console.log(`   🛣️  ${routesData.length} خط (Routes)`);
  console.log("\n🌍 دروب Droob ready for development!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});