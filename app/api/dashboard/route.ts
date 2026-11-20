import { NextResponse } from "next/server";
import { snapshot } from "@/lib/service";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(snapshot()); }
