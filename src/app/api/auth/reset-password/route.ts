import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { email, nuevaPassword } = await req.json();

  if (!email || !nuevaPassword) {
    return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });
  }
  if (nuevaPassword.length < 8) {
    return NextResponse.json({ ok: false, error: "Mínimo 8 caracteres" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Obtener el user id por email
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .single();

  if (!usuario) {
    return NextResponse.json({ ok: false, error: "Email no encontrado" }, { status: 404 });
  }

  // Actualizar contraseña vía admin API
  const { error } = await supabase.auth.admin.updateUserById(usuario.id, {
    password: nuevaPassword,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "Error al actualizar contraseña" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
