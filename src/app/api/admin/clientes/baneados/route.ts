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

export async function GET(request: NextRequest) {
  const ctx = await verificarAdmin(request);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data, error } = await ctx.supabase
    .from("emails_baneados")
    .select("email, motivo, banned_at, banned_by, bloqueado_hasta, dni, tipo")
    .order("banned_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ baneados: data ?? [] });
}

export async function DELETE(request: NextRequest) {
  const ctx = await verificarAdmin(request);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

  const { error } = await ctx.supabase
    .from("emails_baneados")
    .delete()
    .eq("email", email);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void ctx.supabase.from("actividad_admin").insert({
    admin_id: ctx.adminId,
    accion: "desbanear_email",
    entidad_tipo: "email_baneado",
    entidad_id: email,
    detalle: { email },
  });

  return NextResponse.json({ ok: true });
}
