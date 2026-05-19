export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { enviarSolicitudRechazada } from "@/lib/resend/emails";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // 1. Verificar admin
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let adminId: string;
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error("Token inválido");

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single();

    if (usuario?.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    adminId = user.id;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  // 2. Obtener motivo del body
  const body = await request.json().catch(() => ({}));
  const motivo = (body as { motivo?: string }).motivo?.trim();
  if (!motivo) {
    return NextResponse.json({ error: "Motivo de rechazo requerido" }, { status: 400 });
  }

  // 3. Obtener solicitud
  const { data: solicitud } = await supabase
    .from("solicitudes")
    .select("*, usuarios(email, nombre)")
    .eq("id", id)
    .single();

  if (!solicitud) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (solicitud.estado !== "pendiente" && solicitud.estado !== "en_revision") {
    return NextResponse.json(
      { error: `La solicitud ya fue procesada (estado: ${solicitud.estado})` },
      { status: 409 }
    );
  }

  // 4. Actualizar a rechazado
  await supabase
    .from("solicitudes")
    .update({
      estado: "rechazado",
      motivo_rechazo: motivo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  // 5. Log de actividad
  await supabase.from("actividad_admin").insert({
    admin_id: adminId,
    accion: "rechazar_solicitud",
    entidad_tipo: "solicitud",
    entidad_id: id,
    detalle: `Rechazada: ${motivo}`,
  });

  // 6. Enviar email (no-bloqueante)
  const usuario = solicitud.usuarios as { email: string; nombre: string } | null;
  if (usuario?.email) {
    enviarSolicitudRechazada({
      email: usuario.email,
      nombre: usuario.nombre ?? "Cliente",
      monto: solicitud.monto,
      motivo,
    }).catch((e) => console.error("Error enviando email rechazo:", e));
  }

  return NextResponse.json({ ok: true });
}
