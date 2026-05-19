import { NextRequest, NextResponse } from "next/server";
import { getDeudas, getWorstSituacion } from "@/lib/bcra/client";

export async function POST(req: NextRequest) {
  const { cuil } = await req.json();
  if (!cuil) return NextResponse.json({ error: "Falta el CUIL/CUIT" }, { status: 400 });

  const cuilLimpio = String(cuil).replace(/\D/g, "");
  if (!/^\d{11}$/.test(cuilLimpio)) {
    return NextResponse.json({ error: "CUIL/CUIT inválido" }, { status: 400 });
  }

  try {
    const resp = await getDeudas(cuilLimpio);
    const situacion = getWorstSituacion(resp);

    // Solo se permite situación 1 o 2 (normal o seguimiento especial)
    // Situación 0 = sin deuda registrada → permitir
    // Situación 3+ = irregular/alto riesgo → bloquear
    if (situacion >= 3) {
      return NextResponse.json({
        ok: false,
        error: "Tu perfil crediticio no cumple requisitos mínimos para acceder a un préstamo. Desde ya gracias por contactarnos.",
        bcra_bloqueado: true,
        situacion,
      });
    }

    return NextResponse.json({ ok: true, situacion });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Si el CUIL no figura en el BCRA (sin deuda), permitir
    if (msg.includes("No se encontraron datos")) {
      return NextResponse.json({ ok: true, situacion: 0 });
    }
    // Si la API del BCRA no responde, no bloquear al usuario
    console.error(`[CHECK-BCRA] Error cuil=${cuilLimpio}: ${msg}`);
    return NextResponse.json({ ok: true, situacion: null });
  }
}
