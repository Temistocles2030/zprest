export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/solicitudes — Lista de solicitudes (solo admin)
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();

  // Verificar token Bearer del header
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Verificar token Supabase y obtener usuario
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  // Verificar role admin
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("role")
    .eq("id", user.id)
    .single();

  if (usuario?.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const estado = request.nextUrl.searchParams.get("estado");

  let query = supabase
    .from("solicitudes")
    .select("*, usuarios(nombre, email, dni), planes(nombre, tipo)")
    .order("created_at", { ascending: false });

  if (estado) {
    query = query.eq("estado", estado);
  }

  const { data: solicitudes, error } = await query;

  if (error) {
    console.error("GET /api/solicitudes:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  return NextResponse.json({ solicitudes });
}

// POST /api/solicitudes — Crear solicitud (usuario autenticado)
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const body = await request.json();
  const { plan_id, monto, plazo, cuotas, cbu, banco, bcra_situacion, bcra_advertencia } = body as {
    plan_id: string;
    monto: number;
    plazo: number;
    cuotas: number;
    cbu: string;
    banco?: string | null;
    bcra_situacion?: number | null;
    bcra_advertencia?: boolean;
  };

  if (!plan_id || !monto || !plazo || !cuotas || !cbu) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  // Verificar plan activo
  const { data: plan } = await supabase
    .from("planes")
    .select("*")
    .eq("id", plan_id)
    .eq("activo", true)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "Plan no válido o inactivo" }, { status: 400 });
  }

  if (monto < plan.monto_min || monto > plan.monto_max) {
    return NextResponse.json(
      { error: `Monto debe estar entre $${plan.monto_min} y $${plan.monto_max}` },
      { status: 400 }
    );
  }

  const { data: nueva, error } = await supabase
    .from("solicitudes")
    .insert({
      user_id: user.id,
      plan_id,
      monto,
      plazo,
      cuotas,
      cbu,
      banco: banco ?? null,
      estado: "pendiente",
      documentos: body.documentos ?? [],
      bcra_situacion: bcra_situacion ?? null,
      bcra_advertencia: bcra_advertencia ?? false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("POST /api/solicitudes:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  return NextResponse.json({ id: nueva!.id }, { status: 201 });
}
