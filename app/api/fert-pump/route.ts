import { NextRequest, NextResponse } from "next/server";
import { setFertPump } from "@/lib/service";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const [out, code] = await setFertPump(body?.action);
  return NextResponse.json(out, { status: code });
}
