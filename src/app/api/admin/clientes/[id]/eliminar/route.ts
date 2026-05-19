export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const body = await request.json().catch(() => ({}));
  const tipo: "banear" | "temporal" = body.tipo === "temporal" ? "temporal" : "banear";
  const dias: number | null = tipo === "temporal" && body.dias ? parseInt(body.dias) : null;

  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const { data: me } = await supabase.from("usuarios").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  // No permitir que un admin se elimine a sí mismo
  if (id === user.id) return NextResponse.json({ error: "No podés eliminarte a vos mismo" }, { status: 400 });

  // Verificar que existe y es un usuario (no admin)
  const { data: target } = await supabase.from("usuarios").select("email, role, dni").eq("id", id).single();
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (target.role === "admin") return NextResponse.json({ error: "No se puede eliminar un administrador" }, { status: 400 });

  // Borrar en orden correcto respetando FK
  // 1. cuotas (references prestamos + usuarios)
  await supabase.from("cuotas").delete().eq("user_id", id);

  // 2. movimientos (references billeteras)
  const { data: billeteras } = await supabase.from("billeteras").select("id").eq("user_id", id);
  if (billeteras && billeteras.length > 0) {
    const billetera_ids = billeteras.map((b: { id: string }) => b.id);
    await supabase.from("movimientos").delete().in("billetera_id", billetera_ids);
  }
  await supabase.from("movimientos").delete().eq("user_id", id);

  // 3. billeteras
  await supabase.from("billeteras").delete().eq("user_id", id);

  // 4. prestamos (references solicitudes)
  await supabase.from("prestamos").delete().eq("user_id", id);

  // 5. solicitudes
  await supabase.from("solicitudes").delete().eq("user_id", id);

  // 6. webauthn
  await supabase.from("webauthn_credentials").delete().eq("user_id", id);
  await supabase.from("webauthn_challenges").delete().eq("user_id", id);

  // 7. otp_codes (por email)
  await supabase.from("otp_codes").delete().eq("email", target.email);

  // 8. actividad donde el usuario era el admin (edge case)
  await supabase.from("actividad_admin").delete().eq("admin_id", id);

  // 9. Registrar en emails_baneados (permanente o temporal)
  const bloqueado_hasta = tipo === "temporal" && dias
    ? new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString()
    : null;
  await supabase.from("emails_baneados").upsert({
    email: target.email,
    motivo: tipo === "temporal"
      ? `Eliminación temporal por administrador — puede re-registrarse en ${dias} días`
      : "Eliminación definitiva por administrador",
    banned_by: user.id,
    banned_at: new Date().toISOString(),
    bloqueado_hasta,
    dni: target.dni ?? null,
    tipo,
  }, { onConflict: "email" });

  // 10. Registrar acción ANTES de borrar el usuario
  await supabase.from("actividad_admin").insert({
    admin_id: user.id,
    accion: "eliminacion_definitiva",
    entidad_tipo: "usuario",
    entidad_id: id,
    detalle: `Usuario ${target.email} eliminado definitivamente y email baneado`,
  });

  // 11. Borrar de public.usuarios
  const { error: dbError } = await supabase.from("usuarios").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // 11. Borrar de auth.users (Supabase Auth)
  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);
  if (authDeleteError) {
    // El registro de DB ya fue borrado — loguear pero no fallar
    console.error("[eliminar] Error borrando auth.users:", authDeleteError.message);
  }

  return NextResponse.json({ ok: true });
}
