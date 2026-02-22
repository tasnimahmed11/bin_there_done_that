import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import csv from "csv-parser";
import db from "./database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = path.join(__dirname, "../data");

function detectCampus(zip, lat) {
  if (zip === "02118") return "medical";
  if (zip === "02215" && lat < 42.348) return "fenway";
  return "charles-river";
}
function mockFill() { return Math.floor(Math.random() * 100); }
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath).pipe(csv()).on("data", d => rows.push(d)).on("end", () => resolve(rows)).on("error", reject);
  });
}

// ── Hotspot scoring algorithm ─────────────────────────────────────────────────
//
// Based on real data distribution (93 BU bins):
//   Min days to fill:  0.9   p25: 2.4
//   Median:            3.5   p75: 6.4   Max: 153.9
//
// Classification uses the FASTER of trash/recycle as the primary signal:
//   🔴 hot  = fills in < 3 days  → genuinely overwhelmed, high demand
//   🟢 good = fills in 3–20 days → healthy placement, appropriate usage
//   ⚫ cold = fills in > 20 days  → low demand, consider relocating
//
// Score 0–100 uses log scale for better visual spread across the map,
// combined with avg fill% as a secondary signal.
//
function computeHotspotScore(wasteDays, wasteFill, recycleDays, recycleFill) {
  const values = [];
  const MAX_DAYS = 160; // slightly above observed max of 153.9

  const scoreStream = (days, fill) => {
    if (!days || !fill) return null;
    // Log scale so short-filling bins spread out well from 0–100
    const dayScore  = Math.max(0, 100 - (Math.log(days + 1) / Math.log(MAX_DAYS + 1)) * 100);
    const fillScore = Math.min(100, fill);
    return (dayScore * 0.65) + (fillScore * 0.35);
  };

  const ws = scoreStream(wasteDays, wasteFill);
  const rs = scoreStream(recycleDays, recycleFill);
  if (ws != null) values.push(ws);
  if (rs != null) values.push(rs);
  if (!values.length) return 50;
  return Math.min(100, Math.max(0, values.reduce((a, b) => a + b) / values.length));
}

function classifyPlacement(wasteDays, recycleDays) {
  // Use the faster-filling stream as the primary signal
  const days = Math.min(wasteDays ?? Infinity, recycleDays ?? Infinity);
  if (days === Infinity) return "good"; // no data — default to good
  if (days < 3)  return "hot";         // fills very fast — overwhelmed
  if (days > 20) return "cold";        // fills very slowly — underused
  return "good";                       // 3–20 days — healthy
}

async function seedBins() {
  db.prepare("DELETE FROM bins").run();
  const insert = db.prepare(`INSERT INTO bins (address, full_street, zip_code, lat, lng, campus, notes, trash_fill, recycle_fill) VALUES (@address, @full_street, @zip_code, @lat, @lng, @campus, @notes, @trash_fill, @recycle_fill)`);
  const rows = await readCSV(path.join(DATA_DIR, "geocoded_table.csv"));
  const mapped = rows.map(d => {
    const lat = parseFloat(d["Y"]), lng = parseFloat(d["X"]), zip = (d["Zip Code"] || "").trim();
    if (isNaN(lat) || isNaN(lng)) return null;
    return { address: (d["Address"] || "").trim(), full_street: (d["Full Street"] || "").trim(), zip_code: zip, lat, lng, campus: detectCampus(zip, lat), notes: (d["Location_Notes"] || "").trim(), trash_fill: mockFill(), recycle_fill: mockFill() };
  }).filter(Boolean);
  db.transaction(r => r.forEach(row => insert.run(row)))(mapped);
  console.log(`✅ Seeded ${mapped.length} BU bins`);
}

async function seedCityBins() {
  db.prepare("DELETE FROM city_bins").run();
  const insert = db.prepare(`INSERT INTO city_bins (description, lat, lng) VALUES (@description, @lat, @lng)`);
  const cityFile = fs.readdirSync(DATA_DIR).find(f => f.toLowerCase().includes("city"));
  if (!cityFile) { console.log("⚠️  City bins CSV not found"); return; }
  const rows = await readCSV(path.join(DATA_DIR, cityFile));
  const mapped = rows.map(d => {
    const lat = parseFloat(d["lat"]), lng = parseFloat(d["lon"]);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { description: (d["description"] || "").trim(), lat, lng };
  }).filter(Boolean);
  db.transaction(r => r.forEach(row => insert.run(row)))(mapped);
  console.log(`✅ Seeded ${mapped.length} City of Boston bins`);
}

async function seedHotspots() {
  db.prepare("DELETE FROM hotspot_analysis").run();
  const insert = db.prepare(`
    INSERT INTO hotspot_analysis
      (serial, description, lat, lng, campus,
       waste_days_to_fill, waste_fill_percent, waste_days_to_80,
       recycle_days_to_fill, recycle_fill_percent, recycle_days_to_80,
       hotspot_score, placement_status)
    VALUES
      (@serial, @description, @lat, @lng, @campus,
       @waste_days_to_fill, @waste_fill_percent, @waste_days_to_80,
       @recycle_days_to_fill, @recycle_fill_percent, @recycle_days_to_80,
       @hotspot_score, @placement_status)
  `);

  const hotRows = await readCSV(path.join(DATA_DIR, "location_analysis_hotspots.csv"));
  const geoRows = await readCSV(path.join(DATA_DIR, "geocoded_table.csv"));

  const geoMap = {};
  geoRows.forEach(r => {
    const key = (r["Location_Notes"] || "").trim().toLowerCase();
    geoMap[key] = { lat: parseFloat(r["Y"]), lng: parseFloat(r["X"]), zip: (r["Zip Code"] || "").trim() };
  });

  const bySerial = {};
  hotRows.forEach(r => {
    const serial = r["Serial"].trim();
    if (!bySerial[serial]) bySerial[serial] = { serial, description: r["Description"].trim() };
    const type = r["Stream Type"].trim();
    if (type === "Waste") {
      bySerial[serial].waste_days_to_fill  = parseFloat(r["avg_days_to_fill"])    || null;
      bySerial[serial].waste_fill_percent  = parseFloat(r["avg_fill_percent"])    || null;
      bySerial[serial].waste_days_to_80    = parseFloat(r["estimated_days_to_80"])|| null;
    } else {
      bySerial[serial].recycle_days_to_fill  = parseFloat(r["avg_days_to_fill"])    || null;
      bySerial[serial].recycle_fill_percent  = parseFloat(r["avg_fill_percent"])    || null;
      bySerial[serial].recycle_days_to_80    = parseFloat(r["estimated_days_to_80"])|| null;
    }
  });

  // Hardcoded coordinates for bins that exist in hotspot data but
  // had no matching entry in the geocoded CSV (mostly garage locations)
  const MANUAL_COORDS = {
    "ashford and babcock dock":                          { lat: 42.35180, lng: -71.11680, zip: "02215" },
    "595 comm ave garage p1 west":                      { lat: 42.35012, lng: -71.10912, zip: "02215" },
    "595 comm ave garage p1 east":                      { lat: 42.35015, lng: -71.10905, zip: "02215" },
    "595 comm ave garage p2 west":                      { lat: 42.35008, lng: -71.10918, zip: "02215" },
    "595 comm ave garage p2 east":                      { lat: 42.35010, lng: -71.10910, zip: "02215" },
    "595 comm ave garage p3 west":                      { lat: 42.35005, lng: -71.10922, zip: "02215" },
    "595 comm ave garage p3 east":                      { lat: 42.35007, lng: -71.10915, zip: "02215" },
    "700 comm ave garage - 2b":                         { lat: 42.35060, lng: -71.11050, zip: "02215" },
    "700 comm ave garage - 3a":                         { lat: 42.35062, lng: -71.11048, zip: "02215" },
    "700 comm ave garage - 3b":                         { lat: 42.35064, lng: -71.11045, zip: "02215" },
    "700 comm ave garage - 3c":                         { lat: 42.35066, lng: -71.11042, zip: "02215" },
    "775 comm ave - rear court area":                   { lat: 42.35100, lng: -71.11200, zip: "02215" },
    "new balance field inside gate - 278 babcock st":   { lat: 42.35320, lng: -71.11450, zip: "02215" },
    "agganis arena garage p2 west (weak/no signal-frequent snc)": { lat: 42.35290, lng: -71.11340, zip: "02215" },
  };

  const records = Object.values(bySerial).map(bin => {
    const key = bin.description.toLowerCase();
    const geo = geoMap[key] || MANUAL_COORDS[key];
    const lat = geo?.lat || null, lng = geo?.lng || null, zip = geo?.zip || "";
    const score = computeHotspotScore(
      bin.waste_days_to_fill, bin.waste_fill_percent,
      bin.recycle_days_to_fill, bin.recycle_fill_percent
    );
    const status = classifyPlacement(bin.waste_days_to_fill, bin.recycle_days_to_fill);
    return {
      serial: bin.serial, description: bin.description, lat, lng,
      campus: lat ? detectCampus(zip, lat) : null,
      waste_days_to_fill:   bin.waste_days_to_fill   ?? null,
      waste_fill_percent:   bin.waste_fill_percent   ?? null,
      waste_days_to_80:     bin.waste_days_to_80     ?? null,
      recycle_days_to_fill: bin.recycle_days_to_fill ?? null,
      recycle_fill_percent: bin.recycle_fill_percent ?? null,
      recycle_days_to_80:   bin.recycle_days_to_80   ?? null,
      hotspot_score:        Math.round(score * 10) / 10,
      placement_status:     status,
    };
  });

  db.transaction(r => r.forEach(row => insert.run(row)))(records);

  const hot  = records.filter(r => r.placement_status === "hot").length;
  const good = records.filter(r => r.placement_status === "good").length;
  const cold = records.filter(r => r.placement_status === "cold").length;
  console.log(`✅ Seeded ${records.length} hotspot records`);
  console.log(`   🔴 ${hot} overwhelmed (< 3 days) | 🟢 ${good} well placed (3–20 days) | ⚫ ${cold} underused (> 20 days)`);

  // Print sample for verification
  console.log("\n   Sample bins:");
  records.slice(0, 5).forEach(r => {
    console.log(`   ${r.placement_status.padEnd(4)} | ${(r.waste_days_to_fill ?? "?").toString().padStart(6)} days | score ${r.hotspot_score} | ${r.description.slice(0,40)}`);
  });
}

async function main() {
  console.log("🌱 Starting seed...");
  await seedBins();
  await seedCityBins();
  await seedHotspots();
  console.log("\n🎉 Database ready!");
  db.close();
}

main().catch(err => { console.error("❌ Seed failed:", err); process.exit(1); });