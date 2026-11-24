// lib/logic.ts — Évaluation agronomique (port de backend/logic.py)
import { CROPS, PHASE_FOCUS, moistureRange, phaseLabel } from "./crops";
import { nutrients } from "./simulator";
import type { SimState, Esp32Data } from "./simulator";

function rangeStatus(v: number, lo: number, hi: number, low = "bas", high = "élevé") {
  return v < lo ? low : v > hi ? high : "ok";
}

export function evaluate(st: SimState, real: Esp32Data | null) {
  const { crop, phase } = st;
  const c = CROPS[crop];
  const [lo, hi] = moistureRange(crop, phase);
  const nut = nutrients(st);
  const soil = st.soil;
  const soilStatus = soil < lo ? "sec" : soil > hi ? "humide" : "optimal";
  const hybrid = real !== null;
  const sReal = hybrid ? "réel" : "simulé";

  const items: [string, string, number, string, [number, number], string][] = [
    ["ph", "pH du sol", nut.ph, "", c.ph, !(c.ph[0] <= nut.ph && nut.ph <= c.ph[1]) ? "à vérifier" : "ok"],
    ["salinity", "Salinité", nut.salinity, "dS/m", [0, c.salinity_max], nut.salinity > c.salinity_max ? "élevé" : "ok"],
    ["nitrogen", "Azote (N)", nut.nitrogen, "mg/kg", c.n, rangeStatus(nut.nitrogen, ...c.n)],
    ["phosphorus", "Phosphore (P)", nut.phosphorus, "mg/kg", c.p, rangeStatus(nut.phosphorus, ...c.p)],
    ["potassium", "Potassium (K)", nut.potassium, "mg/kg", c.k, rangeStatus(nut.potassium, ...c.k)],
  ];
  const nutrientList = items.map(([key, label, value, unit, [min, max], status]) => ({
    key, label, value, unit, min, max, status, source: "simulé",
  }));

  const alerts: [string, string, string, string][] = [];
  if (soilStatus === "sec" && !st.pump_on)
    alerts.push(["dry_soil", "danger", "Sol sec détecté",
      `Humidité ${soil.toFixed(1)} % sous le seuil minimal (${lo} %) pour ${c.label} en phase ${phaseLabel(phase).toLowerCase()}. Arrosage conseillé.`]);
  if (soilStatus === "humide")
    alerts.push(["wet_soil", "info", "Sol très humide",
      `Humidité ${soil.toFixed(1)} % au-dessus du maximum (${hi} %). Inutile d'arroser.`]);
  for (const n of nutrientList) {
    if (n.status === "ok") continue;
    let msg = "";
    if (n.key === "ph") msg = `pH simulé ${n.value} hors de la plage ${n.min}–${n.max} pour ${c.label}.`;
    else if (n.key === "salinity") msg = `Salinité simulée ${n.value} dS/m au-dessus de ${n.max} dS/m.`;
    else msg = n.status === "bas"
      ? `${n.label} simulé à ${n.value} ${n.unit} (bas, plage ${n.min}–${n.max}). Un apport mérite d'être vérifié.`
      : `${n.label} simulé à ${n.value} ${n.unit}, au-dessus de la plage ${n.min}–${n.max} : éviter tout apport.`;
    alerts.push([`nut_${n.key}`, "warning", `${n.label} à vérifier`, msg]);
  }

  let irr: [string, string];
  if (soilStatus === "sec") irr = ["Arrosage conseillé", `Sol sec : ${soil.toFixed(1)} % pour un minimum de ${lo} %. Démarrez la pompe ou arrosez.`];
  else if (soilStatus === "humide") irr = ["Éviter l'arrosage", `Humidité ${soil.toFixed(1)} % au-dessus du maximum de ${hi} %.`];
  else if (soil < lo + 5) irr = ["Surveiller l'humidité", `Humidité ${soil.toFixed(1)} % proche du minimum (${lo} %).`];
  else irr = ["Humidité adaptée", `${soil.toFixed(1)} % dans la plage cible ${lo}–${hi} % pour la phase ${phaseLabel(phase).toLowerCase()}.`];

  const bad = nutrientList.filter(n => n.status !== "ok");
  const fertTitle = bad.length ? `${bad.length} paramètre(s) à vérifier` : "Nutriments dans la plage cible";
  const fertDetail = [PHASE_FOCUS[phase as keyof typeof PHASE_FOCUS], ...c.tips.slice(0, 1)].join(" ");

  return {
    parcel: st.parcel,
    mode: hybrid ? "hybride" : "simulation",
    crop: { id: crop, label: c.label, icon: c.icon },
    phase: { id: phase, label: phaseLabel(phase) },
    moisture: { min: lo, max: hi, status: soilStatus },
    values: { soil_moisture: soil, air_temperature: st.temp, air_humidity: st.air, rain: nut.rain },
    sources: { soil_moisture: sReal, air_temperature: sReal, air_humidity: sReal, rain: "simulé" },
    nutrients: nutrientList,
    pump: { on: st.pump_on, since: st.pump_since, simulated: true },
    fert_pump: { on: Boolean(st.fert_pump_on), since: st.fert_pump_since ?? null, simulated: true },
    recommendations: {
      irrigation: { title: irr[0], detail: irr[1] },
      fertilisation: { title: fertTitle, detail: fertDetail, tips: c.tips },
    },
    _alerts: alerts,
    _nut: nut,
  };
}
