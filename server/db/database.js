import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "ecohack.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// ── BU Big Belly bins (with sensor data) ──────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS bins (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    address     TEXT NOT NULL,
    full_street TEXT,
    zip_code    TEXT,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL,
    campus      TEXT NOT NULL,
    notes       TEXT,
    -- Mock fill data (replace with real sensor data when available)
    trash_fill  INTEGER DEFAULT 0,
    recycle_fill INTEGER DEFAULT 0,
    last_updated TEXT DEFAULT (datetime('now'))
  );
`);

// ── City of Boston bins (display only, no sensor data) ────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS city_bins (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL
  );
`);

// ── Route history (for future algorithm output) ───────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS routes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    campus      TEXT NOT NULL,
    bin_order   TEXT NOT NULL,  -- JSON array of bin IDs in pickup order
    total_dist  REAL,
    est_minutes INTEGER,
    created_at  TEXT DEFAULT (datetime('now'))
  );
`);

export default db;
