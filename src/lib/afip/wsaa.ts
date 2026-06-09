import forge from "node-forge";
import crypto from "crypto";

const WSAA_URL = "https://wsaa.afip.gov.ar/ws/services/LoginCms";

// Cache en memoria para los tickets de login (duran ~12 hs)
const ticketCache: Record<string, { token: string; sign: string; expiresAt: Date }> = {};

function getCredentials() {
  const certBase64 = process.env.AFIP_CERT_BASE64;
  const keyBase64 = process.env.AFIP_KEY_BASE64;

  if (!certBase64 || !keyBase64) {
    throw new Error("AFIP_CERT_BASE64 y AFIP_KEY_BASE64 deben estar configurados");
  }

  let certPem = Buffer.from(certBase64.trim(), "base64").toString("utf-8");
  let keyPem = Buffer.from(keyBase64.trim(), "base64").toString("utf-8");

  // Si están invertidos (el "key" contiene un cert o el "cert" contiene una clave), intercambiar.
  const keySeemsCert = keyPem.includes("BEGIN CERTIFICATE");
  const certSeemsKey = certPem.includes("BEGIN PRIVATE KEY") || certPem.includes("BEGIN RSA PRIVATE KEY");
  if (keySeemsCert || certSeemsKey) {
    [certPem, keyPem] = [keyPem, certPem];
  }

  return { certPem, keyPem };
}

function buildTRA(service: string): string {
  const now = new Date();
  const generationTime = new Date(now.getTime() - 10 * 60 * 1000);
  const expirationTime = new Date(now.getTime() + 10 * 60 * 1000);
  const uniqueId = Math.floor(Date.now() / 1000);

  const formatDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${formatDate(generationTime)}</generationTime>
    <expirationTime>${formatDate(expirationTime)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

// Node crypto acepta cualquier formato RSA (PKCS8, PKCS1, etc.)
// y lo exporta como PKCS1 que forge siempre entiende.
function normalizarClave(keyPem: string): string {
  const header = keyPem.split("\n")[0]?.trim() ?? "(vacío)";
  try {
    const k = crypto.createPrivateKey({ key: keyPem, format: "pem" });
    return k.export({ type: "pkcs1", format: "pem" }) as string;
  } catch (e) {
    throw new Error(
      `Clave privada AFIP inválida. Header: "${header}". Detalle: ${e instanceof Error ? e.message : e}`
    );
  }
}

function signTRA(traXml: string, certPem: string, keyPem: string): string {
  const cert = forge.pki.certificateFromPem(certPem);
  const privateKey = forge.pki.privateKeyFromPem(normalizarClave(keyPem));

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(traXml, "utf8");
  p7.addCertificate(cert);
  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign();

  const asn1 = p7.toAsn1();
  const derBytes = forge.asn1.toDer(asn1).getBytes();
  return forge.util.encode64(derBytes);
}

function buildLoginCmsRequest(cmsBase64: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cmsBase64}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function parseLoginResponse(xml: string): { token: string; sign: string; expirationTime: string } {
  const returnMatch = xml.match(/<loginCmsReturn>([\s\S]*?)<\/loginCmsReturn>/);
  if (!returnMatch) throw new Error("No se encontró loginCmsReturn en la respuesta WSAA");

  const inner = returnMatch[1]
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');

  const tokenMatch = inner.match(/<token>([\s\S]*?)<\/token>/);
  const signMatch = inner.match(/<sign>([\s\S]*?)<\/sign>/);
  const expirationMatch = inner.match(/<expirationTime>([\s\S]*?)<\/expirationTime>/);

  if (!tokenMatch || !signMatch) {
    throw new Error("Token o Sign no encontrados en la respuesta WSAA");
  }

  return {
    token: tokenMatch[1].trim(),
    sign: signMatch[1].trim(),
    expirationTime: expirationMatch?.[1]?.trim() || "",
  };
}

export async function getLoginTicket(service: string): Promise<{ token: string; sign: string }> {
  const cached = ticketCache[service];
  if (cached && cached.expiresAt > new Date()) {
    return { token: cached.token, sign: cached.sign };
  }
  // Limpiar cache expirado
  delete ticketCache[service];

  const { certPem, keyPem } = getCredentials();
  const traXml = buildTRA(service);
  const cmsBase64 = signTRA(traXml, certPem, keyPem);
  const soapRequest = buildLoginCmsRequest(cmsBase64);

  const response = await fetch(WSAA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "",
    },
    body: soapRequest,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WSAA login falló (${response.status}): ${text.substring(0, 500)}`);
  }

  const responseXml = await response.text();

  if (responseXml.includes("<faultstring>")) {
    const faultMatch = responseXml.match(/<faultstring>([\s\S]*?)<\/faultstring>/);
    throw new Error(`WSAA fault: ${faultMatch?.[1] || "Error desconocido"}`);
  }

  const { token, sign, expirationTime } = parseLoginResponse(responseXml);

  const expiresAt = expirationTime
    ? new Date(new Date(expirationTime).getTime() - 5 * 60 * 1000)
    : new Date(Date.now() + 11 * 60 * 60 * 1000);

  ticketCache[service] = { token, sign, expiresAt };

  return { token, sign };
}
