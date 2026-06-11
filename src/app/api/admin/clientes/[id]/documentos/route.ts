export const dynamic = "force-dynamic";

/**
 * GET /api/admin/clientes/[id]/documentos
 * Devuelve los documentos adjuntos en todas las solicitudes del cliente.
 * Solo accesible por admins.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

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

  const { data: admin } = await supabase.from("usuarios").select("role").eq("id", user.id).single();
  if (admin?.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { data: cliente, error: clienteError } = await supabase
    .from("usuarios")
    .select("id, nombre, apellido, email, dni, cuil")
    .eq("id", id)
    .single();

  if (clienteError || !cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const { data: solicitudes, error: solicitudesError } = await supabase
    .from("solicitudes")
    .select("id, estado, documentos, created_at, planes(nombre, tipo)")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  if (solicitudesError) return NextResponse.json({ error: solicitudesError.message }, { status: 500 });

  return NextResponse.json({ cliente, solicitudes: solicitudes ?? [] });
}
