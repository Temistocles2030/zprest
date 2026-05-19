import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface NotifyPayload {
  evento: "solicitud_aprobada" | "solicitud_rechazada" | "cuota_vencida";
  solicitudId?: string;
  prestamoId?: string;
  clienteEmail?: string;
  monto?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Envía notificación no-bloqueante al webhook de Make.com.
 * Se llama con `fetch(...).catch()` desde las API routes de aprobación/rechazo.
 */
export async function POST(req: NextRequest) {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ ok: false, reason: "MAKE_WEBHOOK_URL not set" });
  }

  const payload: NotifyPayload = await req.json();

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
      }),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notify/make]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
