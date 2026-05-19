export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/clientes/[id]/tipo
 * Asigna tipo_cliente al usuario: "personal" | "pyme"
 * Solo accesible por admins.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { TipoCliente } from "@/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Verificar admin
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error();
    const { data: admin } = await supabase
      .from("usuarios").select("role, id").eq("id", user.id).single();
    if (admin?.role !== "admin")
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const body = await request.json() as { tipo_cliente: TipoCliente };
    const tipo = body.tipo_cliente;

    if (!["personal", "pyme", "pendiente"].includes(tipo))
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

    // Al clasificar como personal/pyme → aprobar acceso al portal
    // Al volver a pendiente → revocar acceso
    const estadoRegistro = tipo === "pendiente" ? "pendiente_aprobacion" : "aprobado";

    const { error: updErr } = await supabase
      .from("usuarios")
      .update({
        tipo_cliente: tipo,
        estado_registro: estadoRegistro,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updErr) throw updErr;

    // Log actividad
    await supabase.from("actividad_admin").insert({
      admin_id: admin.id,
      accion: "clasificar_cliente",
      entidad_tipo: "usuario",
      entidad_id: id,
      detalle: `Tipo asignado: ${tipo}`,
    });

    return NextResponse.json({ ok: true, tipo_cliente: tipo });
  } catch {
    return NextResponse.json({ error: "Error al actualizar tipo de cliente" }, { status: 500 });
  }
}
