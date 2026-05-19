/**
 * Templates HTML para emails transaccionales de Zprest.
 * Diseño minimalista oscuro, compatible con clientes de email principales.
 */

const BASE = (content: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zprest</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0f1e4a;padding:24px 32px;">
              <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:1px;">ZPREST</span>
              <span style="color:#7dd3fc;font-size:12px;margin-left:8px;">zprest.com.ar</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
                Zprest · zprest.com.ar · contacto@zprest.com.ar<br/>
                Este es un email automático, no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const btn = (href: string, texto: string, color = "#2563eb") =>
  `<a href="${href}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:${color};color:#ffffff;font-size:14px;font-weight:600;border-radius:8px;text-decoration:none;">${texto}</a>`;

const pesos = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

// ── Templates ──────────────────────────────────────────────────────────────────

export function templatePrestamoaprobado(data: {
  nombre: string;
  monto: number;
  cuotas: number;
  cuotaMonto: number;
  primerVencimiento: string;
  tipoPlan?: "personal" | "pyme";
}): { subject: string; html: string } {
  const esPyme = data.tipoPlan === "pyme";
  const labelCuotas = esPyme ? "Plazo" : "Cuotas";
  const valorCuotas = esPyme
    ? `${data.cuotas} días — ${pesos(data.cuotaMonto)}/día`
    : `${data.cuotas} cuotas de ${pesos(data.cuotaMonto)}`;
  const labelPrimera = esPyme ? "Primera cuota diaria" : "Primera cuota";

  return {
    subject: `✅ Tu préstamo de ${pesos(data.monto)} fue aprobado — Zprest`,
    html: BASE(`
      <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">¡Tu préstamo fue aprobado! 🎉</h1>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Hola ${data.nombre}, el dinero está en camino a tu cuenta.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:12px;padding:20px;margin-bottom:24px;">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e0f2fe;">
            <span style="color:#64748b;font-size:13px;">Monto acreditado</span>
            <span style="float:right;font-weight:700;font-size:18px;color:#0f1e4a;">${pesos(data.monto)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e0f2fe;">
            <span style="color:#64748b;font-size:13px;">${labelCuotas}</span>
            <span style="float:right;font-weight:600;color:#0f172a;">${valorCuotas}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <span style="color:#64748b;font-size:13px;">${labelPrimera}</span>
            <span style="float:right;font-weight:600;color:#0f172a;">${data.primerVencimiento}</span>
          </td>
        </tr>
      </table>

      <p style="font-size:13px;color:#64748b;">Podés ver el detalle completo y el cronograma de cuotas en tu portal.</p>
      ${btn("https://zprest.com.ar/mis-prestamos", "Ver mis préstamos")}
    `),
  };
}

export function templateSolicitudRechazada(data: {
  nombre: string;
  monto: number;
  motivo: string;
}): { subject: string; html: string } {
  return {
    subject: `Actualización sobre tu solicitud — Zprest`,
    html: BASE(`
      <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Sobre tu solicitud</h1>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hola ${data.nombre}, lamentablemente no pudimos aprobar tu solicitud de ${pesos(data.monto)}.</p>

      <div style="background:#fef2f2;border-left:4px solid #f87171;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">Motivo</p>
        <p style="margin:4px 0 0;font-size:14px;color:#7f1d1d;">${data.motivo}</p>
      </div>

      <p style="font-size:13px;color:#64748b;">
        Podés volver a solicitar en 30 días o contactarnos si tenés dudas.
      </p>
      ${btn("https://zprest.com.ar/simulador", "Simular otro préstamo", "#64748b")}
    `),
  };
}

export function templateAlertaVencimiento(data: {
  nombre: string;
  numeroCuota: number;
  monto: number;
  fechaVencimiento: string;
  diasRestantes: number;
}): { subject: string; html: string } {
  return {
    subject: `⏰ Tu cuota ${data.numeroCuota} vence en ${data.diasRestantes} días — Zprest`,
    html: BASE(`
      <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Recordatorio de cuota</h1>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hola ${data.nombre}, te recordamos que tu próxima cuota vence pronto.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #fde68a;">
        <tr>
          <td style="padding:6px 0;">
            <span style="color:#92400e;font-size:13px;">Cuota N°</span>
            <span style="float:right;font-weight:700;color:#78350f;">${data.numeroCuota}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <span style="color:#92400e;font-size:13px;">Monto</span>
            <span style="float:right;font-weight:700;font-size:18px;color:#78350f;">${pesos(data.monto)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <span style="color:#92400e;font-size:13px;">Vence el</span>
            <span style="float:right;font-weight:600;color:#78350f;">${data.fechaVencimiento}</span>
          </td>
        </tr>
      </table>

      <p style="font-size:13px;color:#64748b;">El cobro se realizará automáticamente desde tu cuenta. Asegurate de tener saldo disponible.</p>
      ${btn("https://zprest.com.ar/mis-prestamos", "Ver mis cuotas", "#d97706")}
    `),
  };
}

export function templatePrestamoCancelado(data: {
  nombre: string;
  monto: number;
  motivo?: string;
}): { subject: string; html: string } {
  return {
    subject: `Tu préstamo ha sido cancelado — Zprest`,
    html: BASE(`
      <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Cancelación de préstamo</h1>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hola ${data.nombre}, tu préstamo de ${pesos(data.monto)} ha sido cancelado por el equipo de Zprest.</p>

      ${data.motivo ? `<div style="background:#fef2f2;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #fecaca;">
        <p style="margin:0;font-size:14px;color:#991b1b;"><strong>Motivo:</strong> ${data.motivo}</p>
      </div>` : ""}

      <p style="font-size:14px;color:#374151;">Si tenés dudas o creés que esto es un error, contactanos:</p>
      ${btn("mailto:contacto@zprest.com.ar", "Contactar a Zprest", "#3b82f6")}
    `),
  };
}

export function templateCuotaFallida(data: {
  nombre: string;
  numeroCuota: number;
  monto: number;
  waNumber: string;
}): { subject: string; html: string } {
  return {
    subject: `⚠️ No pudimos cobrar tu cuota ${data.numeroCuota} — Zprest`,
    html: BASE(`
      <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Problema con tu cuota</h1>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hola ${data.nombre}, el débito automático de tu cuota N° ${data.numeroCuota} no pudo procesarse.</p>

      <div style="background:#fef2f2;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #fecaca;">
        <p style="margin:0;font-size:15px;color:#991b1b;font-weight:600;">Cuota N° ${data.numeroCuota} — ${pesos(data.monto)}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#7f1d1d;">Fondos insuficientes o cuenta no disponible</p>
      </div>

      <p style="font-size:14px;color:#374151;font-weight:500;">Para regularizar, contactanos por WhatsApp:</p>
      ${btn(`https://wa.me/${data.waNumber}?text=${encodeURIComponent("Hola, quiero regularizar mi cuota vencida.")}`, "Regularizar por WhatsApp", "#16a34a")}
      <p style="margin-top:16px;font-size:12px;color:#94a3b8;">Cuanto antes lo regularices, evitás cargos adicionales.</p>
    `),
  };
}
