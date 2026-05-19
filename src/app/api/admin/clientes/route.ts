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

  // Query completa con columnas nuevas (requiere migración 17/04/2026 + 27/04/2026 + 29/04/2026)
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, email, nombre, dni, cuil, telefono, telefono_verificado, bcra_situacion, bcra_advertencia, afip_activo, afip_actividad, tipo_cliente, tipo_interes, estado, estado_motivo, estado_hasta, estado_cambiado_at, estado_registro, domicilio, nombre_comercio, empleador, plan_preferencial_id, updated_at, created_at, prestamos(id), solicitudes(id, cbu, bcra_situacion, bcra_advertencia, estado, created_at)")
    .eq("role", "user")
    .order("created_at", { ascending: false });

  if (!error) return NextResponse.json({ clientes: data ?? [] });

  // Fallback 1: sin columnas nuevas de usuarios ni bcra/afip de solicitudes
  const { data: f1, error: e1 } = await supabase
    .from("usuarios")
    .select("id, email, nombre, dni, telefono, tipo_cliente, estado, estado_hasta, estado_registro, created_at, prestamos(id), solicitudes(id, cbu, estado, created_at)")
    .eq("role", "user")
    .order("created_at", { ascending: false });

  if (!e1) return NextResponse.json({ clientes: f1 ?? [] });

  // Fallback 2: mínimo absoluto sin relaciones
  const { data: f2, error: e2 } = await supabase
    .from("usuarios")
    .select("id, email, nombre, dni, telefono, estado, created_at")
    .eq("role", "user")
    .order("created_at", { ascending: false });

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  return NextResponse.json({ clientes: f2 ?? [] });
}
