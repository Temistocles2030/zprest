export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

async function getAdmin(request: NextRequest) {
  const supabase = createAdminClient();
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: me } = await supabase.from("usuarios").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return null;
  return supabase;
}

// GET /api/admin/signatura — Documentos Signatura + eventos recientes
export async function GET(request: NextRequest) {
  const supabase = await getAdmin(request);
  if (!supabase) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") ?? "firmas";

  if (tab === "eventos") {
    const { data: eventos, error } = await supabase
      .from("signatura_eventos")
      .select("*, solicitudes(id, estado, usuarios(nombre, email))")
      .order("received_at", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ eventos: eventos ?? [] });
  }

  // tab === "firmas" — solicitudes con documento Signatura
  const { data: solicitudes, error } = await supabase
    .from("solicitudes")
    .select(`
      id, estado, monto, plazo, cuotas,
      signatura_documento_id, contrato_enviado_at, contrato_firmado, contrato_firmado_at,
      biometria_firmante,
      usuarios(nombre, email, dni),
      planes(nombre, tipo)
    `)
    .not("signatura_documento_id", "is", null)
    .order("contrato_enviado_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ solicitudes: solicitudes ?? [] });
}
