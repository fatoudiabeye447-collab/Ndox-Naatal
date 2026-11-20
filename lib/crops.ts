// lib/crops.ts — Référentiel cultures/phases (port de backend/crops.py)

export const PHASES = [
  { id: "pepiniere", label: "Pépinière" },
  { id: "croissance", label: "Croissance" },
  { id: "floraison", label: "Floraison" },
  { id: "fructification", label: "Fructification" },
  { id: "recolte", label: "Récolte" },
] as const;

export type PhaseId = (typeof PHASES)[number]["id"];

export interface CropDef {
  label: string;
  icon: string;
  moisture: Record<PhaseId, [number, number]>;
  ph: [number, number];
  salinity_max: number;
  n: [number, number];
  p: [number, number];
  k: [number, number];
  tips: string[];
}

export const CROPS: Record<string, CropDef> = {
  tomate: {
    label: "Tomate", icon: "🍅",
    moisture: { pepiniere: [55,75], croissance: [50,70], floraison: [45,65], fructification: [50,70], recolte: [40,60] },
    ph: [6.0, 6.8], salinity_max: 2.5,
    n: [30,60], p: [25,50], k: [40,80],
    tips: [
      "Éviter les arrosages irréguliers à la fructification (risque de fruits fendus).",
      "Le potassium et le calcium comptent beaucoup à partir de la floraison.",
    ],
  },
  oignon: {
    label: "Oignon", icon: "🧅",
    moisture: { pepiniere: [55,75], croissance: [50,70], floraison: [40,60], fructification: [40,60], recolte: [25,45] },
    ph: [6.0, 7.0], salinity_max: 1.2,
    n: [25,55], p: [20,45], k: [35,75],
    tips: [
      "Culture sensible à la salinité : surveiller la conductivité.",
      "Réduire progressivement l'eau à l'approche de la récolte.",
    ],
  },
  riz: {
    label: "Riz", icon: "🌾",
    moisture: { pepiniere: [70,90], croissance: [75,95], floraison: [80,95], fructification: [70,90], recolte: [40,60] },
    ph: [5.5, 6.5], salinity_max: 3.0,
    n: [30,60], p: [15,40], k: [35,75],
    tips: [
      "Le riz demande un sol très humide ; la floraison est la phase la plus sensible au manque d'eau.",
      "Fractionner les apports d'azote plutôt qu'un apport unique.",
    ],
  },
  mil: {
    label: "Mil", icon: "🌿",
    moisture: { pepiniere: [35,55], croissance: [30,50], floraison: [35,55], fructification: [30,50], recolte: [15,35] },
    ph: [5.5, 7.0], salinity_max: 3.0,
    n: [20,50], p: [10,35], k: [30,70],
    tips: [
      "Culture tolérante à la sécheresse : éviter le sur-arrosage.",
      "Un apport d'azote est surtout utile pendant la croissance végétative.",
    ],
  },
  laitue: {
    label: "Laitue", icon: "🥬",
    moisture: { pepiniere: [60,80], croissance: [60,80], floraison: [55,75], fructification: [55,75], recolte: [55,75] },
    ph: [6.0, 7.0], salinity_max: 1.3,
    n: [30,60], p: [25,50], k: [40,80],
    tips: [
      "Racines superficielles : arrosages fréquents et légers.",
      "La laitue se récolte avant floraison ; les phases floraison/fructification sont rarement utilisées.",
    ],
  },
};

export const PHASE_FOCUS: Record<PhaseId, string> = {
  pepiniere: "En pépinière, privilégier de faibles apports et éviter l'excès de sels.",
  croissance: "En croissance, l'azote est le nutriment à surveiller en priorité.",
  floraison: "À la floraison, vérifier le phosphore et le potassium.",
  fructification: "À la fructification, le potassium est déterminant.",
  recolte: "À l'approche de la récolte, éviter tout apport d'engrais azoté.",
};

export const phaseIds = (): PhaseId[] => PHASES.map((p) => p.id);
export const phaseLabel = (pid: string): string => PHASES.find((p) => p.id === pid)?.label ?? pid;
export const moistureRange = (crop: string, phase: string): [number, number] =>
  CROPS[crop]?.moisture[phase as PhaseId] ?? [40, 70];

export function catalog() {
  return {
    phases: PHASES,
    crops: Object.entries(CROPS).map(([id, v]) => ({
      id,
      label: v.label,
      icon: v.icon,
      moisture: Object.fromEntries(
        Object.entries(v.moisture).map(([p, [min, max]]) => [p, { min, max }])
      ),
    })),
  };
}
