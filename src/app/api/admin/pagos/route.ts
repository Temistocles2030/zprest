export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const METODOS_VALIDOS = ["efectivo", "tarjeta", "mercadopago", "transferencia", "debin"];

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const { data: me } = await supabase.from("usuarios").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const body = await request.json();
  const { cuota_ids, metodo_pago, comprobante, monto_recibido } = body;

  if (!cuota_ids?.length) return NextResponse.json({ error: "No se seleccionaron cuotas" }, { status: 400 });
  if (!metodo_pago || !METODOS_VALIDOS.includes(metodo_pago)) {
    return NextResponse.json({ error: "Método de pago inválido" }, { status: 400 });
  }

  // Verificar que las cuotas existen y no están ya pagadas
  const { data: cuotas, error: cuotasError } = await supabase
    .from("cuotas")
    .select("id, prestamo_id, monto, estado")
    .in("id", cuota_ids);

  if (cuotasError || !cuotas?.length) {
    return NextResponse.json({ error: "Cuotas no encontradas" }, { status: 404 });
  }

  const yaPagadas = cuotas.filter(c => c.estado === "pagada");
  if (yaPagadas.length > 0) {
    return NextResponse.json({ error: `${yaPagadas.length} cuota(s) ya están pagadas` }, { status: 400 });
  }

  const ahora = new Date().toISOString();

  // Marcar cuotas como pagadas
  const { error: updateError } = await supabase
    .from("cuotas")
    .update({
      estado: "pagada",
      fecha_pago: ahora,
      metodo_pago,
      comprobante: comprobante || null,
      registrado_por: user.id,
    })
    .in("id", cuota_ids);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Recalcular stats de cada préstamo afectado
  const prestamoIds = [...new Set(cuotas.map(c => c.prestamo_id))];

  for (const prestamo_id of prestamoIds) {
    const { data: todas } = await supabase
      .from("cuotas")
      .select("monto, estado, fecha_vencimiento")
      .eq("prestamo_id", prestamo_id);

    if (!todas) continue;

    const pagadas = todas.filter(c => c.estado === "pagada");
    const pendientes = todas.filter(c => c.estado !== "pagada");
    const totalAbonado = pagadas.reduce((a, c) => a + c.monto, 0);
    const saldoRemanente = pendientes.reduce((a, c) => a + c.monto, 0);
    const proximoVencimiento = pendientes
      .map(c => c.fecha_vencimiento)
      .sort()[0] ?? null;

    await supabase
      .from("prestamos")
      .update({
        cuotas_pagadas: pagadas.length,
        total_abonado: totalAbonado,
        saldo_remanente: saldoRemanente,
        proximo_vencimiento: proximoVencimiento,
        updated_at: ahora,
      })
      .eq("id", prestamo_id);
  }

  void supabase.from("actividad_admin").insert({
    admin_id: user.id,
    accion: "registrar_pago",
    entidad_tipo: "cuota",
    entidad_id: cuota_ids[0],
    detalle: {
      cuota_ids,
      metodo_pago,
      comprobante: comprobante || null,
      monto_recibido: monto_recibido || 0,
      cuotas_count: cuota_ids.length,
    },
  });

  return NextResponse.json({ ok: true, cuotas_pagadas: cuota_ids.length });
}
