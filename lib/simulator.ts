// lib/simulator.ts — Simulation parcelle (port de backend/simulator.py)

const SPEED = parseFloat(process.env.NDOX_SIM_SPEED ?? "1");
const DRY_PER_MIN = 2.0;
const PUMP_PER_MIN = 12.0;
const N_USE_PER_MIN = 0.25;
const MAX_STEP = 60;

const BASE = {
  ph: 5.8, salinity: 1.7, nitrogen: 45.0,
  phosphorus: 35.0, potassium: 48.0, rain: 0.0,
};

export interface SimState {
  parcel: string;
  crop: string;
  phase: string;
  soil: number;
  temp: number;
  air: number;
  pump_on: boolean;
  pump_since: string | null;
  n_used: number;
  last_ts: number;
  last_record: number;
  last_notif: Record<string, number>;
  mode?: string;
}

export interface Esp32Data {
  soil_moisture: number;
  air_temperature: number;
  air_humidity: number;
  parcel: string;
  received_at: string;
}

export function newState(now: number, crop = "tomate", phase = "croissance"): SimState {
  return {
    parcel: "Parcelle de Miss", crop, phase,
    soil: 65.0, temp: 28.0, air: 65.0,
    pump_on: false, pump_since: null,
    n_used: 0.0, last_ts: now, last_record: 0, last_notif: {},
  };
}

function weather(now: number): [number, number] {
  const d = new Date(now * 1000);
  const h = d.getHours() + d.getMinutes() / 60;
  const wave = Math.sin(2 * Math.PI * (h - 9) / 24);
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  return [
    Math.round((28 + 4 * wave + rand(-0.4, 0.4)) * 10) / 10,
    Math.round(Math.max(20, Math.min(95, 65 - 10 * wave + rand(-1.5, 1.5))) * 10) / 10,
  ];
}

export function advance(st: SimState, now: number, real: Esp32Data | null = null): void {
  const dt = Math.max(0, Math.min(now - st.last_ts, MAX_STEP)) * SPEED;
  st.last_ts = now;
  if (real) {
    st.soil = real.soil_moisture;
    st.temp = real.air_temperature;
    st.air = real.air_humidity;
  } else {
    const [t, a] = weather(now);
    st.temp = t; st.air = a;
    const drying = (DRY_PER_MIN / 60) * (1 + (st.temp - 28) * 0.03);
    const gain = st.pump_on ? PUMP_PER_MIN / 60 : 0;
    st.soil = Math.round(Math.max(0, Math.min(100, st.soil + (gain - drying) * dt)) * 100) / 100;
  }
  st.n_used = Math.min(st.n_used + (N_USE_PER_MIN / 60) * dt, 35.0);
}

export function nutrients(st: SimState) {
  return {
    ph: BASE.ph,
    salinity: BASE.salinity,
    nitrogen: Math.round((BASE.nitrogen - st.n_used) * 10) / 10,
    phosphorus: BASE.phosphorus,
    potassium: BASE.potassium,
    rain: BASE.rain,
  };
}
