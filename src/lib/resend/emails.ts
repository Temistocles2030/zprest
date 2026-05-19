/**
 * Funciones de envío de emails transaccionales.
 * Todas son server-side only — no importar desde cliente.
 */
import { getResend, FROM_EMAIL } from "./client";
import {
  templatePrestamoaprobado,
  templateSolicitudRechazada,
  templateAlertaVencimiento,
  templateCuotaFallida,
  templatePrestamoCancelado,
} from "./templates";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

async function send(to: string, subject: string, html: string) {
  if (IS_MOCK) {
    console.log(`[EMAIL MOCK] Para: ${to} | Asunto: ${subject}`);
    return { id: "mock-email-id" };
  }
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  return data;
}

export async function enviarPrestamoAprobado(params: {
  email: string;
  nombre: string;
  monto: number;
  cuotas: number;
  cuotaMonto: number;
  primerVencimiento: Date;
  tipoPlan?: "personal" | "pyme";
}) {
  const { subject, html } = templatePrestamoaprobado({
    nombre: params.nombre,
    monto: params.monto,
    cuotas: params.cuotas,
    cuotaMonto: params.cuotaMonto,
    primerVencimiento: format(params.primerVencimiento, "d 'de' MMMM yyyy", { locale: es }),
    tipoPlan: params.tipoPlan,
  });
  return send(params.email, subject, html);
}

export async function enviarSolicitudRechazada(params: {
  email: string;
  nombre: string;
  monto: number;
  motivo: string;
}) {
  const { subject, html } = templateSolicitudRechazada({
    nombre: params.nombre,
    monto: params.monto,
    motivo: params.motivo,
  });
  return send(params.email, subject, html);
}

export async function enviarAlertaVencimiento(params: {
  email: string;
  nombre: string;
  numeroCuota: number;
  monto: number;
  fechaVencimiento: Date;
  diasRestantes: number;
}) {
  const { subject, html } = templateAlertaVencimiento({
    nombre: params.nombre,
    numeroCuota: params.numeroCuota,
    monto: params.monto,
    fechaVencimiento: format(params.fechaVencimiento, "d 'de' MMMM yyyy", { locale: es }),
    diasRestantes: params.diasRestantes,
  });
  return send(params.email, subject, html);
}

export async function enviarPrestamoCancelado(params: {
  email: string;
  nombre: string;
  monto: number;
  motivo?: string;
}) {
  const { subject, html } = templatePrestamoCancelado({
    nombre: params.nombre,
    monto: params.monto,
    motivo: params.motivo,
  });
  return send(params.email, subject, html);
}

export async function enviarCuotaFallida(params: {
  email: string;
  nombre: string;
  numeroCuota: number;
  monto: number;
}) {
  const waNumber = process.env.NEXT_PUBLIC_WA_NUMBER ?? "5491100000000";
  const { subject, html } = templateCuotaFallida({
    nombre: params.nombre,
    numeroCuota: params.numeroCuota,
    monto: params.monto,
    waNumber,
  });
  return send(params.email, subject, html);
}
