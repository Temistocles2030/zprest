export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { obtenerDocumento, obtenerBiometria } from "@/lib/signatura/client";

async function getAdmin(request: NextRequest) {
  const supabase = createAdminClient();
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: me } = await supabase.from("usuarios").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return null;
  return { supabase, adminId: user.id };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAdmin(request);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { supabase, adminId } = ctx;

  const { data: solicitud, error: fetchErr } = await supabase
    .from("solicitudes")
    .select("id, signatura_documento_id, contrato_firmado, user_id")
    .eq("id", id)
    .single();

  if (fetchErr || !solicitud) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (!solicitud.signatura_documento_id) {
    return NextResponse.json({ error: "Esta solicitud no tiene contrato enviado a Signatura" }, { status: 400 });
  }

  if (solicitud.contrato_firmado) {
    return NextResponse.json({ firmado: true, mensaje: "El contrato ya estaba marcado como firmado" });
  }

  // Consultar estado real en Signatura
  let doc;
  try {
    doc = await obtenerDocumento(solicitud.signatura_documento_id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error consultando Signatura";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // status "CO" es completado en Signatura
  const estaFirmado =
    doc.status === "CO" ||
    doc.status === "completed" ||
    doc.status === "signed" ||
    doc.signatures?.every((s) => s.status === "CO" || s.status === "signed" || s.status === "completed");

  if (!estaFirmado) {
    return NextResponse.json({
      firmado: false,
      estado: doc.status,
      mensaje: "El contrato aún no fue firmado",
    });
  }

  // Obtener datos biométricos si hay firma con ID
  const signatureId = doc.signatures?.[0]?.id;
  let biometria: Record<string, unknown> | null = null;

  if (signatureId) {
    try {
      const bio = await obtenerBiometria(signatureId);
      biometria = {
        nombre_completo: bio.full_name,
        numero_documento: bio.document_number,
        pais: bio.country,
        fotos: bio.photos,
        intentos: bio.attempts,
        verificado_at: doc.completed_at ?? new Date().toISOString(),
      };
    } catch {
      // Sin biometría disponible (firma sin BI o aún no procesada)
    }
  }

  await supabase.from("solicitudes").update({
    contrato_firmado: true,
    contrato_firmado_at: doc.completed_at ?? new Date().toISOString(),
    contrato_url: doc.download_url ?? null,
    ...(biometria ? { biometria_firmante: biometria } : {}),
  }).eq("id", id);

  await supabase.from("actividad_admin").insert({
    admin_id: adminId,
    accion: "contrato_firmado",
    entidad_tipo: "solicitud",
    entidad_id: id,
    detalle: `Firma verificada manualmente. Documento: ${solicitud.signatura_documento_id}. Biometría: ${biometria ? "✓" : "sin datos"}`,
  });

  return NextResponse.json({
    firmado: true,
    mensaje: biometria
      ? "Contrato firmado y biometría verificada. Solicitud actualizada."
      : "Contrato firmado correctamente. Solicitud actualizada.",
  });
}
