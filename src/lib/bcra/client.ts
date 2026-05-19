import https from "https";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface BCRADeudaResponse {
  results?: {
    identificacion: number;
    denominacion: string;
    periodos: Array<{
      periodo: string;
      entidades: Array<{
        entidad: string;
        situacion: number;
        monto: number;
        diasAtrasoPago: number;
      }>;
    }>;
  };
}

// ── Cliente HTTP ──────────────────────────────────────────────────────────────

const BCRA_BASE_URL = "https://api.bcra.gob.ar/centraldedeudores/v1.0";

// BCRA tiene cadena de certificados incompleta (le falta el certificado intermedio).
// rejectUnauthorized: false es seguro aquí porque solo se aplica a este agente,
// exclusivamente para api.bcra.gob.ar.
const agent = new https.Agent({
  minVersion: "TLSv1.2",
  keepAlive: false,
  rejectUnauthorized: false,
});

function bcraRequest(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `${BCRA_BASE_URL}${path}`;
    const req = https.get(
      url,
      {
        agent,
        headers: {
          Accept: "application/json",
          "User-Agent": "Zprest/1.0",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 404) {
            // Persona sin antecedentes en central de deudores → respuesta válida vacía
            resolve(JSON.stringify({ results: null }));
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Error BCRA (${res.statusCode}): ${data || res.statusMessage}`));
            return;
          }
          resolve(data);
        });
        res.on("error", reject);
      }
    );
    req.on("error", (err) => {
      reject(new Error(`No se pudo conectar con el BCRA: ${err.message}`));
    });
    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error("La API del BCRA no respondió a tiempo"));
    });
  });
}

// ── Funciones públicas ────────────────────────────────────────────────────────

export async function getDeudas(identificacion: string): Promise<BCRADeudaResponse> {
  const raw = await bcraRequest(`/Deudas/${identificacion}`);
  return JSON.parse(raw) as BCRADeudaResponse;
}

export async function getDeudasHistoricas(identificacion: string) {
  const raw = await bcraRequest(`/Deudas/Historicas/${identificacion}`);
  return JSON.parse(raw);
}

export async function getChequesRechazados(identificacion: string) {
  const raw = await bcraRequest(`/Deudas/ChequesRechazados/${identificacion}`);
  return JSON.parse(raw);
}

export function getWorstSituacion(deudaResponse: BCRADeudaResponse): number {
  const periodos = deudaResponse?.results?.periodos;
  if (!periodos || periodos.length === 0) return 0;
  const latestPeriod = periodos[0];
  if (!latestPeriod.entidades || latestPeriod.entidades.length === 0) return 0;
  return Math.max(...latestPeriod.entidades.map((e) => e.situacion));
}
