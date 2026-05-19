import { NextRequest, NextResponse } from "next/server";
import { getMovimientos } from "@/lib/bind/client";

export async function GET(req: NextRequest) {
  const limite = Number(req.nextUrl.searchParams.get("limite") ?? "20");
  try {
    const movimientos = await getMovimientos(limite);
    return NextResponse.json({ movimientos });
  } catch (error) {
    return NextResponse.json(
      { movimientos: [], error: error instanceof Error ? error.message : "Error" }
    );
  }
}
