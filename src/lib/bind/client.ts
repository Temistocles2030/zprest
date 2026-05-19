/**
 * Cliente HTTP BindX — SOLO server-side.
 * Nunca importar desde componentes cliente.
 *
 * Auth: POST /login/jwt → JWT token (expira en 1h, se cachea en memoria)
 * mTLS: BINDX_CERT_BASE64 + BINDX_KEY_BASE64 (preferido, solo cert hoja) o BINDX_PFX_BASE64 (fallback)
 * bank_id siempre 322 (Banco Industrial)
 * view_id siempre "owner"
 */
import https from "https";
import http from "http";

const BASE_URL = process.env.BINDX_BASE_URL ?? "https://sandbox.bind.com.ar/v1";

// ─── mTLS agent ───────────────────────────────────────────────────────────────
let _agent: https.Agent | null = null;

function getAgent(): https.Agent | undefined {
  if (_agent) return _agent;

  // Modo PEM (preferido — solo cert hoja, sin CA chain, evita "header too long")
  const certB64 = process.env.BINDX_CERT_BASE64;
  const keyB64  = process.env.BINDX_KEY_BASE64;
  if (certB64 && keyB64) {
    _agent = new https.Agent({
      cert: Buffer.from(certB64, "base64").toString("utf-8"),
      key:  Buffer.from(keyB64,  "base64").toString("utf-8"),
      rejectUnauthorized: true,
      keepAlive: true,
    });
    return _agent;
  }

  // Modo PFX (fallback — puede incluir CA chain completa)
  const pfxB64 = process.env.BINDX_PFX_BASE64;
  if (pfxB64) {
    _agent = new https.Agent({
      pfx: Buffer.from(pfxB64, "base64"),
      passphrase: process.env.BINDX_PFX_PASSWORD ?? "",
      rejectUnauthorized: true,
      keepAlive: true,
    });
    return _agent;
  }

  return undefined;
}

// ─── HTTP helper con soporte mTLS ─────────────────────────────────────────────
function nodeRequest(
  url: string,
  options: { method: string; headers: Record<string, string>; body?: string }
): Promise<{ status: number; json: () => Promise<unknown>; ok: boolean }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const agent = isHttps ? getAgent() : undefined;

    const headers = { ...options.headers };
    if (options.body) {
      headers["Content-Length"] = Buffer.byteLength(options.body, "utf-8").toString();
    }

    const reqOptions: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method,
      headers,
      agent,
    };

    const req = (isHttps ? https : http).request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf-8");
        const status = res.statusCode ?? 0;
        resolve({
          status,
          ok: status >= 200 && status < 300,
          rawBody: body,
          json: () => {
            try { return Promise.resolve(JSON.parse(body)); }
            catch { return Promise.resolve({}); }
          },
        } as { status: number; ok: boolean; rawBody: string; json: () => Promise<unknown> });
      });
    });

    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ─── JWT cache ────────────────────────────────────────────────────────────────
let _token: string | null = null;
let _tokenExpiry: number = 0;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (_token && now < _tokenExpiry - 5 * 60 * 1000) return _token;

  const username = process.env.BINDX_USERNAME;
  const password = process.env.BINDX_PASSWORD;
  if (!username || !password)
    throw new Error("Credenciales BindX no configuradas (BINDX_USERNAME / BINDX_PASSWORD)");

  const res = await nodeRequest(`${BASE_URL}/login/jwt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const raw = (res as unknown as { rawBody: string }).rawBody ?? "";
    console.error(`[BindX login] ${res.status} raw response: ${raw.slice(0, 500)}`);
    const err = await res.json() as { code?: string; message?: string };
    throw new Error(`BindX login failed ${res.status} [${err.code ?? "?"}]: ${err.message ?? raw.slice(0, 200)}`);
  }

  const data = await res.json() as { token: string; expires_in: number };
  _token = data.token;
  _tokenExpiry = now + (data.expires_in ?? 3600) * 1000;
  return _token;
}

// ─── Base request ─────────────────────────────────────────────────────────────
interface BindXRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

export async function bindxRequest<T>(path: string, options: BindXRequestOptions = {}): Promise<T> {
  const token = await getToken();
  const { method = "GET", body } = options;

  const res = await nodeRequest(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `JWT ${token}`,
      "Accept": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json() as { code?: string; message?: string };
    throw new Error(`BindX ${res.status} [${err.code ?? "?"}]: ${err.message ?? res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Helpers de cuenta ────────────────────────────────────────────────────────
export const BANK_ID = "322";
export const VIEW_ID = "owner";

export function getAccountId(): string {
  const id = process.env.BINDX_ACCOUNT_ID;
  if (!id) throw new Error("BINDX_ACCOUNT_ID no configurado");
  return id;
}

// ─── Saldo y movimientos ──────────────────────────────────────────────────────

export interface BindCuenta {
  id: string;
  label: string;
  balance: { currency: string; amount: number };
  account_routing: { scheme: string; address: string };
}

export interface BindMovimiento {
  id: string;
  type: string;
  description: string;
  this_account: { id: string };
  other_account: { id: string; holder: { display_name: string } };
  details: {
    type: string;
    description: string;
    posted: string;
    completed: string;
    value: { currency: string; amount: string };
  };
}

export async function getSaldo(): Promise<{
  disponible: number;
  acreditado: number;
  cbu: string;
  alias: string;
  account_id: string;
}> {
  const accountId = getAccountId();
  const data = await bindxRequest<BindCuenta>(
    `/banks/${BANK_ID}/accounts/${accountId}/${VIEW_ID}`
  );
  return {
    disponible: data.balance?.amount ?? 0,
    acreditado: 0,
    cbu: data.account_routing?.address ?? "",
    alias: data.label ?? "",
    account_id: accountId,
  };
}

export async function getMovimientos(limite = 20): Promise<BindMovimiento[]> {
  const accountId = getAccountId();
  const data = await bindxRequest<{ transactions: BindMovimiento[] }>(
    `/banks/${BANK_ID}/accounts/${accountId}/${VIEW_ID}/transactions?limit=${limite}`
  );
  return data.transactions ?? [];
}

// ─── Consulta CBU/CVU ─────────────────────────────────────────────────────────

export interface BindConsultaCuenta {
  owners: Array<{ id: string; display_name: string; id_type: string; is_physical_person: boolean }>;
  type: string;
  is_active: boolean;
  account_routing: { scheme: string; address: string };
  bank_routing: { scheme: string; address: string; code: string };
}

export async function consultarCBU(cbu: string): Promise<BindConsultaCuenta> {
  return bindxRequest<BindConsultaCuenta>(`/accounts/cbu/${cbu}`);
}
