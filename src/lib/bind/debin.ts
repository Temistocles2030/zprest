/**
 * DEBIN BindX — SOLO server-side.
 *
 * NOTA IMPORTANTE (confirmado con BindX):
 * DEBIN Recurrente (suscripción) NO puede usarse para cuotas de préstamos,
 * solo para servicios (por normativa BCRA).
 *
 * Estrategia de cobro Zprest:
 * - Principal: CVU por cliente → cliente transfiere voluntariamente → webhook
 * - Secundario: DEBIN Spot (el cliente debe aceptar cada débito)
 */
import { bindxRequest, BANK_ID, VIEW_ID, getAccountId } from "./client";
import type { BindDebin } from "@/types";

interface DebinSpotPayload {
  cbuDeudor: string;
  monto: number;
  concepto: string;
  referencia: string; // origin_id max 15 chars
  expiracionMinutos?: number; // default 1440 (24hs), max 4320
}

interface DebinResponse {
  id: string;
  type: string;
  status: string;
  details?: {
    origin_id?: string;
    buyer?: { cuit?: string; alias?: string; cbu?: string; name?: string };
  };
  charge?: { value: { currency: string; amount: number } };
}

function mapEstado(status: string): BindDebin["estado"] {
  if (status === "COMPLETED") return "acreditado";
  if (status === "REJECTED_CLIENT" || status === "REJECTED") return "rechazado";
  if (status === "EXPIRED") return "expirado";
  return "pendiente";
}

function mapDebin(r: DebinResponse, monto?: number): BindDebin {
  return {
    id: r.id,
    cbuDeudor: r.details?.buyer?.cbu ?? "",
    monto: r.charge?.value?.amount ?? monto ?? 0,
    concepto: r.details?.origin_id ?? "",
    estado: mapEstado(r.status),
    fechaVencimiento: "",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Registra la cuenta Zprest como vendedor DEBIN (se hace una sola vez).
 * Prerequisito para poder crear DEBINs.
 */
export async function registrarVendedorDebin(): Promise<void> {
  const accountId = getAccountId();
  await bindxRequest(
    `/banks/${BANK_ID}/accounts/${accountId}/${VIEW_ID}/transaction-request-types/DEBIN`,
    { method: "PUT", body: { adhered: true } }
  );
}

/**
 * Crea un DEBIN Spot (cobro único).
 * El cliente recibe una notificación y debe aceptar el débito.
 * Útil para cobros puntuales o cuotas donde el cliente no tiene CVU activo.
 */
export async function crearDebinSpot(payload: DebinSpotPayload): Promise<BindDebin> {
  const accountId = getAccountId();

  const response = await bindxRequest<DebinResponse>(
    `/banks/${BANK_ID}/accounts/${accountId}/${VIEW_ID}/transaction-request-types/DEBIN/transaction-requests`,
    {
      method: "POST",
      body: {
        origin_id: payload.referencia.slice(0, 15),
        to: { cbu: payload.cbuDeudor },
        value: { currency: "ARS", amount: payload.monto },
        concept: "EXP",
        description: payload.concepto.slice(0, 100),
        expiration: payload.expiracionMinutos ?? 1440,
      },
    }
  );

  return mapDebin(response, payload.monto);
}

// Alias para compatibilidad con código existente
export const crearDebin = crearDebinSpot;

/**
 * Consulta el estado de un DEBIN por ID.
 */
export async function getDebin(id: string): Promise<BindDebin> {
  const accountId = getAccountId();
  const response = await bindxRequest<DebinResponse>(
    `/banks/${BANK_ID}/accounts/${accountId}/${VIEW_ID}/transaction-request-types/DEBIN/${id}`
  );
  return mapDebin(response);
}

/**
 * Lista todos los DEBINs de la cuenta.
 */
export async function getDebins(): Promise<BindDebin[]> {
  const accountId = getAccountId();
  const data = await bindxRequest<{ transactions: DebinResponse[] }>(
    `/banks/${BANK_ID}/accounts/${accountId}/${VIEW_ID}/transaction-request-types/DEBIN`
  );
  return (data.transactions ?? []).map((r) => mapDebin(r));
}

/**
 * Cancela/elimina un DEBIN pendiente.
 */
export async function cancelarDebin(id: string): Promise<void> {
  const accountId = getAccountId();
  await bindxRequest(
    `/banks/${BANK_ID}/accounts/${accountId}/${VIEW_ID}/transaction-request-types/DEBIN/${id}`,
    { method: "DELETE" }
  );
}

/**
 * Reintenta un DEBIN fallido creando uno nuevo con el mismo concepto.
 * BindX no tiene endpoint de "reintentar" — se crea uno nuevo.
 */
export async function reintentarDebin(
  payload: DebinSpotPayload & { nuevaReferencia: string }
): Promise<BindDebin> {
  return crearDebinSpot({ ...payload, referencia: payload.nuevaReferencia });
}
