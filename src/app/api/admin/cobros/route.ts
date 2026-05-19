export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();

  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const { data: me } = await supabase.from("usuarios").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  // Obtener IDs de préstamos activos (no eliminados)
  const { data: prestamosActivos } = await supabase
    .from("prestamos")
    .select("id")
    .is("eliminado_at", null);

  const prestamoIdsActivos = (prestamosActivos ?? []).map((p) => p.id);

  if (prestamoIdsActivos.length === 0) {
    return NextResponse.json({ cuotas: [] });
  }

  // Fetch cuotas sin joins (dos FK a usuarios causan ambigüedad en PostgREST)
  const { data: cuotas, error } = await supabase
    .from("cuotas")
    .select("*")
    .in("prestamo_id", prestamoIdsActivos)
    .order("fecha_vencimiento", { ascending: true })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const raw = cuotas ?? [];

  // Fetch usuarios por separado
  const userIds = [...new Set(raw.map((c) => c.user_id).filter(Boolean))];
  const { data: usuarios } = userIds.length > 0
    ? await supabase.from("usuarios").select("id, nombre, email").in("id", userIds)
    : { data: [] };
  const usuarioMap = Object.fromEntries((usuarios ?? []).map((u) => [u.id, u]));

  // Fetch prestamos por separado
  const prestamoIds = [...new Set(raw.map((c) => c.prestamo_id).filter(Boolean))];
  const { data: prestamos } = prestamoIds.length > 0
    ? await supabase
        .from("prestamos")
        .select("id, capital_original, saldo_remanente, cuotas_total, cuotas_pagadas, proximo_vencimiento")
        .in("id", prestamoIds)
    : { data: [] };
  const prestamoMap = Object.fromEntries((prestamos ?? []).map((p) => [p.id, p]));

  const cuotasEnriquecidas = raw.map((c) => ({
    ...c,
    usuarios: usuarioMap[c.user_id] ?? null,
    prestamos: prestamoMap[c.prestamo_id] ?? null,
  }));

  return NextResponse.json({ cuotas: cuotasEnriquecidas });
}
