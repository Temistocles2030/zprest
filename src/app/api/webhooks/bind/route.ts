export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/bind
 *
 * CRÍTICO: Verifica firma HMAC antes de procesar cualquier evento.
 * Eventos reales de BindX:
 *   - transfer.cvu.received  → pago voluntario al CVU del cliente (principal)
 *   - debin.acredited        → DEBIN cobrado exitosamente
 *   - debin.rejected         → DEBIN rechazado por el cliente
 *   - debin.refunded         → DEBIN disputado/devuelto
 *   - endpoint.created       → validación de registro del webhook
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { enviarCuotaFallida } from "@/lib/resend/emails";
import type {
  BindWebhookEnvelope,
  BindTransferCVUReceived,
  BindDebinEvent,
} from "@/lib/bind/types";

function verificarFirmaHMAC(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Bind-Signature") ?? "";
  const secret = process.env.BINDX_WEBHOOK_SECRET;

  if (!secret) {
    // Sin secreto configurado: ignorar silenciosamente (no exponer info)
    console.error("BINDX_WEBHOOK_SECRET no configurado — webhook ignorado");
    return NextResponse.json({ recibido: true });
  }

  if (!verificarFirmaHMAC(rawBody, signature, secret)) {
    // Responder 200 para no dar info al atacante, pero no procesar
    console.warn("Webhook BindX: firma HMAC inválida");
    return NextResponse.json({ recibido: true });
  }

  let envelope: BindWebhookEnvelope;
  try {
    envelope = JSON.parse(rawBody) as BindWebhookEnvelope;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const { type, data } = envelope;
  const supabase = createAdminClient();

  // ── Validación de registro ─────────────────────────────────────────────────
  if (type === "endpoint.created") {
    console.log("Webhook BindX registrado correctamente");
    return NextResponse.json({ recibido: true });
  }

  try {
    // ── CVU recibió un pago (cliente transfirió voluntariamente) ───────────────
    if (type === "transfer.cvu.received") {
      const transfer = data as BindTransferCVUReceived;
      const cvu = transfer.details?.origin_credit?.cvu;
      const monto = transfer.charge?.value?.amount ?? 0;

      if (!cvu || !monto) {
        console.warn("transfer.cvu.received sin CVU o monto", data);
        return NextResponse.json({ recibido: true });
      }

      // Buscar préstamo del cliente por CVU en tabla billeteras
      const { data: billetera } = await supabase
        .from("billeteras")
        .select("user_id, id")
        .eq("cvu", cvu)
        .single();

      if (!billetera) {
        console.warn(`CVU ${cvu} no encontrado en billeteras`);
        return NextResponse.json({ recibido: true });
      }

      // Aplicar pago a la próxima cuota pendiente del usuario
      await aplicarPagoACuota(supabase, billetera.user_id, monto, transfer.id);
    }

    // ── DEBIN cobrado ──────────────────────────────────────────────────────────
    else if (type === "debin.acredited") {
      const debin = data as BindDebinEvent;
      const originId = debin.details?.origin_id;
      const monto = debin.charge?.value?.amount ?? 0;

      await marcarCuotaPagada(supabase, originId, monto);
    }

    // ── DEBIN rechazado ────────────────────────────────────────────────────────
    else if (type === "debin.rejected" || type === "debin.refunded") {
      const debin = data as BindDebinEvent;
      const originId = debin.details?.origin_id;

      await marcarCuotaFallida(supabase, originId);
    }

    else {
      console.log(`Evento BindX no manejado: ${type}`);
    }

    return NextResponse.json({ recibido: true });
  } catch (error) {
    console.error("Error procesando webhook BindX:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function aplicarPagoACuota(supabase: any, userId: string, monto: number, transactionId: string) {
  // Buscar la próxima cuota pendiente
  const { data: cuotas } = await supabase
    .from("cuotas")
    .select("id, prestamo_id, monto, numero_cuota")
    .eq("user_id", userId)
    .eq("estado", "pendiente")
    .order("fecha_vencimiento", { ascending: true })
    .limit(1);

  if (!cuotas?.length) {
    console.log(`No hay cuotas pendientes para user ${userId}, pago de $${monto} registrado sin aplicar`);
    return;
  }

  const cuota = cuotas[0];

  await supabase.from("cuotas").update({
    estado: "pagada",
    bind_operacion_id: transactionId,
    bind_estado: "COMPLETED",
    fecha_pago: new Date().toISOString(),
  }).eq("id", cuota.id);

  await actualizarSaldoPrestamo(supabase, cuota.prestamo_id, monto);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function marcarCuotaPagada(supabase: any, originId: string, monto: number) {
  const { data: cuotas } = await supabase
    .from("cuotas")
    .select("id, prestamo_id, reintentos_count")
    .eq("bind_operacion_id", originId)
    .limit(1);

  if (!cuotas?.length) {
    console.warn(`Cuota no encontrada para origin_id ${originId}`);
    return;
  }

  const cuota = cuotas[0];
  await supabase.from("cuotas").update({
    estado: "pagada",
    bind_estado: "COMPLETED",
    fecha_pago: new Date().toISOString(),
  }).eq("id", cuota.id);

  await actualizarSaldoPrestamo(supabase, cuota.prestamo_id, monto);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function marcarCuotaFallida(supabase: any, originId: string) {
  const { data: cuotas } = await supabase
    .from("cuotas")
    .select("id, prestamo_id, reintentos_count, numero_cuota, monto, usuarios(email, nombre)")
    .eq("bind_operacion_id", originId)
    .limit(1);

  if (!cuotas?.length) return;

  const cuota = cuotas[0];
  await supabase.from("cuotas").update({
    estado: "fallida",
    bind_estado: "REJECTED_CLIENT",
    reintentos_count: cuota.reintentos_count + 1,
  }).eq("id", cuota.id);

  const usuario = Array.isArray(cuota.usuarios) ? cuota.usuarios[0] : cuota.usuarios;
  if (usuario?.email) {
    enviarCuotaFallida({
      email: usuario.email,
      nombre: usuario.nombre ?? "Cliente",
      numeroCuota: cuota.numero_cuota,
      monto: cuota.monto,
    }).catch((e: unknown) => console.error("Error email cuota fallida:", e));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function actualizarSaldoPrestamo(supabase: any, prestamoId: string, monto: number) {
  const { data: prestamo } = await supabase
    .from("prestamos")
    .select("total_abonado, saldo_remanente, cuotas_pagadas")
    .eq("id", prestamoId)
    .single();

  if (!prestamo) return;

  await supabase.from("prestamos").update({
    total_abonado: prestamo.total_abonado + monto,
    saldo_remanente: Math.max(0, prestamo.saldo_remanente - monto),
    cuotas_pagadas: prestamo.cuotas_pagadas + 1,
    updated_at: new Date().toISOString(),
  }).eq("id", prestamoId);
}
