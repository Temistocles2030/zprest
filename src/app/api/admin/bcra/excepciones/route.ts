export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

async function verificarAdmin(request: NextRequest) {
  const supabase = createAdminClient();
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: me } = await supabase.from("usuarios").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return null;
  return { supabase, adminId: user.id };
}

function limpiarCuil(cuil: string): string {
  return String(cuil).replace(/\D/g, "");
}

export async function GET(request: NextRequest) {
  const ctx = await verificarAdmin(request);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data, error } = await ctx.supabase
    .from("bcra_excepciones")
    .select("id, cuil, motivo, creado_por, created_at, usuarios(nombre, email)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ excepciones: data ?? [] });
}

export async function POST(request: NextRequest) {
  const ctx = await verificarAdmin(request);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { cuil, motivo } = await request.json();
  const cuilLimpio = limpiarCuil(cuil ?? "");
  if (!/^\d{11}$/.test(cuilLimpio)) {
    return NextResponse.json({ error: "CUIL/CUIT inválido (11 dígitos)" }, { status: 400 });
  }

  const { error } = await ctx.supabase
    .from("bcra_excepciones")
    .upsert({ cuil: cuilLimpio, motivo: motivo || null, creado_por: ctx.adminId }, { onConflict: "cuil" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void ctx.supabase.from("actividad_admin").insert({
    admin_id: ctx.adminId,
    accion: "bcra_excepcion_agregar",
    entidad_tipo: "bcra_excepcion",
    entidad_id: cuilLimpio,
    detalle: `Excepción BCRA agregada para CUIL ${cuilLimpio}${motivo ? ` — ${motivo}` : ""}`,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const ctx = await verificarAdmin(request);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { cuil } = await request.json();
  const cuilLimpio = limpiarCuil(cuil ?? "");
  if (!cuilLimpio) return NextResponse.json({ error: "CUIL requerido" }, { status: 400 });

  const { error } = await ctx.supabase
    .from("bcra_excepciones")
    .delete()
    .eq("cuil", cuilLimpio);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void ctx.supabase.from("actividad_admin").insert({
    admin_id: ctx.adminId,
    accion: "bcra_excepcion_quitar",
    entidad_tipo: "bcra_excepcion",
    entidad_id: cuilLimpio,
    detalle: `Excepción BCRA removida para CUIL ${cuilLimpio}`,
  });

  return NextResponse.json({ ok: true });
}
