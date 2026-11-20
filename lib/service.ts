// lib/service.ts — Orchestration (port de backend/service.py)
import * as db from "./database";
import { newState, advance } from "./simulator";
import type { SimState, Esp32Data } from "./simulator";
import { CROPS, moistureRange, phaseIds, phaseLabel } from "./crops";
import { evaluate } from "./logic";

const ESP32_FRESH_S = 35;
const NOTIF_COOLDOWN_S = 300;
const RECORD_EVERY_S = 10;

function iso(ts?: number): string {
  return new Date((ts ?? Date.now() / 1000) * 1000).toISOString();
}

function load(now: number): SimState {
  const st = db.getState() as SimState | null;
  if (!st) {
    const s = newState(now);
    db.setState(s);
    return s;
  }
  return st;
}

function freshEsp32(now: number): Esp32Data | null {
  const r = db.latestEsp32() as Esp32Data & { received_at: string } | null;
  if (!r) return null;
  try {
    const age = now - new Date(r.received_at).getTime() / 1000;
    return age >= 0 && age <= ESP32_FRESH_S ? r : null;
  } catch { return null; }
}

function notify(st: SimState, now: number, kind: string, level: string, title: string, msg: string) {
  const last = st.last_notif[kind] ?? 0;
  if (now - last >= NOTIF_COOLDOWN_S) {
    st.last_notif[kind] = now;
    db.addNotification(iso(now), level, kind, title, msg);
  }
}

export function snapshot() {
  const now = Date.now() / 1000;
  const st = load(now);
  const real = freshEsp32(now);
  const wasMode = st.mode;
  advance(st, now, real);
  let data = evaluate(st, real);
  const [lo, hi] = [data.moisture.min, data.moisture.max];

  if (st.pump_on && st.soil >= hi) {
    st.pump_on = false; st.pump_since = null;
    db.addEvent(iso(now), "pompe", "Pompe arrêtée automatiquement (humidité cible atteinte) — simulé");
    notify(st, now, "target_reached", "success", "Humidité cible atteinte",
      `Humidité ${st.soil.toFixed(1)} % ≥ ${hi} %. La pompe simulée a été arrêtée.`);
    data = evaluate(st, real);
  }

  const mode = data.mode;
  if (wasMode && wasMode !== mode)
    db.addEvent(iso(now), "systeme", mode === "hybride"
      ? "Capteurs ESP32 détectés : mode hybride"
      : "Plus de mesure ESP32 récente : retour à la simulation complète");
  st.mode = mode;

  for (const [kind, level, title, msg] of data._alerts)
    notify(st, now, kind, level, title, msg);
  const nut = data._nut;

  if (now - st.last_record >= RECORD_EVERY_S) {
    st.last_record = now;
    const v = data.values;
    db.saveReading({
      ts: iso(now), parcel: st.parcel, crop: st.crop, phase: st.phase, mode,
      soil_moisture: Math.round(v.soil_moisture * 10) / 10,
      air_temperature: v.air_temperature, air_humidity: v.air_humidity,
      ph: nut.ph, salinity: nut.salinity, nitrogen: nut.nitrogen,
      phosphorus: nut.phosphorus, potassium: nut.potassium,
      moisture_min: lo, moisture_max: hi, pump_on: st.pump_on ? 1 : 0,
    });
  }
  db.setState(st);
  const { _alerts: _a, _nut: _n, ...clean } = data;
  return { ...clean, updated_at: iso(now), unread: db.unreadCount() };
}

export function setPump(action: string): [Record<string, unknown>, number] {
  const now = Date.now() / 1000;
  const st = load(now);
  const real = freshEsp32(now);
  advance(st, now, real);
  const [, hi] = moistureRange(st.crop, st.phase);
  if (action === "start") {
    if (st.pump_on) return [{ ok: true, message: "La pompe est déjà en marche (simulée)." }, 200];
    if (st.soil >= hi) return [{ ok: false, message: `Humidité déjà au-dessus du maximum (${hi} %). Démarrage refusé.` }, 409];
    st.pump_on = true; st.pump_since = iso(now);
    db.addEvent(iso(now), "pompe", "Pompe démarrée manuellement — simulé");
  } else if (action === "stop") {
    if (!st.pump_on) return [{ ok: true, message: "La pompe est déjà à l'arrêt." }, 200];
    st.pump_on = false; st.pump_since = null;
    db.addEvent(iso(now), "pompe", "Pompe arrêtée manuellement — simulé");
  } else return [{ ok: false, message: "action doit être 'start' ou 'stop'" }, 400];
  db.setState(st);
  return [{ ok: true, message: action === "start" ? "Pompe démarrée (simulation)." : "Pompe arrêtée (simulation).", pump_on: st.pump_on }, 200];
}

export function setSettings(body: Record<string, string>): [Record<string, unknown>, number] {
  const { crop, phase } = body;
  if (!CROPS[crop] || !phaseIds().includes(phase as never))
    return [{ ok: false, message: "Culture ou phase invalide" }, 400];
  const now = Date.now() / 1000;
  const st = load(now);
  const changed = st.crop !== crop || st.phase !== phase;
  st.crop = crop; st.phase = phase; st.last_notif = {};
  db.setState(st);
  if (changed) db.addEvent(iso(now), "culture", `${CROPS[crop].label} · phase ${phaseLabel(phase).toLowerCase()} sélectionnées`);
  return [{ ok: true, message: "Culture et phase enregistrées" }, 200];
}

export function resetSimulation(): [Record<string, unknown>, number] {
  const now = Date.now() / 1000;
  const old = load(now);
  db.setState(newState(now, old.crop, old.phase));
  db.addEvent(iso(now), "systeme", "Simulation réinitialisée (sol à 65 %)");
  return [{ ok: true, message: "Simulation réinitialisée" }, 200];
}
