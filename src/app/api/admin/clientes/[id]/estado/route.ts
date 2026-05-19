export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function PATCH(
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

  const { estado, motivo, hasta } = await request.json() as {
    estado: "activo" | "inactivo" | "bloqueado" | "eliminado";
    motivo?: string;
    hasta?: string;
  };

  if (!["activo", "inactivo", "bloqueado", "eliminado"].includes(estado))
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

  const { error } = await supabase
    .from("usuarios")
    .update({
      estado,
      estado_motivo: motivo ?? null,
      estado_hasta: hasta ?? null,
      estado_cambiado_at: new Date().toISOString(),
      estado_cambiado_por: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("actividad_admin").insert({
    admin_id: user.id,
    accion: `cambio_estado_usuario`,
    entidad_tipo: "usuario",
    entidad_id: id,
    detalle: `Estado → ${estado}${motivo ? `: ${motivo}` : ""}`,
  });

  return NextResponse.json({ ok: true });
}
