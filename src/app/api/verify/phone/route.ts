import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createHmac, timingSafeEqual, randomInt } from "crypto"; // VUL-01: Importamos randomInt

const EMAIL_TTL_MS = 10 * 60 * 1000; // 10 minutos
const SMS_TTL_MS   = 60 * 1000;      // 60 segundos

function getSecret() {
  return process.env.BIOMETRIC_JWT_SECRET || process.env.CRON_SECRET || "zprest-otp-secret";
}

// ── MITIGACIÓN VUL-01 ──────────────────────────────────────────────────
// Reemplazamos Math.random() por randomInt criptográficamente seguro
function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

function createToken(userId: string, phone: string, code: string, ttlMs: number): string {
  const payload = JSON.stringify({ userId, phone, code, exp: Date.now() + ttlMs });
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(payload).toString("base64url") + "." + sig;
}

function verifyToken(token: string): { userId: string; phone: string; code: string; exp: number } | null {
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

function toSMSMasivosPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const sin54 = digits.startsWith("54") ? digits.slice(2) : digits;
  const sin9 = sin54.startsWith("9") ? sin54.slice(1) : sin54;
  return sin9.startsWith("0") ? sin9.slice(1) : sin9;
}

// ── MITIGACIÓN VUL-03 (ACTUALIZADA) ────────────────────────────────────
// Usamos HTTPS estricto y enviamos los parámetros ocultos en un POST body (x-www-form-urlencoded)
async function sendSMS(phone: string, message: string): Promise<void> {
  const apiKey = process.env.SMSMASIVOS_API_KEY;
  if (!apiKey) throw new Error("Servicio SMS no configurado");

  const localPhone = toSMSMasivosPhone(phone);
  
  // URL de API corregida mediante HTTPS sin parámetros visibles
  const url = "https://servicio.smsmasivos.com.ar/enviar_sms.asp";

  // Ocultamos la API Key inyectándola directamente en el cuerpo codificado del POST
  const bodyParams = new URLSearchParams();
  bodyParams.set("api", "1");
  bodyParams.set("apikey", apiKey);
  bodyParams.set("tos", localPhone);
  bodyParams.set("texto", message);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: bodyParams.toString()
  });
  
  const text = await res.text();
  console.log("[SMSMasivos] response:", text.trim());

  if (!res.ok || text.trim().toUpperCase().startsWith("ERROR")) {
    throw new Error(`SMSMasivos error: ${text.trim()}`);
  }
}

function buildOtpEmail(name: string, code: string, phone: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="background-color:#0a0f1e;font-family:Arial,sans-serif;margin:0;padding:20px 0">
  <div style="max-width:480px;margin:0 auto;background:#111827;border-radius:8px;overflow:hidden">
    <div style="background-color:#1e3a8a;padding:20px 32px;text-align:center">
      <h1 style="color:#ffffff;font-size:20px;font-weight:bold;margin:0">Verificación de Teléfono</h1>
      <p style="color:#93c5fd;font-size:13px;margin:6px 0 0">Zprest</p>
    </div>
    <div style="padding:28px 32px;text-align:center">
      <p style="color:#e8eeff;font-size:15px;margin-bottom:6px">Hola${name ? ` ${name}` : ""},</p>
      <p style="color:#94a3b8;font-size:14px;margin-bottom:24px">
        Tu código para verificar el número <strong style="color:#e8eeff">${phone}</strong>:
      </p>
      <div style="background:#1e293b;border:2px dashed #3b82f6;border-radius:12px;padding:20px;display:inline-block;margin-bottom:24px">
        <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#3b82f6;font-family:monospace">${code}</span>
      </div>
      <p style="color:#64748b;font-size:12px;margin:0">
        Este código expira en 10 minutos.<br/>
        Si no solicitaste este código, ignorá este email.
      </p>
    </div>
    <div style="background-color:#0f172a;padding:14px 32px;text-align:center">
      <p style="color:#64748b;font-size:11px;margin:0">Zprest — Créditos 100% digitales</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();

    const bearerToken = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!bearerToken) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(bearerToken);
    if (authError || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

    const body = await req.json();
    const { action, phone, code, otpToken, channel } = body as {
      action: "send" | "confirm";
      phone?: string;
      code?: string;
      otpToken?: string;
      channel: "email" | "sms";
    };

    if (!channel || !["email", "sms"].includes(channel)) {
      return NextResponse.json({ error: "Canal requerido: email o sms" }, { status: 400 });
    }

    // ── SEND ──────────────────────────────────────────────────────────────
    if (action === "send") {
      if (!phone) return NextResponse.json({ error: "Teléfono requerido" }, { status: 400 });

      if (channel === "sms") {
        const otp = generateOtp();
        const smsToken = createToken(user.id, phone, otp, SMS_TTL_MS);

        try {
          await sendSMS(phone, `Zprest: tu codigo de verificacion es ${otp}. Valido por 60 segundos.`);
        } catch (e) {
          console.error("[verify/phone] SMS error:", e instanceof Error ? e.message : e);
          return NextResponse.json({ error: "No se pudo enviar el SMS. Verificá el número o reintentá más tarde." }, { status: 500 });
        }

        return NextResponse.json({ success: true, channel: "sms", ttl: 60, otpToken: smsToken });
      }

      const otp = generateOtp();
      const signedToken = createToken(user.id, phone, otp, EMAIL_TTL_MS);

      const { data: usuario } = await supabase.from("usuarios").select("nombre").eq("id", user.id).single();
      const nombre = usuario?.nombre || "";

      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error: emailError } = await resend.emails.send({
        from: `Zprest <${process.env.RESEND_FROM_EMAIL || "noreply@zprest.com.ar"}>`,
        to: [user.email!],
        subject: `Tu código Zprest: ${otp}`,
        html: buildOtpEmail(nombre, otp, phone),
      });

      if (emailError) {
        console.error("[verify/phone] Resend error:", emailError);
        return NextResponse.json({ error: "Error al enviar el email" }, { status: 500 });
      }

      return NextResponse.json({ success: true, channel: "email", email: user.email, otpToken: signedToken });
    }

    // ── CONFIRM ───────────────────────────────────────────────────────────
    if (action === "confirm") {
      if (!code) return NextResponse.json({ error: "Código requerido" }, { status: 400 });
      if (!otpToken) return NextResponse.json({ error: "Token requerido" }, { status: 400 });

      const data = verifyToken(otpToken);
      if (!data) return NextResponse.json({ error: "El código expiró. Solicitá uno nuevo." }, { status: 400 });
      if (data.userId !== user.id) return NextResponse.json({ error: "Token inválido" }, { status: 400 });
      if (data.code !== code.trim()) return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });

      await supabase.from("usuarios").update({
        telefono_verificado: true,
        telefono: data.phone,
      }).eq("id", user.id);

      return NextResponse.json({ success: true, phone: data.phone });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (error) {
    // ── MITIGACIÓN VUL-05 ──────────────────────────────────────────────────
    console.error("[verify/phone] Error crítico interno:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
