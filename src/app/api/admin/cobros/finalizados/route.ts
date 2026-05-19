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

  const { data: prestamos, error } = await supabase
    .from("prestamos")
    .select("id, capital_original, saldo_remanente, cuotas_total, cuotas_pagadas, created_at, user_id")
    .is("eliminado_at", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const finalizados = (prestamos ?? []).filter(
    (p) => p.cuotas_total > 0 && p.cuotas_pagadas >= p.cuotas_total
  );

  const userIds = [...new Set(finalizados.map((p) => p.user_id).filter(Boolean))];
  const { data: usuarios } = userIds.length > 0
    ? await supabase.from("usuarios").select("id, nombre, email").in("id", userIds)
    : { data: [] };
  const usuarioMap = Object.fromEntries((usuarios ?? []).map((u) => [u.id, u]));

  const result = finalizados.map((p) => ({
    ...p,
    usuario: usuarioMap[p.user_id] ?? null,
  }));

  return NextResponse.json({ prestamos: result });
}
