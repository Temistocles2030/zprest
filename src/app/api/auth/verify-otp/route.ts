import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createHmac } from "crypto";

const MAX_INTENTOS = 5;
const VENTANA_BLOQUEO_MIN = 30;

function getSecret() {
  return process.env.BIOMETRIC_JWT_SECRET || process.env.CRON_SECRET || "zprest-otp-secret";
}

export async function POST(req: NextRequest) {
  const { email, code, tipo } = await req.json();
  if (!email || !code) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const supabase = createAdminClient();

  // Verificar si la cuenta está bloqueada
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
      error: `Cuenta bloqueada por ${VENTANA_BLOQUEO_MIN} minutos. Intentá más tarde.`,
    });
  }

  // Buscar OTP válido
  const { data: otp } = await supabase
    .from("otp_codes")
    .select("id, code, expires_at, usado")
    .eq("email", email)
    .eq("tipo", tipo)
    .eq("usado", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!otp || otp.code !== code) {
    // Incrementar intentos fallidos en el OTP más reciente (expirado o no)
    const { data: ultimo } = await supabase
      .from("otp_codes")
      .select("id, intentos_fallidos")
      .eq("email", email)
      .eq("tipo", tipo)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (ultimo) {
      await supabase
        .from("otp_codes")
        .update({ intentos_fallidos: (ultimo.intentos_fallidos ?? 0) + 1 })
        .eq("id", ultimo.id);
    }

    const restantes = MAX_INTENTOS - (totalFallidos + 1);
    const msg = restantes > 0
      ? `Código inválido. Te quedan ${restantes} intentos.`
      : `Cuenta bloqueada por ${VENTANA_BLOQUEO_MIN} minutos por demasiados intentos.`;
    return NextResponse.json({ ok: false, error: msg });
  }

  // Marcar como usado
  await supabase.from("otp_codes").update({ usado: true }).eq("id", otp.id);

  // admin-otp, reset y registro: solo verificar OTP, el frontend maneja el siguiente paso
  if (tipo === "admin-otp" || tipo === "reset" || tipo === "registro") {
    
    // 👇 GENERACIÓN CORRECTA DEL TOKEN DE SEGURIDAD 👇
    if (tipo === "reset") {
      const payloadObj = {
        email: email.trim(),
        code: code.trim(),
        exp: Date.now() + 15 * 60 * 1000 // Token válido por 15 minutos
      };
      
      // 1. Convertimos los datos a texto (JSON)
      const jsonText = JSON.stringify(payloadObj);
      
      // 2. Firmamos el texto plano (exactamente como lo espera el reset)
      const sig = createHmac("sha256", getSecret()).update(jsonText).digest("hex");
      
      // 3. Convertimos el JSON a base64url para juntarlo con la firma
      const payloadB64 = Buffer.from(jsonText).toString("base64url");
      const otpToken = `${payloadB64}.${sig}`;

      // Devolvemos el ok y el TOKEN listo para usarse
      return NextResponse.json({ ok: true, otpToken });
    }

    return NextResponse.json({ ok: true });
  }

  // Otros tipos: generar magic link para establecer sesión
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://zprest.com.ar";
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${appUrl}/auth/callback` },
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("generateLink error:", linkError);
    return NextResponse.json({ ok: false, error: "Error al generar sesión" }, { status: 500 });
  }

  const { data: usuarioDB } = await supabase
    .from("usuarios")
    .select("estado_registro")
    .eq("email", email)
    .single();

  const estadoRegistro = usuarioDB?.estado_registro ?? "pendiente_aprobacion";

  return NextResponse.json({
    ok: true,
    tokenHash: linkData.properties.hashed_token,
    estadoRegistro,
  });
}
