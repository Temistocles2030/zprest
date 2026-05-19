export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const { data: me } = await supabase.from("usuarios").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { motivo, hasta } = await request.json() as { motivo: string; hasta?: string };
  if (!motivo?.trim()) return NextResponse.json({ error: "El motivo es obligatorio" }, { status: 400 });

  const { data: sol } = await supabase
    .from("solicitudes")
    .select("historial_estados, estado, user_id")
    .eq("id", id)
    .single();

  if (!sol) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });

  const historial = (sol.historial_estados as unknown[] ?? []);
  const { error } = await supabase
    .from("solicitudes")
    .update({
      estado: "pausado",
      pausado_motivo: motivo,
      pausado_hasta: hasta ?? null,
      updated_at: new Date().toISOString(),
      historial_estados: [...historial, {
        estado: "pausado",
        fecha: new Date().toISOString(),
        admin_id: user.id,
        motivo,
      }],
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("actividad_admin").insert({
    admin_id: user.id,
    accion: "pausar_solicitud",
    entidad_tipo: "solicitud",
    entidad_id: id,
    detalle: motivo,
  });

  // Email al cliente (no bloqueante)
  try {
    const { data: cliente } = await supabase
      .from("usuarios")
      .select("email, nombre")
      .eq("id", sol.user_id)
      .single();

    if (cliente?.email) {
      const fechaStr = hasta
        ? new Date(hasta).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "próximamente";
      const { getResend, FROM_EMAIL } = await import("@/lib/resend/client");
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: cliente.email,
        subject: "Actualización sobre tu solicitud — Zprest",
        html: `<p>Hola ${cliente.nombre ?? ""},</p>
          <p>Tu solicitud está siendo revisada. Te contactaremos el <strong>${fechaStr}</strong> con novedades.</p>
          <p>Consultas: <a href="mailto:contacto@zprest.com.ar">contacto@zprest.com.ar</a></p>`,
      });
    }
  } catch { /* no-op */ }

  return NextResponse.json({ ok: true });
}
