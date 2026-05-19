import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { randomInt } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const MAX_INTENTOS = 5;
const VENTANA_BLOQUEO_MIN = 30;

function generarCodigo(): string {
  return randomInt(100000, 1000000).toString();
}

export async function POST(req: NextRequest) {
  const { email, tipo, telefono } = await req.json();
  if (!email || !tipo) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const supabase = createAdminClient();

  // Para login y reset: verificar que el email esté registrado
  // admin-otp: ya está autenticado con contraseña, no necesita verificación extra
  if (tipo === "login" || tipo === "reset") {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", email)
      .single();
    if (!usuario) {
      return NextResponse.json({ ok: false, error: "No encontramos una cuenta con ese email. ¿Querés registrarte?" });
    }
  }

  // Verificar si la cuenta está bloqueada por intentos fallidos
  const ventana = new Date(Date.now() - VENTANA_BLOQUEO_MIN * 60 * 1000).toISOString();
  const { data: intentosRecientes } = await supabase
    .from("otp_codes")
    .select("intentos_fallidos")
    .eq("email", email)
    .gte("created_at", ventana);

  const totalFallidos = (intentosRecientes ?? []).reduce(
    (sum, r) => sum + (r.intentos_fallidos ?? 0), 0
  );
  if (totalFallidos >= MAX_INTENTOS) {
    return NextResponse.json({
      ok: false,
      error: `Cuenta bloqueada por ${VENTANA_BLOQUEO_MIN} minutos por demasiados intentos fallidos.`,
    });
  }

  const codigo = generarCodigo();
  // registro tiene TTL más largo (10 min) para que el usuario pueda revisar el email
  const ttlMs = tipo === "registro" ? 10 * 60 * 1000 : 90 * 1000;
  const ttlLabel = tipo === "registro" ? "10 minutos" : "90 segundos";

  // Guardar OTP en DB
  const { error: insertError } = await supabase.from("otp_codes").insert({
    email,
    code: codigo,
    tipo,
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
  });
  if (insertError) {
    console.error("otp_codes insert error:", insertError);
    return NextResponse.json({ ok: false, error: "Error interno al generar código" }, { status: 500 });
  }

  // Enviar email
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@zprest.com.ar",
    to: email,
    subject: "Tu código de verificación Zprest",
    html: `<p>Tu código de verificación es: <strong style="font-size:24px;letter-spacing:4px">${codigo}</strong></p><p>Válido por ${ttlLabel}.</p>`,
  });

  // Enviar WhatsApp via Make.com si hay teléfono
  const makeUrl = process.env.MAKE_WEBHOOK_URL;
  if (makeUrl && telefono) {
    await fetch(makeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefono, codigo, tipo }),
    }).catch(() => {}); // no bloquear si falla
  }

  return NextResponse.json({ ok: true });
}
