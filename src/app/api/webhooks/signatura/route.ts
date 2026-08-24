export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

// IMPORTAMOS LAS FUNCIONES OFICIALES DE CÁLCULO
import { calcularCuotaPersonal, calcularCuotaDiariaComercial } from "@/lib/loan-calculator";

function verificarFirmaHMAC(rawBody: string, signatureHeader: string, secret: string): boolean {
  try {
    const sig = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
    const expectedUtf8 = createHmac("sha256", Buffer.from(secret, "utf8")).update(rawBody).digest("hex");
    if (sig.length === expectedUtf8.length && timingSafeEqual(Buffer.from(expectedUtf8, "utf8"), Buffer.from(sig, "utf8")))
      return true;
    const secretBytes = Buffer.from(secret, "hex");
    if (secretBytes.length > 0) {
      const expectedHex = createHmac("sha256", secretBytes).update(rawBody).digest("hex");
      if (sig.length === expectedHex.length && timingSafeEqual(Buffer.from(expectedHex, "utf8"), Buffer.from(sig, "utf8")))
        return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signatureHeader =
      request.headers.get("x-signature-sha256") ??
      request.headers.get("x-signatura-signature") ??
      request.headers.get("x-hub-signature-256") ??
      "";
    const secretHex = process.env.SIGNATURA_WEBHOOK_SECRET ?? "";
    const esEntornoDesarrollo = process.env.NODE_ENV === "development";
    const skipHmac = esEntornoDesarrollo && !secretHex;

    if (!skipHmac) {
      if (!secretHex || !signatureHeader || !verificarFirmaHMAC(rawBody, signatureHeader, secretHex)) {
        console.warn("[Signatura webhook] Rechazado por firma inválida o falta de configuración.");
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    const accion: string = body.notification_action ?? "";
    const documentoId: string = body.document_id ?? "";

    if (!documentoId) return NextResponse.json({ ok: true });

    const supabase = createAdminClient();

    const { data: solicitud, error: fetchErr } = await supabase
      .from("solicitudes")
      .select("*")
      .eq("signatura_documento_id", documentoId)
      .single();

    if (fetchErr || !solicitud) {
      console.warn("[Signatura webhook] Solicitud no encontrada para documento:", documentoId);
      return NextResponse.json({ ok: true });
    }

    const esFirmado = accion === "DS" || (accion === "DC" && body.new_status === "CO");
    const esRechazado = accion === "SD" || (accion === "DC" && body.new_status === "CA");

    if (esRechazado) {
      await supabase.from("solicitudes").update({ contrato_firmado: false }).eq("id", solicitud.id);
      return NextResponse.json({ ok: true });
    }

    if (esFirmado) {
      const yaAprobado = ["aprobado", "activo", "completado"].includes(solicitud.estado);

      // 1. Actualización del estado de la solicitud
      await supabase
        .from("solicitudes")
        .update({
          contrato_firmado: true,
          contrato_firmado_at: new Date().toISOString(),
        })
        .eq("id", solicitud.id);

      if (!yaAprobado) {
        const historialActual = Array.isArray(solicitud.historial_estados) ? solicitud.historial_estados : [];
        await supabase
          .from("solicitudes")
          .update({
            estado: "aprobado",
            comprobante_transferencia: "pendiente_transferencia_manual",
            historial_estados: [
              ...historialActual,
              {
                estado: "aprobado",
                fecha: new Date().toISOString(),
                motivo: `Contrato firmado vía Signatura de forma segura.`,
              },
            ],
          })
          .eq("id", solicitud.id);
      }

      // Traer los datos del plan para usar sus tasas
      const { data: plan } = await supabase
        .from("planes")
        .select("*")
        .eq("id", solicitud.plan_id)
        .single();

      if (!plan) {
        console.error("[Signatura webhook] Plan no encontrado para el cálculo de cuotas.");
        return NextResponse.json({ ok: false, error: "Plan no encontrado" }, { status: 400 });
      }

      const cuotasTotal = Number(solicitud.cuotas) || 1;
      const montoCapital = Number(solicitud.monto);
      
      // CALCULAR LA CUOTA EXACTA CON TU FUNCIÓN
      let montoCuota = 0;
      if (plan.tipo === "personal") {
         montoCuota = calcularCuotaPersonal(montoCapital, plan.tem, cuotasTotal);
      } else if (plan.tipo === "pyme") {
         montoCuota = calcularCuotaDiariaComercial(montoCapital, plan.ted, cuotasTotal);
      } else {
         // Fallback por si hay otro tipo
         montoCuota = Math.round(montoCapital / cuotasTotal);
      }

      // 2. Verificar si el préstamo ya existe
      const { data: prestamoExistente } = await supabase
        .from("prestamos")
        .select("id")
        .eq("solicitud_id", solicitud.id)
        .maybeSingle();

      let prestamoId = prestamoExistente?.id;

      if (!prestamoExistente) {
        // 3. Crear el registro en la tabla de préstamos
        const { data: nuevoPrestamo, error: errorPrestamo } = await supabase
          .from("prestamos")
          .insert({
            solicitud_id: solicitud.id,
            user_id: solicitud.user_id,
            plan_id: solicitud.plan_id,
            capital_original: montoCapital,
            saldo_remanente: montoCapital,
            cuotas_monto: montoCuota,
            cuotas_total: cuotasTotal
          })
          .select("id")
          .single();

        if (errorPrestamo) {
          console.error("[Signatura webhook] Error al insertar el préstamo:", errorPrestamo);
        } else {
          prestamoId = nuevoPrestamo?.id;
        }
      }

      // 4. Generar las cuotas automáticamente
      if (prestamoId) {
        const { count: cuotasCount } = await supabase
          .from("cuotas")
          .select("*", { count: "exact", head: true })
          .eq("prestamo_id", prestamoId);

        if (!cuotasCount || cuotasCount === 0) {
          const cuotasARegistrar = [];
          let fechaActual = new Date();

          for (let i = 1; i <= cuotasTotal; i++) {
            fechaActual.setDate(fechaActual.getDate() + 1);
            if (fechaActual.getDay() === 0) {
              // Salto de domingos
              fechaActual.setDate(fechaActual.getDate() + 1);
            }

            cuotasARegistrar.push({
              prestamo_id: prestamoId,
              user_id: solicitud.user_id,
              numero_cuota: i,
              monto: montoCuota,
              fecha_vencimiento: fechaActual.toISOString().split("T")[0],
              estado: "pendiente",
            });
          }

          const { error: errorCuotas } = await supabase
            .from("cuotas")
            .insert(cuotasARegistrar);

          if (errorCuotas) {
            console.error("[Signatura webhook] Error al generar las cuotas:", errorCuotas);
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Signatura webhook] Error crítico:", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
