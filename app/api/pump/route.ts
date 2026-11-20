import { NextRequest, NextResponse } from "next/server";
import { setPump } from "@/lib/service";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const [out, code] = await setPump(body?.action);
  return NextResponse.json(out, { status: code });
}
