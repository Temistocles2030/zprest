import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { readFileSync } from "fs";
import { join } from "path";
import { formatearPesos } from "@/lib/loan-calculator";
import { format, addMonths } from "date-fns";
import { es } from "date-fns/locale";

export type DatosContratoPersonal = {
  nombre: string;
  dni: string;
  cuil: string;
  email: string;
  domicilio: string;
  ciudad: string;
  provincia: string;
  profesion: string;
  monto: number;
  cuotas: number;
  tem: number;
  primera_cuota: number;
  cbu: string;
  banco: string;
  fecha_aprobacion: string;
  numero_solicitud: string;
};

export type DatosContratoComercial = {
  nombre: string;
  dni: string;
  cuil: string;
  email: string;
  domicilio: string;
  ciudad: string;
  cp: string;
  provincia: string;
  profesion: string;
  domicilio_comercial: string;
  ciudad_comercial: string;
  cp_comercial: string;
  nombre_comercio: string;
  monto: number;
  plazo_dias: number;
  ted: number;
  cuota_diaria: number;
  cbu: string;
  banco: string;
  primera_cuota_fecha: string;
  fecha_aprobacion: string;
  numero_solicitud: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function fechaLarga(iso: string) {
  return format(new Date(iso), "d 'de' MMMM 'de' yyyy", { locale: es });
}

function pct(n: number, decimals = 2): string {
  return `${n.toFixed(decimals)}%`;
}

/** Monto entero a letras en español (rango $1 – $999.999.999). */
function numeroALetras(n: number): string {
  if (n === 0) return "cero pesos";

  const U = ["", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const T = ["diez", "once", "doce", "trece", "catorce", "quince",
    "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
  const D = ["", "", "veinte", "treinta", "cuarenta", "cincuenta",
    "sesenta", "setenta", "ochenta", "noventa"];
  const C = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
    "seiscientos", "setecientos", "ochocientos", "novecientos"];

  function dec(x: number): string {
    if (x < 10) return U[x];
    if (x < 20) return T[x - 10];
    const d = Math.floor(x / 10), u = x % 10;
    if (u === 0) return D[d];
    if (d === 2) return `veinti${U[u]}`;
    return `${D[d]} y ${U[u]}`;
  }

  function cen(x: number): string {
    if (x === 100) return "cien";
    const c = Math.floor(x / 100), r = x % 100;
    return [C[c], r > 0 ? dec(r) : ""].filter(Boolean).join(" ");
  }

  const partes: string[] = [];

  const millones = Math.floor(n / 1_000_000);
  const restoMill = n % 1_000_000;
  if (millones === 1) partes.push("un millón");
  else if (millones > 1) partes.push(`${cen(millones)} millones`);

  const miles = Math.floor(restoMill / 1_000);
  if (miles === 1) partes.push("mil");
  else if (miles > 1) partes.push(`${cen(miles)} mil`);

  const resto = restoMill % 1_000;
  if (resto > 0) partes.push(cen(resto));

  const prefix = partes.join(" ");
  // "de pesos" solo si termina en millón/millones (monto exacto en millones)
  if (prefix.endsWith("millón") || prefix.endsWith("millones")) {
    return `${prefix} de pesos`;
  }
  return `${prefix} pesos`;
}

/** Devuelve el nombre del banco a partir de los primeros 3 dígitos del CBU. */
function bancoDesdesCBU(cbu: string): string {
  const code = cbu.substring(0, 3);
  const bancos: Record<string, string> = {
    "007": "Banco Galicia",
    "011": "Banco Nación",
    "014": "Banco Provincia",
    "017": "BBVA Argentina",
    "034": "Banco Supervielle",
    "044": "Banco Hipotecario",
    "060": "Banco Comafi",
    "072": "Banco Santander",
    "083": "Banco Patagonia",
    "191": "ICBC Argentina",
    "259": "Banco Ciudad",
    "301": "Brubank",
    "307": "Mercado Pago",
    "389": "Ualá",
  };
  return bancos[code] || "el banco indicado";
}

/**
 * Word a veces parte tags {{...}} en dos runs separados por <w:proofErr/> u
 * otros elementos. Esta función une el texto de esos runs para que el tag
 * quede completo en un solo <w:t>.
 *
 * Patrón que corrige:
 *   <w:t>{{#tag</w:t></w:r><w:proofErr.../><w:r...><w:t>}}</w:t>
 * →  <w:t>{{#tag}}</w:t>
 */
function fixSplitTags(xml: string): string {
  // Iterar hasta que no haya más cambios (puede haber tags partidos en 3+ runs)
  let prev = "";
  let result = xml;
  while (prev !== result) {
    prev = result;
    // Busca un <w:t> con {{ sin }} seguido de cualquier XML no-run y otro <w:t>
    result = result.replace(
      /(<w:t(?:[^>]*)>)([^<]*\{\{[^}]*)<\/w:t><\/w:r>((?:<(?!w:r[ >])[^>]*\/?>)*)<w:r(?:[^>]*)>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t(?:[^>]*)>([^<]*)<\/w:t>/g,
      (_match, wtOpen, before, _between, after) => `${wtOpen}${before}${after}</w:t>`,
    );
  }
  return result;
}

/**
 * Pre-procesa el XML del DOCX para que cada {{variable}} quede en su propio
 * <w:r> con <w:b/>, separado del texto estático que lo rodea.
 * Cuando docxtemplater renderiza, el valor sustituido hereda el bold del run.
 */
function separarVariablesNegrita(zip: PizZip): void {
  const archivos = ["word/document.xml"];
  // Incluir encabezados y pies de página si existen
  Object.keys((zip as unknown as { files: Record<string, unknown> }).files).forEach((path) => {
    if (/^word\/(header|footer)\d*\.xml$/.test(path)) archivos.push(path);
  });

  for (const archivo of archivos) {
    const file = zip.file(archivo);
    if (!file) continue;
    let xml = file.asText();
    if (!xml.includes("{{")) continue;

    // 1. Unir tags partidos por Word antes de procesar
    xml = fixSplitTags(xml);

    xml = xml.replace(/<w:r(\s[^>]*)?>[\s\S]*?<\/w:r>/g, (runMatch) => {
      const wtMatch = runMatch.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
      if (!wtMatch || !wtMatch[1].includes("{{")) return runMatch;

      const text = wtMatch[1];
      const rPrMatch = runMatch.match(/(<w:rPr>[\s\S]*?<\/w:rPr>)/);
      const rPr = rPrMatch ? rPrMatch[1] : "";

      // Construir rPr con negrita (evitar duplicar <w:b/>)
      const boldRPr = rPr
        ? (/<w:b[\s/>]/.test(rPr) ? rPr : rPr.replace("</w:rPr>", "<w:b/></w:rPr>"))
        : "<w:rPr><w:b/></w:rPr>";

      const parts = text.split(/({{[^}]+}})/);
      if (parts.length <= 1) return runMatch;

      return parts
        .filter((p) => p !== "")
        .map((part) => {
          const esVariable = /^{{[^}]+}}$/.test(part);
          // xml:space="preserve" para no perder espacios al inicio/fin
          return `<w:r>${esVariable ? boldRPr : rPr}<w:t xml:space="preserve">${part}</w:t></w:r>`;
        })
        .join("");
    });

    zip.file(archivo, xml);
  }
}

function rellenarPlantilla(templatePath: string, datos: Record<string, unknown>): Buffer {
  const content = readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  separarVariablesNegrita(zip);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
  });
  doc.render(datos);
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}

function docxABase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

// ─── Generadores ────────────────────────────────────────────────────────────

export function generarContratoPersonal(datos: DatosContratoPersonal): string {
  const templatePath = join(process.cwd(), "src/lib/signatura/plantillas/contrato_personal.docx");

  const tem = datos.tem;
  const r = tem / 100;
  const n = datos.cuotas;
  const monto = datos.monto;

  // Tasas derivadas de TEM
  const tna = tem * 12;
  const tea = (Math.pow(1 + r, 12) - 1) * 100;
  // CFTEA: TEA con IVA 21% sobre intereses incorporado por período
  const cftea = (Math.pow(1 + r * 1.21, 12) - 1) * 100;

  // Cuota fija sistema francés (sin IVA)
  const cuotaFija = Math.round(monto * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));

  // Fecha primera cuota: primer día del mes siguiente a la aprobación
  const aprobacion = new Date(datos.fecha_aprobacion);
  const primerVencimiento = new Date(aprobacion.getFullYear(), aprobacion.getMonth() + 1, 1);

  // Tabla de amortización (para loop docxtemplater)
  const cuotas_tabla: Record<string, string>[] = [];
  let saldo = monto;
  let totalAPagar = 0;
  for (let i = 1; i <= n; i++) {
    const interesMes = Math.round(saldo * r);
    const ivaMes = Math.round(interesMes * 0.21);
    const amortizMes = cuotaFija - interesMes;
    saldo = Math.max(0, saldo - amortizMes);
    const cuotaPagar = cuotaFija + ivaMes;
    totalAPagar += cuotaPagar;
    cuotas_tabla.push({
      fecha_vto: format(addMonths(primerVencimiento, i - 1), "dd/MM/yyyy"),
      cuota_sin_iva: formatearPesos(cuotaFija),
      interes: formatearPesos(interesMes),
      amortiz: formatearPesos(amortizMes),
      saldo: formatearPesos(saldo),
      iva: formatearPesos(ivaMes),
      cuota_pagar: formatearPesos(cuotaPagar),
    });
  }

  const banco = datos.banco || bancoDesdesCBU(datos.cbu);

  const variables: Record<string, unknown> = {
    nombre: datos.nombre,
    nombre_completo: datos.nombre,
    dni: datos.dni,
    cuil: datos.cuil,
    email: datos.email,
    domicilio: datos.domicilio,
    ciudad: datos.ciudad,
    provincia: datos.provincia,
    profesion: datos.profesion,
    monto: formatearPesos(monto),
    monto_letras: numeroALetras(monto),
    total_a_pagar: formatearPesos(totalAPagar),
    total_a_pagar_letras: numeroALetras(totalAPagar),
    cuotas: String(n),
    tem: pct(tem),
    tna: pct(tna),
    tea: pct(tea),
    cftea: pct(cftea),
    primera_cuota: formatearPesos(datos.primera_cuota),
    primera_cuota_fecha: fechaLarga(primerVencimiento.toISOString()),
    cbu: datos.cbu,
    banco,
    fecha: fechaLarga(datos.fecha_aprobacion),
    numero_solicitud: datos.numero_solicitud,
    cuotas_tabla,
  };

  const buffer = rellenarPlantilla(templatePath, variables);
  return docxABase64(buffer);
}

export function generarContratoComercial(datos: DatosContratoComercial): string {
  const templatePath = join(process.cwd(), "src/lib/signatura/plantillas/contrato_comercial.docx");

  const ted = datos.ted;
  // Tasas derivadas de TED
  const tna = ted * 365;
  const tea = (Math.pow(1 + ted / 100, 365) - 1) * 100;
  const cftea = (Math.pow(1 + (ted / 100) * 1.21, 365) - 1) * 100;

  const banco = datos.banco || bancoDesdesCBU(datos.cbu);

  const primera = new Date(datos.primera_cuota_fecha);

  const totalAPagar = datos.cuota_diaria * datos.plazo_dias;

  const variables: Record<string, unknown> = {
    nombre: datos.nombre,
    nombre_completo: datos.nombre,
    dni: datos.dni,
    cuil: datos.cuil,
    email: datos.email,
    domicilio: datos.domicilio,
    ciudad: datos.ciudad,
    cp: datos.cp,
    provincia: datos.provincia,
    profesion: datos.profesion,
    domicilio_comercial: datos.domicilio_comercial,
    ciudad_comercial: datos.ciudad_comercial,
    cp_comercial: datos.cp_comercial,
    nombre_comercio: datos.nombre_comercio,
    monto: formatearPesos(datos.monto),
    monto_letras: numeroALetras(datos.monto),
    total_a_pagar: formatearPesos(totalAPagar),
    total_a_pagar_letras: numeroALetras(totalAPagar),
    plazo_dias: String(datos.plazo_dias),
    ted: pct(ted),
    tna: pct(tna),
    tea: pct(tea),
    cftea: pct(cftea),
    cuota_diaria: formatearPesos(datos.cuota_diaria),
    cuota_diaria_letras: numeroALetras(datos.cuota_diaria),
    primera_cuota_fecha: fechaLarga(primera.toISOString()),
    cbu: datos.cbu,
    banco,
    fecha: fechaLarga(datos.fecha_aprobacion),
    numero_solicitud: datos.numero_solicitud,
  };

  const buffer = rellenarPlantilla(templatePath, variables);
  return docxABase64(buffer);
}
