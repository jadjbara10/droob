const { Pool } = require("pg");
const fs = require("fs");
const pool = new Pool({ connectionString: "postgresql://droob:droob_password@localhost:5432/droob" });

async function evaluate() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT r.id, r.code, r.name_en, r.mode, r.is_active, CASE WHEN r.path_geojson IS NULL THEN 0 ELSE length(r.path_geojson::text) END as path_len, (SELECT COUNT(*) FROM route_stops rs WHERE rs.route_id = r.id) as stop_count, r.origin_stop_id IS NOT NULL as has_origin, r.destination_stop_id IS NOT NULL as has_dest FROM routes r ORDER BY r.mode, r.code");
    let csv = "code,name_en,mode,is_active,path_len,stop_count,has_origin,has_dest,classification\n";
    let stats = { ACCURATE: 0, NEEDS_FIX: 0, NEEDS_REDRAW: 0, MISSING_DATA: 0 };
    for (const r of res.rows) {
      let cls = "MISSING_DATA";
      if (r.path_len > 5000 && r.stop_count >= 3 && r.has_origin && r.has_dest) cls = "ACCURATE";
      else if (r.path_len > 1000 && r.stop_count >= 2) cls = "NEEDS_FIX";
      else if (r.path_len > 100) cls = "NEEDS_REDRAW";
      stats[cls] = (stats[cls] || 0) + 1;
      csv += '"' + r.code + '","' + (r.name_en || "").replace(/"/g, '""') + '",' + r.mode + ',' + r.is_active + ',' + r.path_len + ',' + r.stop_count + ',' + r.has_origin + ',' + r.has_dest + ',' + cls + '\n';
    }
    fs.writeFileSync("D:\\temp\\route_evaluation.csv", csv);
    console.log("Total routes: " + res.rows.length);
    console.log(JSON.stringify(stats, null, 2));
  } finally { client.release(); await pool.end(); }
}
evaluate().catch(e => console.error(e));
