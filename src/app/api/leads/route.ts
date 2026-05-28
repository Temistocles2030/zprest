import { NextRequest, NextResponse } from "next/server";
import { getResend, FROM_EMAIL } from "@/lib/resend/client";
import { getDeudas, getWorstSituacion } from "@/lib/bcra/client";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "administracion@ciroprestamos.com.ar";

const SITUACION_LABEL: Record<number, string> = {
  0: "Sin deudas (situación 0)",
  1: "Normal (situación 1)",
  2: "Con seguimiento especial (situación 2)",
  3: "Con problemas (situación 3)",
  4: "Con alto riesgo / irrecuperable (situación 4)",
  5: "Irrecuperable (situación 5)",
};

function limpiarCuil(cuil: string): string {
  return cuil.replace(/[-\s]/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, email, telefono, cuil, tipo_credito, monto } = body as {
      nombre: string;
      email: string;
      telefono?: string;
      cuil?: string;
      tipo_credito?: "personal" | "pyme";
      monto?: number;
    };

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    // Consulta BCRA silenciosa (no bloquea ni muestra al usuario)
    let bcraHtml = "<p style='color:#6b7280'>No se consultó BCRA (CUIL no informado).</p>";
    if (cuil?.trim()) {
      try {
        const cuilLimpio = limpiarCuil(cuil.trim());
        const deuda = await getDeudas(cuilLimpio);
        const situacion = getWorstSituacion(deuda);
        const label = SITUACION_LABEL[situacion] ?? `Situación ${situacion}`;
        const color = situacion <= 1 ? "#16a34a" : situacion <= 2 ? "#d97706" : "#dc2626";
        bcraHtml = `
          <p><strong>Situación BCRA:</strong> <span style="color:${color};font-weight:600">${label}</span></p>
          ${deuda.results?.periodos?.length
            ? `<p style="color:#6b7280;font-size:13px">Períodos con deuda: ${deuda.results.periodos.map(p => p.periodo).join(", ")}</p>`
            : "<p style='color:#6b7280;font-size:13px'>Sin períodos de deuda registrados.</p>"
          }
        `;
      } catch {
        bcraHtml = "<p style='color:#6b7280'>BCRA no disponible al momento de la consulta.</p>";
      }
    }

    const tipoLabel = tipo_credito === "pyme" ? "Crédito Pyme" : "Crédito Personal";
    const montoStr = monto ? `$ ${monto.toLocaleString("es-AR")}` : "No especificado";

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;padding:32px;border-radius:12px">
        <h2 style="color:#60a5fa;margin-top:0">Nuevo lead — Quiero que me contacten</h2>

        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr><td style="padding:8px 0;color:#94a3b8;width:140px">Nombre</td><td style="font-weight:600">${nombre || "—"}</td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8">Email</td><td><a href="mailto:${email}" style="color:#60a5fa">${email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8">Teléfono</td><td>${telefono || "—"}</td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8">CUIL / CUIT</td><td>${cuil || "—"}</td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8">Tipo crédito</td><td><strong>${tipoLabel}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8">Monto referencial</td><td>${montoStr}</td></tr>
        </table>

        <div style="background:#1e293b;border-radius:8px;padding:16px;border-left:4px solid #60a5fa">
          <p style="margin:0 0 8px;font-weight:600;color:#93c5fd">Informe BCRA</p>
          ${bcraHtml}
        </div>

        <p style="margin-top:24px;font-size:12px;color:#475569">
          Zprest — Lead recibido el ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}
        </p>
      </div>
    `;

    const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
    if (IS_MOCK) {
      console.log("[MOCK] Lead email:", { nombre, email, tipo_credito, cuil, bcraHtml });
      return NextResponse.json({ ok: true });
    }

    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: `Nuevo lead: ${nombre || email} — ${tipoLabel}`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[leads]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
