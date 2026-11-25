import { NextRequest, NextResponse } from "next/server";
import { snapshot } from "@/lib/service";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const crop = searchParams.get("crop") || undefined;
  const phase = searchParams.get("phase") || undefined;
  const data = await snapshot(crop, phase);
  return NextResponse.json(data);
}
