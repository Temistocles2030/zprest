export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { enviarPrestamoCancelado } from "@/lib/resend/emails";

async function getAdmin(request: NextRequest) {
  const supabase = createAdminClient();
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: me } = await supabase.from("usuarios").select("role, id").eq("id", user.id).single();
  if (me?.role !== "admin") return null;
  return { supabase, adminId: user.id };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getAdmin(request);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { supabase, adminId } = ctx;

  const body = await request.json() as { action: "eliminar" | "restaurar"; motivo?: string; notify?: boolean };
  const { action, motivo, notify = true } = body;

  if (action === "eliminar") {
    const { data: prestamo, error: fetchErr } = await supabase
      .from("prestamos")
      .select("id, capital_original, solicitud_id, user_id, usuarios(nombre, email)")
      .eq("id", id)
      .is("eliminado_at", null)
      .single();

    if (fetchErr || !prestamo) {
      return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 });
    }

    const { error } = await supabase
      .from("prestamos")
      .update({ eliminado_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const usuario = (prestamo as any).usuarios as { nombre: string | null; email: string } | null;

    // Log actividad
    await supabase.from("actividad_admin").insert({
      admin_id: adminId,
      accion: "eliminar_prestamo",
      entidad_tipo: "prestamo",
      entidad_id: id,
      detalle: motivo ?? "Sin motivo especificado",
    });

    if (notify && usuario?.email) {
      try {
        await enviarPrestamoCancelado({
          email: usuario.email,
          nombre: usuario.nombre ?? "Cliente",
          monto: (prestamo as any).capital_original,
          motivo,
        });
      } catch {
        // email falla silenciosamente
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "restaurar") {
    const { error } = await supabase
      .from("prestamos")
      .update({ eliminado_at: null })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from("actividad_admin").insert({
      admin_id: adminId,
      accion: "restaurar_prestamo",
      entidad_tipo: "prestamo",
      entidad_id: id,
      detalle: "Préstamo restaurado desde papelera",
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getAdmin(request);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { supabase, adminId } = ctx;

  // Solo se puede eliminar definitivamente si ya está en papelera
  const { data: prestamo, error: fetchErr } = await supabase
    .from("prestamos")
    .select("id")
    .eq("id", id)
    .not("eliminado_at", "is", null)
    .single();

  if (fetchErr || !prestamo) {
    return NextResponse.json({ error: "Préstamo no encontrado en papelera" }, { status: 404 });
  }

  // Borrar cuotas primero (FK), luego el préstamo
  await supabase.from("cuotas").delete().eq("prestamo_id", id);
  const { error } = await supabase.from("prestamos").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("actividad_admin").insert({
    admin_id: adminId,
    accion: "eliminar_prestamo_definitivo",
    entidad_tipo: "prestamo",
    entidad_id: id,
    detalle: "Eliminación definitiva desde papelera",
  });

  return NextResponse.json({ ok: true });
}
