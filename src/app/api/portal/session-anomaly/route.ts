export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const { email, dispositivo } = await req.json();

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fecha = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "desconocida";
    const ua = req.headers.get("user-agent") ?? "desconocido";

    await resend.emails.send({
      from: `Seguridad Zprest <${process.env.RESEND_FROM_EMAIL ?? "noreply@zprest.com.ar"}>`,
      to: ["seguridad@zprest.com.ar"],
      subject: `⚠️ Anomalía de sesión detectada — ${email ?? "usuario desconocido"}`,
      html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="background:#0a0f1e;font-family:Arial,sans-serif;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#111827;border-radius:10px;overflow:hidden">
    <div style="background:#7f1d1d;padding:20px 28px">
      <h1 style="color:#fff;font-size:18px;margin:0">⚠️ Anomalía de sesión detectada</h1>
    </div>
    <div style="padding:24px 28px;color:#e2e8f0;font-size:14px;line-height:1.7">
      <p>Se detectó una sesión cerrada de forma inesperada (posible inicio de sesión desde otro dispositivo).</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr><td style="color:#94a3b8;padding:6px 0;width:140px">Email</td><td style="color:#fff">${email ?? "—"}</td></tr>
        <tr><td style="color:#94a3b8;padding:6px 0">Fecha y hora</td><td style="color:#fff">${fecha}</td></tr>
        <tr><td style="color:#94a3b8;padding:6px 0">IP detectada</td><td style="color:#fff;font-family:monospace">${ip}</td></tr>
        <tr><td style="color:#94a3b8;padding:6px 0">Dispositivo</td><td style="color:#fff">${dispositivo ?? ua}</td></tr>
        <tr><td style="color:#94a3b8;padding:6px 0">User-Agent</td><td style="color:#cbd5e1;font-size:12px">${ua}</td></tr>
      </table>
      <div style="margin-top:20px;padding:14px;background:#1e293b;border-radius:8px;border-left:3px solid #ef4444">
        <p style="margin:0;color:#fca5a5;font-size:13px">
          Si este acceso no fue autorizado, revisá la cuenta del cliente en el panel de administración
          y tomá las medidas necesarias.
        </p>
      </div>
    </div>
    <div style="padding:14px 28px;background:#0f172a;text-align:center">
      <p style="color:#475569;font-size:11px;margin:0">Zprest — Sistema de seguridad automático</p>
    </div>
  </div>
</body></html>`,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
