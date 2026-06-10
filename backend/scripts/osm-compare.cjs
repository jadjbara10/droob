/**
 * دروب Droob — OSM Route Comparison Script (Sprint 1, Task 1.2)
 *
 * Compares OpenStreetMap public transit routes in Jordan with the Droob database.
 *
 * Phases:
 *   1. Fetch ALL public transit route relations from OSM via Overpass API
 *   2. Parse OSM relations — extract tags (ref, name, name:en, from, to, etc.)
 *   3. Query Droob DB for all routes with their codes, names, and GeoJSON paths
 *   4. Match OSM ↔ DB routes using multiple strategies (exact ref → fuzzy name)
 *   5. For matched routes, fetch detailed geometry from OSM (ways + nodes)
 *   6. Compare path geometry: length, coordinate count, density
 *   7. Save comprehensive report to D:\temp\osm_comparison.json
 *
 * Output categories:
 *   - matched:              route exists in both OSM and DB (with geometry comparison)
 *   - in_osm_not_in_db:     route in OSM but missing from Droob database
 *   - in_db_not_in_osm:     route in Droob database but not mapped in OSM
 *
 * Run: node backend/scripts/osm-compare.cjs
 */

const { Pool } = require("pg");
const https = require("https");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const DB_URL = "postgresql://droob:droob_password@localhost:5432/droob";
const OUTPUT_PATH = "D:\\temp\\osm_comparison.json";

// Multiple Overpass endpoints for fallback
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
];

// Jordan bounding box — slightly expanded to catch border routes
const JORDAN_BBOX = { s: 29.0, w: 34.8, n: 33.5, e: 39.5 };

// Public transport route types to query from OSM
const ROUTE_TYPES = ["bus", "trolleybus", "minibus", "share_taxi", "coach"];

// Earth's mean radius in meters (for Haversine)
const EARTH_R = 6371000;

// Delay between Overpass API calls (be polite to public endpoints)
const API_DELAY_MS = 5000;

// ═══════════════════════════════════════════════════════════════
// OVERPASS API
// ═══════════════════════════════════════════════════════════════

/**
 * POST a query to Overpass API and return parsed JSON.
 * Tries multiple endpoints if the primary fails.
 * @param {string} query - Overpass QL query (body of POST)
 * @param {number} [timeoutMs=180000] - Request timeout
 * @returns {Promise<object>}
 */
async function overpassQuery(query, timeoutMs = 180000) {
  const body = Buffer.from(query, "utf-8");
  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const result = await postToOverpass(endpoint, body, timeoutMs);
      return result;
    } catch (err) {
      lastError = err;
      console.log(`   ⚠️  ${endpoint} failed: ${err.message}`);
      // Short delay before trying next endpoint
      await sleep(2000);
    }
  }

  throw new Error(
    `All Overpass endpoints failed. Last error: ${lastError ? lastError.message : "unknown"}`
  );
}

/**
 * POST data to a single Overpass endpoint.
 */
function postToOverpass(url, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "Content-Length": body.length,
        },
        timeout: timeoutMs,
      },
      (res) => {
        // Follow redirects
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          // Recurse to redirect URL
          postToOverpass(res.headers.location, body, timeoutMs)
            .then(resolve)
            .catch(reject);
          return;
        }

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 429) {
            return reject(new Error("Rate limited (429)"));
          }
          if (res.statusCode !== 200) {
            return reject(
              new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`)
            );
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(
              new Error(`JSON parse error: ${e.message}. Body: ${data.slice(0, 300)}`)
            );
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
    req.write(body);
    req.end();
  });
}

/**
 * Fetch all public transit route relations in Jordan (tags + member refs only).
 * Returns parsed relations with extracted tag fields.
 */
async function fetchOSMRouteRelations() {
  const bbox = `${JORDAN_BBOX.s},${JORDAN_BBOX.w},${JORDAN_BBOX.n},${JORDAN_BBOX.e}`;
  const typeQueries = ROUTE_TYPES.map(
    (t) => `  relation[route=${t}](${bbox});`
  ).join("\n");

  const query = `[out:json];\n(\n${typeQueries}\n);\nout body;`;

  console.log("🌐 Fetching OSM route relations for Jordan...");
  console.log(`   Bounding box: ${JORDAN_BBOX.s},${JORDAN_BBOX.w} → ${JORDAN_BBOX.n},${JORDAN_BBOX.e}`);
  console.log(`   Route types: ${ROUTE_TYPES.join(", ")}`);

  const result = await overpassQuery(query);

  const relations = result.elements.filter((el) => el.type === "relation");
  console.log(`   ✅ Fetched ${relations.length} route relations from OSM\n`);

  // Parse each relation into a clean object
  const parsed = relations.map((rel) => {
    const tags = rel.tags || {};

    // Count member ways and stops
    const members = rel.members || [];
    const wayCount = members.filter((m) => m.type === "way").length;
    const stopCount = members.filter(
      (m) => m.type === "node" && (m.role === "stop" || m.role === "platform")
    ).length;

    return {
      osm_id: rel.id,
      osm_type: rel.type,
      ref: tags.ref || null,
      name: tags.name || null,
      name_en: tags["name:en"] || null,
      name_ar: tags["name:ar"] || null,
      from: tags.from || null,
      to: tags.to || null,
      operator: tags.operator || null,
      network: tags.network || null,
      route: tags.route || null,
      opening_hours: tags.opening_hours || null,
      description: tags.description || null,
      colour: tags.colour || tags.color || null,
      way_count: wayCount,
      stop_count: stopCount,
      total_members: members.length,
      // Preserve raw members for later geometry resolution
      _members: members.map((m) => ({
        type: m.type,
        ref: m.ref,
        role: m.role || "",
      })),
    };
  });

  return parsed;
}

/**
 * Fetch full geometry (ways + nodes) for a specific set of OSM relations.
 * Uses batched requests to avoid overwhelming the API.
 * @param {number[]} relationIds
 * @returns {Promise<{ways: Map<number,object>, nodes: Map<number,object>}>}
 */
async function fetchOSMGeometry(relationIds) {
  if (relationIds.length === 0) {
    return { ways: new Map(), nodes: new Map() };
  }

  const BATCH_SIZE = 100;
  const wayMap = new Map();
  const nodeMap = new Map();

  for (let i = 0; i < relationIds.length; i += BATCH_SIZE) {
    const batch = relationIds.slice(i, i + BATCH_SIZE);
    const idList = batch.join(",");

    const query = `[out:json][timeout:300];\nrelation(id:${idList});\nout body;\n>;\nout skel qt;`;

    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(relationIds.length / BATCH_SIZE);
    console.log(`   Geometry batch ${batchNum}/${totalBatches} (${batch.length} relations)...`);

    try {
      const result = await overpassQuery(query, 300000); // 5 min timeout

      for (const el of result.elements) {
        if (el.type === "way") {
          wayMap.set(el.id, {
            id: el.id,
            nodes: el.nodes || [],
            tags: el.tags || {},
          });
        } else if (el.type === "node") {
          nodeMap.set(el.id, {
            id: el.id,
            lat: el.lat,
            lon: el.lon,
          });
        }
      }

      console.log(`      ${result.elements.length} elements — now have ${wayMap.size} ways, ${nodeMap.size} nodes`);
    } catch (err) {
      console.error(`      ⚠️  Geometry batch failed: ${err.message}`);
      // Continue with partial data
    }

    // Polite delay between batches
    if (i + BATCH_SIZE < relationIds.length) {
      console.log(`      Waiting ${API_DELAY_MS / 1000}s...`);
      await sleep(API_DELAY_MS);
    }
  }

  return { ways: wayMap, nodes: nodeMap };
}

// ═══════════════════════════════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch all routes from the Droob database with full context.
 * Includes origin/destination stop names and stop counts.
 */
async function fetchDBRoutes(pool) {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT
        r.id,
        r.code,
        r.name_ar,
        r.name_en,
        r.mode,
        r.is_active,
        r.path_geojson,
        r.distance,
        r.origin_stop_id,
        r.destination_stop_id,
        os.name_ar  AS origin_name_ar,
        os.name_en  AS origin_name_en,
        ds.name_ar  AS dest_name_ar,
        ds.name_en  AS dest_name_en,
        (SELECT COUNT(*) FROM route_stops rs WHERE rs.route_id = r.id)::int AS stop_count
      FROM routes r
      LEFT JOIN stops os ON os.id = r.origin_stop_id
      LEFT JOIN stops ds ON ds.id = r.destination_stop_id
      ORDER BY r.mode, r.code
    `);

    console.log(`📋 Fetched ${res.rows.length} routes from Droob database\n`);
    return res.rows;
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════════════════
// NAME NORMALIZATION & MATCHING
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize an English/Latin string for comparison:
 * - lowercase, trim, collapse whitespace
 * - remove punctuation except hyphens and slashes
 * - remove parenthetical content
 * - strip common noise words (bus, route, line, station, etc.)
 */
function normalizeEn(str) {
  if (!str) return "";
  let s = str.toLowerCase().trim().replace(/\s+/g, " ");
  s = s.replace(/[.,;:'"!?]/g, "");
  s = s.replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  s = s
    .replace(/\b(bus|route|line|station|terminal|complex|stop|share)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

/**
 * Normalize an Arabic string for comparison:
 * - Normalize alef variants (أ إ آ → ا)
 * - Normalize yeh variants (ي ى ئ → ي)
 * - Normalize teh marbuta (ة → ه)
 * - Remove diacritics (tashkeel)
 * - Remove tatweel (kashida)
 * - Remove punctuation
 * - Strip common noise words
 */
function normalizeAr(str) {
  if (!str) return "";
  let s = str.trim().replace(/\s+/g, " ");
  s = s.replace(/[أإآ]/g, "ا");
  s = s.replace(/[يىئ]/g, "ي");
  s = s.replace(/ة/g, "ه");
  s = s.replace(/[ً-ٰٟ]/g, "");
  s = s.replace(/ـ/g, "");
  s = s.replace(/[،؛:"'!؟\.\(\)\[\]\{\}]/g, "");
  s = s
    .replace(/باص|خط|محطة|مجمع|حافلة|بس/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

/**
 * Tokenize a normalized string into words.
 * Splits on spaces, slashes, hyphens, arrows.
 */
function tokenize(str) {
  return str
    .split(/[\s\/\-–—↔→>]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Calculate Jaccard similarity between two token sets.
 * Returns 0-1 where 1 = identical token sets.
 */
function jaccardSimilarity(tokensA, tokensB) {
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Check if a string is primarily Arabic script.
 */
function isArabic(str) {
  if (!str) return false;
  const arabicChars = str.match(/[؀-ۿ]/g);
  return arabicChars ? arabicChars.length / str.length > 0.3 : false;
}

/**
 * Match an OSM route relation against DB routes using multiple strategies.
 *
 * Strategies are tried in order of reliability. First successful match wins.
 *
 *   1. exact_ref       — OSM ref == DB code (case-insensitive, trimmed)
 *   2. normalized_ref  — After removing leading zeros and special chars
 *   3. name_en_exact   — Normalized English names match exactly
 *   4. name_en_fuzzy   — Jaccard token similarity >= 0.5
 *   5. name_ar_exact   — Normalized Arabic names match exactly
 *   6. name_ar_fuzzy   — Jaccard token similarity >= 0.5
 *   7. from_to         — OSM from/to tags partially match DB name
 *
 * @param {object} osmRoute - Parsed OSM route relation
 * @param {object[]} dbRoutes - Array of DB route records
 * @param {Set<string>} usedDbIds - Already matched DB route IDs
 * @returns {{ matched: boolean, strategy: string|null, dbRoute: object|null, confidence: number }}
 */
function findMatch(osmRoute, dbRoutes, usedDbIds) {
  const osmRef = (osmRoute.ref || "").trim();
  const osmNameEn = osmRoute.name_en || (isArabic(osmRoute.name || "") ? "" : osmRoute.name) || "";
  const osmNameAr = osmRoute.name_ar || (isArabic(osmRoute.name || "") ? osmRoute.name : "");
  const osmFrom = (osmRoute.from || "").trim();
  const osmTo = (osmRoute.to || "").trim();

  // Pre-compute normalized OSM fields
  const osmRefNorm = osmRef
    .toLowerCase()
    .replace(/^0+/, "")
    .replace(/[^a-z0-9]/g, "");
  const osmNameEnNorm = normalizeEn(osmNameEn);
  const osmNameArNorm = normalizeAr(osmNameAr);
  const osmNameEnTokens = tokenize(osmNameEnNorm);
  const osmNameArTokens = tokenize(osmNameArNorm);

  let bestMatch = null;
  let bestScore = 0;

  for (const dbRoute of dbRoutes) {
    // Skip already matched DB routes
    if (usedDbIds.has(dbRoute.id)) continue;

    const dbCode = (dbRoute.code || "").trim();
    const dbNameEn = dbRoute.name_en || "";
    const dbNameAr = dbRoute.name_ar || "";

    const dbCodeNorm = dbCode
      .toLowerCase()
      .replace(/^0+/, "")
      .replace(/[^a-z0-9]/g, "");
    const dbNameEnNorm = normalizeEn(dbNameEn);
    const dbNameArNorm = normalizeAr(dbNameAr);
    const dbNameEnTokens = tokenize(dbNameEnNorm);
    const dbNameArTokens = tokenize(dbNameArNorm);

    // ── Strategy 1: exact_ref ──────────────────────────────
    if (osmRef && dbCode && osmRef.toLowerCase() === dbCode.toLowerCase()) {
      return {
        matched: true,
        strategy: "exact_ref",
        dbRoute,
        confidence: 1.0,
      };
    }

    // ── Strategy 2: normalized_ref ─────────────────────────
    if (osmRefNorm && dbCodeNorm && osmRefNorm === dbCodeNorm) {
      return {
        matched: true,
        strategy: "normalized_ref",
        dbRoute,
        confidence: 0.95,
      };
    }

    // ── Strategy 3: name_en_exact ──────────────────────────
    if (
      osmNameEnNorm.length > 3 &&
      dbNameEnNorm.length > 3 &&
      osmNameEnNorm === dbNameEnNorm
    ) {
      const score = 0.9;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          matched: true,
          strategy: "name_en_exact",
          dbRoute,
          confidence: score,
        };
      }
    }

    // ── Strategy 4: name_en_fuzzy ──────────────────────────
    if (osmNameEnTokens.length >= 2 && dbNameEnTokens.length >= 2) {
      const jaccard = jaccardSimilarity(osmNameEnTokens, dbNameEnTokens);
      if (jaccard >= 0.5 && jaccard > bestScore) {
        bestScore = jaccard;
        bestMatch = {
          matched: true,
          strategy: "name_en_fuzzy",
          dbRoute,
          confidence: Math.round(jaccard * 100) / 100,
        };
      }
    }

    // ── Strategy 5: name_ar_exact ──────────────────────────
    if (
      osmNameArNorm.length > 3 &&
      dbNameArNorm.length > 3 &&
      osmNameArNorm === dbNameArNorm
    ) {
      const score = 0.9;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          matched: true,
          strategy: "name_ar_exact",
          dbRoute,
          confidence: score,
        };
      }
    }

    // ── Strategy 6: name_ar_fuzzy ──────────────────────────
    if (osmNameArTokens.length >= 2 && dbNameArTokens.length >= 2) {
      const jaccard = jaccardSimilarity(osmNameArTokens, dbNameArTokens);
      if (jaccard >= 0.5 && jaccard > bestScore) {
        bestScore = jaccard;
        bestMatch = {
          matched: true,
          strategy: "name_ar_fuzzy",
          dbRoute,
          confidence: Math.round(jaccard * 100) / 100,
        };
      }
    }

    // ── Strategy 7: from/to partial match ──────────────────
    if (osmFrom && osmTo) {
      const fromNorm = normalizeEn(osmFrom);
      const toNorm = normalizeEn(osmTo);
      if (fromNorm && toNorm && dbNameEnNorm) {
        const fromInName = dbNameEnNorm.includes(fromNorm);
        const toInName = dbNameEnNorm.includes(toNorm);
        if (fromInName && toInName) {
          const score = 0.7;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = {
              matched: true,
              strategy: "from_to_match",
              dbRoute,
              confidence: score,
            };
          }
        } else if (fromInName || toInName) {
          const score = 0.5;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = {
              matched: true,
              strategy: "from_to_partial",
              dbRoute,
              confidence: score,
            };
          }
        }
      }
      // Also try Arabic from/to matching
      if (fromNorm && toNorm && dbNameArNorm) {
        const fromInAr = dbNameArNorm.includes(normalizeAr(osmFrom));
        const toInAr = dbNameArNorm.includes(normalizeAr(osmTo));
        if (fromInAr && toInAr) {
          const score = 0.7;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = {
              matched: true,
              strategy: "from_to_match_ar",
              dbRoute,
              confidence: score,
            };
          }
        }
      }
    }
  }

  // Return fuzzy match only if confidence is reasonable
  if (bestMatch && bestMatch.confidence >= 0.5) {
    return bestMatch;
  }

  return { matched: false, strategy: null, dbRoute: null, confidence: 0 };
}

// ═══════════════════════════════════════════════════════════════
// GEOMETRY
// ═══════════════════════════════════════════════════════════════

/**
 * Haversine distance between two (lat,lng) points in meters.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate total length of a coordinate array in meters.
 * Expects GeoJSON coordinate format: [[lng, lat], ...]
 */
function calculatePathLength(coords) {
  if (!coords || coords.length < 2) return 0;
  let length = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    if (
      typeof lat1 !== "number" || typeof lng1 !== "number" ||
      typeof lat2 !== "number" || typeof lng2 !== "number"
    ) continue;
    length += haversineDistance(lat1, lng1, lat2, lng2);
  }
  return length;
}

/**
 * Extract valid coordinates from a DB path_geojson value.
 * Handles LineString, MultiLineString, and raw array formats.
 * @returns {number[][]} Array of [lng, lat] coordinates
 */
function extractDBCoordinates(pathGeojson) {
  if (!pathGeojson || typeof pathGeojson !== "object") return [];

  if (pathGeojson.type === "LineString" && Array.isArray(pathGeojson.coordinates)) {
    return pathGeojson.coordinates.filter(
      (c) => Array.isArray(c) && c.length >= 2 &&
        typeof c[0] === "number" && typeof c[1] === "number"
    );
  }

  if (pathGeojson.type === "MultiLineString" && Array.isArray(pathGeojson.coordinates)) {
    return pathGeojson.coordinates.flat().filter(
      (c) => Array.isArray(c) && c.length >= 2 &&
        typeof c[0] === "number" && typeof c[1] === "number"
    );
  }

  if (Array.isArray(pathGeojson)) {
    return pathGeojson.filter(
      (c) => Array.isArray(c) && c.length >= 2 &&
        typeof c[0] === "number" && typeof c[1] === "number"
    );
  }

  return [];
}

/**
 * Reconstruct OSM geometry for a relation from ways and nodes maps.
 * Ways are ordered by their appearance in the relation members.
 * Respects "backward" role (reverses way coordinates).
 * Deduplicates consecutive identical coordinates.
 *
 * @returns {{ coordinates: number[][], totalLength: number, nodeCount: number, wayCount: number }}
 */
function reconstructOSMGeometry(relation, wayMap, nodeMap) {
  const members = relation._members || [];
  const wayMembers = members.filter((m) => m.type === "way");

  if (wayMembers.length === 0) {
    return { coordinates: [], totalLength: 0, nodeCount: 0, wayCount: 0 };
  }

  const allCoords = [];
  let totalNodes = 0;

  for (const member of wayMembers) {
    const way = wayMap.get(member.ref);
    if (!way) continue;

    const wayCoords = [];
    for (const nodeId of way.nodes) {
      const node = nodeMap.get(nodeId);
      if (node && typeof node.lat === "number" && typeof node.lon === "number") {
        wayCoords.push([node.lon, node.lat]); // GeoJSON order: [lng, lat]
        totalNodes++;
      }
    }

    // If way is reversed in relation, reverse coordinates
    if (member.role === "backward") {
      wayCoords.reverse();
    }

    allCoords.push(...wayCoords);
  }

  // Deduplicate consecutive identical coordinates
  const deduped = [];
  for (const coord of allCoords) {
    if (
      deduped.length === 0 ||
      deduped[deduped.length - 1][0] !== coord[0] ||
      deduped[deduped.length - 1][1] !== coord[1]
    ) {
      deduped.push(coord);
    }
  }

  const totalLength = calculatePathLength(deduped);

  return {
    coordinates: deduped,
    totalLength,
    nodeCount: totalNodes,
    wayCount: wayMembers.length,
  };
}

/**
 * Compare OSM geometry with DB path_geojson.
 * Returns detailed comparison metrics.
 */
function compareGeometry(osmGeom, dbPathGeojson, dbDistance) {
  const dbCoords = extractDBCoordinates(dbPathGeojson);
  const dbLength = calculatePathLength(dbCoords);

  // Use stored DB distance as fallback when GeoJSON-derived length is 0
  const dbLengthUsed = dbLength > 0 ? dbLength : (parseFloat(dbDistance) || 0);
  const osmLength = osmGeom.totalLength;

  const lengthDiff = osmLength - dbLengthUsed;
  const lengthDiffPct =
    dbLengthUsed > 0 ? (lengthDiff / dbLengthUsed) * 100 : null;

  return {
    osm_node_count: osmGeom.nodeCount,
    osm_way_count: osmGeom.wayCount,
    osm_length_m: Math.round(osmLength * 100) / 100,
    db_coord_count: dbCoords.length,
    db_length_m: Math.round(dbLengthUsed * 100) / 100,
    db_has_geojson: dbPathGeojson != null && dbCoords.length >= 2,
    db_geojson_length_m: Math.round(dbLength * 100) / 100,
    length_diff_m: Math.round(lengthDiff * 100) / 100,
    length_diff_pct:
      lengthDiffPct !== null ? Math.round(lengthDiffPct * 100) / 100 : null,
    assessment: assessGeometryQuality(osmLength, dbLengthUsed, dbCoords.length),
  };
}

/**
 * Human-readable quality assessment for geometry comparison.
 */
function assessGeometryQuality(osmLength, dbLength, dbCoordCount) {
  if (osmLength === 0 && dbLength === 0) return "both_missing";
  if (osmLength === 0) return "osm_missing";
  if (dbLength === 0 && dbCoordCount < 2) return "db_missing";
  if (dbLength === 0) return "db_no_length";

  const ratio =
    osmLength > dbLength ? osmLength / dbLength : dbLength / osmLength;

  if (ratio < 1.05) return "excellent_match";
  if (ratio < 1.15) return "good_match";
  if (ratio < 1.3) return "acceptable";
  if (ratio < 2.0) return "significant_difference";
  return "major_difference";
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
// REPORT BUILDING
// ═══════════════════════════════════════════════════════════════

/**
 * Build the final comparison report.
 */
function buildReport(osmRoutes, dbRoutes, matched, inOsmNotInDb, inDbNotInOsm, geometryComparisons, strategyCounts) {
  // Summary of geometry assessments
  const geomSummary = {};
  for (const gc of geometryComparisons) {
    const key = gc.geometry ? gc.geometry.assessment : "not_compared";
    geomSummary[key] = (geomSummary[key] || 0) + 1;
  }

  // By-mode breakdown for DB
  const dbByMode = {};
  for (const r of dbRoutes) {
    dbByMode[r.mode] = (dbByMode[r.mode] || 0) + 1;
  }

  // By-route-type breakdown for OSM
  const osmByType = {};
  for (const r of osmRoutes) {
    osmByType[r.route] = (osmByType[r.route] || 0) + 1;
  }

  return {
    metadata: {
      generated_at: new Date().toISOString(),
      tool: "osm-compare.cjs — Droob Sprint 1, Task 1.2",
      jordan_bbox: JORDAN_BBOX,
      route_types_queried: ROUTE_TYPES,
      overpass_endpoints_tried: OVERPASS_ENDPOINTS,
    },
    summary: {
      osm_total_routes: osmRoutes.length,
      db_total_routes: dbRoutes.length,
      matched: matched.length,
      in_osm_not_in_db: inOsmNotInDb.length,
      in_db_not_in_osm: inDbNotInOsm.length,
      match_rate_vs_db:
        dbRoutes.length > 0
          ? Math.round((matched.length / dbRoutes.length) * 1000) / 10
          : 0,
      osm_coverage_pct:
        osmRoutes.length > 0
          ? Math.round((matched.length / osmRoutes.length) * 1000) / 10
          : 0,
    },
    breakdowns: {
      db_by_mode: dbByMode,
      osm_by_route_type: osmByType,
    },
    matching: {
      strategies_used: strategyCounts,
      total_strategies: Object.keys(strategyCounts).length,
    },
    geometry_comparison: {
      summary: geomSummary,
      total_compared: geometryComparisons.length,
      comparisons: geometryComparisons,
    },
    osm_routes_details: osmRoutes.map((r) => ({
      osm_id: r.osm_id,
      ref: r.ref,
      name: r.name,
      name_en: r.name_en,
      name_ar: r.name_ar,
      from: r.from,
      to: r.to,
      operator: r.operator,
      network: r.network,
      route: r.route,
      way_count: r.way_count,
      stop_count: r.stop_count,
    })),
    in_osm_not_in_db: inOsmNotInDb.map((r) => ({
      osm_id: r.osm_id,
      ref: r.ref,
      name: r.name,
      name_en: r.name_en,
      name_ar: r.name_ar,
      from: r.from,
      to: r.to,
      operator: r.operator,
      network: r.network,
      route: r.route,
      way_count: r.way_count,
      stop_count: r.stop_count,
    })),
    in_db_not_in_osm: inDbNotInOsm.map((r) => ({
      id: r.id,
      code: r.code,
      name_ar: r.name_ar,
      name_en: r.name_en,
      mode: r.mode,
      is_active: r.is_active,
      has_path_geojson: r.path_geojson != null,
      distance: r.distance,
      stop_count: r.stop_count,
      origin_name_ar: r.origin_name_ar,
      origin_name_en: r.origin_name_en,
      dest_name_ar: r.dest_name_ar,
      dest_name_en: r.dest_name_en,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("🔍 دروب Droob — OSM Route Comparison Tool\n");
  console.log("═".repeat(65));

  const pool = new Pool({ connectionString: DB_URL });

  try {
    // ══════════════════════════════════════════════════════════
    // PHASE 1: Fetch OSM route relations (tags + member refs only)
    // ══════════════════════════════════════════════════════════
    console.log("\n📡 PHASE 1: Fetching OSM route relations...\n");
    const osmRoutes = await fetchOSMRouteRelations();

    if (osmRoutes.length === 0) {
      console.error(
        "❌ No OSM route relations found. Check bounding box or network connectivity."
      );
      await pool.end();
      process.exit(1);
    }

    // Show a preview of what we found
    console.log("   Sample OSM routes:");
    for (const r of osmRoutes.slice(0, 10)) {
      const label =
        r.name || r.name_en || r.name_ar || r.ref || `OSM#${r.osm_id}`;
      const detail = [r.ref, r.from, r.to].filter(Boolean).join(" → ");
      console.log(`     #${r.osm_id}  [${r.route}]  ${label}  ${detail ? "(" + detail + ")" : ""}`);
    }
    if (osmRoutes.length > 10) {
      console.log(`     ... and ${osmRoutes.length - 10} more`);
    }

    // ══════════════════════════════════════════════════════════
    // PHASE 2: Fetch DB routes
    // ══════════════════════════════════════════════════════════
    console.log("\n📋 PHASE 2: Fetching Droob database routes...\n");
    const dbRoutes = await fetchDBRoutes(pool);

    // ══════════════════════════════════════════════════════════
    // PHASE 3: Match OSM ↔ DB
    // ══════════════════════════════════════════════════════════
    console.log("🔗 PHASE 3: Matching routes...\n");

    const usedDbIds = new Set();
    const matched = [];
    const inOsmNotInDb = [];
    const strategyCounts = {};

    for (const osmRoute of osmRoutes) {
      const match = findMatch(osmRoute, dbRoutes, usedDbIds);

      if (match.matched) {
        usedDbIds.add(match.dbRoute.id);
        matched.push({
          osm: osmRoute,
          db: match.dbRoute,
          match_strategy: match.strategy,
          match_confidence: match.confidence,
        });
        strategyCounts[match.strategy] =
          (strategyCounts[match.strategy] || 0) + 1;
      } else {
        inOsmNotInDb.push(osmRoute);
      }
    }

    // DB routes not matched to any OSM route
    const inDbNotInOsm = dbRoutes.filter((r) => !usedDbIds.has(r.id));

    console.log("   Results:");
    console.log(`   ✅ Matched:            ${matched.length}`);
    console.log(`   ➕ In OSM, not in DB:   ${inOsmNotInDb.length}`);
    console.log(`   ➖ In DB, not in OSM:   ${inDbNotInOsm.length}`);
    console.log("\n   Matching strategies used:");
    for (const [strategy, count] of Object.entries(strategyCounts).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`     ${strategy.padEnd(22)} ${count}`);
    }

    // ══════════════════════════════════════════════════════════
    // PHASE 4: Fetch geometry for matched routes
    // ══════════════════════════════════════════════════════════
    console.log("\n📐 PHASE 4: Fetching OSM geometry for matched routes...\n");

    const matchedOsmIds = matched.map((m) => m.osm.osm_id);
    const { ways: wayMap, nodes: nodeMap } = await fetchOSMGeometry(
      matchedOsmIds
    );

    // ══════════════════════════════════════════════════════════
    // PHASE 5: Compare geometry
    // ══════════════════════════════════════════════════════════
    console.log("\n📏 PHASE 5: Comparing path geometry...\n");

    const geometryComparisons = [];

    for (const pair of matched) {
      const osmGeom = reconstructOSMGeometry(pair.osm, wayMap, nodeMap);
      const comparison = compareGeometry(
        osmGeom,
        pair.db.path_geojson,
        pair.db.distance
      );

      geometryComparisons.push({
        osm_id: pair.osm.osm_id,
        osm_ref: pair.osm.ref,
        osm_name: pair.osm.name,
        osm_name_en: pair.osm.name_en,
        db_id: pair.db.id,
        db_code: pair.db.code,
        db_name_en: pair.db.name_en,
        db_name_ar: pair.db.name_ar,
        db_mode: pair.db.mode,
        match_strategy: pair.match_strategy,
        match_confidence: pair.match_confidence,
        geometry: comparison,
      });
    }

    // Geometry quality distribution
    const geomSummary = {};
    for (const gc of geometryComparisons) {
      const key = gc.geometry.assessment;
      geomSummary[key] = (geomSummary[key] || 0) + 1;
    }
    console.log("   Geometry quality distribution:");
    const qualityOrder = [
      "excellent_match",
      "good_match",
      "acceptable",
      "significant_difference",
      "major_difference",
      "db_missing",
      "osm_missing",
      "both_missing",
      "db_no_length",
    ];
    for (const key of qualityOrder) {
      if (geomSummary[key]) {
        console.log(`     ${key.padEnd(24)} ${geomSummary[key]}`);
      }
    }

    // Show top differences
    const majorDiffs = geometryComparisons
      .filter((g) => g.geometry.assessment === "major_difference")
      .slice(0, 5);
    if (majorDiffs.length > 0) {
      console.log("\n   Routes with largest geometry differences:");
      for (const g of majorDiffs) {
        console.log(
          `     ${(g.db_code || "?").padEnd(8)} OSM: ${String(Math.round(g.geometry.osm_length_m / 1000)).padStart(5)}km  DB: ${String(Math.round(g.geometry.db_length_m / 1000)).padStart(5)}km  diff: ${g.geometry.length_diff_pct}%`
        );
      }
    }

    // ══════════════════════════════════════════════════════════
    // PHASE 6: Build & save report
    // ══════════════════════════════════════════════════════════
    console.log("\n📊 PHASE 6: Building and saving report...\n");

    const report = buildReport(
      osmRoutes,
      dbRoutes,
      matched,
      inOsmNotInDb,
      inDbNotInOsm,
      geometryComparisons,
      strategyCounts
    );

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), "utf-8");

    const fileSize = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
    console.log(`   ✅ Report saved to: ${OUTPUT_PATH}`);
    console.log(`   📦 File size: ${fileSize} KB`);

    // ══════════════════════════════════════════════════════════
    // FINAL SUMMARY
    // ══════════════════════════════════════════════════════════
    console.log("\n" + "═".repeat(65));
    console.log("📊 FINAL SUMMARY");
    console.log("═".repeat(65));
    console.log(`   OSM routes found:     ${osmRoutes.length}`);
    console.log(`   DB routes total:      ${dbRoutes.length}`);
    console.log(
      `   Matched:              ${matched.length} (${report.summary.match_rate_vs_db}% of DB, ${report.summary.osm_coverage_pct}% of OSM)`
    );
    console.log(`   Only in OSM:          ${inOsmNotInDb.length}`);
    console.log(`   Only in DB:           ${inDbNotInOsm.length}`);
    console.log(`   Geometry compared:    ${geometryComparisons.length}`);
    console.log(`\n📁 Full report: ${OUTPUT_PATH}`);
    console.log("═".repeat(65));

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Fatal error:", err);
    try {
      await pool.end();
    } catch (_) {
      // ignore cleanup errors
    }
    process.exit(1);
  }
}

main();
