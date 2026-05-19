import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const { prestamo_id, motivo } = await req.json();
  if (!prestamo_id) return NextResponse.json({ error: "Falta el préstamo" }, { status: 400 });

  // Verificar que el préstamo pertenece al usuario
  const { data: prestamo } = await supabase
    .from("prestamos")
    .select("id, estado, created_at")
    .eq("id", prestamo_id)
    .eq("user_id", user.id)
    .single();

  if (!prestamo) return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 });

  // Verificar que no haya ejercido arrepentimiento antes
  const { data: existente } = await supabase
    .from("arrepentimientos")
    .select("id")
    .eq("prestamo_id", prestamo_id)
    .maybeSingle();

  if (existente) {
    return NextResponse.json({ error: "Ya ejerciste el derecho de arrepentimiento para este préstamo" }, { status: 409 });
  }

  // Verificar plazo de 10 días hábiles (simplificado: 14 días corridos)
  const fechaAprobacion = new Date(prestamo.created_at);
  const diasTranscurridos = Math.floor((Date.now() - fechaAprobacion.getTime()) / (1000 * 60 * 60 * 24));
  if (diasTranscurridos > 14) {
    return NextResponse.json({ error: "El plazo de 10 días hábiles para el arrepentimiento ya venció" }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("arrepentimientos").insert({
    user_id: user.id,
    prestamo_id,
    motivo: motivo ?? null,
    estado: "pendiente",
  });

  if (insertError) {
    console.error("arrepentimiento insert error:", insertError);
    return NextResponse.json({ error: "Error al registrar la solicitud" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
