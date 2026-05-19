const BASE_URL = "https://connect.signatura.co/api/v2";

function headers() {
  const key = process.env.SIGNATURA_API_KEY;
  if (!key) throw new Error("SIGNATURA_API_KEY no configurada");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
}

export type SignaturaDocumento = {
  id: string;
  status: string;
  title: string;
  created_at: string;
  completed_at?: string;
  signatures?: Array<{
    id?: string;
    status: string;
    email?: string;
    signed_at?: string;
  }>;
  download_url?: string;
};

export type SignaturaBiometria = {
  full_name: string;
  document_number: string;
  country: string;
  photos: Array<{ url: string; type: "front" | "back" | "selfie" }>;
  attempts: number;
};

function normalizarTelefono(tel: string): string {
  let d = tel.replace(/\D/g, "");

  // Quitar prefijo de país
  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54")) d = d.slice(2);

  // Quitar cero inicial
  if (d.startsWith("0")) d = d.slice(1);

  // Quitar prefijo móvil '15' (formato viejo: [cod_area][15][número])
  // El '15' puede estar en posición 2 (BA: 11), 3 (Neuquén: 299), o 4 (cod 4 dígitos)
  if (d.length === 12) {
    if (d.slice(2, 4) === "15") d = d.slice(0, 2) + d.slice(4);
    else if (d.slice(3, 5) === "15") d = d.slice(0, 3) + d.slice(5);
    else if (d.slice(4, 6) === "15") d = d.slice(0, 4) + d.slice(6);
  }

  // d ahora son 10 dígitos: [cod_area][número]
  return `+549${d}`;
}

/**
 * Envía un documento a firmar con validación biométrica + SMS.
 * @param dni      DNI del firmante. Si se provee, agrega BI: "AR:{dni}" a validations.
 * @param telefono Teléfono del firmante. Si se provee, agrega PH (OTP por SMS) a validations.
 */
export async function crearDocumento(
  title: string,
  pdfBase64: string,
  email: string,
  nombre: string,
  dni?: string,
  telefono?: string
): Promise<{ id: string }> {
  const validations: Record<string, unknown> = { EM: email };
  const inviteChannel: string[] = ["EM"];

  if (dni) {
    const dniLimpio = dni.replace(/\D/g, "");
    validations.BI = `AR:${dniLimpio}`;
  }

  if (telefono) {
    validations.PH = normalizarTelefono(telefono);
    inviteChannel.push("PH");
  }

  const res = await fetch(`${BASE_URL}/documents/create`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      title,
      file_content: pdfBase64,
      signatures: [
        {
          validations,
          invite_channel: inviteChannel,
          signer_name: nombre,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Signatura error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return { id: data.id ?? data.document_id };
}

/**
 * Consulta el estado actual de un documento.
 */
export async function obtenerDocumento(id: string): Promise<SignaturaDocumento> {
  const res = await fetch(`${BASE_URL}/documents/${id}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Signatura error ${res.status}: ${err}`);
  }

  return res.json();
}

/**
 * Obtiene los datos biométricos de una firma completada.
 * Solo funciona si la firma usó validación BI y tiene estado CO (completado).
 */
export async function obtenerBiometria(signatureId: string): Promise<SignaturaBiometria> {
  const res = await fetch(`${BASE_URL}/signatures/${signatureId}/biometrics`, {
    headers: headers(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Signatura biometría error ${res.status}: ${err}`);
  }

  return res.json();
}

/**
 * Lista todos los documentos de la cuenta Signatura.
 */
export async function listarDocumentos(page = 1, limit = 50): Promise<{
  documents: SignaturaDocumento[];
  total: number;
}> {
  const res = await fetch(`${BASE_URL}/documents?page=${page}&limit=${limit}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Signatura listar documentos error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    documents: data.documents ?? data.data ?? data ?? [],
    total: data.total ?? data.count ?? 0,
  };
}
