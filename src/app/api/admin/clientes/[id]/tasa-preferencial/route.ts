export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/** GET /api/admin/clientes/[id]/tasa-preferencial — lista planes con es_preferencial=true */
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();

  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const { data: me } = await supabase.from("usuarios").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { data: planes } = await supabase
    .from("planes")
    .select("id, nombre, tipo, tna, tem, ted, frecuencia, monto_min, monto_max, plazo_min, plazo_max, activo, es_preferencial")
    .eq("es_preferencial", true)
    .order("tipo")
    .order("plazo_min");

  return NextResponse.json({ planes: planes ?? [] });
}

/** PATCH /api/admin/clientes/[id]/tasa-preferencial — asigna o quita tasa preferencial */
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

  const body = await request.json() as { plan_id: string | null };

  if (body.plan_id !== null) {
    // Verificar que el plan existe y es preferencial
    const { data: plan } = await supabase
      .from("planes")
      .select("id, es_preferencial")
      .eq("id", body.plan_id)
      .single();

    if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    if (!plan.es_preferencial) return NextResponse.json({ error: "El plan no está marcado como preferencial" }, { status: 400 });
  }

  const { error } = await supabase
    .from("usuarios")
    .update({ plan_preferencial_id: body.plan_id, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void supabase.from("actividad_admin").insert({
    admin_id: user.id,
    accion: body.plan_id ? "asignar_tasa_preferencial" : "quitar_tasa_preferencial",
    entidad_tipo: "usuario",
    entidad_id: id,
    detalle: { plan_id: body.plan_id },
  });

  return NextResponse.json({ ok: true });
}
