export const dynamic = "force-dynamic";

/**
 * POST /api/solicitudes/[id]/aprobar
 *
 * Dos modos:
 *   - BindX activo (BINDX_ACCOUNT_ID configurado y is_fondos_propios !== true):
 *       acreditarPrestamo() → asignarCVU() → INSERT prestamo + cuotas
 *   - Manual (fondos propios o sin BindX):
 *       requiere comprobante_transferencia → INSERT prestamo + cuotas
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { calcularCuotaPersonal, calcularCuotaDiariaComercial } from "@/lib/loan-calculator";
import { enviarPrestamoAprobado } from "@/lib/resend/emails";
import { acreditarPrestamo } from "@/lib/bind/transferencias";
import { asignarCVU, uuidToClientId } from "@/lib/bind/cvu";
import type { Plan } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // 1. Verificar token admin
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let adminId: string;
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error("Token inválido");

    const { data: usuario } = await supabase
      .from("usuarios").select("role").eq("id", user.id).single();

    if (usuario?.role !== "admin")
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    adminId = user.id;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  // 2. Obtener solicitud
  const { data: solicitud } = await supabase
    .from("solicitudes").select("*").eq("id", id).single();

  if (!solicitud)
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });

  if (!["pendiente", "en_revision", "pre_aprobado", "pausado"].includes(solicitud.estado))
    return NextResponse.json(
      { error: `No se puede aprobar una solicitud en estado "${solicitud.estado}"` },
      { status: 409 }
    );

  // 3. Obtener plan
  const { data: planRaw } = await supabase
    .from("planes").select("*").eq("id", solicitud.plan_id).single();

  if (!planRaw)
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });

  const plan = planRaw as Plan;

  // 4. Leer body
  const body = await request.json().catch(() => ({})) as {
    comprobante?: string;
    notas?: string;
    is_fondos_propios?: boolean;
  };

  // Decidir modo: BindX automático vs manual con comprobante
  // BINDX_ACTIVE=true es el switch explícito — BINDX_ACCOUNT_ID solo no alcanza
  const usarBindX = process.env.BINDX_ACTIVE === "true" && !!process.env.BINDX_ACCOUNT_ID && !body.is_fondos_propios;

  if (!usarBindX && !body.comprobante?.trim()) {
    return NextResponse.json({ error: "El comprobante de transferencia es obligatorio" }, { status: 400 });
  }

  if (usarBindX && !solicitud.cbu) {
    return NextResponse.json({ error: "El cliente no tiene CBU registrado" }, { status: 400 });
  }

  // 5. Si usa BindX → acreditar préstamo primero (antes de crear registros en DB)
  let bindTransferenciaId: string | undefined;
  let comprobanteGuardar = body.comprobante?.trim();

  if (usarBindX) {
    try {
      const transferencia = await acreditarPrestamo({
        cbuDestino: solicitud.cbu,
        monto: solicitud.monto,
        concepto: `Zprest Prestamo ${id.slice(0, 8)}`,
        referencia: id,
      });

      if (transferencia.estado === "rechazada") {
        throw new Error("BindX rechazó la transferencia saliente");
      }

      bindTransferenciaId = transferencia.id;
      comprobanteGuardar = `BindX:${transferencia.id}`;
      console.log(`Préstamo acreditado vía BindX: ${transferencia.id} — estado: ${transferencia.estado}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      console.error("Error acreditando préstamo en BindX:", err);
      return NextResponse.json(
        { error: `Error al acreditar préstamo: ${msg}` },
        { status: 502 }
      );
    }
  }

  // 6. Calcular cuotas según tipo de plan
  const esPyme = plan.tipo === "pyme";
  const ahora  = new Date();

  let cuotaMonto: number;
  let cuotasInsert: {
    prestamo_id: string;
    user_id: string;
    numero_cuota: number;
    monto: number;
    fecha_vencimiento: string;
    estado: string;
    reintentos_count: number;
  }[] = [];

  if (esPyme && plan.ted != null) {
    cuotaMonto = Math.round(calcularCuotaDiariaComercial(solicitud.monto, plan.ted, solicitud.plazo));
  } else if (!esPyme && plan.tem != null) {
    cuotaMonto = Math.round(calcularCuotaPersonal(solicitud.monto, plan.tem, solicitud.cuotas));
  } else {
    cuotaMonto = Math.round(solicitud.monto / solicitud.cuotas);
  }

  const totalAPagar = cuotaMonto * solicitud.cuotas;

  // 7. Crear préstamo
  const proximoVencimiento = esPyme
    ? new Date(ahora.getTime() + 1 * 24 * 60 * 60 * 1000)
    : new Date(ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate());

  const { data: prestamo, error: prestamoError } = await supabase
    .from("prestamos")
    .insert({
      solicitud_id: id,
      user_id: solicitud.user_id,
      plan_id: solicitud.plan_id,
      capital_original: solicitud.monto,
      saldo_remanente: totalAPagar,
      total_abonado: 0,
      cuotas_monto: cuotaMonto,
      cuotas_total: solicitud.cuotas,
      cuotas_pagadas: 0,
      proximo_vencimiento: proximoVencimiento.toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (prestamoError || !prestamo)
    return NextResponse.json({ error: "Error creando préstamo" }, { status: 500 });

  // 8. Generar cuotas
  if (esPyme) {
    cuotasInsert = Array.from({ length: solicitud.cuotas }, (_, i) => {
      const vto = new Date(ahora);
      vto.setDate(vto.getDate() + i + 1);
      return {
        prestamo_id: prestamo.id,
        user_id: solicitud.user_id,
        numero_cuota: i + 1,
        monto: cuotaMonto,
        fecha_vencimiento: vto.toISOString().split("T")[0],
        estado: "pendiente",
        reintentos_count: 0,
      };
    });
  } else {
    cuotasInsert = Array.from({ length: solicitud.cuotas }, (_, i) => {
      const vto = new Date(ahora.getFullYear(), ahora.getMonth() + i + 1, ahora.getDate());
      return {
        prestamo_id: prestamo.id,
        user_id: solicitud.user_id,
        numero_cuota: i + 1,
        monto: cuotaMonto,
        fecha_vencimiento: vto.toISOString().split("T")[0],
        estado: "pendiente",
        reintentos_count: 0,
      };
    });
  }

  const { error: cuotasError } = await supabase.from("cuotas").insert(cuotasInsert);
  if (cuotasError) {
    await supabase.from("prestamos").delete().eq("id", prestamo.id);
    return NextResponse.json({ error: "Error creando cuotas" }, { status: 500 });
  }

  // 9. Asignar CVU (solo con BindX, no crítico — falla silenciosamente)
  if (usarBindX && bindTransferenciaId) {
    try {
      const { data: clienteData } = await supabase
        .from("usuarios")
        .select("nombre")
        .eq("id", solicitud.user_id)
        .single();

      // CUIL: intentar desde solicitud (si existe columna), sino omitir CVU
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cuil = (solicitud as any).cuil_cuit ?? (solicitud as any).cuil ?? "";

      if (cuil) {
        const cvu = await asignarCVU({
          clienteId: uuidToClientId(solicitud.user_id),
          cuit: cuil,
          nombre: clienteData?.nombre ?? "Cliente Zprest",
        });

        await supabase.from("billeteras").upsert(
          {
            user_id: solicitud.user_id,
            cvu,
            saldo_disponible: 0,
            saldo_retenido: 0,
            bind_account_id: process.env.BINDX_ACCOUNT_ID,
          },
          { onConflict: "user_id" }
        );

        console.log(`CVU asignado para ${solicitud.user_id}: ${cvu}`);
      } else {
        console.warn(`Sin CUIL para user ${solicitud.user_id} — CVU no asignado`);
      }
    } catch (cvuErr) {
      console.warn("asignarCVU falló (no crítico):", cvuErr);
    }
  }

  // 10. Historial de estados
  const historialActual = (solicitud.historial_estados as unknown[] ?? []);

  // 11. Marcar solicitud como aprobada
  const { error: updateErr } = await supabase.from("solicitudes").update({
    estado: "aprobado",
    comprobante_transferencia: comprobanteGuardar,
    notas_admin: body.notas ?? null,
    updated_at: new Date().toISOString(),
    historial_estados: [...historialActual, {
      estado: "aprobado",
      fecha: new Date().toISOString(),
      admin_id: adminId,
      motivo: usarBindX
        ? `Acreditado vía BindX: ${bindTransferenciaId}`
        : `Comprobante: ${comprobanteGuardar}`,
    }],
  }).eq("id", id);

  if (updateErr) {
    console.error("Error actualizando estado solicitud:", updateErr);
    // Intentar al menos actualizar solo el estado
    await supabase.from("solicitudes").update({ estado: "aprobado" }).eq("id", id);
  }

  // 12. Log actividad
  await supabase.from("actividad_admin").insert({
    admin_id: adminId,
    accion: "aprobar_solicitud",
    entidad_tipo: "solicitud",
    entidad_id: id,
    detalle: usarBindX
      ? `Aprobado con BindX. Transferencia: ${bindTransferenciaId}. Préstamo: ${prestamo.id}`
      : `Aprobado manual. Comprobante: ${comprobanteGuardar}. Préstamo: ${prestamo.id}`,
  });

  // 13. Email (no bloqueante)
  try {
    const { data: cliente } = await supabase
      .from("usuarios").select("email, nombre").eq("id", solicitud.user_id).single();

    if (cliente?.email) {
      const primerVto = new Date(cuotasInsert[0].fecha_vencimiento);
      enviarPrestamoAprobado({
        email: cliente.email,
        nombre: cliente.nombre ?? "Cliente",
        monto: solicitud.monto,
        cuotas: solicitud.cuotas,
        cuotaMonto,
        primerVencimiento: primerVto,
        tipoPlan: esPyme ? "pyme" : "personal",
      }).catch(() => {});
    }
  } catch { /* no-op */ }

  return NextResponse.json({
    ok: true,
    prestamoId: prestamo.id,
    modo: usarBindX ? "bindx" : "manual",
    ...(bindTransferenciaId && { bindTransferenciaId }),
  });
}
