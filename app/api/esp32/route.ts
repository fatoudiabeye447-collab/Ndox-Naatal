import { NextRequest, NextResponse } from "next/server";
import { saveEsp32, getState } from "@/lib/database";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  let v: Record<string, number>;
  try {
    v = { soil_moisture: parseFloat(body.soil_moisture), air_temperature: parseFloat(body.air_temperature), air_humidity: parseFloat(body.air_humidity) };
    if (Object.values(v).some(isNaN)) throw new Error();
  } catch { return NextResponse.json({ error: "soil_moisture, air_temperature et air_humidity sont requis" }, { status: 400 }); }
  if (v.soil_moisture < 0 || v.soil_moisture > 100 || v.air_humidity < 0 || v.air_humidity > 100 || v.air_temperature < -10 || v.air_temperature > 70)
    return NextResponse.json({ error: "Valeurs hors limites" }, { status: 400 });
  const rec = { ...v, parcel: String(body.parcel ?? "Parcelle de Miss").slice(0, 80), received_at: new Date().toISOString() };
  saveEsp32(rec);
  const st = getState() as Record<string, unknown> | null ?? {};
  return NextResponse.json({ ok: true, message: "Mesures ESP32 enregistrées", received_at: rec.received_at,
    pump_command: st.pump_on ? "on" : "off", pump_simulated: true }, { status: 201 });
}
