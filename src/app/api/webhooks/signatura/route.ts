export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

function verificarFirmaHMAC(rawBody: string, signatureHeader: string, secret: string): boolean {
  try {
    const sig = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
    const expectedUtf8 = createHmac("sha256", Buffer.from(secret, "utf8")).update(rawBody).digest("hex");
    if (sig.length === expectedUtf8.length && timingSafeEqual(Buffer.from(expectedUtf8, "utf8"), Buffer.from(sig, "utf8"))) return true;
    const secretBytes = Buffer.from(secret, "hex");
    if (secretBytes.length > 0) {
      const expectedHex = createHmac("sha256", secretBytes).update(rawBody).digest("hex");
      if (sig.length === expectedHex.length && timingSafeEqual(Buffer.from(expectedHex, "utf8"), Buffer.from(sig, "utf8"))) return true;
    }
    return false;
  } catch { return false; }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-signature-sha256") ?? request.headers.get("x-signatura-signature") ?? request.headers.get("x-hub-signature-256") ?? "";
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
    const { data: solicitud, error: fetchErr } = await supabase.from("solicitudes").select("id, estado, historial_estados").eq("signatura_documento_id", documentoId).single();

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
      
      // Actualización de estado básica y robusta del contrato
      await supabase.from("solicitudes").update({
        contrato_firmado: true,
        contrato_firmado_at: new Date().toISOString(),
      }).eq("id", solicitud.id);

      if (!yaAprobado) {
        const historialActual = Array.isArray(solicitud.historial_estados) ? solicitud.historial_estados : [];
        await supabase.from("solicitudes").update({
          estado: "aprobado",
          comprobante_transferencia: "pendiente_transferencia_manual",
          historial_estados: [...historialActual, {
            estado: "aprobado",
            fecha: new Date().toISOString(),
            motivo: `Contrato firmado vía Signatura de forma segura.`,
          }],
        }).eq("id", solicitud.id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Signatura webhook] Error crítico:", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
