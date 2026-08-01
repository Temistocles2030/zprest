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
  try {
    const { email, tipo, telefono } = await req.json();
    if (!email || !tipo) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    // ── MITIGACIÓN VUL-06: CAPTURA DE IP DEL CLIENTE ───────────────────────
    // Extraemos la IP real del cliente usando las cabeceras estándar de Next.js/Vercel
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("x-real-ip") || 
                     "127.0.0.1";

    const supabase = createAdminClient();

    // Para login y reset: verificar que el email esté registrado
    if (tipo === "login" || tipo === "reset") {
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id")
        .eq("email", email)
        .single();
        
      if (!usuario) {
        // Mitigación: Devolvemos 'ok: true' genérico para evitar la enumeración de emails válidos por atacantes.
        // El atacante no sabrá si el email existe o no, pero el sistema no enviará nada.
        return NextResponse.json({ ok: true, message: "Si el correo está registrado, recibirás un código a la brevedad." });
      }
    }

    // ── MITIGACIÓN VUL-06: CONTROL DE BLOQUEO POR EMAIL O POR IP ───────────
    const ventana = new Date(Date.now() - VENTANA_BLOQUEO_MIN * 60 * 1000).toISOString();
    
    // Consultamos los intentos fallidos acumulados en la ventana de tiempo para este EMAIL o esta IP
    const { data: intentosRecientes } = await supabase
      .from("otp_codes")
      .select("intentos_fallidos, ip_address")
      .or(`email.eq.${email},ip_address.eq.${clientIp}`)
      .gte("created_at", ventana);

    const totalFallidos = (intentosRecientes ?? []).reduce(
      (sum, r) => sum + (r.intentos_fallidos ?? 0), 0
    );

    if (totalFallidos >= MAX_INTENTOS) {
      return NextResponse.json({
        ok: false,
        error: `Acción bloqueada temporalmente por demasiados intentos fallidos. Intente más tarde.`,
      }, { status: 429 }); // Status 429 Too Many Requests
    }

    const codigo = generarCodigo();
    const ttlMs = tipo === "registro" ? 10 * 60 * 1000 : 90 * 1000;
    const ttlLabel = tipo === "registro" ? "10 minutos" : "90 segundos";

    // Guardar OTP en DB asociando la IP de origen del request
    const { error: insertError } = await supabase.from("otp_codes").insert({
      email,
      code: codigo,
      tipo,
      expires_at: new Date(Date.now() + ttlMs).toISOString(),
      ip_address: clientIp, // <-- IMPORTANTE: Guarda la IP para auditoría y rate-limiting en la tabla
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
      }).catch((e) => console.error("Make webhook error:", e));
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    // ── MITIGACIÓN VUL-05 ──────────────────────────────────────────────────
    console.error("[send-otp] Error crítico interno:", error);
  return NextResponse.json({ ok: true });
  }
}
