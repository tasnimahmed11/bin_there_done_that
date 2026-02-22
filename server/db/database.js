import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "ecohack.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS bins (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    address      TEXT NOT NULL,
    full_street  TEXT,
    zip_code     TEXT,
    lat          REAL NOT NULL,
    lng          REAL NOT NULL,
    campus       TEXT NOT NULL,
    notes        TEXT,
    trash_fill   INTEGER DEFAULT 0,
    recycle_fill INTEGER DEFAULT 0,
    last_updated TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS city_bins (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS hotspot_analysis (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    serial               TEXT,
    description          TEXT NOT NULL,
    lat                  REAL,
    lng                  REAL,
    campus               TEXT,
    waste_days_to_fill   REAL,
    waste_fill_percent   REAL,
    waste_days_to_80     REAL,
    recycle_days_to_fill REAL,
    recycle_fill_percent REAL,
    recycle_days_to_80   REAL,
    hotspot_score        REAL,
    placement_status     TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS routes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    campus      TEXT NOT NULL,
    bin_order   TEXT NOT NULL,
    total_dist  REAL,
    est_minutes INTEGER,
    created_at  TEXT DEFAULT (datetime('now'))
  );
`);

export default db;