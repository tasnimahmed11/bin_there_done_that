// Run with: npm run seed
// This reads both CSVs and populates the SQLite database

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import csv from "csv-parser";
import db from "./database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = path.join(__dirname, "../data");

// ── Campus detection ──────────────────────────────────────────────────────────
function detectCampus(zip, lat) {
  if (zip === "02118") return "medical";
  if (zip === "02215" && lat < 42.348) return "fenway";
  return "charles-river";
}

// ── Random mock fill level (replace with real sensor data) ────────────────────
function mockFill() {
  return Math.floor(Math.random() * 100);
}

// ── Seed BU Big Belly bins ────────────────────────────────────────────────────
function seedBins() {
  return new Promise((resolve, reject) => {
    // Clear existing data
    db.prepare("DELETE FROM bins").run();

    const insert = db.prepare(`
      INSERT INTO bins (address, full_street, zip_code, lat, lng, campus, notes, trash_fill, recycle_fill)
      VALUES (@address, @full_street, @zip_code, @lat, @lng, @campus, @notes, @trash_fill, @recycle_fill)
    `);

    const insertMany = db.transaction((rows) => {
      for (const row of rows) insert.run(row);
    });

    const rows = [];
    const csvPath = path.join(DATA_DIR, "geocoded_table.csv");

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (data) => {
        const lat = parseFloat(data["Y"]);
        const lng = parseFloat(data["X"]);
        const zip = (data["Zip Code"] || "").trim();

        if (isNaN(lat) || isNaN(lng)) return;

        rows.push({
          address:      (data["Address"]        || "").trim(),
          full_street:  (data["Full Street"]    || "").trim(),
          zip_code:     zip,
          lat,
          lng,
          campus:       detectCampus(zip, lat),
          notes:        (data["Location_Notes"] || "").trim(),
          trash_fill:   mockFill(),
          recycle_fill: mockFill(),
        });
      })
      .on("end", () => {
        insertMany(rows);
        console.log(`✅ Seeded ${rows.length} BU bins`);
        resolve(rows.length);
      })
      .on("error", reject);
  });
}

// ── Seed City of Boston bins ──────────────────────────────────────────────────
function seedCityBins() {
  return new Promise((resolve, reject) => {
    db.prepare("DELETE FROM city_bins").run();

    const insert = db.prepare(`
      INSERT INTO city_bins (description, lat, lng)
      VALUES (@description, @lat, @lng)
    `);

    const insertMany = db.transaction((rows) => {
      for (const row of rows) insert.run(row);
    });

    const rows = [];
    const csvPath = path.join(DATA_DIR, "city of boston_big_belly_locations_on or near BU campuses.csv");

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (data) => {
        const lat = parseFloat(data["lat"]);
        const lng = parseFloat(data["lon"]);
        if (isNaN(lat) || isNaN(lng)) return;

        rows.push({
          description: (data["description"] || "").trim(),
          lat,
          lng,
        });
      })
      .on("end", () => {
        insertMany(rows);
        console.log(`✅ Seeded ${rows.length} City of Boston bins`);
        resolve(rows.length);
      })
      .on("error", reject);
  });
}

// ── Run ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Starting seed...");
  await seedBins();
  await seedCityBins();
  console.log("🎉 Database ready!");
  db.close();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
