import { NextResponse } from "next/server";
import { resetSimulation } from "@/lib/service";
export const dynamic = "force-dynamic";
export async function POST() {
  const [out, code] = resetSimulation();
  return NextResponse.json(out, { status: code });
}
