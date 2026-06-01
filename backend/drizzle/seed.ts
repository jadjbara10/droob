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

  // ═══════════════ Additional Landmarks & Terminals ═══════════════
  // ── Amman Terminals ──
  { code: "TM-06", name_ar: "مجمع رغدان", name_en: "Raghadan Terminal", lat: 31.9515, lng: 35.9300, gov: "عمان", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true, has_accessibility: true, has_ticket_machine: true, has_ac: true },
  { code: "TM-07", name_ar: "مجمع الشمال / طارق", name_en: "North Terminal / Tareq", lat: 31.9850, lng: 35.9480, gov: "عمان", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true },

  // ── Amman Landmarks (Neighborhoods) ──
  { code: "LM-31", name_ar: "الشميساني", name_en: "Shmeisani", lat: 31.9800, lng: 35.9000, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true, has_ac: true },
  { code: "LM-32", name_ar: "طلعة العلي", name_en: "Tla'a Al-Ali", lat: 32.0000, lng: 35.8833, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-33", name_ar: "خلدا", name_en: "Khalda", lat: 32.0167, lng: 35.8533, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-34", name_ar: "عبدون", name_en: "Abdoun", lat: 31.9667, lng: 35.8833, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-35", name_ar: "الصويفية", name_en: "Sweifieh", lat: 31.9833, lng: 35.8667, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true, has_ac: true },
  { code: "LM-36", name_ar: "دابوق", name_en: "Dabouq", lat: 32.0000, lng: 35.8333, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-37", name_ar: "الجبيحة", name_en: "Jubeiha", lat: 32.0333, lng: 35.8500, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true, has_ac: true },
  { code: "LM-38", name_ar: "دير غبار", name_en: "Deir Ghbar", lat: 31.9680, lng: 35.8640, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-39", name_ar: "اليا دورة / البايدر", name_en: "Bayader / Wadi Abdoun", lat: 31.9583, lng: 35.8667, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-40", name_ar: "بسمان", name_en: "Basman", lat: 31.9500, lng: 35.9333, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-41", name_ar: "المدينة الرياضية", name_en: "Sports City", lat: 32.0000, lng: 35.8833, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-42", name_ar: "المدينة الطبية", name_en: "Medical City", lat: 31.9667, lng: 35.9000, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true, has_accessibility: true },
  { code: "LM-43", name_ar: "ام اذينة", name_en: "Um Uthaina", lat: 31.9850, lng: 35.8700, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "LM-44", name_ar: "الجوفة", name_en: "Jofeh", lat: 31.9333, lng: 35.8000, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },
  { code: "LM-45", name_ar: "دوار الأمير هاشم", name_en: "Prince Hashem Circle", lat: 31.9500, lng: 35.9167, gov: "عمان", is_terminal: false, is_landmark: true, has_shelter: false, has_lighting: true },

  // ── Amman Regular Stops ──
  { code: "ST-AM-01", name_ar: "القويسمة", name_en: "Qweismeh", lat: 31.8833, lng: 35.9333, gov: "عمان", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-AM-02", name_ar: "ناعور", name_en: "Naour", lat: 31.8667, lng: 35.8833, gov: "عمان", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-AM-03", name_ar: "أبو نصير", name_en: "Abu Nseir", lat: 32.0167, lng: 35.9000, gov: "عمان", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-AM-04", name_ar: "خريبة السوق", name_en: "Khraibet Essouq", lat: 31.9167, lng: 35.8333, gov: "عمان", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-AM-05", name_ar: "يدودة", name_en: "Yadouda", lat: 31.9000, lng: 35.8667, gov: "عمان", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-AM-06", name_ar: "المقابلين", name_en: "Al-Muqabalain", lat: 31.9000, lng: 35.9833, gov: "عمان", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-AM-07", name_ar: "الملحق / المحطة", name_en: "Al-Mahatta", lat: 31.9667, lng: 35.9333, gov: "عمان", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-AM-08", name_ar: "مرج الحمام", name_en: "Marj Al-Hamam", lat: 31.8833, lng: 35.8333, gov: "عمان", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-AM-09", name_ar: "البنيات", name_en: "Al-Bunayat", lat: 31.9000, lng: 35.8167, gov: "عمان", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-AM-10", name_ar: "وادي عبدون", name_en: "Wadi Abdoun", lat: 31.9583, lng: 35.8667, gov: "عمان", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },

  // ── Irbid ──
  { code: "TM-08", name_ar: "مجمع إربد", name_en: "Irbid Central Terminal", lat: 32.5500, lng: 35.8667, gov: "إربد", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true, has_accessibility: true },
  { code: "LM-46", name_ar: "جامعة اليرموك", name_en: "Yarmouk University", lat: 32.5333, lng: 35.8500, gov: "إربد", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true, has_ac: true },
  { code: "ST-IR-01", name_ar: "الحصن", name_en: "Al-Huson", lat: 32.4833, lng: 35.8833, gov: "إربد", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-IR-02", name_ar: "الرمثا", name_en: "Ramtha", lat: 32.5667, lng: 36.0333, gov: "إربد", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-IR-03", name_ar: "بيت راس", name_en: "Beit Ras", lat: 32.5833, lng: 35.8500, gov: "إربد", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-IR-04", name_ar: "حوارة", name_en: "Hawwara", lat: 32.5333, lng: 35.9167, gov: "إربد", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-IR-05", name_ar: "كفر يوبا", name_en: "Kufr Yuba", lat: 32.5333, lng: 35.8000, gov: "إربد", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-IR-06", name_ar: "الصريح", name_en: "Al-Sareeh", lat: 32.5000, lng: 35.9000, gov: "إربد", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-IR-07", name_ar: "أيدون", name_en: "Aydoun", lat: 32.5000, lng: 35.8333, gov: "إربد", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-IR-08", name_ar: "المزار الشمالي", name_en: "Al-Mazar Shamaliya", lat: 32.5833, lng: 35.7833, gov: "إربد", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-IR-09", name_ar: "الشجرة", name_en: "Shajara", lat: 32.6333, lng: 35.9333, gov: "إربد", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-IR-10", name_ar: "كفر أسد", name_en: "Kafr Asad", lat: 32.5833, lng: 35.7000, gov: "إربد", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-IR-11", name_ar: "الهاشمية", name_en: "Hashemiya", lat: 32.5333, lng: 35.9667, gov: "إربد", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-IR-12", name_ar: "الطيبة", name_en: "Al-Tayyiba", lat: 32.5333, lng: 35.7167, gov: "إربد", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },

  // ── Zarqa ──
  { code: "LM-47", name_ar: "جامعة الزرقاء", name_en: "Zarqa University", lat: 32.0667, lng: 36.0833, gov: "الزرقاء", is_terminal: false, is_landmark: true, has_shelter: true, has_lighting: true, has_ac: true },
  { code: "ST-ZA-01", name_ar: "عوجان", name_en: "Awajan", lat: 32.0833, lng: 36.1000, gov: "الزرقاء", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-ZA-02", name_ar: "الخو", name_en: "Khaw", lat: 32.0833, lng: 36.0667, gov: "الزرقاء", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-ZA-03", name_ar: "دوار الأمير محمد", name_en: "Prince Mohammed Circle", lat: 32.0833, lng: 36.1167, gov: "الزرقاء", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-ZA-04", name_ar: "مدينة الملك عبدالله الثاني", name_en: "King Abdullah II Park", lat: 32.0667, lng: 36.0500, gov: "الزرقاء", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-ZA-05", name_ar: "الأزرق", name_en: "Al-Azraq", lat: 31.8333, lng: 36.8167, gov: "الزرقاء", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-ZA-06", name_ar: "الأمير حسن", name_en: "Al-Amir Hasan", lat: 32.1000, lng: 36.1000, gov: "الزرقاء", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-ZA-07", name_ar: "البتراوي", name_en: "Batrawi", lat: 32.0667, lng: 36.0833, gov: "الزرقاء", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-ZA-08", name_ar: "مستشفى الزرقاء", name_en: "Zarqa Hospital", lat: 32.0833, lng: 36.0667, gov: "الزرقاء", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true, has_accessibility: true },

  // ── Balqa ──
  { code: "TM-09", name_ar: "مجمع السلط", name_en: "Salt Central Terminal", lat: 32.0333, lng: 35.7333, gov: "البلقاء", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true, has_accessibility: true },
  { code: "ST-BA-01", name_ar: "الفحيص", name_en: "Fuheis", lat: 32.0000, lng: 35.7667, gov: "البلقاء", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-BA-02", name_ar: "ماحص", name_en: "Maheis", lat: 32.0167, lng: 35.7500, gov: "البلقاء", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-BA-03", name_ar: "دير علا", name_en: "Deir Alla", lat: 32.1833, lng: 35.6167, gov: "البلقاء", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-BA-04", name_ar: "شونة الجنوب", name_en: "Shouna Junoob", lat: 31.9500, lng: 35.6333, gov: "البلقاء", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-BA-05", name_ar: "رمان", name_en: "Rumman", lat: 32.0500, lng: 35.7833, gov: "البلقاء", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },

  // ── Madaba ──
  { code: "TM-10", name_ar: "مجمع مادبا", name_en: "Madaba Terminal", lat: 31.7167, lng: 35.8000, gov: "مادبا", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "ST-MD-01", name_ar: "الليا", name_en: "Liya", lat: 31.7167, lng: 35.7833, gov: "مادبا", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-MD-02", name_ar: "مليحة", name_en: "Mulaiha", lat: 31.7500, lng: 35.7833, gov: "مادبا", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-MD-03", name_ar: "جبل نيبو", name_en: "Mount Nebo", lat: 31.7667, lng: 35.7167, gov: "مادبا", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-MD-04", name_ar: "ذيبان", name_en: "Dhiban", lat: 31.7833, lng: 35.8000, gov: "مادبا", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },

  // ── Karak ──
  { code: "TM-11", name_ar: "مجمع الكرك", name_en: "Karak Terminal", lat: 31.1833, lng: 35.7000, gov: "الكرك", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "ST-KA-01", name_ar: "القطرانة", name_en: "Qatraneh", lat: 31.2500, lng: 35.9333, gov: "الكرك", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-KA-02", name_ar: "المزار الجنوبي", name_en: "Al-Mazar Janubi", lat: 31.0667, lng: 35.7000, gov: "الكرك", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-KA-03", name_ar: "غور الصافي", name_en: "Ghor Al-Safi", lat: 31.0333, lng: 35.4667, gov: "الكرك", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-KA-04", name_ar: "فقع", name_en: "Faqqu", lat: 31.3833, lng: 35.7333, gov: "الكرك", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },

  // ── Tafilah ──
  { code: "ST-TA-01", name_ar: "الطفيلة - وسط البلد", name_en: "Tafilah City Center", lat: 30.8333, lng: 35.6000, gov: "الطفيلة", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-TA-02", name_ar: "بصيرا", name_en: "Busaira", lat: 30.7333, lng: 35.6167, gov: "الطفيلة", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-TA-03", name_ar: "الحسا", name_en: "Al-Hasa", lat: 30.8167, lng: 35.9833, gov: "الطفيلة", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },

  // ── Maan ──
  { code: "TM-12", name_ar: "مجمع معان", name_en: "Maan Terminal", lat: 30.2000, lng: 35.7333, gov: "معان", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true, has_accessibility: true },
  { code: "ST-MN-01", name_ar: "وادي موسى", name_en: "Wadi Musa", lat: 30.3167, lng: 35.4833, gov: "معان", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-MN-02", name_ar: "الشوبك", name_en: "Shoubak", lat: 30.5167, lng: 35.5333, gov: "معان", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-MN-03", name_ar: "الجفر", name_en: "Al-Jafr", lat: 30.3000, lng: 36.2167, gov: "معان", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },

  // ── Aqaba ──
  { code: "TM-13", name_ar: "مجمع العقبة", name_en: "Aqaba Terminal", lat: 29.5319, lng: 35.0056, gov: "العقبة", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true, has_accessibility: true, has_ac: true },
  { code: "ST-AQ-01", name_ar: "ميناء العقبة", name_en: "Aqaba Port", lat: 29.5167, lng: 35.0000, gov: "العقبة", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-AQ-02", name_ar: "أيلة", name_en: "Ayla Oasis", lat: 29.5481, lng: 35.0056, gov: "العقبة", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true, has_ac: true },
  { code: "ST-AQ-03", name_ar: "خليج طلعة", name_en: "Tala Bay", lat: 29.4167, lng: 34.9833, gov: "العقبة", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true, has_ac: true },
  { code: "ST-AQ-04", name_ar: "الشاطئ الجنوبي", name_en: "South Beach", lat: 29.3833, lng: 34.9833, gov: "العقبة", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-AQ-05", name_ar: "مطار العقبة", name_en: "Aqaba Airport", lat: 29.6183, lng: 35.0167, gov: "العقبة", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-AQ-06", name_ar: "الراشدية", name_en: "Al-Rashidya", lat: 29.5333, lng: 35.0167, gov: "العقبة", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },

  // ── Jerash ──
  { code: "TM-14", name_ar: "مجمع جرش", name_en: "Jerash Terminal", lat: 32.2833, lng: 35.9000, gov: "جرش", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "ST-JE-01", name_ar: "سوف", name_en: "Souf", lat: 32.3000, lng: 35.8500, gov: "جرش", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-JE-02", name_ar: "المصطبة", name_en: "Al-Mastaba", lat: 32.2500, lng: 35.8833, gov: "جرش", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-JE-03", name_ar: "برما", name_en: "Burma", lat: 32.2500, lng: 35.7833, gov: "جرش", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-JE-04", name_ar: "كفر خل", name_en: "Kufr Khall", lat: 32.3167, lng: 35.9000, gov: "جرش", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },

  // ── Ajloun ──
  { code: "TM-15", name_ar: "مجمع عجلون", name_en: "Ajloun Terminal", lat: 32.3333, lng: 35.7500, gov: "عجلون", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true },
  { code: "ST-AJ-01", name_ar: "قلعة عجلون", name_en: "Ajloun Castle", lat: 32.3333, lng: 35.7333, gov: "عجلون", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-AJ-02", name_ar: "حلاوة", name_en: "Halawah", lat: 32.3333, lng: 35.7500, gov: "عجلون", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-AJ-03", name_ar: "عوجان", name_en: "Orjan", lat: 32.3333, lng: 35.7167, gov: "عجلون", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },

  // ── Mafraq ──
  { code: "TM-16", name_ar: "مجمع المفرق", name_en: "Mafraq Central Terminal", lat: 32.3500, lng: 36.2000, gov: "المفرق", is_terminal: true, is_landmark: true, has_shelter: true, has_lighting: true, has_accessibility: true },
  { code: "ST-MF-01", name_ar: "الرويشد", name_en: "Ruwaished", lat: 32.5000, lng: 36.8000, gov: "المفرق", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-MF-02", name_ar: "الصفاوي", name_en: "Safawi", lat: 32.2000, lng: 37.1167, gov: "المفرق", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
  { code: "ST-MF-03", name_ar: "أم الجمال", name_en: "Um Al-Jimal", lat: 32.3167, lng: 36.3667, gov: "المفرق", is_terminal: false, is_landmark: false, has_shelter: true, has_lighting: true },
  { code: "ST-MF-04", name_ar: "دير الكهف", name_en: "Deir Al-Kahf", lat: 32.2667, lng: 36.8333, gov: "المفرق", is_terminal: false, is_landmark: false, has_shelter: false, has_lighting: true },
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

  // ═══════════════ Additional Routes ═══════════════
  // ── New City Bus Routes (Amman internal) ──
  { code: "7", name_ar: "الصويفية ↔ العبدلي", name_en: "Sweifieh ↔ Abdali", mode: "city_bus", color: "#0066CC", origin_code: "LM-35", dest_code: "TM-01", base_fare: "0.350", headway_peak: 12, headway_offpeak: 20, first_dep: "05:30", last_dep: "23:00" },
  { code: "10", name_ar: "خلدا ↔ الصويفية ↔ عبدون", name_en: "Khalda ↔ Sweifieh ↔ Abdoun", mode: "city_bus", color: "#0066CC", origin_code: "LM-33", dest_code: "LM-34", base_fare: "0.350", headway_peak: 12, headway_offpeak: 20, first_dep: "05:30", last_dep: "22:30" },
  { code: "15", name_ar: "الجبيحة ↔ المدينة الرياضية ↔ الشميساني", name_en: "Jubeiha ↔ Sports City ↔ Shmeisani", mode: "city_bus", color: "#0066CC", origin_code: "LM-37", dest_code: "LM-31", base_fare: "0.350", headway_peak: 10, headway_offpeak: 20, first_dep: "05:30", last_dep: "23:00" },
  { code: "18", name_ar: "دابوق ↔ الجامعة الأردنية ↔ صويلح", name_en: "Dabouq ↔ UJ ↔ Sweileh", mode: "city_bus", color: "#0066CC", origin_code: "LM-36", dest_code: "TM-03", base_fare: "0.350", headway_peak: 10, headway_offpeak: 20, first_dep: "05:30", last_dep: "22:30" },
  { code: "25", name_ar: "القويسمة ↔ المقابلين ↔ وسط البلد", name_en: "Qweismeh ↔ Muqabalain ↔ Downtown", mode: "city_bus", color: "#0066CC", origin_code: "ST-AM-01", dest_code: "LM-02", base_fare: "0.400", headway_peak: 15, headway_offpeak: 25, first_dep: "06:00", last_dep: "22:00" },
  { code: "30", name_ar: "أبو نصير ↔ طبربور ↔ الهاشمي", name_en: "Abu Nseir ↔ Tabarbour ↔ Hashmi", mode: "city_bus", color: "#0066CC", origin_code: "ST-AM-03", dest_code: "LM-18", base_fare: "0.350", headway_peak: 12, headway_offpeak: 25, first_dep: "05:30", last_dep: "22:30" },
  { code: "40", name_ar: "ناعور ↔ خريبة السوق ↔ وادي السير", name_en: "Naour ↔ Khraibet Essouq ↔ Wadi Seer", mode: "city_bus", color: "#0066CC", origin_code: "ST-AM-02", dest_code: "LM-08", base_fare: "0.400", headway_peak: 20, headway_offpeak: 30, first_dep: "06:00", last_dep: "21:30" },

  // ── New Serveece Routes ──
  { code: "S08", name_ar: "سرفيس - العبدلي ↔ الشميساني ↔ الجبيحة", name_en: "Serveece - Abdali ↔ Shmeisani ↔ Jubeiha", mode: "serveece", color: "#FF8C00", origin_code: "TM-01", dest_code: "LM-37", base_fare: "0.300", fare_min: "0.200", fare_max: "0.400", headway_peak: 5, headway_offpeak: 8, first_dep: "06:00", last_dep: "22:00" },
  { code: "S09", name_ar: "سرفيس - وسط البلد ↔ عبدون ↔ الصويفية", name_en: "Serveece - Downtown ↔ Abdoun ↔ Sweifieh", mode: "serveece", color: "#FF8C00", origin_code: "LM-02", dest_code: "LM-35", base_fare: "0.250", fare_min: "0.200", fare_max: "0.350", headway_peak: 5, headway_offpeak: 10, first_dep: "06:00", last_dep: "22:00" },
  { code: "S10", name_ar: "سرفيس - صويلح ↔ خلدا ↔ دابوق", name_en: "Serveece - Sweileh ↔ Khalda ↔ Dabouq", mode: "serveece", color: "#FF8C00", origin_code: "TM-03", dest_code: "LM-36", base_fare: "0.250", fare_min: "0.200", fare_max: "0.350", headway_peak: 5, headway_offpeak: 10, first_dep: "06:00", last_dep: "22:00" },
  { code: "S11", name_ar: "سرفيس - الهاشمي ↔ المقابلين ↔ القويسمة", name_en: "Serveece - Hashmi ↔ Muqabalain ↔ Qweismeh", mode: "serveece", color: "#FF8C00", origin_code: "LM-18", dest_code: "ST-AM-01", base_fare: "0.300", fare_min: "0.200", fare_max: "0.400", headway_peak: 5, headway_offpeak: 10, first_dep: "06:00", last_dep: "21:30" },

  // ── New Intercity Routes ──
  { code: "IR-AM-RT", name_ar: "عمان ↔ الرمثا", name_en: "Amman ↔ Ramtha", mode: "intercity", color: "#6B21A8", origin_code: "TM-01", dest_code: "ST-IR-02", base_fare: "1.500", fare_min: "1.250", fare_max: "2.000", headway_peak: 45, headway_offpeak: 90, first_dep: "06:00", last_dep: "20:00" },
  { code: "IR-AM-PT", name_ar: "عمان ↔ البتراء", name_en: "Amman ↔ Petra", mode: "intercity", color: "#6B21A8", origin_code: "TM-01", dest_code: "LM-30", base_fare: "3.500", fare_min: "3.000", fare_max: "4.000", headway_peak: 60, headway_offpeak: 120, first_dep: "06:00", last_dep: "17:00" },
  { code: "IR-AM-TF", name_ar: "عمان ↔ الطفيلة", name_en: "Amman ↔ Tafilah", mode: "intercity", color: "#6B21A8", origin_code: "TM-02", dest_code: "ST-TA-01", base_fare: "1.750", fare_min: "1.500", fare_max: "2.250", headway_peak: 60, headway_offpeak: 120, first_dep: "06:30", last_dep: "18:00" },
  { code: "IR-AQ-PT", name_ar: "العقبة ↔ البتراء", name_en: "Aqaba ↔ Petra", mode: "intercity", color: "#6B21A8", origin_code: "LM-23", dest_code: "LM-30", base_fare: "2.500", fare_min: "2.000", fare_max: "3.000", headway_peak: 60, headway_offpeak: 120, first_dep: "07:00", last_dep: "16:00" },
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

  // 7. Schedules for new routes (routes beyond the first 10)
  console.log("\n🕐 زراعة جداول الخطوط الجديدة...");
  for (const r of routesData.slice(10)) {
    const routeKey = `${r.code}-${r.mode}`;
    const routeId = routeMap[routeKey];
    const originStopId = stopMap[r.origin_code];
    if (!routeId || !originStopId) continue;

    const [existing] = await db.select().from(schema.schedules)
      .where(eq(schema.schedules.route_id, routeId))
      .limit(1);
    if (existing) {
      console.log(`  ⏭ ${r.code} (جدول موجود مسبقاً)`);
      continue;
    }

    const headway = (r as any).headway_peak || 15;
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

  // 8. Vehicles (المركبات)
  console.log("\n🚌 زراعة المركبات...");
  let vehicleCount = 0;
  const vehiclesData = [
    // GAM city buses
    { plate: "1-10001", type: "bus", agency_code: "GAM", capacity: 45 },
    { plate: "1-10002", type: "bus", agency_code: "GAM", capacity: 45 },
    { plate: "1-10003", type: "bus", agency_code: "GAM", capacity: 40 },
    { plate: "1-10004", type: "bus", agency_code: "GAM", capacity: 40 },
    { plate: "1-10005", type: "bus", agency_code: "GAM", capacity: 50 },
    { plate: "1-10006", type: "bus", agency_code: "GAM", capacity: 45 },
    { plate: "1-10007", type: "bus", agency_code: "GAM", capacity: 40 },
    { plate: "1-10008", type: "bus", agency_code: "GAM", capacity: 45 },
    { plate: "1-10009", type: "bus", agency_code: "GAM", capacity: 50 },
    { plate: "1-10010", type: "bus", agency_code: "GAM", capacity: 45 },
    // BRT buses
    { plate: "1-20001", type: "brt_bus", agency_code: "BRT-GAM", capacity: 60 },
    { plate: "1-20002", type: "brt_bus", agency_code: "BRT-GAM", capacity: 60 },
    { plate: "1-20003", type: "brt_bus", agency_code: "BRT-GAM", capacity: 60 },
    // Serveece minivans
    { plate: "1-30001", type: "minivan", agency_code: "SERV-PVT", capacity: 14 },
    { plate: "1-30002", type: "minivan", agency_code: "SERV-PVT", capacity: 14 },
    { plate: "1-30003", type: "minivan", agency_code: "SERV-PVT", capacity: 12 },
    { plate: "1-30004", type: "minivan", agency_code: "SERV-PVT", capacity: 14 },
    { plate: "1-30005", type: "minivan", agency_code: "SERV-PVT", capacity: 12 },
    { plate: "1-30006", type: "minivan", agency_code: "SERV-PVT", capacity: 14 },
    { plate: "1-30007", type: "minivan", agency_code: "SERV-PVT", capacity: 14 },
    { plate: "1-30008", type: "minivan", agency_code: "SERV-PVT", capacity: 12 },
    // JETT intercity coaches
    { plate: "1-40001", type: "coach", agency_code: "JETT", capacity: 50 },
    { plate: "1-40002", type: "coach", agency_code: "JETT", capacity: 50 },
    { plate: "1-40003", type: "coach", agency_code: "JETT", capacity: 45 },
    // BOS intercity
    { plate: "1-40004", type: "coach", agency_code: "BOS", capacity: 45 },
    { plate: "1-40005", type: "coach", agency_code: "BOS", capacity: 45 },
    // Trust intercity
    { plate: "1-40006", type: "coach", agency_code: "TRUST", capacity: 50 },
  ];
  const vehicleMap: Record<string, string> = {};
  for (const v of vehiclesData) {
    const [existing] = await db.select().from(schema.vehicles).where(eq(schema.vehicles.plate, v.plate)).limit(1);
    if (!existing) {
      const [inserted] = await db.insert(schema.vehicles).values({
        id: stableUUID(`vehicle-${v.plate}`),
        plate: v.plate,
        type: v.type,
        agency_id: agencyMap[v.agency_code] || null,
        capacity: v.capacity,
        is_active: true,
      }).returning({ id: schema.vehicles.id });
      vehicleMap[v.plate] = inserted.id;
      vehicleCount++;
      if (vehicleCount <= 5) console.log(`  ✓ ${v.plate} — ${v.type}`);
    }
  }
  console.log(`  ... ${vehicleCount} مركبة إجمالاً`);

  // 9. Trips for today (رحلة اليوم — sample departures)
  console.log("\n🚍 زراعة رحلات اليوم...");
  let tripCount = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  for (const r of routesData) {
    const routeKey = `${r.code}-${r.mode}`;
    const routeId = routeMap[routeKey];
    if (!routeId) continue;

    // Find a matching vehicle for this route's mode
    let vehicleId: string | null = null;
    for (const v of vehiclesData) {
      const agencyCodeForRoute = r.mode === "city_bus" ? "GAM" :
        r.mode === "brt" ? "BRT-GAM" :
        r.mode === "serveece" ? "SERV-PVT" :
        r.code.includes("IR-AM-ZA") ? "BOS" : "JETT";
      if (v.agency_code === agencyCodeForRoute && vehicleMap[v.plate]) {
        vehicleId = vehicleMap[v.plate];
        break;
      }
    }

    const headway = (r as any).headway_peak || 15;
    const firstH = parseInt((r as any).first_dep?.split(":")[0] || "6");
    const lastH = parseInt((r as any).last_dep?.split(":")[0] || "22");

    // Generate 3-5 sample trips for today per route
    const tripHours = [];
    const morningHour = firstH;
    const middayHour = Math.min(12, lastH);
    const afternoonHour = Math.min(16, lastH);
    const eveningHour = lastH - 1;

    tripHours.push(morningHour, middayHour, afternoonHour);
    if (eveningHour > afternoonHour) tripHours.push(eveningHour);
    if (lastH >= 22) tripHours.push(20);

    for (const h of tripHours) {
      for (let m = 0; m < 60; m += headway * 2) {
        if (tripCount >= 200) break; // cap at 200 trips
        const depStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        // Skip if before first dep or after last dep
        if (depStr < (r as any).first_dep || depStr > (r as any).last_dep) continue;

        const depTime = new Date(`${todayStr}T${depStr}:00+03:00`);
        // Skip past trips (already departed)
        if (depTime < new Date()) continue;

        // Determine status and occupancy
        const now = new Date();
        const msUntilDeparture = depTime.getTime() - now.getTime();
        const minsUntilDeparture = msUntilDeparture / (1000 * 60);
        let status: string;
        let occupancy: string;
        if (minsUntilDeparture < 0) {
          status = "completed";
          occupancy = "full";
        } else if (minsUntilDeparture < 15) {
          status = "in_progress";
          occupancy = Math.random() > 0.5 ? "partial" : "full";
        } else if (minsUntilDeparture < 60) {
          status = "scheduled";
          occupancy = Math.random() > 0.6 ? "empty" : "partial";
        } else {
          status = "scheduled";
          occupancy = "empty";
        }

        // Arrival approx 30-90 min later based on mode
        const travelMins = r.mode === "intercity" ? 90 : r.mode === "brt" ? 35 : 45;
        const arrTime = new Date(depTime.getTime() + travelMins * 60000);

        await db.insert(schema.trips).values({
          id: stableUUID(`trip-${r.code}-${depStr}`),
          route_id: routeId,
          vehicle_id: vehicleId,
          departure_time: depTime,
          arrival_time: arrTime,
          status,
          occupancy,
        });
        tripCount++;
      }
    }
  }
  console.log(`  ✓ ${tripCount} رحلة لليوم`);

  // 10. Summary
  console.log(`\n✅ تمت الزراعة بنجاح!`);
  console.log(`📍 المحافظات: ${governoratesData.length}`);
  console.log(`🏢 المشغلون: ${agenciesData.length}`);
  console.log(`🚏 المحطات: ${landmarkStops.length}`);
  console.log(`🗺  الخطوط: ${routesData.length}`);
  console.log(`🚌 المركبات: ${vehicleCount}`);
  console.log(`🕐 جداول: ${scheduleCount}`);
  console.log(`🚍 رحلات اليوم: ${tripCount}`);
  console.log("");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ فشلت الزراعة:", err);
    process.exit(1);
  });