import sqlite3
import threading
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "database" / "ndox_naatal.db"
LOCK = threading.RLock()

def connect():
    DB.parent.mkdir(exist_ok=True)
    c = sqlite3.connect(DB, timeout=10)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    with connect() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS esp32_raw(
          id INTEGER PRIMARY KEY AUTOINCREMENT, parcel TEXT NOT NULL, soil_moisture REAL NOT NULL,
          air_temperature REAL NOT NULL, air_humidity REAL NOT NULL, received_at TEXT NOT NULL);
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
        """)

# --- état de la simulation -------------------------------------------------
def get_state():
    import json
    with connect() as c:
        r = c.execute("SELECT value FROM state WHERE key='sim'").fetchone()
        return json.loads(r["value"]) if r else None

def set_state(s):
    import json
    with connect() as c:
        c.execute("INSERT INTO state(key,value) VALUES('sim',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                  (json.dumps(s),))

# --- ESP32 -----------------------------------------------------------------
def save_esp32(d):
    with connect() as c:
        c.execute("INSERT INTO esp32_raw(parcel,soil_moisture,air_temperature,air_humidity,received_at) VALUES(?,?,?,?,?)",
                  (d["parcel"], d["soil_moisture"], d["air_temperature"], d["air_humidity"], d["received_at"]))

def latest_esp32():
    with connect() as c:
        r = c.execute("SELECT * FROM esp32_raw ORDER BY id DESC LIMIT 1").fetchone()
        return dict(r) if r else None

# --- historique ------------------------------------------------------------
READING_COLS = ("ts", "parcel", "crop", "phase", "mode", "soil_moisture", "air_temperature", "air_humidity",
                "ph", "salinity", "nitrogen", "phosphorus", "potassium", "moisture_min", "moisture_max", "pump_on")

def save_reading(d):
    with connect() as c:
        c.execute(f"INSERT INTO readings({','.join(READING_COLS)}) VALUES({','.join('?' * len(READING_COLS))})",
                  tuple(d[k] for k in READING_COLS))

def history(limit):
    with connect() as c:
        return [dict(r) for r in c.execute("SELECT * FROM readings ORDER BY id DESC LIMIT ?", (limit,)).fetchall()]

# --- notifications & événements -------------------------------------------
def add_notification(ts, level, kind, title, message):
    with connect() as c:
        c.execute("INSERT INTO notifications(ts,level,kind,title,message) VALUES(?,?,?,?,?)",
                  (ts, level, kind, title, message))

def list_notifications(limit=40):
    with connect() as c:
        return [dict(r) for r in c.execute("SELECT * FROM notifications ORDER BY id DESC LIMIT ?", (limit,)).fetchall()]

def unread_count():
    with connect() as c:
        return c.execute("SELECT COUNT(*) FROM notifications WHERE is_read=0").fetchone()[0]

def mark_read(nid=None):
    with connect() as c:
        if nid is None:
            c.execute("UPDATE notifications SET is_read=1")
        else:
            c.execute("UPDATE notifications SET is_read=1 WHERE id=?", (nid,))

def add_event(ts, type_, text):
    with connect() as c:
        c.execute("INSERT INTO events(ts,type,text) VALUES(?,?,?)", (ts, type_, text))

def list_events(limit=30):
    with connect() as c:
        return [dict(r) for r in c.execute("SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,)).fetchall()]
