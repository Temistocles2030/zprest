/**
 * Transferencias BindX — SOLO server-side.
 * Endpoint: POST /banks/322/accounts/:account_id/owner/transaction-request-types/TRANSFER/transaction-requests
 */
import { bindxRequest, BANK_ID, VIEW_ID, getAccountId } from "./client";
import type { BindTransferencia } from "@/types";

interface TransferenciaPayload {
  cbuDestino: string;
  monto: number;
  concepto: string;
  referencia: string; // origin_id — max 15 chars, idempotency key
}

interface TransferenciaResponse {
  id: string;
  type: string;
  status: "COMPLETED" | "IN_PROGRESS" | "FAILED" | "UNKNOWN" | "UNKNOWN_FOREVER";
  start_date: string;
  end_date: string;
  charge: { value: { currency: string; amount: number } };
}

function mapEstado(status: string): BindTransferencia["estado"] {
  if (status === "COMPLETED") return "acreditada";
  if (status === "FAILED" || status === "UNKNOWN_FOREVER") return "rechazada";
  return "pendiente";
}

/**
 * Acredita el monto de un préstamo aprobado al CBU del cliente.
 * origin_id = referencia (max 15 chars) — idempotency key.
 * Si status === "IN_PROGRESS" el pago está en tránsito, confirmar con getTransferencia().
 */
export async function acreditarPrestamo(payload: TransferenciaPayload): Promise<BindTransferencia> {
  const accountId = getAccountId();

  const response = await bindxRequest<TransferenciaResponse>(
    `/banks/${BANK_ID}/accounts/${accountId}/${VIEW_ID}/transaction-request-types/TRANSFER/transaction-requests`,
    {
      method: "POST",
      body: {
        origin_id: payload.referencia.slice(0, 15),
        to: { cbu: payload.cbuDestino },
        value: { currency: "ARS", amount: payload.monto },
        description: payload.concepto.slice(0, 100),
        concept: "PRE", // Préstamo
      },
    }
  );

  return {
    id: response.id,
    monto: response.charge?.value?.amount ?? payload.monto,
    cbuDestino: payload.cbuDestino,
    concepto: payload.concepto,
    estado: mapEstado(response.status),
    createdAt: response.start_date,
  };
}

/**
 * Consulta el estado de una transferencia por ID.
 */
export async function getTransferencia(transactionId: string): Promise<BindTransferencia> {
  const accountId = getAccountId();

  const response = await bindxRequest<TransferenciaResponse>(
    `/banks/${BANK_ID}/accounts/${accountId}/${VIEW_ID}/transaction-request-types/TRANSFER/${transactionId}`
  );

  return {
    id: response.id,
    monto: response.charge?.value?.amount ?? 0,
    cbuDestino: "",
    concepto: "",
    estado: mapEstado(response.status),
    createdAt: response.start_date,
  };
}
