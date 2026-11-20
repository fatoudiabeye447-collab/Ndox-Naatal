import { NextRequest, NextResponse } from "next/server";
import { setSettings } from "@/lib/service";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const [out, code] = setSettings(body);
  return NextResponse.json(out, { status: code });
}
