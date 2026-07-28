export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { obtenerDocumento, obtenerBiometria } from "@/lib/signatura/client";
import { calcularCuotaPersonal, calcularCuotaDiariaComercial } from "@/lib/loan-calculator";
import { enviarPrestamoAprobado } from "@/lib/resend/emails";

/**
 * Webhook de Signatura Connect - Versión Protegida y Completa
 */

function verificarFirmaHMAC(rawBody: string, signatureHeader: string, secret: string): boolean {
  try {
    const sig = signatureHeader.startsWith("sha256=")
      ? signatureHeader.slice(7)
      : signatureHeader;

    const expectedUtf8 = createHmac("sha256", Buffer.from(secret, "utf8")).update(rawBody).digest("hex");
    if (sig.length === expectedUtf8.length &&
        timingSafeEqual(Buffer.from(expectedUtf8, "utf8"), Buffer.from(sig, "utf8"))) {
      return true;
    }
    const secretBytes = Buffer.from(secret, "hex");
    if (secretBytes.length > 0) {
      const expectedHex = createHmac("sha256", secretBytes).update(rawBody).digest("hex");
      if (sig.length === expectedHex.length &&
          timingSafeEqual(Buffer.from(expectedHex, "utf8"), Buffer.from(sig, "utf8"))) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verificación HMAC-SHA256
    const signatureHeader =
      request.headers.get("x-signature-sha256") ??
      request.headers.get("x-signatura-signature") ??
      request.headers.get("x-hub-signature-256") ??
      "";
    const secretHex = process.env.SIGNATURA_WEBHOOK_SECRET ?? "";

    // ── MITIGACIÓN VUL-08 ──────────────────────────────────────────────────
    // Se elimina la variable SIGNATURA_SKIP_HMAC de producción.
    // Solo se permite saltear de forma pasiva en ambiente local estricto si falta la key.
    const esEntornoDesarrollo = process.env.NODE_ENV === "development";
    const skipHmac = esEntornoDesarrollo && !secretHex;

    if (!skipHmac) {
      if (!secretHex) {
        console.error("[Signatura webhook] Error: SIGNATURA_WEBHOOK_SECRET ausente en el entorno.");
        return NextResponse.json({ ok: false, error: "Error de configuración interna" }, { status: 500 });
      }

      if (!signatureHeader) {
        console.warn("[Signatura webhook] Solicitud rechazada: Header de firma ausente.");
        return NextResponse.json({ ok: false }, { status: 401 });
      }

      if (!verificarFirmaHMAC(rawBody, signatureHeader, secretHex)) {
        console.warn("[Signatura webhook] Solicitud rechazada: Firma inválida.");
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);

    const accion: string = body.notification_action ?? "";
    const documentoId: string = body.document_id ?? "";
    const signatureId: string = body.signature_id ?? "";
    const newStatus: string = body.new_status ?? "";

    console.log("[Signatura webhook]", { accion, documentoId, signatureId, newStatus });

    if (!documentoId) return NextResponse.json({ ok: true });

    const supabase = createAdminClient();

    const { data: solicitud, error: fetchErr } = await supabase
      .from("solicitudes")
      .select("id, user_id, contrato_firmado, estado, monto, plazo, cuotas, cbu, plan_id, historial_estados")
      .eq("signatura_documento_id", documentoId)
      .single();

    // Loguear evento en signatura_eventos
    await supabase.from("signatura_eventos").insert({
      notification_action: accion,
      document_id: documentoId,
      signature_id: signatureId || null,
      new_status: newStatus || null,
      raw_payload: body,
      solicitud_id: solicitud?.id ?? null,
      procesado: !fetchErr && !!solicitud,
      error_msg: fetchErr ? "Solicitud no encontrada" : null,
    });

    if (fetchErr || !solicitud) {
      console.warn("[Signatura webhook] Solicitud no encontrada para documento:", documentoId);
      return NextResponse.json({ ok: true });
    }

    const esFirmado =
      accion === "DS" ||
      (accion === "DC" && newStatus === "CO");

    const esRechazado =
      accion === "SD" ||
      (accion === "DC" && newStatus === "CA");

    if (esRechazado) {
      await supabase
        .from("solicitudes")
        .update({ contrato_firmado: false })
        .eq("id", solicitud.id);
      console.log("[Signatura webhook] Firma rechazada/cancelada:", solicitud.id);
      return NextResponse.json({ ok: true });
    }

    if (esFirmado && !solicitud.contrato_firmado) {
      let downloadUrl: string | null = null;
      let firmadoAt = new Date().toISOString();

      try {
        const doc = await obtenerDocumento(documentoId);
        downloadUrl = doc.download_url ?? null;
        if (doc.completed_at) firmadoAt = doc.completed_at;
        if (!signatureId && doc.signatures?.[0]?.id) {
          (body as Record<string, string>).signature_id = doc.signatures[0].id;
        }
      } catch (e) {
        console.warn("[Signatura webhook] Error obteniendo documento:", e);
      }

      const sid = signatureId || (body as Record<string, string>).signature_id;
      let biometria: Record<string, unknown> | null = null;
      if (sid) {
        try {
          const bio = await obtenerBiometria(sid);
          biometria = {
            nombre_completo: bio.full_name,
            numero_documento: bio.document_number,
            pais: bio.country,
            fotos: bio.photos,
            intentos: bio.attempts,
            verificado_at: firmadoAt,
          };
        } catch (e) {
          console.warn("[Signatura webhook] Sin datos biométricos:", e);
        }
      }

      // ── Crear préstamo automáticamente si no existe ──────────────────────
      let prestamoId: string | null = null;
      const yaAprobado = ["aprobado", "activo", "completado"].includes(solicitud.estado);

      if (!yaAprobado && solicitud.plan_id) {
        try {
          const { data: prestamoExistente } = await supabase
            .from("prestamos")
            .select("id")
            .eq("solicitud_id", solicitud.id)
            .maybeSingle();

          if (!prestamoExistente) {
            const { data: planRaw } = await supabase
              .from("planes")
              .select("tipo, tem, ted")
              .eq("id", solicitud.plan_id)
              .single();

            const plan = planRaw as { tipo: string; tem: number | null; ted: number | null } | null;
            const esPyme = plan?.tipo === "pyme";
            const ahora = new Date();

            let cuotaMonto: number;
            if (esPyme && plan?.ted != null) {
              cuotaMonto = Math.round(calcularCuotaDiariaComercial(solicitud.monto, plan.ted, solicitud.plazo));
            } else if (!esPyme && plan?.tem != null) {
              cuotaMonto = Math.round(calcularCuotaPersonal(solicitud.monto, plan.tem, solicitud.cuotas));
            } else {
              cuotaMonto = Math.round(solicitud.monto / (solicitud.cuotas || solicitud.plazo));
            }

            const cantidadCuotas = esPyme ? solicitud.plazo : solicitud.cuotas;
            const totalAPagar = cuotaMonto * cantidadCuotas;

            const proximoVencimiento = esPyme
              ? new Date(ahora.getTime() + 1 * 24 * 60 * 60 * 1000)
              : new Date(ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate());

            const { data: prestamo } = await supabase
              .from("prestamos")
              .insert({
                solicitud_id: solicitud.id,
                user_id: solicitud.user_id,
                plan_id: solicitud.plan_id,
                capital_original: solicitud.monto,
                saldo_remanente: totalAPagar,
                total_abonado: 0,
                cuotas_monto: cuotaMonto,
                cuotas_total: cantidadCuotas,
                cuotas_pagadas: 0,
                proximo_vencimiento: proximoVencimiento.toISOString().split("T")[0],
,              })
              .select("id")
              .single();

            if (prestamo) {
              prestamoId = prestamo.id;

              const cuotasInsert = Array.from({ length: cantidadCuotas }, (_, i) => {
                const vto = esPyme
                  ? new Date(ahora.getTime() + (i + 1) * 24 * 60 * 60 * 1000)
                  : new Date(ahora.getFullYear(), ahora.getMonth() + i + 1, ahora.getDate());
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

              await supabase.from("cuotas").insert(cuotasInsert);
              console.log("[Signatura webhook] Préstamo creado:", prestamo.id);

              try {
                const { data: cliente } = await supabase
                  .from("usuarios")
                  .select("email, nombre")
                  .eq("id", solicitud.user_id)
                  .single();

                if (cliente?.email) {
                  enviarPrestamoAprobado({
                    email: cliente.email,
                    nombre: cliente.nombre ?? "Cliente",
                    monto: solicitud.monto,
                    cuotas: cantidadCuotas,
                    cuotaMonto,
                    primerVencimiento: proximoVencimiento,
                    tipoPlan: esPyme ? "pyme" : "personal",
                  }).catch(() => {});
                }
              } catch { /* no-op */ }
            }
          } else {
            prestamoId = prestamoExistente.id;
          }
        } catch (e) {
