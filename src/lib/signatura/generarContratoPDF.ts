import PDFDocument from "pdfkit";
import { formatearPesos } from "@/lib/loan-calculator";
import { format, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { join } from "path";
import type { DatosContratoPersonal, DatosContratoComercial } from "./generarContrato";

// ─── Constants ────────────────────────────────────────────────────────────────
const MARGIN = 72;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const HEADER_H = 57;              // ≈2cm
const FOOTER_H = 57;              // ≈2cm
const LOGO_W = 40;
const TOP_MARGIN = HEADER_H + 15; // content top = 72pt
const BOT_MARGIN = FOOTER_H + 15; // content bottom offset = 72pt
const CONTENT_W = PAGE_W - 2 * MARGIN;
const CONTENT_BOTTOM = PAGE_H - BOT_MARGIN;
const FS = 10;
const FS_SM = 8;
const ROW_H = 15;
const LOGO_PATH = join(process.cwd(), "public/contratos/zprest.png");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fechaLarga(iso: string) {
  return format(new Date(iso), "d 'de' MMMM 'de' yyyy", { locale: es });
}

function pct(n: number, decimals = 2) {
  return `${n.toFixed(decimals)}%`;
}

function numeroALetras(n: number): string {
  if (n === 0) return "cero pesos";
  const U = ["", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const T = ["diez", "once", "doce", "trece", "catorce", "quince",
    "dieciseis", "diecisiete", "dieciocho", "diecinueve"];
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
  if (millones === 1) partes.push("un millon");
  else if (millones > 1) partes.push(`${cen(millones)} millones`);
  const miles = Math.floor(restoMill / 1_000);
  if (miles === 1) partes.push("mil");
  else if (miles > 1) partes.push(`${cen(miles)} mil`);
  const resto = restoMill % 1_000;
  if (resto > 0) partes.push(cen(resto));
  const prefix = partes.join(" ");
  if (prefix.endsWith("millon") || prefix.endsWith("millones")) return `${prefix} de pesos`;
  return `${prefix} pesos`;
}

function bancoDesdesCBU(cbu: string): string {
  const code = cbu.substring(0, 3);
  const bancos: Record<string, string> = {
    "007": "Banco Galicia", "011": "Banco Nacion", "014": "Banco Provincia",
    "017": "BBVA Argentina", "034": "Banco Supervielle", "044": "Banco Hipotecario",
    "060": "Banco Comafi", "072": "Banco Santander", "083": "Banco Patagonia",
    "191": "ICBC Argentina", "259": "Banco Ciudad", "301": "Brubank",
    "307": "Mercado Pago", "389": "Uala",
  };
  return bancos[code] || "el banco indicado";
}

// ─── PDF engine ───────────────────────────────────────────────────────────────

function pdfBuffer(builder: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let pageNum = 0;

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: TOP_MARGIN, bottom: BOT_MARGIN, left: MARGIN, right: MARGIN },
    });
    const parts: Buffer[] = [];
    doc.on("data", (c: Buffer) => parts.push(c));
    doc.on("end", () => resolve(Buffer.concat(parts)));
    doc.on("error", reject);

    const drawPageDecorations = () => {
      pageNum++;
      const savedX = doc.x;
      const savedY = doc.y;

      // Temporarily allow drawing outside the content area (header y<topMargin, footer y>maxY).
      // Without this, doc.text() at footerY > page.maxY() triggers addPage() → infinite recursion.
      const page = (doc as any).page;
      const origTop = page.margins.top;
      const origBottom = page.margins.bottom;
      page.margins.top = 0;
      page.margins.bottom = 0;

      doc.save();

      // ── Header band ───────────────────────────────────────────────────
      doc.rect(0, 0, PAGE_W, HEADER_H).fill("#f7f7f7");
      doc.strokeColor("#dddddd").lineWidth(0.5)
        .moveTo(0, HEADER_H).lineTo(PAGE_W, HEADER_H).stroke();

      const logoY = (HEADER_H - LOGO_W) / 2;
      try {
        doc.image(LOGO_PATH, MARGIN, logoY, { width: LOGO_W });
      } catch { /* logo opcional */ }

      const nameX = MARGIN + LOGO_W + 10;
      const nameW = PAGE_W - nameX - MARGIN;
      doc.fillColor("#222222").font("Helvetica-Bold").fontSize(8.5)
        .text("ZAYIN SERVICIOS FINANCIEROS S.A.S.", nameX, logoY + 4, { width: nameW, lineBreak: false });
      doc.fillColor("#777777").font("Helvetica").fontSize(7.5)
        .text("zprest.com.ar", nameX, logoY + 18, { width: nameW, lineBreak: false });

      // ── Footer band ───────────────────────────────────────────────────
      const footerY = PAGE_H - FOOTER_H;
      doc.rect(0, footerY, PAGE_W, FOOTER_H).fill("#f7f7f7");
      doc.strokeColor("#dddddd").lineWidth(0.5)
        .moveTo(0, footerY).lineTo(PAGE_W, footerY).stroke();
      doc.fillColor("#777777").font("Helvetica").fontSize(7.5)
        .text(`Página ${pageNum}`, 0, footerY + (FOOTER_H - 8) / 2, { width: PAGE_W, align: "center", lineBreak: false });

      doc.restore();
      doc.fillColor("#000000"); // reset after gray footer text

      // Restore margins and cursor
      page.margins.top = origTop;
      page.margins.bottom = origBottom;
      doc.x = savedX;
      doc.y = savedY;
    };

    drawPageDecorations(); // primera página (no dispara pageAdded)
    doc.on("pageAdded", drawPageDecorations);

    builder(doc);
    doc.end();
  });
}

function title(doc: PDFKit.PDFDocument, text: string) {
  doc.font("Helvetica-Bold").fontSize(FS).text(text, { width: CONTENT_W });
  doc.moveDown(0.25);
}

function body(doc: PDFKit.PDFDocument, text: string) {
  doc.font("Helvetica").fontSize(FS).text(text, { width: CONTENT_W, align: "justify", lineGap: 1 });
  doc.moveDown(0.5);
}

// Renderiza texto con partes en negrita marcadas con **...**
function bb(doc: PDFKit.PDFDocument, template: string) {
  const parts = template.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  parts.forEach((part, i) => {
    const bold = part.startsWith("**") && part.endsWith("**");
    const text = bold ? part.slice(2, -2) : part;
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(FS)
      .text(text, { continued: i < parts.length - 1, align: "justify", lineGap: 1, width: CONTENT_W });
  });
  doc.moveDown(0.5);
}

function gap(doc: PDFKit.PDFDocument) {
  doc.moveDown(0.6);
}

function centered(doc: PDFKit.PDFDocument, text: string, bold = false) {
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(FS).text(text, { width: CONTENT_W, align: "center" });
  doc.moveDown(0.2);
}

// ─── Commercial amortization table ───────────────────────────────────────────

type ComercialRow = {
  n: string; fecha: string; capital: string;
  interes: string; total: string; saldo: string;
};

function drawComercialTable(doc: PDFKit.PDFDocument, rows: ComercialRow[]) {
  const cols = [25, 72, 80, 80, 84, 110]; // sum = 451 = CONTENT_W
  const headers = ["N°", "Fecha", "Capital", "Interés c/IVA", "Total Cuota", "Saldo Restante"];

  const drawRow = (rowY: number, cells: string[], bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(FS_SM);
    let x = MARGIN;
    cells.forEach((cell, i) => {
      doc.rect(x, rowY, cols[i], ROW_H).stroke();
      doc.text(cell, x + 2, rowY + (ROW_H - FS_SM) / 2, {
        width: cols[i] - 4,
        lineBreak: false,
      });
      x += cols[i];
    });
  };

  let y = doc.y;
  if (y + ROW_H * 3 > CONTENT_BOTTOM) { doc.addPage(); y = TOP_MARGIN; }

  drawRow(y, headers, true);
  y += ROW_H;

  for (const row of rows) {
    if (y + ROW_H > CONTENT_BOTTOM) { doc.addPage(); y = TOP_MARGIN; }
    drawRow(y, [row.n, row.fecha, row.capital, row.interes, row.total, row.saldo], true);
    y += ROW_H;
  }

  doc.y = y + 8;
  doc.x = MARGIN;
}

// ─── Amortization table (personal contracts only) ────────────────────────────

type AmortRow = {
  fecha_vto: string; cuota_sin_iva: string; interes: string;
  amortiz: string; saldo: string; iva: string; cuota_pagar: string;
};

function drawAmortTable(doc: PDFKit.PDFDocument, rows: AmortRow[]) {
  const cols = [75, 65, 60, 60, 65, 51, 75]; // sum = 451 = CONTENT_W
  const headers = ["Fecha a Pagar", "CUOTA S/ IVA", "INTERES", "AMORTIZ", "SALDO", "IVA", "Cuota Pagar"];

  const drawRow = (rowY: number, cells: string[], bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(FS_SM);
    let x = MARGIN;
    cells.forEach((cell, i) => {
      doc.rect(x, rowY, cols[i], ROW_H).stroke();
      doc.text(cell, x + 2, rowY + (ROW_H - FS_SM) / 2, {
        width: cols[i] - 4,
        lineBreak: false,
      });
      x += cols[i];
    });
  };

  let y = doc.y;

  // Page break if less than header + 2 rows fit
  if (y + ROW_H * 3 > CONTENT_BOTTOM) {
    doc.addPage();
    y = TOP_MARGIN;
  }

  drawRow(y, headers, true);
  y += ROW_H;

  for (const row of rows) {
    if (y + ROW_H > CONTENT_BOTTOM) {
      doc.addPage();
      y = TOP_MARGIN;
    }
    drawRow(y, [row.fecha_vto, row.cuota_sin_iva, row.interes, row.amortiz, row.saldo, row.iva, row.cuota_pagar], true);
    y += ROW_H;
  }

  // Reset text cursor after table
  doc.y = y + 8;
  doc.x = MARGIN;
}

// ─── Personal contract ────────────────────────────────────────────────────────

export async function generarContratoPersonalPDF(datos: DatosContratoPersonal): Promise<string> {
  const tem = datos.tem;
  const r = tem / 100;
  const n = datos.cuotas;
  const monto = datos.monto;
  const tna = tem * 12;
  const tea = (Math.pow(1 + r, 12) - 1) * 100;
  const cftea = (Math.pow(1 + r * 1.21, 12) - 1) * 100;
  const cuotaFija = Math.round(monto * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
  const aprobacion = new Date(datos.fecha_aprobacion);
  const primerVencimiento = new Date(aprobacion.getFullYear(), aprobacion.getMonth() + 1, 1);

  const amortRows: AmortRow[] = [];
  let saldo = monto;
  let totalAPagar = 0;
  for (let i = 1; i <= n; i++) {
    const interesMes = Math.round(saldo * r);
    const ivaMes = Math.round(interesMes * 0.21);
    const amortizMes = cuotaFija - interesMes;
    saldo = Math.max(0, saldo - amortizMes);
    const cuotaPagar = cuotaFija + ivaMes;
    totalAPagar += cuotaPagar;
    amortRows.push({
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
  const montoFmt = formatearPesos(monto);
  const totalFmt = formatearPesos(totalAPagar);
  const montoLetras = numeroALetras(monto);
  const primeraCuotaFechaFmt = fechaLarga(primerVencimiento.toISOString());
  const fechaFmt = fechaLarga(datos.fecha_aprobacion);

  const buf = await pdfBuffer((doc) => {
    // TÍTULO
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(16).text("CONTRATO CREDITO PERSONAL", {
      width: CONTENT_W, align: "center",
    });
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(FS).text(`Solicitud N° ${datos.numero_solicitud}`, {
      width: CONTENT_W, align: "center",
    });
    doc.moveDown(1.2);

    // ENCABEZADO
    bb(doc,
      `El que suscribe: **${datos.nombre}** DNI N **${datos.dni}**, Profesion/Actividad: **${datos.profesion}**, con domicilio en: **${datos.domicilio}** de la Ciudad de **${datos.ciudad}** Provincia **${datos.provincia}**, en adelante el SOLICITANTE, solicita de ZAYIN SERVICIOS FINANCIEROS S.A.S., con domicilio en Altos de CNEA, Duplex A, Lote 6, Manzana 3D, Collon Cura S/N, de la Ciudad de Plottier, Provincia de Neuquen (en adelante, la OTORGANTE), a traves del sitio web: Zprest.com.ar, el otorgamiento de un prestamo para capital de trabajo, que quedara sujeto a las siguientes clausulas y condiciones:`
    );
    gap(doc);

    // 1
    title(doc, "1 MONTO. ACREDITACION.");
    bb(doc,
      `El monto del prestamo sera de **${montoFmt}** (**${montoLetras}**); y sera depositado por la OTORGANTE, en la cuenta identificada con CBU N **${datos.cbu}** titularidad del Solicitante en **${banco}**.`
    );
    body(doc,
      "El OTORGANTE se reserva el derecho a su exclusivo criterio, de rechazar o disminuir el monto de la presente Solicitud de Otorgamiento de Prestamo, sin que ello origine a favor del SOLICITANTE derecho a reclamar ningun tipo de indemnizacion. Asimismo, en caso de disminucion del monto solicitado en la presente clausula, el OTORGANTE podra posteriormente ir ampliandole al SOLICITANTE el monto del prestamo, en caso de que el OTORGANTE a su exclusivo criterio asi lo decidiera. La acreditacion del monto que sea aprobado finalmente por el OTORGANTE, y las futuras acreditaciones que posteriormente el SOLICITANTE le otorgue, seran realizadas en la cuenta indicada en la presente clausula siendo suficiente constancia del recibo de la suma convenida por el SOLICITANTE, asi como de la aceptacion de la OTORGANTE a los terminos de la presente, que sera considerada a partir de la primera acreditacion como el contrato que vincula a las partes. En caso de haberse cancelado parte del dinero prestado antes de la fecha establecida en la Clausula Segunda, el cupo se podra liberar a opcion del OTORGANTE y siempre dentro del limite descripto en la Clausula Primera. Dicho cupo se podra otorgar en las mismas condiciones pactadas en el presente, o bien de acuerdo a las condiciones que se pacten en un futuro. En dicho caso, se suscribira una adenda a la presente solicitud de otorgamiento de prestamo, en la cual se fijaran las condiciones de este nuevo otorgamiento."
    );
    gap(doc);

    // 2
    title(doc, "2 FORMA DE PAGO.");
    bb(doc,
      `El SOLICITANTE se obliga a devolver la suma recibida en **${n} cuotas mensuales** que se detallaran a continuacion. Dicho monto incluye tanto la parte correspondiente al capital adeudado, como los intereses y porcentual correspondiente al Seguro de Saldo Deudor.`
    );
    bb(doc,
      `CAPITAL: **${montoFmt}** Pesos. TNA (Tasa Nominal Anual) **${pct(tna)}** TEA (Tasa Efectiva Anual) **${pct(tea)}** TEM (Tasa Efectiva Mensual) **${pct(tem)}** CFTEFA (Costo Financiero Total Efectivo Anual) **${pct(cftea)}**, el IVA sobre los intereses correspondientes, las comisiones por Administracion de Cuota (pesos veinte) mas impuestos por cada orden de debito de las cuotas y el costo del seguro de Saldo Deudor. Detalle de cuotas y Vencimiento.`
    );
    gap(doc);

    // TABLA
    drawAmortTable(doc, amortRows);
    gap(doc);

    bb(doc,
      `En caso de configurarse la mora por falta de pago, se adicionaran al monto senalado los intereses punitorios, IVA sobre intereses y los gastos por gestion de cobranza detallados en la clausula SEPTIMA. Las cuotas seran pagaderas la primera el dia **${primeraCuotaFechaFmt}** y las restantes en la misma fecha de acuerdo al cronograma de vencimientos o el dia habil inmediato posterior si el fijado fuere feriado bancario.`
    );
    body(doc,
      "Todos los pagos que deba efectuar el SOLICITANTE a causa de la presente, se haran efectivos mediante debito automatico/transferencia a la cuenta perteneciente a la empresa."
    );
    body(doc,
      "A este fin, El SOLICITANTE se obliga a efectuar tales pagos por los importes y en las fechas de vencimiento pactadas o las derivadas del uso de modalidades acordadas en la clausula SEGUNDA. Caso contrario se procedera a efectuar el cobro de los intereses por los importes pactados en fechas posteriores a los vencimientos que fueron establecidos, pudiendo el OTORGANTE adicionalmente efectuar tambien los cobros correspondientes por la mora en el pago de la cuota conforme se detalla en la clausula SEPTIMA. Asimismo, se deja expresa constancia que el SOLICITANTE podra realizar los pagos en forma voluntaria, respetando las fechas de vencimiento pactadas con el OTORGANTE. Dichos pagos se efectuaran a traves de los medios de pago que establezca el OTORGANTE, los cuales se informaran a traves de la pagina web del OTORGANTE. De generarse gastos adicionales por efectuarse el pago voluntario, los mismos estaran a cargo exclusivamente del SOLICITANTE."
    );
    gap(doc);

    // 3
    title(doc, "3 MODALIDADES.");
    body(doc,
      "El SOLICITANTE podra hacer uso de las siguientes facilidades que se establecen a su favor, las cuales operaran a traves del sitio de Internet de la OTORGANTE, el que se regira por las condiciones ahi establecidas, las que el SOLICITANTE declara conocer y aceptar, y que se consideran parte integrante de la presente Solicitud."
    );
    body(doc,
      "a) Pre-cancelacion total del prestamo: El SOLICITANTE podra realizar la pre-cancelacion total del saldo de deuda en la fecha de vencimiento de cualquiera de las cuotas pactadas. No se aplicara ningun cargo adicional cuando al momento de efectuarla haya transcurrido al menos la cuarta parte del plazo original de la financiacion o 180 dias corridos desde su otorgamiento, de ambos el mayor."
    );
    body(doc,
      "b) Opcion de diferimiento del vencimiento de la primera cuota: el SOLICITANTE podra a su exclusivo criterio y decision diferir el vencimiento de la primera cuota hasta un maximo de 30 dias desde la fecha estipulada inicialmente, a efectos de hacer vencer esa primera cuota y las restantes en una fecha determinada que seleccione. Dicho diferimiento implicara el calculo de intereses compensatorios adicionales calculados a la tasa de interes del prestamo por la cantidad de dias diferidos desde la fecha estipulada inicialmente por el OTORGANTE hasta la fecha finalmente seleccionada por el SOLICITANTE. Los Intereses asi calculados se acumularan al capital original del prestamo y se deduciran al momento de la liquidacion del mismo como intereses pagados por adelantado. La opcion por parte del SOLICITANTE de este diferimiento implicara su consentimiento expreso a la capitalizacion de los intereses adicionales en los terminos del Art. 770 del Codigo Civil y Comercial de la Nacion."
    );
    gap(doc);

    // 4
    title(doc, "4 ANTECEDENTES. COMPROMISO DE TRANSPARENCIA y BUENA FE.");
    body(doc,
      "Se hace constar: a) Que el SOLICITANTE ha tomado conocimiento previo de los Terminos y Condiciones que regulan el otorgamiento del prestamo solicitado, incluyendo la conformacion en detalle de cada uno de los rubros que componen el monto a devolver y el texto integro de esta solicitud, de la cual tiene copia en su poder, en el sitio de Internet de la OTORGANTE. b) Que, a los efectos del otorgamiento del prestamo, la OTORGANTE tiene en cuenta con especial consideracion la condicion del SOLICITANTE en su vinculacion con el sistema financiero informada por el Banco Central de la Republica Argentina, quien revista actualmente en la categoria Situacion 1 (segun la categoria definida por el BCRA), dato que el SOLICITANTE ratifica en este acto. c) Que en dicho sitio el SOLICITANTE podra consultar en cualquier momento ese estado de cuenta incluyendo monto del prestamo, cuotas programadas, cuotas abonadas, saldo pendiente de pago y uso de las modalidades establecidas en la clausula TERCERA. d) Que las partes confieren plena validez a las comunicaciones que se cursen a traves del referido sitio de Internet y se obligan a prestar su activa colaboracion para el cumplimiento de las pautas contractuales aqui contenidas. e) Que el SOLICITANTE se hace responsable por el uso de la clave personal por el registrada en el sitio de Internet de la OTORGANTE, asumiendo y consintiendo plenamente que dicha clave personal quede establecida como firma electronica convencional, y lo obligue respecto de todas las acciones e instrucciones que curse por su intermedio, con los mismos e identicos efectos que una firma holografa. Igualmente se hace responsable por la operatoria de la cuenta bancaria por el designada, conforme clausula PRIMERA, a los fines de la acreditacion y debito de las sumas convenidas en este contrato. f) Que el SOLICITANTE da su conformidad y autoriza expresamente al OTORGANTE a informar a instituciones oficiales o entidades privadas sobre el estado de cumplimiento de pagos, transmitir informacion a terceras empresas para fines de evaluacion crediticia, utilizar datos personales para ofrecimiento de productos, y acceder a la informacion crediticia en la Central de Deudores del Sistema Financiero."
    );
    gap(doc);

    // 5
    title(doc, `5 PAGARE.`);
    bb(doc,
      `El SOLICITANTE suscribe en este acto, de forma presencial y con firma olografa, un pagare con clausula sin protesto y a la vista a favor de la OTORGANTE por la suma de **${montoFmt}** (pesos **${montoLetras}**); Se conviene al respecto que ese documento solo podra ser ejecutado en caso de mora del SOLICITANTE debidamente configurada conforme lo pactado en la clausula SEXTA. Y en tal caso la ejecucion podra promoverse exclusivamente por el saldo adeudado por el SOLICITANTE a causa de la presente, con independencia del monto del pagare.`
    );
    gap(doc);

    // 6
    title(doc, "6 MORA.");
    body(doc,
      "La falta de pago de cualquiera de las obligaciones asumidas por el SOLICITANTE lo hara incurrir en mora de pleno derecho sin necesidad de interpelacion alguna; en particular, seran causales de mora: a) La inexistencia de fondos suficientes para el debito de cualquiera de los pagos a cargo del SOLICITANTE. b) La revocacion de la autorizacion de debito automatico conferida en la clausula SEGUNDA. c) El cierre de la cuenta bancaria donde deben efectuarse los debitos. d) El cambio de la actual condicion del SOLICITANTE o el incumplimiento de cualquier otra obligacion. e) La existencia de inhibiciones y/o inhabilitaciones y/o embargos. f) La solicitud del SOLICITANTE de su quiebra o concurso. g) La falsedad o inexactitud de cualquier de las declaraciones o datos personales. h) El cese o extincion de la relacion laboral del SOLICITANTE."
    );
    gap(doc);

    // 7
    title(doc, "7 CONSECUENCIAS DE LA MORA.");
    body(doc,
      "La mora del SOLICITANTE motivara y dara derecho a la OTORGANTE a declarar el vencimiento anticipado del presente contrato y a reclamar el total adeudado que sera considerado como capital de plazo vencido, con mas los intereses que se calcularan a una vez y media la tasa del prestamo original que es del 97% anual, desde la mora y hasta el efectivo pago. La OTORGANTE podra a tal fin proceder a la ejecucion del pagare librado conforme clausula QUINTA. Sin perjuicio de ello, dado que a resultas de la mora la OTORGANTE se vera obligada a efectuar una gestion de cobranza previa a la promocion de las acciones judiciales se conviene que el SOLICITANTE debera abonar en ese caso los gastos de cada gestion de cobranza."
    );
    gap(doc);

    // 8
    title(doc, "8 COMPENSACION.");
    body(doc,
      "En la medida que sea procedente de acuerdo al articulo 921 y siguientes del Codigo Civil y Comercial de la Nacion, el OTORGANTE queda facultado a compensar en todo o en parte cualquier credito del OTORGANTE con cualquier suma de dinero en moneda local o extranjera, que por cualquier concepto o titulo existiera en favor del SOLICITANTE en la cuenta corriente, caja de ahorro, plazo fijo u otro tipo de deposito. El OTORGANTE se compromete a notificar inmediatamente a los titulares de la cuenta luego de haber realizado cualquiera de dichas compensaciones."
    );
    gap(doc);

    // 9
    title(doc, "9 ADECUACION NO PREVALENCIA.");
    body(doc,
      "Para el hipotetico supuesto que alguna clausula de las contenidas en las presentes condiciones resultara inadecuada o no plenamente compatible con alguna disposicion normativa, o regla de buenas practicas a la que hubiese adherido el OTORGANTE, este se compromete a no prevalecerse de la misma, o en su caso, aplicarla solo en la medida que resulte compatible con tales normas o reglas que resulten aplicables."
    );
    gap(doc);

    // 10
    title(doc, "10 MODIFICACIONES.");
    body(doc,
      "Toda modificacion a los cargos administrativos y/o comisiones sera notificada a traves del e-mail registrado por el SOLICITANTE en el sitio, con sesenta (60) dias de anticipacion a la fecha en que se apliquen. Las modificaciones que impliquen incrementos en los cargos respondera exclusivamente a la incorporacion o mejora de servicios tecnologias, prestaciones o variaciones en los costos involucrados en la actividad."
    );
    gap(doc);

    // 11
    title(doc, "11 REQUERIMIENTO DE INFORMACION.");
    body(doc,
      "Ante el requerimiento del OTORGANTE o del Banco Central de la Republica Argentina o de la normativa vigente, el Cliente debera informar inmediatamente sobre su estado patrimonial, proveyendo la documentacion que lo fundamente. El Cliente autoriza al OTORGANTE a verificar por los medios que considere convenientes la correccion de los datos que le hubiere proporcionado."
    );
    gap(doc);

    // 12
    title(doc, "12 CONFORMIDAD.");
    body(doc,
      "El OTORGANTE podra ceder libremente los derechos resultantes de la presente, sin que ello pueda implicar modificacion alguna de las obligaciones asumidas por el SOLICITANTE, quien presta a esos efectos su conformidad. En los casos que la cesion se realice de conformidad con lo previsto en los arts. 70, 71 y 72 de la ley 24.441 no sera requisito la notificacion al solicitante."
    );
    gap(doc);

    // 13
    title(doc, "13 Declaracion jurada:");
    body(doc,
      "El SOLICITANTE declara bajo juramento que todos los datos personales que ha Ingresado via Internet son autenticos, exactos y permanecen vigentes a la fecha de la presente, ratificandolas integramente mediante la firma del anexo adjunto."
    );
    gap(doc);

    // 14
    title(doc, "14 COMPETENCIA. Domicilios.");
    body(doc,
      "Para todos los efectos de la presente, las partes se someten a la competencia de los Tribunales Ordinarios de la Primera Circunscripcion de Neuquen y constituyen domicilios especiales en los indicados en el encabezamiento, donde seran validas todas las notificaciones que deban practicarse. Asimismo, las partes acuerdan que las notificaciones cursadas a sus domicilios electronicos seran validas y vinculantes. A tal efecto, la OTORGANTE constituye como su domicilio electronico la casilla de correo: contacto@zprest.com.ar, y el SOLICITANTE constituye como domicilio electronico el correo electronico informado en la presente Solicitud de Prestamo. Cualquier cambio de dichos domicilios electronicos debera ser comunicado de manera fehaciente a la otra parte."
    );
    gap(doc);

    // 15
    title(doc, "15 POLITICA DE PROTECCION DE DATOS PERSONALES.");
    body(doc,
      "ZAYIN SERVICIOS FINANCIEROS SAS posee una estricta POLITICA DE PROTECCION DE DATOS PERSONALES, que tiene por objeto la proteccion integral de los datos personales asentados en sus Bases de Datos, para garantizar el derecho al honor y la intimidad de las personas, de conformidad con lo prescripto por el art. 43 de la Constitucion Nacional y la LEY DE PROTECCION DE DATOS PERSONALES (25.326). ZAYIN SERVICIOS FINANCIEROS SAS asume el caracter de Responsable Registrado. El SOLICITANTE tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses. El SOLICITANTE podra ejercitar los derechos de acceso, actualizacion, cancelacion, rectificacion y oposicion contactando a ZAYIN SERVICIOS FINANCIEROS SAS a traves del correo electronico contacto@zprest.com.ar."
    );
    gap(doc);

    // 16
    title(doc, "16 CLAUSULA DE REVOCACION.");
    body(doc,
      "El SOLICITANTE tiene el derecho irrenunciable de revocar la aceptacion del presente prestamo dentro del plazo de diez (10) dias habiles contados a partir de la disponibilidad efectiva del importe del mismo, notificando al OTORGANTE de manera fehaciente o por el mismo medio por el cual fue solicitado. Dicha revocacion sera sin costo ni responsabilidad alguna para el SOLICITANTE."
    );
    gap(doc);

    // 17
    title(doc, "17 FIRMA ELECTRONICA Y DIGITAL.");
    body(doc,
      "Las partes reconocen la validez de la firma electronica y digital aplicada en el presente contrato, conforme lo dispuesto por la Ley N 25.506 y el articulo 288 del Codigo Civil y Comercial de la Nacion. Dicha firma electronica o digital es legalmente valida y vinculante, teniendo la misma eficacia juridica y valor probatorio que la firma manuscrita (olografa) de las partes."
    );
    gap(doc);

    // 18
    title(doc, "18 EQUIVALENCIA DIGITAL.");
    body(doc,
      "Las partes acuerdan que el presente contrato, suscripto por medios electronicos, constituye un documento electronico original. Cualquier copia impresa del mismo que contenga la reproduccion de la firma digital de las partes sera considerada copia fiel del documento digital original a todos los efectos legales. Asimismo, las partes reconocen que este documento electronico satisface los requisitos de firma y de instrumento escrito previstos en la normativa vigente, gozando de plena validez y eficacia probatoria."
    );
    gap(doc);
    gap(doc);

    // FIRMA
    bb(doc, `Lugar y fecha: **${datos.ciudad}**, **${fechaFmt}**`);
    gap(doc);
    bb(doc, `Nro de solicitud: **${datos.numero_solicitud}**`);
    gap(doc);
    gap(doc);
    centered(doc, "____________________________________");
    centered(doc, "Firma del SOLICITANTE");
    centered(doc, `${datos.nombre} - DNI ${datos.dni}`, true);
  });

  return buf.toString("base64");
}

// ─── Commercial contract ──────────────────────────────────────────────────────

export async function generarContratoComercialPDF(datos: DatosContratoComercial): Promise<string> {
  const ted = datos.ted;
  const n = datos.plazo_dias;
  const tna = ted * 365;
  const tea = (Math.pow(1 + ted / 100, 365) - 1) * 100;
  const cftea = (Math.pow(1 + (ted / 100) * 1.21, 365) - 1) * 100;
  const banco = datos.banco || bancoDesdesCBU(datos.cbu);
  const totalAPagar = datos.cuota_diaria * n;
  const montoFmt = formatearPesos(datos.monto);
  const totalFmt = formatearPesos(totalAPagar);
  const montoLetras = numeroALetras(datos.monto);
  const totalLetras = numeroALetras(totalAPagar);
  const cuotaLetras = numeroALetras(datos.cuota_diaria);
  const cuotaFmt = formatearPesos(datos.cuota_diaria);
  const fechaFmt = fechaLarga(datos.fecha_aprobacion);
  const primeraCuotaFmt = fechaLarga(datos.primera_cuota_fecha);

  // Tabla de amortización diaria
  const capitalDiario = Math.round(datos.monto / n);
  const interesDiario = datos.cuota_diaria - capitalDiario;
  const primerFecha = new Date(datos.primera_cuota_fecha);
  const comercialRows: ComercialRow[] = [];
  let saldoRestante = datos.monto;
  for (let i = 0; i < n; i++) {
    const rawDate = new Date(primerFecha.getTime() + i * 24 * 60 * 60 * 1000);
    const fechaDia = rawDate.getDay() === 0 ? new Date(rawDate.getTime() + 24 * 60 * 60 * 1000) : rawDate;
    const capitalEste = i === n - 1 ? saldoRestante : capitalDiario;
    saldoRestante = Math.max(0, saldoRestante - capitalEste);
    comercialRows.push({
      n: String(i + 1),
      fecha: format(fechaDia, "dd/MM/yyyy"),
      capital: formatearPesos(capitalEste),
      interes: formatearPesos(interesDiario),
      total: formatearPesos(capitalEste + interesDiario),
      saldo: formatearPesos(saldoRestante),
    });
  }

  const buf = await pdfBuffer((doc) => {
    // TÍTULO
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(16).text("CONTRATO CREDITO COMERCIAL", {
      width: CONTENT_W, align: "center",
    });
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(FS).text(`Solicitud N° ${datos.numero_solicitud}`, {
      width: CONTENT_W, align: "center",
    });
    doc.moveDown(1.2);

    // ENCABEZADO
    bb(doc,
      `En el dia de la fecha **${fechaFmt}**, quien suscribe: **${datos.nombre}** DNI N **${datos.dni}**, con domicilio en **${datos.domicilio}** de la Ciudad de **${datos.ciudad}** (C.P. **${datos.cp}**), Provincia **${datos.provincia}** Profesion **${datos.profesion}** CUIT **${datos.cuil}**, titular del comercio sito en calle **${datos.domicilio_comercial}** en la ciudad de **${datos.ciudad_comercial}** (C.P **${datos.cp_comercial}**) Nombre de Fantasia: **${datos.nombre_comercio}** (en adelante, el SOLICITANTE); solicita de ZAYIN SERVICIOS FINANCIEROS S.A.S., con domicilio en Altos de CNEA, Duplex A, Lote 6, Manzana 3D, Collon Cura S/N, de la Ciudad de Plottier, Provincia de Neuquen (en adelante, la OTORGANTE), a traves del sitio web: Zprest.com.ar, el otorgamiento de un prestamo para capital de trabajo, que quedara sujeto a las siguientes clausulas y condiciones:`
    );
    gap(doc);

    // 1
    title(doc, "1. MONTO Y ACREDITACION.");
    bb(doc,
      `El monto del prestamo es la suma de **${montoFmt}** (**${montoLetras}**) que LA OTORGANTE entregara (acreditara) al SOLICITANTE. La suma sera depositada en la cuenta indicada por EL SOLICITANTE (CVU/CBU N **${datos.cbu}**, Titular **${datos.nombre}** en BILLETERA VIRTUAL/BANCO nombre: **${banco}**). Dicha acreditacion en la cuenta mencionada servira como suficiente constancia de recepcion del monto por parte del SOLICITANTE.`
    );
    bb(doc,
      `En caso de que EL SOLICITANTE cancele anticipadamente parte del dinero prestado antes de la fecha fijada para el vencimiento total (Clausula Segunda), LA OTORGANTE podra, a su sola opcion, liberar el cupo dentro del limite del monto acordado en esta clausula. Esto significa que EL SOLICITANTE podria volver a disponer de fondos adicionales (hasta completar el monto total de **${montoFmt}**) bajo las mismas condiciones pactadas en este contrato, o bajo condiciones que se pacten en el futuro mediante acuerdo expreso.`
    );
    body(doc,
      "Finalmente, una vez cumplido el pago total de todas las obligaciones emergentes del presente contrato, el contrato se considerara finalizado de pleno derecho. Cualquier nuevo prestamo que el SOLICITANTE desee obtener de LA OTORGANTE despues de la finalizacion del presente debera instrumentarse mediante la celebracion de un nuevo contrato independiente, salvo acuerdo expreso en contrario entre las partes."
    );
    gap(doc);

    // 2
    title(doc, "2. FORMA DE PAGO E INTERESES.");
    bb(doc,
      `EL SOLICITANTE se obliga a reembolsar el prestamo en **${n} cuotas diarias**, iguales y consecutivas, de **${cuotaFmt}** (**${cuotaLetras}**) cada una. Cada cuota diaria comprende la porcion de capital, los intereses compensatorios devengados y el IVA (21%) sobre dichos intereses. Las cuotas se abonaran en forma diaria; la primera cuota vencera el dia **${primeraCuotaFmt}** y las cuotas siguientes vencen cada dia segun el cronograma de pagos.`
    );
    bb(doc,
      `El monto total a pagar por el SOLICITANTE en concepto de capital, intereses e IVA asciende a la suma de **${totalFmt}** (**${totalLetras}**).`
    );
    bb(doc,
      `El prestamo devengara intereses compensatorios calculados diariamente. La Tasa Nominal Anual (TNA) aplicada es del **${pct(tna)}**, lo que equivale a una Tasa Efectiva Diaria (TED) de aproximadamente **${pct(ted)}**. En base a esta ultima, la Tasa Efectiva Anual (TEA) resultante asciende al **${pct(tea)}**. El Costo Financiero Total Efectivo Anual (CFTEA) para el presente prestamo es del **${pct(cftea)}**, e incluye todos los intereses, el IVA sobre los intereses devengados y los gastos administrativos aplicables.`
    );
    body(doc,
      "Todos los pagos que deba efectuar EL SOLICITANTE en virtud de este contrato se realizaran en forma diaria mediante transferencia bancaria o mediante pago QR a la cuenta Mercado Pago de LA OTORGANTE, o bien en el momento en que el cobrador de LA OTORGANTE concurra al domicilio comercial del SOLICITANTE. Bajo ninguna circunstancia el cobrador recibira dinero en efectivo; su funcion se limita a facilitar y verificar la realizacion del pago a traves de los medios electronicos mencionados."
    );
    body(doc,
      "EL SOLICITANTE se obliga a mantener fondos suficientes en su cuenta o billetera para que, al momento de presentarse el cobrador, los pagos puedan hacerse efectivos sin demoras. Se deja expresa constancia de que EL SOLICITANTE podra, si lo desea, anticipar o adelantar pagos voluntariamente, siempre respetando las fechas de vencimiento pactadas, utilizando los medios de pago establecidos por LA OTORGANTE (los cuales seran informados a traves de la pagina web de LA OTORGANTE u otros canales oficiales). En caso de que el SOLICITANTE opte por realizar pagos en forma voluntaria por su cuenta y ello genere gastos adicionales (por ejemplo, comisiones por el uso de ciertos medios de pago), dichos gastos seran asumidos exclusivamente por EL SOLICITANTE."
    );
    gap(doc);

    // Cronograma de pagos
    title(doc, "CRONOGRAMA DE PAGOS");
    drawComercialTable(doc, comercialRows);
    gap(doc);

    // 3
    title(doc, "3. MODALIDADES DE PAGO.");
    body(doc,
      "El SOLICITANTE podra hacer uso de las facilidades de pago especiales que la OTORGANTE pudiera establecer a su favor, las cuales operaran a traves del sitio de Internet de la OTORGANTE, y que se regiran por las condiciones alli establecidas."
    );
    gap(doc);

    // 4
    title(doc, "4. ANTECEDENTES. COMPROMISO DE TRANSPARENCIA Y BUENA FE.");
    body(doc,
      "Se hace constar: a) Que el SOLICITANTE ha tomado conocimiento previo de los Terminos y Condiciones que regulan el otorgamiento del prestamo solicitado. b) Que la OTORGANTE ha evaluado la condicion crediticia del SOLICITANTE en base a la informacion obtenida de la Central de Deudores del BCRA u otras fuentes pertinentes. c) Que en el sitio web el SOLICITANTE podra consultar en cualquier momento el estado de cuenta de su prestamo. d) Que las partes confieren plena validez legal a las comunicaciones que cursen a traves del referido sitio de Internet."
    );
    body(doc,
      "El SOLICITANTE se hace responsable por la correcta operatoria de la cuenta bancaria por el designada a los fines de la acreditacion de las sumas convenidas en este contrato, debiendo notificar de inmediato a la OTORGANTE cualquier cambio en dicha cuenta."
    );
    body(doc,
      "El SOLICITANTE da su conformidad y autoriza expresamente a la OTORGANTE a transmitir informacion sobre los productos y/o servicios contratados, asi como los datos personales, a terceras empresas con fines de evaluacion crediticia, y a acceder y consultar la informacion crediticia que sobre el SOLICITANTE exista en la Central de Deudores del Sistema Financiero."
    );
    gap(doc);

    // 5
    title(doc, "5. PAGARE.");
    bb(doc,
      `En garantia de las obligaciones asumidas, EL SOLICITANTE entrega en este acto a LA OTORGANTE un pagare suscripto sin protesto y a la vista, a favor de LA OTORGANTE, por la suma de **${totalFmt}** (**${totalLetras}**). Las partes acuerdan que dicho pagare solo podra ser completado y ejecutado en caso de mora del SOLICITANTE configurada conforme lo pactado en la Clausula 7. En tal situacion de mora, LA OTORGANTE queda facultada para reclamar mediante la ejecucion del pagare unicamente el saldo adeudado por EL SOLICITANTE en virtud del presente contrato.`
    );
    gap(doc);

    // 6
    title(doc, "6. GASTOS Y RESPONSABILIDAD DEL SOLICITANTE.");
    body(doc,
      "El SOLICITANTE reconoce que es de su cargo exclusivo el pago de cualquier gasto o impuesto presente o futuro que grave al credito otorgado, incluyendo sellados, impuestos de credito y debito bancario, IVA u otros, eximiendo de toda responsabilidad a la OTORGANTE por dichos conceptos. Asimismo, el SOLICITANTE declara que dispone de capacidad de pago suficiente para afrontar el presente compromiso sin afectar la normal marcha de su negocio."
    );
    gap(doc);

    // 7
    title(doc, "7. MORA.");
    body(doc,
      "La falta de pago de cualquiera de las obligaciones asumidas por EL SOLICITANTE en este contrato hara que incurra en mora automatica y de pleno derecho, sin necesidad de interpelacion o reclamo previo de ninguna clase. En particular, constituiran causas de mora: a) La inexistencia de fondos suficientes en la cuenta designada o medio de pago provisto por EL SOLICITANTE para el pago de cualquiera de las cuotas. b) El cambio adverso en la condicion financiera o crediticia actual del SOLICITANTE que afectare su solvencia. c) La falsedad o inexactitud de cualquiera de las declaraciones, manifestaciones o datos personales proporcionados por EL SOLICITANTE."
    );
    gap(doc);

    // 8
    title(doc, "8. CONSECUENCIAS DE LA MORA.");
    body(doc,
      "Incurrida la mora por parte del SOLICITANTE, la OTORGANTE quedara habilitada a exigir inmediatamente el pago de la totalidad del saldo adeudado del prestamo, el cual sera considerado automaticamente vencido y exigible en su totalidad (vencimiento anticipado de plazo). Asimismo, desde el momento de la mora y hasta la cancelacion total de lo adeudado, el monto reclamado devengara, ademas de los intereses compensatorios, un interes punitorio (mora) equivalente al cincuenta por ciento (50%) de la tasa convenida para los intereses compensatorios."
    );
    body(doc,
      "Para hacer efectivo lo anterior, la OTORGANTE podra proceder a la ejecucion judicial del pagare firmado conforme la clausula Quinta. Queda expresamente convenido que seran a cargo exclusivo del SOLICITANTE todos los gastos, costas y honorarios profesionales que se originen tanto en la eventual gestion de cobranza extrajudicial como en la judicial del credito adeudado."
    );
    gap(doc);

    // 9
    title(doc, "9. ADECUACION - NO PREVALENCIA.");
    body(doc,
      "En el hipotetico supuesto de que alguna clausula de las contenidas en las presentes condiciones resultare incompatible o no plenamente acorde con alguna disposicion normativa vigente, o con alguna regla de buenas practicas a la que hubiere adherido la OTORGANTE, esta se compromete a no prevalerse de dicha clausula en perjuicio del SOLICITANTE."
    );
    gap(doc);

    // 10
    title(doc, "10. MODIFICACIONES.");
    body(doc,
      "Cualquier modificacion a los cargos administrativos y/o comisiones pactadas sera notificada al SOLICITANTE a traves del email registrado por este en el sitio web de la OTORGANTE, con no menos de treinta (30) dias de anticipacion a la fecha en que dicha modificacion deba entrar en vigencia."
    );
    gap(doc);

    // 11
    title(doc, "11. CONDICION FISCAL.");
    body(doc, "El SOLICITANTE manifiesta estar inscripto ante la ARCA.");
    gap(doc);

    // 12
    title(doc, "12. CONFORMIDAD - CESION.");
    body(doc,
      "La OTORGANTE podra ceder o transferir libremente los derechos resultantes de la presente relacion contractual, sin que ello implique modificacion alguna de las obligaciones asumidas por el SOLICITANTE, quien desde ya presta su conformidad a tal cesion. En los casos en que la cesion se realice de conformidad con lo previsto en los arts. 70, 71 y 72 de la Ley 24.441, las partes acuerdan que no sera requisito la notificacion previa de dicha cesion al SOLICITANTE."
    );
    gap(doc);

    // 13
    title(doc, "13. DECLARACION JURADA.");
    body(doc,
      "EL SOLICITANTE declara bajo juramento que todos los datos personales y comerciales que ingreso por medios electronicos al solicitar el presente credito son verdaderos, exactos y actuales a la fecha de la suscripcion del contrato. Cualquier falsedad o inexactitud en estos datos habilitara a LA OTORGANTE a considerar incumplida la obligacion de informacion veraz por parte del SOLICITANTE y a adoptar las medidas correspondientes."
    );
    gap(doc);

    // 14
    title(doc, "14. COMPETENCIA Y DOMICILIOS.");
    body(doc,
      "Para todos los efectos judiciales y extrajudiciales derivados del presente contrato, las partes acuerdan someterse a la competencia de los Tribunales Ordinarios de la Primera Circunscripcion Judicial de la Provincia de Neuquen, con sede en la ciudad de Neuquen, Republica Argentina. Cualquier cambio de domicilio debera ser notificado fehacientemente a la otra parte dentro de las 48 horas de producido."
    );
    gap(doc);

    // 15
    title(doc, "15. PROTECCION DE DATOS PERSONALES.");
    body(doc,
      "LA OTORGANTE manifiesta poseer y aplicar una estricta Politica de Proteccion de Datos Personales, de conformidad con el art. 43 de la Constitucion Nacional Argentina y la Ley 25.326. EL SOLICITANTE consiente expresamente que LA OTORGANTE pueda informar a empresas y/u organismos dedicados a la recopilacion de informacion crediticia sobre el estado de cumplimiento de las obligaciones asumidas por EL SOLICITANTE en el presente contrato."
    );
    gap(doc);

    // 16
    title(doc, "16. CLAUSULA DE REVOCACION.");
    body(doc,
      "EL SOLICITANTE tiene el derecho irrenunciable de revocar su aceptacion del presente prestamo dentro del plazo de 10 (diez) dias habiles, contados a partir de la fecha en que el monto del prestamo haya sido puesto efectivamente a su disposicion. El ejercicio en tiempo y forma de este derecho de revocacion no generara costo ni responsabilidad alguna para EL SOLICITANTE."
    );
    gap(doc);

    // 17
    title(doc, "17. CARACTER COMERCIAL - EXCLUSION DE RELACION DE CONSUMO.");
    body(doc,
      "El SOLICITANTE manifiesta expresamente que el prestamo objeto del presente contrato ha sido solicitado y sera utilizado exclusivamente con fines comerciales y/o de inversion en su emprendimiento, quedando excluido del ambito de destinacion personal, familiar o domestica. En virtud de ello, ambas partes acuerdan que no resultan aplicables al presente contrato las disposiciones de la Ley de Defensa del Consumidor N 24.240."
    );
    gap(doc);

    // 18
    title(doc, "18. FIRMA ELECTRONICA Y VALIDEZ JURIDICA.");
    body(doc,
      "Las partes acuerdan suscribir el presente contrato mediante firma electronica con validacion biometrica. En virtud de la Ley N 25.506 de Firma Digital y el art. 288 del Codigo Civil y Comercial de la Nacion, la firma electronica utilizada vincula juridicamente a las partes con su declaracion de voluntad. Las partes reconocen que el documento electronico firmado de este modo constituye un instrumento privado plenamente valido y exigible."
    );
    gap(doc);

    // 19
    title(doc, "19. EQUIVALENCIA DIGITAL Y COPIAS.");
    body(doc,
      "El presente contrato celebrado en formato digital sera considerado como original unico. Las partes acuerdan que no sera necesario firmar ejemplares en papel, dado que la version electronica firmada goza de plena validez. Ninguna de las partes podra alegar la nulidad o inaplicabilidad de las obligaciones asumidas aduciendo la falta de soporte papel o de firma manuscrita."
    );
    gap(doc);
    gap(doc);

    // FIRMA
    bb(doc, `Lugar y fecha: **${datos.ciudad}**, **${fechaFmt}**`);
    gap(doc);
    bb(doc, `Nro de solicitud: **${datos.numero_solicitud}**`);
    gap(doc);
    gap(doc);
    centered(doc, "____________________________________");
    centered(doc, "Firma del SOLICITANTE");
    centered(doc, `${datos.nombre} - DNI ${datos.dni}`, true);
  });

  return buf.toString("base64");
}
