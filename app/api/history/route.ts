import { NextRequest, NextResponse } from "next/server";
import { history, listEvents } from "@/lib/database";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 1), 500);
  return NextResponse.json({ readings: await history(limit), events: await listEvents(30) });
}
