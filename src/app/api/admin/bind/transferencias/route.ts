import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { acreditarPrestamo } from "@/lib/bind/transferencias";

export async function GET() {
  const supabase = createAdminClient();

  // Lee solicitudes aprobadas con bind_transferencia_id (historial de acreditaciones)
  const { data, error } = await supabase
    .from("solicitudes")
    .select("id, monto, cbu, bind_transferencia_id, estado, created_at, usuarios(nombre, email)")
    .not("bind_transferencia_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ transferencias: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { cbu_destino, monto, concepto } = await req.json() as {
    cbu_destino: string;
    monto: number;
    concepto: string;
  };

  if (!cbu_destino || !monto || !concepto) {
    return NextResponse.json({ error: "cbu_destino, monto y concepto son requeridos" }, { status: 400 });
  }

  if (cbu_destino.length !== 22) {
    return NextResponse.json({ error: "CBU debe tener 22 dígitos" }, { status: 400 });
  }

  try {
    const transferencia = await acreditarPrestamo({
      cbuDestino: cbu_destino,
      monto,
      concepto,
      referencia: `M${Date.now()}`.slice(0, 15),
    });
    return NextResponse.json({ ok: true, transferencia });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
