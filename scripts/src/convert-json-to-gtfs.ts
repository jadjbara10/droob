/**
 * دروب Droob — JSON ↔ GTFS Converter
 * Converts jordan_routes_master.json → GTFS static feed (stops.txt, routes.txt, trips.txt, stop_times.txt)
 * and downloads/processes GAM GTFS feed
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

// ─── Zod schemas for the master route data ──────────────────────────────
const StopSchema = z.object({
  stop_id: z.string(),
  stop_name_ar: z.string(),
  stop_name_en: z.string().optional(),
  stop_lat: z.number(),
  stop_lon: z.number(),
  location_type: z.number().optional(), // 0=stop, 1=station
  parent_station: z.string().optional(),
  wheelchair_boarding: z.number().optional(), // 0=unknown, 1=yes, 2=no
  is_terminal: z.boolean().optional(),
});

const RouteSchema = z.object({
  route_id: z.string(),
  route_short_name: z.string(),
  route_long_name_ar: z.string(),
  route_long_name_en: z.string().optional(),
  route_type: z.number(), // 3=bus, 700=serveece, 200=coach
  route_color: z.string().optional(),
  agency_id: z.string().optional(),
  mode: z.enum(["city_bus", "brt", "serveece", "intercity"]).optional(),
  stops: z.array(z.string()).optional(),
  schedule: z
    .array(
      z.object({
        departure_time: z.string(),
        arrival_time: z.string().optional(),
        days: z.array(z.string()).optional(), // ["monday","tuesday",...]
      })
    )
    .optional(),
  headway_minutes: z.number().optional(),
  fare_jod: z.number().optional(),
});

const MasterDataSchema = z.object({
  stops: z.array(StopSchema),
  routes: z.array(RouteSchema),
  agencies: z
    .array(
      z.object({
        agency_id: z.string(),
        agency_name: z.string(),
        agency_url: z.string().optional(),
        agency_timezone: z.string().optional(),
      })
    )
    .optional(),
});

type MasterData = z.infer<typeof MasterDataSchema>;

// ─── GTFS Writers ───────────────────────────────────────────────────────
function writeAgencyTxt(data: MasterData, outDir: string) {
  const lines = ["agency_id,agency_name,agency_url,agency_timezone,agency_lang,agency_phone"];
  const agencies = data.agencies || [
    { agency_id: "GAM", agency_name: "Greater Amman Municipality", agency_url: "https://www.ammancity.gov.jo", agency_timezone: "Asia/Amman" },
    { agency_id: "JETT", agency_name: "JETT Transport", agency_url: "https://www.jett.com.jo", agency_timezone: "Asia/Amman" },
    { agency_id: "TRUST", agency_name: "Trust International Transport", agency_url: "https://www.trusttransport.com.jo", agency_timezone: "Asia/Amman" },
    { agency_id: "MOT", agency_name: "وزارة النقل الأردنية", agency_url: "https://www.mot.gov.jo", agency_timezone: "Asia/Amman" },
  ];
  for (const a of agencies) {
    lines.push(`"${a.agency_id}","${a.agency_name}","${a.agency_url || ""}","${a.agency_timezone || "Asia/Amman"}","ar","")`);
  }
  fs.writeFileSync(path.join(outDir, "agency.txt"), lines.join("\n") + "\n", "utf-8");
  console.log(`✓ Wrote agency.txt (${agencies.length} agencies)`);
}

function writeStopsTxt(data: MasterData, outDir: string) {
  const lines = ["stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station,wheelchair_boarding"];
  for (const s of data.stops) {
    lines.push(
      `"${s.stop_id}","${s.stop_name_ar}",${s.stop_lat},${s.stop_lon},${s.location_type ?? 0},${s.parent_station || ""},${s.wheelchair_boarding ?? 0}`
    );
  }
  fs.writeFileSync(path.join(outDir, "stops.txt"), lines.join("\n") + "\n", "utf-8");
  console.log(`✓ Wrote stops.txt (${data.stops.length} stops)`);
}

function writeRoutesTxt(data: MasterData, outDir: string) {
  const lines = ["route_id,agency_id,route_short_name,route_long_name,route_type,route_color,route_text_color"];
  const agencies = (data.agencies || []).map((a) => a.agency_id);
  const defaultAgency = agencies[0] || "GAM";

  for (const r of data.routes) {
    const agency = r.agency_id || defaultAgency;
    const color = r.route_color || "0066CC";
    lines.push(
      `"${r.route_id}","${agency}","${r.route_short_name}","${r.route_long_name_ar}",${r.route_type},"${color}","FFFFFF"`
    );
  }
  fs.writeFileSync(path.join(outDir, "routes.txt"), lines.join("\n") + "\n", "utf-8");
  console.log(`✓ Wrote routes.txt (${data.routes.length} routes)`);
}

function writeTripsAndStopTimes(data: MasterData, outDir: string) {
  const tripLines = ["route_id,service_id,trip_id,trip_headsign,direction_id"];
  const stLines = ["trip_id,arrival_time,departure_time,stop_id,stop_sequence"];

  const defaultSchedule = [
    { departure_time: "06:00:00", days: ["monday", "tuesday", "wednesday", "thursday", "saturday", "sunday"] },
    { departure_time: "08:00:00", days: ["monday", "tuesday", "wednesday", "thursday", "saturday", "sunday"] },
    { departure_time: "10:00:00", days: ["monday", "tuesday", "wednesday", "thursday", "saturday", "sunday"] },
    { departure_time: "12:00:00", days: ["monday", "tuesday", "wednesday", "thursday", "saturday", "sunday"] },
    { departure_time: "14:00:00", days: ["monday", "tuesday", "wednesday", "thursday", "saturday", "sunday"] },
    { departure_time: "16:00:00", days: ["monday", "tuesday", "wednesday", "thursday", "saturday", "sunday"] },
    { departure_time: "18:00:00", days: ["monday", "tuesday", "wednesday", "thursday", "saturday", "sunday"] },
    { departure_time: "20:00:00", days: ["monday", "tuesday", "wednesday", "thursday", "saturday", "sunday"] },
    // Friday reduced service (no 11AM-1PM)
    { departure_time: "06:00:00", days: ["friday"] },
    { departure_time: "08:00:00", days: ["friday"] },
    { departure_time: "10:00:00", days: ["friday"] },
    { departure_time: "14:00:00", days: ["friday"] },
    { departure_time: "16:00:00", days: ["friday"] },
    { departure_time: "18:00:00", days: ["friday"] },
  ];

  const weekendSchedule = [
    { departure_time: "06:00:00", days: ["friday"] },
    { departure_time: "08:00:00", days: ["friday"] },
    { departure_time: "10:00:00", days: ["friday"] },
    { departure_time: "14:00:00", days: ["friday"] },
    { departure_time: "16:00:00", days: ["friday"] },
    { departure_time: "18:00:00", days: ["friday"] },
  ];

  let tripCount = 0;
  let stopTimeCount = 0;

  for (const route of data.routes) {
    const stopIds = route.stops || [];
    if (stopIds.length < 2) continue;

    const schedule = route.schedule || (route.headway_minutes ? generateHeadwaySchedule(route.headway_minutes) : defaultSchedule);

    for (let tripIdx = 0; tripIdx < schedule.length; tripIdx++) {
      const sched = schedule[tripIdx];
      const days = sched.days || ["monday", "tuesday", "wednesday", "thursday", "saturday", "sunday"];
      const serviceId = days.length === 0 ? "WEEKDAY" : days.join("_").toUpperCase();

      // Forward direction
      const tripIdFwd = `${route.route_id}_${tripIdx}_0`;
      const headsignFwd = data.stops.find((s) => s.stop_id === stopIds[stopIds.length - 1])?.stop_name_ar || route.route_long_name_ar;
      tripLines.push(`"${route.route_id}","${serviceId}","${tripIdFwd}","${headsignFwd}",0`);

      let deptSec = timeToSeconds(sched.departure_time);
      for (let seq = 0; seq < stopIds.length; seq++) {
        const arrSec = seq === 0 ? deptSec : deptSec + seq * 120; // ~2 min between stops
        const depSec = seq === stopIds.length - 1 ? arrSec : arrSec + 30;
        stLines.push(`"${tripIdFwd}","${secondsToTime(arrSec)}","${secondsToTime(depSec)}","${stopIds[seq]}",${seq + 1}`);
        stopTimeCount++;
      }
      tripCount++;

      // Reverse direction
      if (stopIds.length >= 2) {
        const tripIdRev = `${route.route_id}_${tripIdx}_1`;
        const headsignRev = data.stops.find((s) => s.stop_id === stopIds[0])?.stop_name_ar || route.route_long_name_ar;
        tripLines.push(`"${route.route_id}","${serviceId}","${tripIdRev}","${headsignRev}",1`);

        deptSec = timeToSeconds(sched.departure_time) + stopIds.length * 150; // Offset return
        for (let seq = stopIds.length - 1; seq >= 0; seq--) {
          const arrSec = seq === stopIds.length - 1 ? deptSec : deptSec + (stopIds.length - 1 - seq) * 120;
          const depSec = seq === 0 ? arrSec : arrSec + 30;
          stLines.push(`"${tripIdRev}","${secondsToTime(arrSec)}","${secondsToTime(depSec)}","${stopIds[seq]}",${stopIds.length - seq}`);
          stopTimeCount++;
        }
        tripCount++;
      }
    }
  }

  fs.writeFileSync(path.join(outDir, "trips.txt"), tripLines.join("\n") + "\n", "utf-8");
  fs.writeFileSync(path.join(outDir, "stop_times.txt"), stLines.join("\n") + "\n", "utf-8");
  console.log(`✓ Wrote trips.txt (${tripCount} trips) + stop_times.txt (${stopTimeCount} records)`);
}

// ─── Helpers ────────────────────────────────────────────────────────────
function timeToSeconds(time: string): number {
  const [h, m, s] = time.split(":").map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

function secondsToTime(sec: number): string {
  const h = Math.floor(sec / 3600) % 24;
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function generateHeadwaySchedule(headwayMinutes: number) {
  const schedules: { departure_time: string; days: string[] }[] = [];
  const startMin = 5 * 60 + 30; // 5:30 AM
  const endMin = 23 * 60; // 11:00 PM
  for (let min = startMin; min <= endMin; min += headwayMinutes) {
    if (min >= 11 * 60 + 30 && min <= 13 * 60 + 30) continue; // Friday gap
    const h = Math.floor(min / 60);
    const m = min % 60;
    schedules.push({
      departure_time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`,
      days: min >= 11 * 60 + 30 && min <= 13 * 60 + 30 ? ["friday"] : [],
    });
  }
  return schedules;
}

// ─── Main ───────────────────────────────────────────────────────────────
async function main() {
  const inputPath = process.argv[2] || path.resolve(__dirname, "../../mobile/src/data/jordan_routes_master.json");
  const outputDir = process.argv[3] || path.resolve(__dirname, "../../data/gtfs_output");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`📦 Reading: ${inputPath}`);
  const raw = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

  const parsed = MasterDataSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("❌ Invalid master data schema:");
    console.error(parsed.error.format());
    process.exit(1);
  }

  const data: MasterData = parsed.data;
  console.log(`   ${data.stops.length} stops, ${data.routes.length} routes`);

  writeAgencyTxt(data, outputDir);
  writeStopsTxt(data, outputDir);
  writeRoutesTxt(data, outputDir);
  writeTripsAndStopTimes(data, outputDir);

  // Write calendar.txt (simplified)
  const calendarLines = ["service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date"];
  calendarLines.push("WEEKDAY,1,1,1,1,0,1,1,20260101,20261231");
  calendarLines.push("WEEKEND,0,0,0,0,1,1,1,20260101,20261231");
  fs.writeFileSync(path.join(outputDir, "calendar.txt"), calendarLines.join("\n") + "\n", "utf-8");

  console.log(`\n✅ GTFS feed written to: ${outputDir}`);
  console.log(`   Files: agency.txt, stops.txt, routes.txt, trips.txt, stop_times.txt, calendar.txt`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});