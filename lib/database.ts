// lib/database.ts — SQLite via better-sqlite3 (compatible Vercel /tmp)
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "database");
const DB_PATH = path.join(DB_DIR, "ndox_naatal.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS esp32_raw(
      id INTEGER PRIMARY KEY AUTOINCREMENT, parcel TEXT NOT NULL,
      soil_moisture REAL NOT NULL, air_temperature REAL NOT NULL,
      air_humidity REAL NOT NULL, received_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS readings(
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, parcel TEXT NOT NULL,
      crop TEXT NOT NULL, phase TEXT NOT NULL, mode TEXT NOT NULL,
      soil_moisture REAL, air_temperature REAL, air_humidity REAL,
      ph REAL, salinity REAL, nitrogen REAL, phosphorus REAL, potassium REAL,
      moisture_min REAL, moisture_max REAL, pump_on INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS notifications(
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, level TEXT NOT NULL,
      kind TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0, simulated INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS events(
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, type TEXT NOT NULL,
      text TEXT NOT NULL, simulated INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS state(key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  return _db;
}

// --- État simulation ---
export function getState(): Record<string, unknown> | null {
  const row = getDb().prepare("SELECT value FROM state WHERE key='sim'").get() as { value: string } | undefined;
  return row ? JSON.parse(row.value) : null;
}
export function setState(s: unknown): void {
  getDb().prepare("INSERT INTO state(key,value) VALUES('sim',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(s));
}

// --- ESP32 ---
export function saveEsp32(d: Record<string, unknown>): void {
  getDb().prepare("INSERT INTO esp32_raw(parcel,soil_moisture,air_temperature,air_humidity,received_at) VALUES(?,?,?,?,?)")
    .run(d.parcel, d.soil_moisture, d.air_temperature, d.air_humidity, d.received_at);
}
export function latestEsp32(): Record<string, unknown> | null {
  const r = getDb().prepare("SELECT * FROM esp32_raw ORDER BY id DESC LIMIT 1").get();
  return r ? (r as Record<string, unknown>) : null;
}

// --- Historique ---
const READING_COLS = ["ts","parcel","crop","phase","mode","soil_moisture","air_temperature","air_humidity","ph","salinity","nitrogen","phosphorus","potassium","moisture_min","moisture_max","pump_on"];
export function saveReading(d: Record<string, unknown>): void {
  getDb().prepare(`INSERT INTO readings(${READING_COLS.join(",")}) VALUES(${READING_COLS.map(()=>"?").join(",")})`)
    .run(...READING_COLS.map(k => d[k]));
}
export function history(limit: number): Record<string, unknown>[] {
  return getDb().prepare("SELECT * FROM readings ORDER BY id DESC LIMIT ?").all(limit) as Record<string, unknown>[];
}

// --- Notifications ---
export function addNotification(ts: string, level: string, kind: string, title: string, message: string): void {
  getDb().prepare("INSERT INTO notifications(ts,level,kind,title,message) VALUES(?,?,?,?,?)").run(ts,level,kind,title,message);
}
export function listNotifications(limit = 40): Record<string, unknown>[] {
  return getDb().prepare("SELECT * FROM notifications ORDER BY id DESC LIMIT ?").all(limit) as Record<string, unknown>[];
}
export function unreadCount(): number {
  return (getDb().prepare("SELECT COUNT(*) as c FROM notifications WHERE is_read=0").get() as {c:number}).c;
}
export function markRead(nid?: number): void {
  if (nid == null) getDb().prepare("UPDATE notifications SET is_read=1").run();
  else getDb().prepare("UPDATE notifications SET is_read=1 WHERE id=?").run(nid);
}

// --- Événements ---
export function addEvent(ts: string, type_: string, text: string): void {
  getDb().prepare("INSERT INTO events(ts,type,text) VALUES(?,?,?)").run(ts, type_, text);
}
export function listEvents(limit = 30): Record<string, unknown>[] {
  return getDb().prepare("SELECT * FROM events ORDER BY id DESC LIMIT ?").all(limit) as Record<string, unknown>[];
}
