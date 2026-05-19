export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const supabase = createAdminClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    request.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
  );

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    nombre?: string;
    dni?: string;
    cuil?: string | null;
    telefono?: string;
    domicilio?: string | null;
    localidad?: string | null;
    provincia?: string | null;
    fecha_nacimiento?: string | null;
  };

  const nombre = body.nombre?.trim();
  const dni = body.dni?.trim();
  const telefono = body.telefono?.trim();

  if (!nombre || nombre.length < 3) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  }
  if (!dni || dni.length < 7) {
    return NextResponse.json({ error: "DNI inválido" }, { status: 400 });
  }
  if (!telefono) {
    return NextResponse.json({ error: "Teléfono requerido" }, { status: 400 });
  }

  const { error } = await supabase
    .from("usuarios")
    .update({
      nombre,
      dni,
      cuil: body.cuil || null,
      telefono,
      domicilio: body.domicilio || null,
      localidad: body.localidad || null,
      provincia: body.provincia || null,
      fecha_nacimiento: body.fecha_nacimiento || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("[portal/registro] Supabase error:", error.message);
    return NextResponse.json({ error: "Error al guardar datos" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
