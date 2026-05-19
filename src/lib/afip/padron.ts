import { getLoginTicket } from "./wsaa";

export interface AFIPPersona {
  idPersona: string;
  tipoPersona: string;
  tipoClave: string;
  estadoClave: string;
  denominacion?: string;
  nombre: string | null;
  apellido: string | null;
  razonSocial: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  fechaNacimiento: string | null;
  sexo: string | null;
  domicilioFiscal: {
    direccion: string | null;
    localidad: string | null;
    provincia: string | null;
    codigoPostal: string | null;
  };
}

const PADRON_URL = "https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA13";
const SERVICE_NAME = "ws_sr_padron_a13";

function buildGetPersonaRequest(
  token: string,
  sign: string,
  cuitRepresentada: string,
  idPersona: string
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:a13="http://a13.soap.ws.server.puc.sr/">
  <soapenv:Header/>
  <soapenv:Body>
    <a13:getPersona>
      <token>${token}</token>
      <sign>${sign}</sign>
      <cuitRepresentada>${cuitRepresentada}</cuitRepresentada>
      <idPersona>${idPersona}</idPersona>
    </a13:getPersona>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : null;
}

function parsePersonaResponse(xml: string): AFIPPersona {
  if (xml.includes("<faultstring>")) {
    const fault = extractTag(xml, "faultstring");
    throw new Error(`AFIP fault: ${fault || "Error desconocido"}`);
  }

  const errorCode = extractTag(xml, "codigo");
  if (errorCode && xml.includes("<error>")) {
    const errorMsg = extractTag(xml, "mensaje") || extractTag(xml, "descripcion");
    throw new Error(`Error AFIP (${errorCode}): ${errorMsg || "Error desconocido"}`);
  }

  const persona: AFIPPersona = {
    idPersona: extractTag(xml, "idPersona") || "",
    tipoPersona: extractTag(xml, "tipoPersona") || "",
    tipoClave: extractTag(xml, "tipoClave") || "",
    estadoClave: extractTag(xml, "estadoClave") || "",
    nombre: extractTag(xml, "nombre") || null,
    apellido: extractTag(xml, "apellido") || null,
    razonSocial: extractTag(xml, "razonSocial") || null,
    tipoDocumento: extractTag(xml, "tipoDocumento") || null,
    numeroDocumento: extractTag(xml, "numeroDocumento") || null,
    fechaNacimiento: extractTag(xml, "fechaNacimiento") || null,
    sexo: extractTag(xml, "sexo") || null,
    domicilioFiscal: {
      direccion: extractTag(xml, "direccion") || null,
      localidad: extractTag(xml, "localidad") || null,
      provincia: extractTag(xml, "descripcionProvincia") || null,
      codigoPostal: extractTag(xml, "codPostal") || null,
    },
  };

  if (persona.tipoPersona === "FISICA") {
    persona.denominacion = [persona.apellido, persona.nombre].filter(Boolean).join(" ");
  } else {
    persona.denominacion = persona.razonSocial || "";
  }

  return persona;
}

export async function getPersona(cuit: string): Promise<AFIPPersona> {
  const afipCuit = process.env.AFIP_CUIT;
  if (!afipCuit) {
    throw new Error("AFIP_CUIT no está configurado");
  }

  const { token, sign } = await getLoginTicket(SERVICE_NAME);
  const soapRequest = buildGetPersonaRequest(token, sign, afipCuit, cuit);

  const response = await fetch(PADRON_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "",
    },
    body: soapRequest,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Padrón AFIP error (${response.status}): ${text.substring(0, 500)}`);
  }

  const responseXml = await response.text();
  return parsePersonaResponse(responseXml);
}
