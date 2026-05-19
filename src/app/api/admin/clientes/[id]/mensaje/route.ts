export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getResend, FROM_EMAIL } from "@/lib/resend/client";

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

  const { data: me } = await supabase.from("usuarios").select("role, nombre").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { asunto, mensaje } = await request.json() as { asunto: string; mensaje: string };
  if (!asunto?.trim() || !mensaje?.trim())
    return NextResponse.json({ error: "Asunto y mensaje son obligatorios" }, { status: 400 });

  const { data: cliente } = await supabase
    .from("usuarios").select("email, nombre").eq("id", id).single();

  if (!cliente?.email)
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: cliente.email,
    subject: asunto,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <p style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Zprest</p>
        <p>Hola ${cliente.nombre ?? cliente.email},</p>
        <div style="white-space:pre-wrap;line-height:1.6">${mensaje.replace(/\n/g, "<br>")}</div>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
        <p style="color:#888;font-size:12px">
          Este mensaje fue enviado por el equipo de Zprest.<br>
          Respondé a <a href="mailto:contacto@zprest.com.ar">contacto@zprest.com.ar</a>
        </p>
      </div>
    `,
  });

  await supabase.from("actividad_admin").insert({
    admin_id: user.id,
    accion: "mensaje_cliente",
    entidad_tipo: "usuario",
    entidad_id: id,
    detalle: `Email enviado a ${cliente.email}: "${asunto}"`,
  });

  return NextResponse.json({ ok: true });
}
