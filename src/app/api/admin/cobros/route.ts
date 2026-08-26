export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // 1. Verificamos la sesión actual usando el Bearer token (consistente con /pagos, /finalizados, /prestamos)
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Verificamos que el usuario tenga rol de admin en la base de datos
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single();

    if (usuario?.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // Obtener IDs de préstamos activos (no eliminados)
    const { data: prestamosActivos, error: activeErr } = await supabase
      .from("prestamos")
      .select("id")
      .is("eliminado_at", null);

    if (activeErr) {
      console.error("[admin/cobros] Error buscando préstamos activos:", activeErr);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    const prestamoIdsActivos = (prestamosActivos ?? []).map((p) => p.id);

    if (prestamoIdsActivos.length === 0) {
      return NextResponse.json({ cuotas: [] });
    }

    // Fetch cuotas sin joins
    const { data: cuotas, error } = await supabase
      .from("cuotas")
      .select("*")
      .in("prestamo_id", prestamoIdsActivos)
      .order("fecha_vencimiento", { ascending: true })
      .limit(500);

    if (error) {
      console.error("[admin/cobros] DB Cuotas Error:", error.message);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    const raw = cuotas ?? [];

    // Fetch usuarios por separado
    const userIds = [...new Set(raw.map((c) => c.user_id).filter(Boolean))];
    const { data: usuarios, error: userErr } = userIds.length > 0
      ? await supabase.from("usuarios").select("id, nombre, email").in("id", userIds)
      : { data: [] };

    if (userErr) {
      console.error("[admin/cobros] DB Usuarios Error:", userErr);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    const usuarioMap = Object.fromEntries((usuarios ?? []).map((u) => [u.id, u]));

    // Fetch prestamos por separado
    const prestamoIds = [...new Set(raw.map((c) => c.prestamo_id).filter(Boolean))];
    const { data: prestamos, error: loanErr } = prestamoIds.length > 0
      ? await supabase
          .from("prestamos")
          .select("id, capital_original, saldo_remanente, cuotas_total, cuotas_pagadas, proximo_vencimiento")
          .in("id", prestamoIds)
      : { data: [] };

    if (loanErr) {
      console.error("[admin/cobros] DB Prestamos Error:", loanErr);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    const prestamoMap = Object.fromEntries((prestamos ?? []).map((p) => [p.id, p]));

    const cuotasEnriquecidas = raw.map((c) => ({
      ...c,
      usuarios: usuarioMap[c.user_id] ?? null,
      prestamos: prestamoMap[c.prestamo_id] ?? null,
    }));

    return NextResponse.json({ cuotas: cuotasEnriquecidas });

  } catch (err) {
    console.error("[admin/cobros] Error fatal crítico detectado:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
