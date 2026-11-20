import { NextRequest, NextResponse } from "next/server";
import { listNotifications, unreadCount } from "@/lib/database";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "40");
  return NextResponse.json({ items: listNotifications(limit), unread: unreadCount() });
}
