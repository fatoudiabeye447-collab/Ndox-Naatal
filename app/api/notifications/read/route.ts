import { NextRequest, NextResponse } from "next/server";
import { markRead, unreadCount } from "@/lib/database";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  await markRead(body?.id);
  return NextResponse.json({ ok: true, unread: await unreadCount() });
}
