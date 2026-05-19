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

  const { condiciones } = await request.json() as { condiciones: string };
  if (!condiciones?.trim()) return NextResponse.json({ error: "Las condiciones son obligatorias" }, { status: 400 });

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
      estado: "pre_aprobado",
      pre_aprobado_condiciones: condiciones,
      updated_at: new Date().toISOString(),
      historial_estados: [...historial, {
        estado: "pre_aprobado",
        fecha: new Date().toISOString(),
        admin_id: user.id,
        motivo: condiciones,
      }],
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("actividad_admin").insert({
    admin_id: user.id,
    accion: "pre_aprobar_solicitud",
    entidad_tipo: "solicitud",
    entidad_id: id,
    detalle: `Pre-aprobado con condiciones: ${condiciones.slice(0, 100)}`,
  });

  // Email al cliente (no bloqueante)
  try {
    const { data: cliente } = await supabase
      .from("usuarios")
      .select("email, nombre")
      .eq("id", sol.user_id)
      .single();

    if (cliente?.email) {
      const { getResend, FROM_EMAIL } = await import("@/lib/resend/client");
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: cliente.email,
        subject: "Tu solicitud fue pre-aprobada — Zprest",
        html: `<p>Hola ${cliente.nombre ?? ""},</p>
          <p>Tu solicitud fue <strong>pre-aprobada</strong>. Para continuar, necesitamos que completes lo siguiente:</p>
          <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555">${condiciones}</blockquote>
          <p>Contactanos a <a href="mailto:contacto@zprest.com.ar">contacto@zprest.com.ar</a></p>`,
      });
    }
  } catch { /* no-op */ }

  return NextResponse.json({ ok: true });
}
