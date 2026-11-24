// lib/database.ts — Stockage données fiable pour Vercel (zéro dépendance native)
import fs from "fs";
import path from "path";

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
  fert_pump_on?: number;
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
  nextId: {
    esp32: number;
    readings: number;
    notifications: number;
    events: number;
  };
}

const DB_DIR = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "database");
const DB_FILE = path.join(DB_DIR, "ndox_naatal_store.json");

const g = globalThis as unknown as {
  __ndoxStore?: DbStore;
  __ndoxMtime?: number;
  __ndoxLock?: Promise<unknown>;
};

export async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = g.__ndoxLock ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((res) => {
    release = res;
  });
  g.__ndoxLock = prev.then(() => next, () => next);
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

function getStore(): DbStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const mtime = fs.statSync(DB_FILE).mtimeMs;
      if (!g.__ndoxStore || g.__ndoxMtime !== mtime) {
        const data = fs.readFileSync(DB_FILE, "utf-8");
        g.__ndoxStore = JSON.parse(data);
        g.__ndoxMtime = mtime;
      }
      return g.__ndoxStore!;
    }
  } catch (err) {
    console.error("Error reading DB_FILE:", err);
  }

  if (g.__ndoxStore) return g.__ndoxStore;

  g.__ndoxStore = {
    esp32_raw: [],
    readings: [],
    notifications: [],
    events: [],
    state: {},
    nextId: { esp32: 1, readings: 1, notifications: 1, events: 1 },
  };
  return g.__ndoxStore;
}

function saveStore() {
  if (!g.__ndoxStore) return;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(g.__ndoxStore, null, 2), "utf-8");
    g.__ndoxMtime = fs.statSync(DB_FILE).mtimeMs;
  } catch {
    // Non-fatal if /tmp write fails
  }
}

// --- État simulation ---
export async function getState(): Promise<Record<string, unknown> | null> {
  const store = getStore();
  const val = store.state["sim"];
  return (val as Record<string, unknown>) ?? null;
}

export async function setState(s: unknown): Promise<void> {
  const store = getStore();
  store.state["sim"] = s;
  saveStore();
}

// --- ESP32 ---
export async function saveEsp32(d: Record<string, unknown>): Promise<void> {
  const store = getStore();
  const rec: Esp32Record = {
    id: store.nextId.esp32++,
    parcel: String(d.parcel || ""),
    soil_moisture: Number(d.soil_moisture),
    air_temperature: Number(d.air_temperature),
    air_humidity: Number(d.air_humidity),
    received_at: String(d.received_at),
  };
  store.esp32_raw.push(rec);
  saveStore();
}

export async function latestEsp32(): Promise<Record<string, unknown> | null> {
  const store = getStore();
  const list = store.esp32_raw;
  return list.length ? (list[list.length - 1] as unknown as Record<string, unknown>) : null;
}

// --- Historique ---
export async function saveReading(d: Record<string, unknown>): Promise<void> {
  const store = getStore();
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
    fert_pump_on: Number(d.fert_pump_on ?? 0),
  };
  store.readings.push(rec);
  saveStore();
}

export async function history(limit: number): Promise<Record<string, unknown>[]> {
  const store = getStore();
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
  const store = getStore();
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
  saveStore();
}

export async function listNotifications(limit = 40): Promise<Record<string, unknown>[]> {
  const store = getStore();
  const res = [...store.notifications].reverse().slice(0, limit);
  return res as unknown as Record<string, unknown>[];
}

export async function unreadCount(): Promise<number> {
  const store = getStore();
  return store.notifications.filter((n) => n.is_read === 0).length;
}

export async function markRead(nid?: number): Promise<void> {
  const store = getStore();
  if (nid == null) {
    store.notifications.forEach((n) => (n.is_read = 1));
  } else {
    const item = store.notifications.find((n) => n.id === nid);
    if (item) item.is_read = 1;
  }
  saveStore();
}

// --- Événements ---
export async function addEvent(ts: string, type_: string, text: string): Promise<void> {
  const store = getStore();
  const rec: EventRecord = {
    id: store.nextId.events++,
    ts,
    type: type_,
    text,
    simulated: 1,
  };
  store.events.push(rec);
  saveStore();
}

export async function listEvents(limit = 30): Promise<Record<string, unknown>[]> {
  const store = getStore();
  const res = [...store.events].reverse().slice(0, limit);
  return res as unknown as Record<string, unknown>[];
}
