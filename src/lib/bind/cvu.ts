/**
 * CVU por cliente — BindX SOLO server-side.
 *
 * Cada cliente de Zprest recibe un CVU único al aprobar su préstamo.
 * El cliente puede transferir a ese CVU para pagar cuotas voluntariamente.
 * Los pagos se detectan via webhook "transfer.cvu.received".
 *
 * El CVU es idempotente: mismo client_id siempre devuelve el mismo CVU.
 */
import { bindxRequest, BANK_ID, VIEW_ID, getAccountId } from "./client";

interface AltaCVUPayload {
  clienteId: number;   // ID numérico interno del cliente (max 12 dígitos)
  cuit: string;        // CUIT del cliente (inmutable una vez asignado)
  nombre: string;      // 5-41 chars, letras/números/espacios/tildes
}

interface AltaCVUResponse {
  cvu: string;
  label: string;
  reactivated: boolean;
}

/**
 * Asigna un CVU único al cliente en BindX.
 * Idempotente: si el client_id ya tiene CVU, devuelve el existente.
 * IMPORTANTE: el CUIT asociado al CVU no se puede cambiar.
 */
export async function asignarCVU(payload: AltaCVUPayload): Promise<string> {
  const accountId = getAccountId();

  // Normalizar nombre: solo chars permitidos, 5-41
  const nombre = payload.nombre
    .normalize("NFC")
    .replace(/[^a-zA-Z0-9ñÑáéíóúÁÉÍÓÚ.\s]/g, "")
    .trim()
    .slice(0, 41)
    .padEnd(5, "X");

  const response = await bindxRequest<AltaCVUResponse>(
    `/banks/${BANK_ID}/accounts/${accountId}/${VIEW_ID}/wallet/cvu`,
    {
      method: "POST",
      body: {
        client_id: payload.clienteId,
        cuit: payload.cuit,
        name: nombre,
        currency: "ARS",
      },
    }
  );

  return response.cvu;
}

/**
 * Da de baja un CVU de cliente.
 */
export async function darDeBajaCVU(cvu: string, cuit: string): Promise<void> {
  const accountId = getAccountId();
  await bindxRequest(
    `/banks/${BANK_ID}/accounts/${accountId}/${VIEW_ID}/wallet/cvu/${cvu}/${cuit}`,
    { method: "DELETE" }
  );
}

/**
 * Convierte un user_id UUID a un número de 12 dígitos para usar como client_id en BindX.
 * Toma los primeros 12 dígitos del UUID (solo números).
 */
export function uuidToClientId(uuid: string): number {
  const digits = uuid.replace(/[^0-9]/g, "").slice(0, 12);
  return parseInt(digits || "1", 10);
}
