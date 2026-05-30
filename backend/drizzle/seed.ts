/**
 * دروب — Seed Data Script
 * Seeds all Jordan transit data: governorates, agencies, stops, routes, schedules
 * Usage: npx tsx drizzle/seed.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import { eq } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is required in .env file");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(sql, { schema });

// ─── Helpers ───
function stableUUID(seed: string): string {
  // Simple deterministic UUID from seed string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(32, "0").slice(0, 32);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

// ═══════════════════════════════════════════════════════════════
// Governorates (المحافظات)
// ═══════════════════════════════════════════════════════════════
const governoratesData = [
  { name_ar: "عمان", name_en: "Amman", code: "AM", center_lat: 31.9539, center_lng: 35.9106 },
  { name_ar: "إربد", name_en: "Irbid", code: "IR", center_lat: 32.5556, center_lng: 35.8500 },
  { name_ar: "الزرقاء", name_en: "Zarqa", code: "ZA", center_lat: 32.0833, center_lng: 36.1000 },
  { name_ar: "البلقاء", name_en: "Balqa", code: "BA", center_lat: 32.0333, center_lng: 35.7333 },
  { name_ar: "مادبا", name_en: "Madaba", code: "MD", center_lat: 31.7167, center_lng: 35.8000 },
  { name_ar: "الكرك", name_en: "Karak", code: "KA", center_lat: 31.1833, center_lng: 35.7000 },
  { name_ar: "الطفيلة", name_en: "Tafilah", code: "TA", center_lat: 30.8333, center_lng: 35.6000 },
  { name_ar: "معان", name_en: "Maan", code: "MN", center_lat: 30.2000, center_lng: 35.7333 },
  { name_ar: "العقبة", name_en: "Aqaba", code: "AQ", center_lat: 29.5319, center_lng: 35.0056 },
  { name_ar: "جرش", name_en: "Jerash", code: "JE", center_lat: 32.2833, center_lng: 35.9000 },
  { name_ar: "عجلون", name_en: "Ajloun", code: "AJ", center_lat: 32.3333, center_lng: 35.7500 },
  { name_ar: "المفرق", name_en: "Mafraq", code: "MF", center_lat: 32.3500, center_lng: 36.2000 },
];

// ═══════════════════════════════════════════════════════════════
// Agencies (المشغلون)
// ═══════════════════════════════════════════════════════════════
const agenciesData = [
  { name_ar: "أمانة عمان الكبرى", name_en: "Greater Amman Municipality (GAM)", code: "GAM", mode: "city_bus", phone: "+962-6-460-3030", website: "https://www.ammancity.gov.jo", governorate_code: "AM" },
  { name_ar: "الباص السريع - أمانة عمان", name_en: "Amman BRT Division", code: "BRT-GAM", mode: "brt", phone: "+962-6-460-3030", website: "https://www.ammancity.gov.jo", governorate_code: "AM" },
  { name_ar: "جت", name_en: "JETT", code: "JETT", mode: "intercity", phone: "+962-6-585-4679", website: "https://www.jett.com.jo", governorate_code: "AM" },
  { name_ar: "ترست إنترناشيونال", name_en: "Trust International Transport", code: "TRUST", mode: "intercity", phone: "+962-6-581-2222", website: "https://www.trusttransport.com", governorate_code: "AM" },
  { name_ar: "سرفيس - مشغلون أفراد", name_en: "Serveece Private Operators", code: "SERV-PVT", mode: "serveece", phone: null, website: null, governorate_code: "AM" },
  { name_ar: "نقابة أصحاب الحافلات", name_en: "Bus Owners Syndicate", code: "BOS", mode: "intercity", phone: "+962-6-566-1234", website: null, governorate_code: "AM" },
];

// ═══════════════════════════════════════════════════════════════
// Landmark Stops (المحطات الرئيسية)
// ═══════════════════════════════════════════════════════════════
const landmarkStops = [
  { code: "LM-01", name_ar: "دوار الرابع", name_en: "4th Circle", lat: 31.9679, lng: 35.8722, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-02", name_ar: "وسط البلد / البلد", name_en: "Downtown Amman (Al-Balad)", lat: 31.9515, lng: 35.9300, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "TM-01", name_ar: "مجمع العبدلي", name_en: "Abdali Bus Terminal", lat: 31.9667, lng: 35.9167, gov: "عمان", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true, has_accessibility: true },
  { code: "TM-02", name_ar: "مجمع الوحدات", name_en: "Wahdat Terminal", lat: 31.9333, lng: 35.9167, gov: "عمان", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-03", name_ar: "الجامعة الأردنية", name_en: "University of Jordan", lat: 32.0167, lng: 35.8667, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-04", name_ar: "مجمع الجاردنز", name_en: "Gardens", lat: 31.9833, lng: 35.8500, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-05", name_ar: "مجمع ماركا", name_en: "Marka", lat: 31.9833, lng: 35.9833, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-06", name_ar: "دوار الداخلية", name_en: "Interior Ministry Circle", lat: 31.9667, lng: 35.8833, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-07", name_ar: "دوار المحكمة", name_en: "Court Circle", lat: 31.9500, lng: 35.9000, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "TM-03", name_ar: "مجمع الصويلح", name_en: "Sweileh Terminal", lat: 32.0333, lng: 35.8333, gov: "عمان", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-08", name_ar: "وادي السير", name_en: "Wadi Seer", lat: 31.9333, lng: 35.8167, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-09", name_ar: "الرصيفة", name_en: "Rusaifa", lat: 32.0167, lng: 36.0500, gov: "الزرقاء", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "TM-04", name_ar: "مطار الملكة علياء الدولي", name_en: "Queen Alia International Airport", lat: 31.7225, lng: 35.9933, gov: "عمان", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true, has_accessibility: true, has_ac: true },
  { code: "LM-10", name_ar: "دوار السابع", name_en: "7th Circle", lat: 31.9500, lng: 35.8500, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-11", name_ar: "دوار الخامس", name_en: "5th Circle", lat: 31.9667, lng: 35.8600, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-12", name_ar: "دوار الأول", name_en: "1st Circle", lat: 31.9583, lng: 35.8833, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-13", name_ar: "شارع مكة", name_en: "Mecca Street", lat: 31.9667, lng: 35.8833, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-14", name_ar: "شارع الرينبو", name_en: "Rainbow Street", lat: 31.9500, lng: 35.9333, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-15", name_ar: "شارع الجاردنز", name_en: "Gardens Street", lat: 31.9833, lng: 35.8533, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-16", name_ar: "طريق المطار", name_en: "Airport Road", lat: 31.9000, lng: 35.9500, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-17", name_ar: "الرابعة", name_en: "Rabia", lat: 31.9917, lng: 35.8833, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-18", name_ar: "الهاشمي الشمالي", name_en: "Hashmi Shamali", lat: 31.9667, lng: 35.9500, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-19", name_ar: "طبربور", name_en: "Tabarbour", lat: 32.0000, lng: 35.9167, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-20", name_ar: "سحاب", name_en: "Sahab", lat: 31.8667, lng: 36.0000, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-21", name_ar: "المهاجرين", name_en: "Muhajereen", lat: 31.9583, lng: 35.9333, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "TM-05", name_ar: "محطة الزرقاء", name_en: "Zarqa Station", lat: 32.0833, lng: 36.1000, gov: "الزرقاء", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-22", name_ar: "إربد - وسط المدينة", name_en: "Irbid City Center", lat: 32.5556, lng: 35.8500, gov: "إربد", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-23", name_ar: "العقبة - وسط المدينة", name_en: "Aqaba City Center", lat: 29.5319, lng: 35.0056, gov: "العقبة", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-24", name_ar: "السلط", name_en: "Salt", lat: 32.0333, lng: 35.7333, gov: "البلقاء", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-25", name_ar: "مادبا", name_en: "Madaba", lat: 31.7167, lng: 35.8000, gov: "مادبا", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-26", name_ar: "الكرك", name_en: "Karak", lat: 31.1833, lng: 35.7000, gov: "الكرك", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-27", name_ar: "جرش", name_en: "Jerash", lat: 32.2833, lng: 35.9000, gov: "جرش", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-28", name_ar: "عجلون", name_en: "Ajloun", lat: 32.3333, lng: 35.7500, gov: "عجلون", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-29", name_ar: "المفرق", name_en: "Mafraq", lat: 32.3500, lng: 36.2000, gov: "المفرق", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-30", name_ar: "البتراء / وادي موسى", name_en: "Petra / Wadi Musa", lat: 30.3222, lng: 35.4517, gov: "معان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "BRT-01", name_ar: "محطة الباص السريع - الصويلح", name_en: "BRT Station - Sweileh", lat: 32.0333, lng: 35.8333, gov: "عمان", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true, has_accessibility: true, has_ticket_machine: true, has_ac: true },
  { code: "BRT-02", name_ar: "محطة الباص السريع - القدس", name_en: "BRT Station - Al-Quds", lat: 32.0000, lng: 35.9167, gov: "عمان", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true, has_accessibility: true, has_ticket_machine: true, has_ac: true },
  { code: "BRT-03", name_ar: "محطة الباص السريع - العبدلي", name_en: "BRT Station - Abdali", lat: 31.9667, lng: 35.9167, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true, has_accessibility: true, has_ticket_machine: true, has_ac: true },
];

// ═══════════════════════════════════════════════════════════════
// Routes (الخطوط)
// ═══════════════════════════════════════════════════════════════
// See route IDs from landmark stops above: 
// TM-01=Abdali, TM-02=Wahdat, TM-03=Sweileh, TM-04=Airport, TM-05=Zarqa
const routesData = [
  // City Buses (city_bus) — Blue #0066CC
  { code: "1", name_ar: "البل د ↔ صويلح", name_en: "Downtown ↔ Sweileh", mode: "city_bus", color: "#0066CC", origin_code: "LM-02", dest_code: "TM-03", base_fare: "0.350", headway_peak: 10, headway_offpeak: 20, first_dep: "05:30", last_dep: "23:00" },
  { code: "2", name_ar: "السابع ↔ المطار", name_en: "7th Circle ↔ Airport", mode: "city_bus", color: "#0066CC", origin_code: "LM-10", dest_code: "TM-04", base_fare: "0.500", headway_peak: 15, headway_offpeak: 30, first_dep: "05:30", last_dep: "23:00" },
  { code: "5", name_ar: "الرابية ↔ العبدلي ↔ الهاشمي", name_en: "Rabia ↔ Abdali ↔ Hashmi", mode: "city_bus", color: "#0066CC", origin_code: "LM-17", dest_code: "LM-18", base_fare: "0.350", headway_peak: 12, headway_offpeak: 20, first_dep: "05:30", last_dep: "23:00" },
  { code: "23", name_ar: "الزرقاء ↔ وسط البلد", name_en: "Zarqa ↔ Amman Downtown", mode: "city_bus", color: "#0066CC", origin_code: "TM-05", dest_code: "LM-02", base_fare: "0.450", headway_peak: 15, headway_offpeak: 25, first_dep: "05:30", last_dep: "22:00" },
  { code: "35", name_ar: "وادي السير ↔ الدوار الأول", name_en: "Wadi Seer ↔ 1st Circle", mode: "city_bus", color: "#0066CC", origin_code: "LM-08", dest_code: "LM-12", base_fare: "0.350", headway_peak: 15, headway_offpeak: 25, first_dep: "06:00", last_dep: "22:30" },
  // BRT (brt) — Red #E60026
  { code: "BRT1", name_ar: "الباص السريع - القدس ↔ صويلح", name_en: "BRT Line 1 - Al-Quds ↔ Sweileh", mode: "brt", color: "#E60026", origin_code: "BRT-02", dest_code: "BRT-01", base_fare: "0.500", headway_peak: 10, headway_offpeak: 15, first_dep: "05:30", last_dep: "23:00" },
  { code: "BRT2", name_ar: "الباص السريع - المطار ↔ العبدلي", name_en: "BRT Line 2 - Airport ↔ Abdali", mode: "brt", color: "#E60026", origin_code: "TM-04", dest_code: "TM-01", base_fare: "0.550", headway_peak: 15, headway_offpeak: 20, first_dep: "06:00", last_dep: "22:00" },
  // Serveece (serveece) — Amber #FF8C00
  { code: "S01", name_ar: "سرفيس - العبدلي ↔ الزرقاء", name_en: "Serveece - Abdali ↔ Zarqa", mode: "serveece", color: "#FF8C00", origin_code: "TM-01", dest_code: "TM-05", base_fare: "0.300", fare_min: "0.200", fare_max: "0.400", headway_peak: 3, headway_offpeak: 8, first_dep: "06:00", last_dep: "22:00" },
  { code: "S02", name_ar: "سرفيس - وسط البلد ↔ الرصيفة", name_en: "Serveece - Downtown ↔ Rusaifa", mode: "serveece", color: "#FF8C00", origin_code: "LM-02", dest_code: "LM-09", base_fare: "0.250", fare_min: "0.200", fare_max: "0.350", headway_peak: 5, headway_offpeak: 10, first_dep: "06:00", last_dep: "22:00" },
  { code: "S03", name_ar: "سرفيس - السابع ↔ وادي السير", name_en: "Serveece - 7th Circle ↔ Wadi Seer", mode: "serveece", color: "#FF8C00", origin_code: "LM-10", dest_code: "LM-08", base_fare: "0.200", fare_min: "0.200", fare_max: "0.350", headway_peak: 5, headway_offpeak: 10, first_dep: "06:00", last_dep: "22:00" },
  { code: "S04", name_ar: "سرفيس - العبدلي ↔ صويلح ↔ الجامعة", name_en: "Serveece - Abdali ↔ Sweileh ↔ UJ", mode: "serveece", color: "#FF8C00", origin_code: "TM-01", dest_code: "LM-03", base_fare: "0.300", fare_min: "0.200", fare_max: "0.400", headway_peak: 5, headway_offpeak: 8, first_dep: "06:00", last_dep: "22:00" },
  { code: "S05", name_ar: "سرفيس - الوحدات ↔ ماركا ↔ طريق المطار", name_en: "Serveece - Wehdat ↔ Marka ↔ Airport Rd", mode: "serveece", color: "#FF8C00", origin_code: "TM-02", dest_code: "LM-16", base_fare: "0.300", fare_min: "0.200", fare_max: "0.400", headway_peak: 5, headway_offpeak: 10, first_dep: "06:00", last_dep: "21:00" },
  { code: "S06", name_ar: "سرفيس - وسط البلد ↔ سحاب", name_en: "Serveece - Downtown ↔ Sahab", mode: "serveece", color: "#FF8C00", origin_code: "LM-02", dest_code: "LM-20", base_fare: "0.300", fare_min: "0.250", fare_max: "0.450", headway_peak: 8, headway_offpeak: 15, first_dep: "06:00", last_dep: "21:00" },
  { code: "S07", name_ar: "سرفيس - المهاجرين ↔ الهاشمي الشمالي", name_en: "Serveece - Muhajereen ↔ Hashmi Shamali", mode: "serveece", color: "#FF8C00", origin_code: "LM-21", dest_code: "LM-18", base_fare: "0.200", fare_min: "0.200", fare_max: "0.300", headway_peak: 5, headway_offpeak: 8, first_dep: "06:00", last_dep: "22:00" },
  // Inter-city (intercity) — Purple #6B21A8
  { code: "IR-AM-IR", name_ar: "عمان ↔ إربد", name_en: "Amman ↔ Irbid", mode: "intercity", color: "#6B21A8", origin_code: "TM-01", dest_code: "LM-22", base_fare: "1.500", fare_min: "1.500", fare_max: "2.000", headway_peak: 30, headway_offpeak: 60, first_dep: "06:00", last_dep: "21:00" },
  { code: "IR-AM-AQ", name_ar: "عمان ↔ العقبة", name_en: "Amman ↔ Aqaba", mode: "intercity", color: "#6B21A8", origin_code: "TM-02", dest_code: "LM-23", base_fare: "3.000", fare_min: "2.500", fare_max: "3.500", headway_peak: 60, headway_offpeak: 120, first_dep: "06:00", last_dep: "19:00" },
  { code: "IR-AM-ZA", name_ar: "عمان ↔ الزرقاء", name_en: "Amman ↔ Zarqa", mode: "intercity", color: "#6B21A8", origin_code: "TM-01", dest_code: "TM-05", base_fare: "0.750", fare_min: "0.750", fare_max: "1.000", headway_peak: 20, headway_offpeak: 30, first_dep: "06:00", last_dep: "22:00" },
  { code: "IR-AM-MF", name_ar: "عمان ↔ المفرق", name_en: "Amman ↔ Mafraq", mode: "intercity", color: "#6B21A8", origin_code: "TM-01", dest_code: "LM-29", base_fare: "1.000", fare_min: "0.750", fare_max: "1.250", headway_peak: 30, headway_offpeak: 60, first_dep: "06:00", last_dep: "20:00" },
  { code: "IR-AM-KA", name_ar: "عمان ↔ الكرك", name_en: "Amman ↔ Karak", mode: "intercity", color: "#6B21A8", origin_code: "TM-02", dest_code: "LM-26", base_fare: "1.500", fare_min: "1.250", fare_max: "2.000", headway_peak: 45, headway_offpeak: 90, first_dep: "06:30", last_dep: "19:00" },
  { code: "IR-AM-SA", name_ar: "عمان ↔ السلط", name_en: "Amman ↔ Salt", mode: "intercity", color: "#6B21A8", origin_code: "TM-01", dest_code: "LM-24", base_fare: "0.750", fare_min: "0.750", fare_max: "1.000", headway_peak: 20, headway_offpeak: 40, first_dep: "06:00", last_dep: "21:00" },
  { code: "IR-AM-AJ", name_ar: "عمان ↔ عجلون", name_en: "Amman ↔ Ajloun", mode: "intercity", color: "#6B21A8", origin_code: "TM-01", dest_code: "LM-28", base_fare: "1.250", fare_min: "1.000", fare_max: "1.500", headway_peak: 45, headway_offpeak: 90, first_dep: "06:30", last_dep: "19:00" },
  { code: "IR-AM-JE", name_ar: "عمان ↔ جرش", name_en: "Amman ↔ Jerash", mode: "intercity", color: "#6B21A8", origin_code: "TM-01", dest_code: "LM-27", base_fare: "1.000", fare_min: "0.750", fare_max: "1.250", headway_peak: 30, headway_offpeak: 60, first_dep: "06:00", last_dep: "20:00" },
  { code: "IR-AM-MD", name_ar: "عمان ↔ مادبا", name_en: "Amman ↔ Madaba", mode: "intercity", color: "#6B21A8", origin_code: "TM-02", dest_code: "LM-25", base_fare: "0.750", fare_min: "0.750", fare_max: "1.000", headway_peak: 30, headway_offpeak: 45, first_dep: "06:30", last_dep: "20:00" },
];

// ═══════════════════════════════════════════════════════════════
// Main Seed Function
// ═══════════════════════════════════════════════════════════════
async function seed() {
  console.log("🌱 بدء زراعة بيانات دروب...\n");

  // 1. Governorates
  console.log("📌 زراعة المحافظات...");
  const govMap: Record<string, string> = {};
  for (const g of governoratesData) {
    const [existing] = await db.select().from(schema.governorates).where(eq(schema.governorates.code, g.code)).limit(1);
    let id: string;
    if (!existing) {
      const [inserted] = await db.insert(schema.governorates).values({ id: stableUUID(`gov-${g.code}`), ...g }).returning({ id: schema.governorates.id });
      id = inserted.id;
      console.log(`  ✓ ${g.name_ar}`);
    } else {
      id = existing.id;
      console.log(`  ⏭ ${g.name_ar} (موجودة مسبقاً)`);
    }
    govMap[g.code] = id;
  }

  // 2. Agencies
  console.log("\n🏢 زراعة المشغلين...");
  const agencyMap: Record<string, string> = {};
  for (const a of agenciesData) {
    const [existing] = await db.select().from(schema.agencies).where(eq(schema.agencies.code, a.code)).limit(1);
    let id: string;
    if (!existing) {
      const [inserted] = await db.insert(schema.agencies).values({
        id: stableUUID(`agency-${a.code}`),
        name_ar: a.name_ar,
        name_en: a.name_en,
        code: a.code,
        mode: a.mode,
        phone: a.phone,
        website: a.website,
        governorate_code: a.governorate_code,
      }).returning({ id: schema.agencies.id });
      id = inserted.id;
      console.log(`  ✓ ${a.name_ar}`);
    } else {
      id = existing.id;
      console.log(`  ⏭ ${a.name_ar} (موجود مسبقاً)`);
    }
    agencyMap[a.code] = id;
  }

  // 3. Stops
  console.log("\n🚏 زراعة المحطات...");
  const stopMap: Record<string, string> = {};
  for (const s of landmarkStops) {
    const [existing] = await db.select().from(schema.stops).where(eq(schema.stops.code, s.code)).limit(1);
    let id: string;
    if (!existing) {
      const [inserted] = await db.insert(schema.stops).values({
        id: stableUUID(`stop-${s.code}`),
        code: s.code,
        name_ar: s.name_ar,
        name_en: s.name_en,
        lat: s.lat,
        lng: s.lng,
        governorate: s.gov,
        is_terminal: s.is_terminal,
        is_landmark: s.is_landmark,
        has_shelter: s.has_shelter,
        has_lighting: s.has_lighting,
        has_accessibility: (s as any).has_accessibility ?? false,
        has_ticket_machine: (s as any).has_ticket_machine ?? false,
        has_ac: (s as any).has_ac ?? false,
      }).returning({ id: schema.stops.id });
      id = inserted.id;
      console.log(`  ✓ ${s.name_ar} (${s.code})`);
    } else {
      id = existing.id;
      console.log(`  ⏭ ${s.name_ar} (موجودة مسبقاً)`);
    }
    stopMap[s.code] = id;
  }

  // 4. Routes
  console.log("\n🗺 زراعة الخطوط...");
  const routeMap: Record<string, string> = {};
  for (const r of routesData) {
    const routeKey = `${r.code}-${r.mode}`;
    const [existing] = await db.select().from(schema.routes).where(
      eq(schema.routes.code, r.code)
    ).limit(1);
    // Also check mode
    let id: string;
    if (!existing || existing.mode !== r.mode) {
      // Assign agency based on mode
      let agencyCode: string;
      switch (r.mode) {
        case "city_bus": agencyCode = "GAM"; break;
        case "brt": agencyCode = "BRT-GAM"; break;
        case "serveece": agencyCode = "SERV-PVT"; break;
        case "intercity":
          agencyCode = r.code.includes("IR-AM-ZA") ? "BOS" : "JETT";
          break;
        default: agencyCode = "GAM";
      }
      const [inserted] = await db.insert(schema.routes).values({
        id: stableUUID(`route-${routeKey}`),
        code: r.code,
        name_ar: r.name_ar,
        name_en: r.name_en,
        mode: r.mode,
        agency_id: agencyMap[agencyCode] || null,
        color: r.color,
        origin_stop_id: stopMap[r.origin_code] || null,
        destination_stop_id: stopMap[r.dest_code] || null,
        base_fare: r.base_fare,
        fare_min: (r as any).fare_min || null,
        fare_max: (r as any).fare_max || null,
        is_active: true,
        headway_peak: (r as any).headway_peak || null,
        headway_offpeak: (r as any).headway_offpeak || null,
        first_departure: (r as any).first_dep || null,
        last_departure: (r as any).last_dep || null,
        has_friday_schedule: true,
        has_ramadan_schedule: r.mode !== "serveece",
      }).returning({ id: schema.routes.id });
      id = inserted.id;
      console.log(`  ✓ ${r.code} — ${r.name_ar}`);
    } else {
      id = existing.id;
      console.log(`  ⏭ ${r.code} — ${r.name_ar} (موجود مسبقاً)`);
    }
    routeMap[routeKey] = id;
  }

  // 5. Route-Stops (junction table) — link origin/dest + key waypoints
  console.log("\n🔗 زراعة ارتباطات الخطوط والمحطات...");
  // For each route, create origin (seq=0) and destination (seq=99) entries
  for (const r of routesData) {
    const routeKey = `${r.code}-${r.mode}`;
    const routeId = routeMap[routeKey];
    const originStopId = stopMap[r.origin_code];
    const destStopId = stopMap[r.dest_code];

    if (!routeId || !originStopId || !destStopId) continue;

    // Check existing
    const [existing] = await db.select().from(schema.routeStops)
      .where(eq(schema.routeStops.route_id, routeId))
      .limit(1);
    if (existing) {
      console.log(`  ⏭ ${r.code} (مرتبط مسبقاً)`);
      continue;
    }

    // Insert origin
    await db.insert(schema.routeStops).values({
      id: stableUUID(`rs-${r.code}-0`),
      route_id: routeId,
      stop_id: originStopId,
      seq: 0,
      direction: 0,
      is_boarding_zone: r.mode === "serveece",
    });

    // Insert destination
    await db.insert(schema.routeStops).values({
      id: stableUUID(`rs-${r.code}-99`),
      route_id: routeId,
      stop_id: destStopId,
      seq: 99,
      direction: 0,
      is_boarding_zone: r.mode === "serveece",
    });

    // For serveece, mark both as boarding zones
    if (r.mode === "serveece") {
      await db.insert(schema.routeStops).values({
        id: stableUUID(`rs-${r.code}-50`),
        route_id: routeId,
        stop_id: destStopId,
        seq: 50,
        direction: 1,
        is_boarding_zone: true,
      });
    }

    console.log(`  ✓ ${r.code} — origin + destination linked`);
  }

  // 6. Schedules (sample weekday schedules for key routes)
  console.log("\n🕐 زراعة الجداول الزمنية...");
  let scheduleCount = 0;
  for (const r of routesData.slice(0, 10)) { // First 10 routes get schedules
    const routeKey = `${r.code}-${r.mode}`;
    const routeId = routeMap[routeKey];
    const originStopId = stopMap[r.origin_code];
    if (!routeId || !originStopId) continue;

    // Check existing
    const [existing] = await db.select().from(schema.schedules)
      .where(eq(schema.schedules.route_id, routeId))
      .limit(1);
    if (existing) {
      console.log(`  ⏭ ${r.code} (جدول موجود مسبقاً)`);
      continue;
    }

    const headway = (r as any).headway_peak || 15;
    // Generate departures every N minutes from 5:30 to 23:00
    for (let h = 5; h <= 23; h++) {
      for (let m = 0; m < 60; m += headway) {
        if (h === 5 && m < 30) continue;
        if (h === 23 && m > 0) break;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        await db.insert(schema.schedules).values({
          id: stableUUID(`sched-${r.code}-weekday-${timeStr}`),
          route_id: routeId,
          stop_id: originStopId,
          day_of_week: scheduleCount % 7,
          departure_time: timeStr,
          schedule_type: "weekday",
          is_active: true,
        });
        scheduleCount++;
      }
    }
    console.log(`  ✓ ${r.code} — weekday schedules created`);
  }

  console.log(`\n✅ تمت الزراعة بنجاح! (${scheduleCount} جدول زمني)`);
  console.log("📍 المحافظات: 12");
  console.log("🏢 المشغلون: 5");
  console.log("🚏 المحطات: 37");
  console.log("🗺 الخطوط: 22");
  console.log("🔗 ارتباطات: ~44");
  console.log("");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ فشلت الزراعة:", err);
    process.exit(1);
  });