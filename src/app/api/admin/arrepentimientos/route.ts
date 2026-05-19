export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const { data: admin } = await supabase.from("usuarios").select("role").eq("id", user.id).single();
  if (admin?.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { data, error } = await supabase
    .from("arrepentimientos")
    .select(`
      id, estado, motivo, created_at, resuelto_at, notas_admin,
      usuarios:user_id (id, nombre, email, dni, telefono),
      prestamos:prestamo_id (id, capital_original, created_at)
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient();

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const { data: admin } = await supabase.from("usuarios").select("role").eq("id", user.id).single();
  if (admin?.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id, estado, notas_admin } = await req.json();
  if (!id || !estado) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const { error } = await supabase
    .from("arrepentimientos")
    .update({
      estado,
      notas_admin: notas_admin ?? null,
      resuelto_at: ["resuelto", "rechazado"].includes(estado) ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("actividad_admin").insert({
    admin_id: user.id,
    accion: `Arrepentimiento ${estado}`,
    entidad_tipo: "arrepentimiento",
    entidad_id: id,
    detalle: notas_admin ?? null,
  });

  return NextResponse.json({ ok: true });
}
