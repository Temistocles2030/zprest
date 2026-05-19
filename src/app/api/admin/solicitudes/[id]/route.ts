export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/admin/solicitudes/[id] — Detalle (solo admin)
export async function GET(
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

  const { data, error } = await supabase
    .from("solicitudes")
    .select("*, usuarios(nombre, email, dni, cuil, telefono, nombre_comercio, empleador, domicilio), planes(nombre, tipo, tem, ted, plazo_min)")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ solicitud: data });
}

// PATCH /api/admin/solicitudes/[id] — Cambiar estado (solo admin)
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

  const body = await request.json();
  const { estado, ...extra } = body as { estado: string; [key: string]: unknown };

  if (!estado) return NextResponse.json({ error: "Estado requerido" }, { status: 400 });

  // Obtener historial actual
  const { data: solicitudActual } = await supabase
    .from("solicitudes")
    .select("historial_estados, estado")
    .eq("id", id)
    .single();

  const historial = (solicitudActual?.historial_estados as unknown[] ?? []);
  const entrada = {
    estado,
    fecha: new Date().toISOString(),
    admin_id: user.id,
    ...(extra.motivo_rechazo ? { motivo: extra.motivo_rechazo as string } : {}),
    ...(extra.pausado_motivo  ? { motivo: extra.pausado_motivo as string  } : {}),
    ...(extra.pre_aprobado_condiciones ? { motivo: extra.pre_aprobado_condiciones as string } : {}),
  };

  const { error } = await supabase
    .from("solicitudes")
    .update({
      estado,
      updated_at: new Date().toISOString(),
      historial_estados: [...historial, entrada],
      ...extra,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Registrar actividad
  await supabase.from("actividad_admin").insert({
    admin_id: user.id,
    accion: `cambio_estado_solicitud`,
    entidad_tipo: "solicitud",
    entidad_id: id,
    detalle: `${solicitudActual?.estado} → ${estado}`,
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/solicitudes/[id] — Eliminar solicitud y datos relacionados
export async function DELETE(
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

  // Borrar cuotas asociadas a préstamos de esta solicitud
  const { data: prestamos } = await supabase.from("prestamos").select("id").eq("solicitud_id", id);
  if (prestamos && prestamos.length > 0) {
    const prestamoIds = prestamos.map((p) => p.id);
    await supabase.from("cuotas").delete().in("prestamo_id", prestamoIds);
    await supabase.from("prestamos").delete().in("id", prestamoIds);
  }

  const { error: delErr } = await supabase.from("solicitudes").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  await supabase.from("actividad_admin").insert({
    admin_id: user.id,
    accion: "eliminar_solicitud",
    entidad_tipo: "solicitud",
    entidad_id: id,
    detalle: "Solicitud eliminada definitivamente por admin",
  });

  return NextResponse.json({ ok: true });
}
