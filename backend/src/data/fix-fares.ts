/**
 * 🔧 Fix unrealistic fares — normalize fils (350) → JOD (0.350)
 * Run: npx tsx src/data/fix-fares.ts
 */
import "dotenv/config";
import { db } from "../db/index.js";
import { routes } from "../../drizzle/schema.js";
import { sql } from "drizzle-orm";

async function fixFares() {
  const all = await db.select({
    id: routes.id, code: routes.code, name_ar: routes.name_ar,
    mode: routes.mode, base_fare: routes.base_fare,
  }).from(routes);

  let fixed = 0;
  let skipped = 0;

  for (const r of all) {
    const fare = parseFloat(String(r.base_fare || "0.35"));

    // Realistic Jordan bus fares: 0.25-3.00 JOD
    // If fare > 5 JOD, it's likely stored in fils (divide by 1000)
    if (fare > 5) {
      const corrected = fare / 1000;
      // Sanity check: corrected fare should be 0.10-3.00 JOD
      if (corrected >= 0.10 && corrected <= 5.0) {
        await db.update(routes)
          .set({ base_fare: corrected.toFixed(3), updated_at: new Date() })
          .where(sql`id = ${r.id}`);
        console.log(`  ✅ ${r.code}: ${fare} → ${corrected.toFixed(3)} JOD (${r.name_ar})`);
        fixed++;
        continue;
      }
    }

    // Also fix if fare < 0.05 (too low) — likely data error
    if (fare < 0.05 && fare > 0) {
      const defaults: Record<string, string> = {
        city_bus: "0.350", brt: "0.500", serveece: "0.350", intercity: "1.500",
      };
      const def = defaults[r.mode] || "0.350";
      await db.update(routes)
        .set({ base_fare: def, updated_at: new Date() })
        .where(sql`id = ${r.id}`);
      console.log(`  ⚠️ ${r.code}: ${fare} → ${def} JOD (too low, set default) [${r.mode}]`);
      fixed++;
      continue;
    }

    skipped++;
  }

  console.log(`\n📊 FIXED: ${fixed}, SKIPPED: ${skipped}, TOTAL: ${all.length}`);

  // Verify
  const bad = await db.select({ count: sql<number>`count(*)` }).from(routes)
    .where(sql`base_fare::numeric > 5`);
  console.log(`🔍 Routes still > 5 JOD: ${bad[0].count}`);

  process.exit(0);
}

fixFares().catch((err) => { console.error(err); process.exit(1); });
