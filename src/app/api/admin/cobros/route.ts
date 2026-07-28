export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verificarSiEsAdmin } from "@/lib/verify-admin";
// Importación de nuestro validador unificado

export async function GET(request: NextRequest) {
  try {
    // ── MITIGACIÓN VUL-09 ──────────────────────────────────────────────────
    // Centralizamos la verificación de identidad y rol admin mediante el helper unificado
    const tokenHeader = request.headers.get("Authorization");
    const auth = await verificarSiEsAdmin(tokenHeader);
    if (!auth.esAdmin) {
      return NextResponse.json({ error: "No autorizado o acceso denegado" }, { status: 401 });
    }

    const supabase = createAdminClient();

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
      // ── MITIGACIÓN VUL-05 ──────────────────────────────────────────────────
      // Registramos de forma privada el error.message real en la consola del servidor
      console.error("[admin/cobros] DB Cuotas Error:", error.message);
      // Respondemos al exterior con un string completamente opaco y genérico
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
    // ── MITIGACIÓN VUL-05 ──────────────────────────────────────────────────
    console.error("[admin/cobros] Error fatal crítico detectado:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
