import { NextResponse } from "next/server";
import { catalog } from "@/lib/crops";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(catalog()); }
