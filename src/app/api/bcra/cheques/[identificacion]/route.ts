import { NextResponse } from "next/server";
import { getChequesRechazados } from "@/lib/bcra/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ identificacion: string }> }
) {
  try {
    const { identificacion } = await params;

    if (!identificacion || identificacion.length < 7) {
      return NextResponse.json({ error: "Identificación inválida" }, { status: 400 });
    }

    const data = await getChequesRechazados(identificacion);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
