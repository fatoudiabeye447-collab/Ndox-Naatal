// lib/database.ts — Support hybride : Vercel Postgres (cloud persistant) + Fallback local
import fs from "fs";
import path from "path";
import { sql } from "@vercel/postgres";

const isPostgresConfigured = (): boolean => {
  return Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);
};

let pgInitialized = false;

async function ensurePgTables(): Promise<void> {
  if (pgInitialized) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS esp32_raw (
        id SERIAL PRIMARY KEY,
        parcel VARCHAR(100) NOT NULL,
        soil_moisture DOUBLE PRECISION NOT NULL,
        air_temperature DOUBLE PRECISION NOT NULL,
        air_humidity DOUBLE PRECISION NOT NULL,
        received_at VARCHAR(60) NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS readings (
        id SERIAL PRIMARY KEY,
        ts VARCHAR(60) NOT NULL,
        parcel VARCHAR(100) NOT NULL,
        crop VARCHAR(50) NOT NULL,
        phase VARCHAR(50) NOT NULL,
        mode VARCHAR(50) NOT NULL,
        soil_moisture DOUBLE PRECISION,
        air_temperature DOUBLE PRECISION,
        air_humidity DOUBLE PRECISION,
        ph DOUBLE PRECISION,
        salinity DOUBLE PRECISION,
        nitrogen DOUBLE PRECISION,
        phosphorus DOUBLE PRECISION,
        potassium DOUBLE PRECISION,
        moisture_min DOUBLE PRECISION,
        moisture_max DOUBLE PRECISION,
        pump_on INTEGER NOT NULL DEFAULT 0
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        ts VARCHAR(60) NOT NULL,
        level VARCHAR(30) NOT NULL,
        kind VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        simulated INTEGER NOT NULL DEFAULT 1
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        ts VARCHAR(60) NOT NULL,
        type VARCHAR(50) NOT NULL,
        text TEXT NOT NULL,
        simulated INTEGER NOT NULL DEFAULT 1
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS state (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `;
    pgInitialized = true;
  } catch (err) {
    console.error("Vercel Postgres table initialization error:", err);
  }
}

/* ==========================================================================
   Store Local / Temporaire (Fallback)
   ========================================================================== */
export interface Esp32Record {
  id: number;
  parcel: string;
  soil_moisture: number;
  air_temperature: number;
  air_humidity: number;
  received_at: string;
}

export interface ReadingRecord {
  id: number;
  ts: string;
  parcel: string;
  crop: string;
  phase: string;
  mode: string;
  soil_moisture: number;
  air_temperature: number;
  air_humidity: number;
  ph: number;
  salinity: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  moisture_min: number;
  moisture_max: number;
  pump_on: number;
}

export interface NotificationRecord {
  id: number;
  ts: string;
  level: string;
  kind: string;
  title: string;
  message: string;
  is_read: number;
  simulated: number;
}

export interface EventRecord {
  id: number;
  ts: string;
  type: string;
  text: string;
  simulated: number;
}

interface DbStore {
  esp32_raw: Esp32Record[];
  readings: ReadingRecord[];
  notifications: NotificationRecord[];
  events: EventRecord[];
  state: Record<string, unknown>;
  nextId: { esp32: number; readings: number; notifications: number; events: number };
}

const DB_DIR = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "database");
const DB_FILE = path.join(DB_DIR, "ndox_naatal_store.json");

let memoryStore: DbStore | null = null;

function getLocalStore(): DbStore {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      memoryStore = JSON.parse(data);
      return memoryStore!;
    }
  } catch (err) {
    console.error("Error reading DB_FILE:", err);
  }
  memoryStore = {
    esp32_raw: [],
    readings: [],
    notifications: [],
    events: [],
    state: {},
    nextId: { esp32: 1, readings: 1, notifications: 1, events: 1 },
  };
  return memoryStore;
}

function saveLocalStore() {
  if (!memoryStore) return;
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryStore, null, 2), "utf-8");
  } catch {
    // Non-bloquant
  }
}

/* ==========================================================================
   Méthodes Publiques (Postgres ou Local automatique)
   ========================================================================== */

// --- État simulation ---
export async function getState(): Promise<Record<string, unknown> | null> {
  if (isPostgresConfigured()) {
    try {
      await ensurePgTables();
      const { rows } = await sql`SELECT value FROM state WHERE key = 'sim' LIMIT 1;`;
      return rows.length ? JSON.parse(rows[0].value) : null;
    } catch {
      // Fallback
    }
  }
  const store = getLocalStore();
  const val = store.state["sim"];
  return (val as Record<string, unknown>) ?? null;
}

export async function setState(s: unknown): Promise<void> {
  if (isPostgresConfigured()) {
    try {
      await ensurePgTables();
      const val = JSON.stringify(s);
      await sql`
        INSERT INTO state (key, value)
        VALUES ('sim', ${val})
        ON CONFLICT (key) DO UPDATE SET value = ${val};
      `;
      return;
    } catch {
      // Fallback
    }
  }
  const store = getLocalStore();
  store.state["sim"] = s;
  saveLocalStore();
}

// --- ESP32 ---
export async function saveEsp32(d: Record<string, unknown>): Promise<void> {
  if (isPostgresConfigured()) {
    try {
      await ensurePgTables();
      await sql`
        INSERT INTO esp32_raw (parcel, soil_moisture, air_temperature, air_humidity, received_at)
        VALUES (${String(d.parcel)}, ${Number(d.soil_moisture)}, ${Number(d.air_temperature)}, ${Number(d.air_humidity)}, ${String(d.received_at)});
      `;
      return;
    } catch {
      // Fallback
    }
  }
  const store = getLocalStore();
  const rec: Esp32Record = {
    id: store.nextId.esp32++,
    parcel: String(d.parcel || ""),
    soil_moisture: Number(d.soil_moisture),
    air_temperature: Number(d.air_temperature),
    air_humidity: Number(d.air_humidity),
    received_at: String(d.received_at),
  };
  store.esp32_raw.push(rec);
  saveLocalStore();
}

export async function latestEsp32(): Promise<Record<string, unknown> | null> {
  if (isPostgresConfigured()) {
    try {
      await ensurePgTables();
      const { rows } = await sql`SELECT * FROM esp32_raw ORDER BY id DESC LIMIT 1;`;
      return rows.length ? (rows[0] as Record<string, unknown>) : null;
    } catch {
      // Fallback
    }
  }
  const store = getLocalStore();
  const list = store.esp32_raw;
  return list.length ? (list[list.length - 1] as unknown as Record<string, unknown>) : null;
}

// --- Historique ---
export async function saveReading(d: Record<string, unknown>): Promise<void> {
  if (isPostgresConfigured()) {
    try {
      await ensurePgTables();
      await sql`
        INSERT INTO readings (
          ts, parcel, crop, phase, mode, soil_moisture, air_temperature, air_humidity,
          ph, salinity, nitrogen, phosphorus, potassium, moisture_min, moisture_max, pump_on
        ) VALUES (
          ${String(d.ts)}, ${String(d.parcel)}, ${String(d.crop)}, ${String(d.phase)}, ${String(d.mode)},
          ${Number(d.soil_moisture)}, ${Number(d.air_temperature)}, ${Number(d.air_humidity)},
          ${Number(d.ph)}, ${Number(d.salinity)}, ${Number(d.nitrogen)}, ${Number(d.phosphorus)},
          ${Number(d.potassium)}, ${Number(d.moisture_min)}, ${Number(d.moisture_max)}, ${Number(d.pump_on)}
        );
      `;
      return;
    } catch {
      // Fallback
    }
  }
  const store = getLocalStore();
  const rec: ReadingRecord = {
    id: store.nextId.readings++,
    ts: String(d.ts),
    parcel: String(d.parcel),
    crop: String(d.crop),
    phase: String(d.phase),
    mode: String(d.mode),
    soil_moisture: Number(d.soil_moisture),
    air_temperature: Number(d.air_temperature),
    air_humidity: Number(d.air_humidity),
    ph: Number(d.ph),
    salinity: Number(d.salinity),
    nitrogen: Number(d.nitrogen),
    phosphorus: Number(d.phosphorus),
    potassium: Number(d.potassium),
    moisture_min: Number(d.moisture_min),
    moisture_max: Number(d.moisture_max),
    pump_on: Number(d.pump_on),
  };
  store.readings.push(rec);
  saveLocalStore();
}

export async function history(limit: number): Promise<Record<string, unknown>[]> {
  if (isPostgresConfigured()) {
    try {
      await ensurePgTables();
      const { rows } = await sql`SELECT * FROM readings ORDER BY id DESC LIMIT ${limit};`;
      return rows as Record<string, unknown>[];
    } catch {
      // Fallback
    }
  }
  const store = getLocalStore();
  const res = [...store.readings].reverse().slice(0, limit);
  return res as unknown as Record<string, unknown>[];
}

// --- Notifications ---
export async function addNotification(
  ts: string,
  level: string,
  kind: string,
  title: string,
  message: string
): Promise<void> {
  if (isPostgresConfigured()) {
    try {
      await ensurePgTables();
      await sql`
        INSERT INTO notifications (ts, level, kind, title, message)
        VALUES (${ts}, ${level}, ${kind}, ${title}, ${message});
      `;
      return;
    } catch {
      // Fallback
    }
  }
  const store = getLocalStore();
  const rec: NotificationRecord = {
    id: store.nextId.notifications++,
    ts,
    level,
    kind,
    title,
    message,
    is_read: 0,
    simulated: 1,
  };
  store.notifications.push(rec);
  saveLocalStore();
}

export async function listNotifications(limit = 40): Promise<Record<string, unknown>[]> {
  if (isPostgresConfigured()) {
    try {
      await ensurePgTables();
      const { rows } = await sql`SELECT * FROM notifications ORDER BY id DESC LIMIT ${limit};`;
      return rows as Record<string, unknown>[];
    } catch {
      // Fallback
    }
  }
  const store = getLocalStore();
  const res = [...store.notifications].reverse().slice(0, limit);
  return res as unknown as Record<string, unknown>[];
}

export async function unreadCount(): Promise<number> {
  if (isPostgresConfigured()) {
    try {
      await ensurePgTables();
      const { rows } = await sql`SELECT COUNT(*)::int as count FROM notifications WHERE is_read = 0;`;
      return rows[0]?.count ?? 0;
    } catch {
      // Fallback
    }
  }
  const store = getLocalStore();
  return store.notifications.filter((n) => n.is_read === 0).length;
}

export async function markRead(nid?: number): Promise<void> {
  if (isPostgresConfigured()) {
    try {
      await ensurePgTables();
      if (nid == null) {
        await sql`UPDATE notifications SET is_read = 1;`;
      } else {
        await sql`UPDATE notifications SET is_read = 1 WHERE id = ${nid};`;
      }
      return;
    } catch {
      // Fallback
    }
  }
  const store = getLocalStore();
  if (nid == null) {
    store.notifications.forEach((n) => (n.is_read = 1));
  } else {
    const item = store.notifications.find((n) => n.id === nid);
    if (item) item.is_read = 1;
  }
  saveLocalStore();
}

// --- Événements ---
export async function addEvent(ts: string, type_: string, text: string): Promise<void> {
  if (isPostgresConfigured()) {
    try {
      await ensurePgTables();
      await sql`
        INSERT INTO events (ts, type, text)
        VALUES (${ts}, ${type_}, ${text});
      `;
      return;
    } catch {
      // Fallback
    }
  }
  const store = getLocalStore();
  const rec: EventRecord = {
    id: store.nextId.events++,
    ts,
    type: type_,
    text,
    simulated: 1,
  };
  store.events.push(rec);
  saveLocalStore();
}

export async function listEvents(limit = 30): Promise<Record<string, unknown>[]> {
  if (isPostgresConfigured()) {
    try {
      await ensurePgTables();
      const { rows } = await sql`SELECT * FROM events ORDER BY id DESC LIMIT ${limit};`;
      return rows as Record<string, unknown>[];
    } catch {
      // Fallback
    }
  }
  const store = getLocalStore();
  const res = [...store.events].reverse().slice(0, limit);
  return res as unknown as Record<string, unknown>[];
}
