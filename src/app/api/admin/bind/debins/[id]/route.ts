import { NextRequest, NextResponse } from "next/server";
import { cancelarDebin, reintentarDebin } from "@/lib/bind/debin";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { accion } = await req.json() as { accion: "cancelar" | "reintentar" };

  try {
    if (accion === "cancelar") {
      await cancelarDebin(id);
      const supabase = createAdminClient();
      await supabase
        .from("cuotas")
        .update({ bind_estado: "cancelado", estado: "fallida" })
        .eq("bind_operacion_id", id);
      return NextResponse.json({ ok: true, accion: "cancelado" });
    }

    if (accion === "reintentar") {
      // Obtener datos de la cuota original para recrear el DEBIN
      const supabase = createAdminClient();
      const { data: cuota } = await supabase
        .from("cuotas")
        .select("monto, user_id, numero_cuota, prestamos(id), usuarios(dni)")
        .eq("bind_operacion_id", id)
        .single();

      if (!cuota) throw new Error("Cuota no encontrada");

      const nuevaRef = `R${Date.now()}`.slice(0, 15);
      const debin = await reintentarDebin({
        cbuDeudor: "",        // se debe obtener del préstamo/solicitud
        monto: cuota.monto,
        concepto: `Reintento cuota ${cuota.numero_cuota}`,
        referencia: id,
        nuevaReferencia: nuevaRef,
      });

      await supabase
        .from("cuotas")
        .update({ bind_estado: "pendiente", estado: "pendiente", bind_operacion_id: debin.id })
        .eq("bind_operacion_id", id);
      return NextResponse.json({ ok: true, accion: "reintentado", debin });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
