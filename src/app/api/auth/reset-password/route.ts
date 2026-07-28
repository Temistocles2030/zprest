import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createHmac, timingSafeEqual } from "crypto";

function getSecret() {
  return process.env.BIOMETRIC_JWT_SECRET || process.env.CRON_SECRET || "zprest-otp-secret";
}

// Función auxiliar para verificar que el OTP ingresado sea válido y coincida con el email
function verifyOtpToken(token: string): { userId?: string; email: string; code: string; exp: number } | null {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;
    const payload = Buffer.from(payloadB64, "base64url").toString();
    const expectedSig = createHmac("sha256", getSecret()).update(payload).digest("hex");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const data = JSON.parse(payload);
    if (Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // ── MITIGACIÓN VUL-02 ──────────────────────────────────────────────────
    // Ahora exigimos de forma obligatoria el código OTP y el otpToken generado al enviarlo
    const { email, nuevaPassword, code, otpToken } = await req.json();

    if (!email || !nuevaPassword || !code || !otpToken) {
      return NextResponse.json({ ok: false, error: "Faltan datos obligatorios (Email, contraseña u OTP)" }, { status: 400 });
    }
    
    if (nuevaPassword.length < 8) {
      return NextResponse.json({ ok: false, error: "Mínimo 8 caracteres para la nueva contraseña" }, { status: 400 });
    }

    // Validamos el token criptográfico del OTP
    const dataOtp = verifyOtpToken(otpToken);
    if (!dataOtp) {
      return NextResponse.json({ ok: false, error: "El código OTP ha expirado o es inválido" }, { status: 400 });
    }
    
    // Aseguramos que el token pertenezca estrictamente al email que se quiere restablecer
    if (dataOtp.email !== email.trim() || dataOtp.code !== code.trim()) {
      return NextResponse.json({ ok: false, error: "Código de verificación incorrecto" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Obtener el user id por email
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", email)
      .single();

    if (!usuario) {
      // Mitigación adicional: usar un mensaje genérico para evitar enumeración de emails válidos
      return NextResponse.json({ ok: false, error: "El código o el email son incorrectos" }, { status: 404 });
    }

    // Actualizar contraseña vía admin API de forma segura ya validada la identidad
    const { error } = await supabase.auth.admin.updateUserById(usuario.id, {
      password: nuevaPassword,
    });

    if (error) {
      console.error("[reset-password] Supabase Admin Error:", error);
      return NextResponse.json({ ok: false, error: "Error al actualizar contraseña" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    // ── MITIGACIÓN VUL-05 ──────────────────────────────────────────────────
    // Ocultamos excepciones de base de datos o sistema al exterior
    console.error("[reset-password] Error crítico interno:", error);
    return NextResponse.json({ ok: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
