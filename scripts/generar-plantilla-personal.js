/**
 * Genera contrato_personal.docx desde cero con loop de tabla correcto para docxtemplater.
 * Corre con: node scripts/generar-plantilla-personal.js
 */

const PizZip = require("pizzip");
const fs = require("fs");
const path = require("path");

// ── Helpers XML ──────────────────────────────────────────────────────────────

function x(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const SZ = 20; // font size half-points (10pt)
const SZ_SM = 18; // 9pt para tabla

function rPr(bold = false, sz = SZ) {
  return `<w:rPr>${bold ? "<w:b/>" : ""}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>`;
}

function pPr(opts = {}) {
  const parts = [];
  if (opts.center) parts.push('<w:jc w:val="center"/>');
  if (opts.bold)   parts.push("<w:pStyle w:val=\"Heading3\"/>");
  parts.push("<w:spacing w:before=\"0\" w:after=\"120\"/>");
  return `<w:pPr>${parts.join("")}</w:pPr>`;
}

// Crea un párrafo complejo con runs, donde algunas partes pueden ser bold
function p(text, opts = {}) {
  const { bold = false, center = false, sz = SZ, spacing = 120 } = opts;
  const pp = `<w:pPr>${center ? '<w:jc w:val="center"/>' : ""}<w:spacing w:before="0" w:after="${spacing}"/></w:pPr>`;
  const rp = rPr(bold, sz);
  return `<w:p>${pp}<w:r>${rp}<w:t xml:space="preserve">${x(text)}</w:t></w:r></w:p>`;
}

// Párrafo con secciones bold/normal mezcladas: parts = [{t, bold?}]
function pMixed(parts, opts = {}) {
  const { center = false, sz = SZ, spacing = 120 } = opts;
  const pp = `<w:pPr>${center ? '<w:jc w:val="center"/>' : ""}<w:spacing w:before="0" w:after="${spacing}"/></w:pPr>`;
  const runs = parts.map(({ t, bold = false }) =>
    `<w:r>${rPr(bold, sz)}<w:t xml:space="preserve">${x(t)}</w:t></w:r>`
  ).join("");
  return `<w:p>${pp}${runs}</w:p>`;
}

function emptyP() {
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="60"/></w:pPr></w:p>`;
}

// ── Celda de tabla ───────────────────────────────────────────────────────────

function tc(content, bold = false) {
  const borders = `<w:tcBorders>
    <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  </w:tcBorders>`;
  const tcPr = `<w:tcPr>${borders}<w:tcMar><w:top w:w="50" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar></w:tcPr>`;
  const cellP = `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r>${rPr(bold, SZ_SM)}<w:t xml:space="preserve">${content}</w:t></w:r></w:p>`;
  return `<w:tc>${tcPr}${cellP}</w:tc>`;
}

// ── Tabla de amortización ────────────────────────────────────────────────────

const COLS = [2000, 1400, 1400, 1400, 1400, 900, 1460]; // anchos en twips

const tabla = `<w:tbl>
  <w:tblPr>
    <w:tblW w:w="0" w:type="auto"/>
    <w:tblBorders>
      <w:top    w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      <w:left   w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      <w:right  w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    </w:tblBorders>
    <w:tblCellMar>
      <w:top    w:w="50" w:type="dxa"/>
      <w:left   w:w="80" w:type="dxa"/>
      <w:bottom w:w="50" w:type="dxa"/>
      <w:right  w:w="80" w:type="dxa"/>
    </w:tblCellMar>
  </w:tblPr>
  <w:tblGrid>
    ${COLS.map(w => `<w:gridCol w:w="${w}"/>`).join("\n    ")}
  </w:tblGrid>
  <w:tr>
    ${tc("Fecha a Pagar", true)}
    ${tc("CUOTA S/ IVA", true)}
    ${tc("INTERES", true)}
    ${tc("AMORTIZ", true)}
    ${tc("SALDO", true)}
    ${tc("IVA", true)}
    ${tc("Cuota Pagar", true)}
  </w:tr>
  <w:tr>
    ${tc("{{#cuotas_tabla}}{{fecha_vto}}")}
    ${tc("{{cuota_sin_iva}}")}
    ${tc("{{interes}}")}
    ${tc("{{amortiz}}")}
    ${tc("{{saldo}}")}
    ${tc("{{iva}}")}
    ${tc("{{cuota_pagar}}{{/cuotas_tabla}}")}
  </w:tr>
</w:tbl>`;

// ── Contenido del contrato ───────────────────────────────────────────────────

const cuerpo = [

  // Encabezado
  p("El que suscribe: {{nombre_completo}} DNI Nº {{dni}}, Profesión/Actividad: {{profesion}}, con domicilio en: {{domicilio}} de la Ciudad de {{ciudad}} Provincia {{provincia}}, en adelante el SOLICITANTE, solicita de ZAYIN SERVICIOS FINANCIEROS S.A.S., con domicilio en Altos de CNEA, Dúplex A, Lote 6, Manzana 3D, Collón Cura S/N, de la Ciudad de Plottier, Provincia de Neuquén (en adelante, la OTORGANTE), a través del sitio web: Zprest.com.ar, el otorgamiento de un préstamo para capital de trabajo, que quedará sujeto a las siguientes cláusulas y condiciones:"),

  emptyP(),

  // 1ª
  p("1ª: MONTO. ACREDITACION.", { bold: true }),
  p("El monto del préstamo será de {{monto}} ({{monto_letras}}); y será depositado por la OTORGANTE, en la cuenta identificada con CBU Nº {{cbu}} titularidad del Solicitante en {{banco}}."),
  p("El OTORGANTE se reserva el derecho a su exclusivo criterio, de rechazar o disminuir el monto de la presente Solicitud de Otorgamiento de Préstamo, sin que ello origine a favor del SOLICITANTE derecho a reclamar ningún tipo de indemnización. Asimismo, en caso de disminución del monto solicitado en la presente cláusula, el OTORGANTE podrá posteriormente ir ampliándole al SOLICITANTE el monto del préstamo, en caso de que el OTORGANTE a su exclusivo criterio así lo decidiera. La acreditación del monto que sea aprobado finalmente por el OTORGANTE, y las futuras acreditaciones que posteriormente el SOLICITANTE le otorgue, serán realizadas en la cuenta indicada en la presente cláusula siendo suficiente constancia del recibo de la suma convenida por el SOLICITANTE, así como de la aceptación de la OTORGANTE a los términos de la presente, que será considerada a partir de la primera acreditación como el contrato que vincula a las partes. En caso de haberse cancelado parte del dinero prestado antes de la fecha establecida en la Cláusula Segunda, el cupo se podrá liberar a opción del OTORGANTE y siempre dentro del límite descripto en la Cláusula Primera. Dicho cupo se podrá otorgar en las mismas condiciones pactadas en el presente, o bien de acuerdo a las condiciones que se pacten en un futuro. En dicho caso, se suscribirá una adenda a la presente solicitud de otorgamiento de préstamo, en la cual se fijarán las condiciones de este nuevo otorgamiento."),

  emptyP(),

  // 2ª
  p("2ª: FORMA DE PAGO.", { bold: true }),
  p("El SOLICITANTE se obliga a devolver la suma recibida en {{cuotas}} cuotas mensuales que se detallaran a continuación. Dicho monto incluye tanto la parte correspondiente al capital adeudado, como los intereses y porcentual correspondiente al Seguro de Saldo Deudor."),
  p("CAPITAL: {{monto}} Pesos. TNA (Tasa Nominal Anual) {{tna}} TEA (Tasa Efectiva Anual) {{tea}} TEM (Tasa Efectiva Mensual) {{tem}} CFTEFA (Costo Financiero Total Efectivo Anual) {{cftea}}, el IVA sobre los intereses correspondientes, las comisiones por Administración de Cuota (pesos veinte) más impuestos por cada orden de débito de las cuotas y el costo del seguro de Saldo Deudor. Detalle de cuotas y Vencimiento."),

  emptyP(),

  // TABLA
  tabla,

  emptyP(),

  p("En caso de configurarse la mora por falta de pago, se adicionarán al monto señalado los intereses punitorios, IVA sobre intereses y los gastos por gestión de cobranza detallados en la cláusula SÉPTIMA. Las cuotas serán pagaderas la primera el día {{primera_cuota_fecha}} y las restantes en la misma fecha de acuerdo al cronograma de vencimientos o el día hábil inmediato posterior si el fijado fuere feriado bancario."),
  p("Todos los pagos que deba efectuar el SOLICITANTE a causa de la presente, se harán efectivos mediante debito automático/transferencia a la cuenta perteneciente a la empresa."),
  p("A este fin, El SOLICITANTE se obliga a efectuar tales pagos por los importes y en las fechas de vencimiento pactadas o las derivadas del uso de modalidades acordadas en la cláusula SEGUNDA. Caso contrario se procederán a efectuar el cobro de los interés por los importes pactados en fechas posteriores a los vencimientos que fueron establecidos, pudiendo el OTORGANTE adicionalmente efectuar también los cobros correspondientes por la mora en el pago de la cuota conforme se detalla en la cláusula SEPTIMA. Asimismo, se deja expresa constancia que el SOLICITANTE podrá realizar los pagos en forma voluntaria, respetando las fechas de vencimiento pactadas con el OTORGANTE. Dichos pagos se efectuarán a través de los medios de pago que establezca el OTORGANTE, los cuales se informarán a través de la página web del OTORGANTE. De generarse gastos adicionales por efectuarse el pago voluntario, los mismos estarán a cargo exclusivamente del SOLICITANTE."),

  emptyP(),

  // 3ª
  p("3ª MODALIDADES.", { bold: true }),
  p("El SOLICITANTE podrá hacer uso de las siguientes facilidades que se establecen a su favor, las cuales operarán a través del sitio de Internet de la OTORGANTE, el que se regirán por las condiciones ahí establecidas, las que el SOLICITANTE declara conocer y aceptar, y que se consideran parte integrante de la presente Solicitud."),
  p("a) Pre-cancelación total del préstamo: El SOLICITANTE podrá realizar la pre-cancelación total del saldo de deuda en la fecha de vencimiento de cualquiera de las cuotas pactadas. No se aplicará ningún cargo adicional cuando al momento de efectuarla haya transcurrido al menos la cuarta parte del plazo original de la financiación o 180 días corridos desde su otorgamiento, de ambos el mayor."),
  p("b) Opción de diferimiento del vencimiento de la primera cuota: el SOLICITANTE podrá a su exclusivo criterio y decisión diferir el vencimiento de la primera cuota hasta un máximo de 30 días desde la fecha estipulada inicialmente, a efectos de hacer vencer esa primera cuota y las restantes en una fecha determinada que seleccione. Dicho diferimiento implicara el cálculo de intereses compensatorios adicionales calculados a la tasa de interés del préstamo por la cantidad de días diferidos desde la fecha estipulada inicialmente por el OTORGANTE hasta la fecha finalmente seleccionada por el SOLICITANTE. Los Intereses así calculados se acumularán al capital original del préstamo y se deducirán al momento de la liquidación del mismo como intereses pagados por adelantado. La opción por parte del SOLICITANTE de este diferimiento implicará su consentimiento expreso a la capitalización de los intereses adicionales en los términos del Art. 770 del Código Civil y Comercial de la Nación."),

  emptyP(),

  // 4ª
  p("4ª ANTECEDENTES. COMPROMISO DE TRANSPARENCIA y BUENA FE.", { bold: true }),
  p("Se hace constar: a) Que el SOLICITANTE ha tomado conocimiento previo de los \"Términos y Condiciones\" que regulan el otorgamiento del préstamo solicitado, incluyendo la conformación en detalle de cada uno de los rubros que componen el monto a devolver y el texto íntegro de esta solicitud, de la cual tiene copia en su poder, en el sitio de Internet de la OTORGANTE. b) Que, a los efectos del otorgamiento del préstamo, la OTORGANTE tiene en cuenta con especial consideración la condición del SOLICITANTE en su vinculación con el sistema financiero informada por el Banco Central de la República Argentina, quien revista actualmente en la categoría \"Situación 1\" (según la categoría definida por el BCRA), dato que el SOLICITANTE ratifica en este acto. c) Que en dicho sitio el SOLICITANTE podrá consultar en cualquier momento ese estado de cuenta incluyendo monto del préstamo, cuotas programadas, cuotas abonadas, saldo pendiente de pago y uso de las modalidades establecidas en la cláusula TERCERA. d) Que las partes confieren plena validez a las comunicaciones que se cursen a través del referido sitio de Internet y se obligan a prestar su activa colaboración para el cumplimiento de las pautas contractuales aquí contenidas. e) Que el SOLICITANTE se hace responsable por el uso de la clave personal por el registrada en el sitio de Internet de la OTORGANTE, asumiendo y consintiendo plenamente que dicha clave personal quede establecida como firma electrónica convencional, y lo obligue respecto de todas las acciones e instrucciones que curse por su intermedio, con los mismos e idénticos efectos que una firma hológrafa. Igualmente se hace responsable por la operatoria de la cuenta bancaria por él designada, conforme cláusula PRIMERA, a los fines de la acreditación y débito de las sumas convenidas en este contrato. f) Que el SOLICITANTE da su conformidad y autoriza expresamente al OTORGANTE a: i) Informar a cualquier institución oficial o entidad privada con la cual intercambie información referente al estado de cumplimiento de pagos y situación del producto y/o servicio contratado, los datos del SOLICITANTE siempre que dicha información no se aparte de lo prescripto por las disposiciones legales vigentes. ii) Transmitir la información correspondiente a los productos y/o servicios contratados y datos personales del SOLICITANTE a terceras empresas para fines de evaluación crediticia, operativos o de guarda o almacenamiento de datos, ya sean vinculadas o no. iii) Utilizar y/o suministrar a empresas vinculadas, los datos personales del SOLICITANTE, a los fines del ofrecimiento de productos y/o servicios, y acciones de marketing en general; iv) Acceder y conocer la información crediticia que sobre el exista en la Central de Deudores del Sistema Financiero o en las Entidades de información crediticia en las formas legalmente habilitadas al efecto. v) A solicitud de cada cliente, dentro de los 10 días corridos del pedido, El OTORGANTE comunicara al mismo la última clasificación asignada junto con los fundamentos que la justifican según la evaluación realizada, el importe total de deudas con el sistema financiero y las clasificaciones asignadas que surjan de la última información disponible en la \"Central de deudores del sistema financiero\". En caso de falsedad o error en algún dato que se le asigne, el SOLICITANTE tiene derecho de solicitar a la entidad generadora de la información la supresión, rectificación o actualización de los datos erróneos."),

  emptyP(),

  // 5ª
  p("5ª: PAGARE.", { bold: true }),
  p("El SOLICITANTE suscribe en este acto, de forma presencial y con firma ológrafa, un pagare con cláusula \"sin protesto\" y a la vista a favor de la OTORGANTE por la suma de {{monto}} (pesos {{monto_letras}}); Se conviene al respecto que ese documento sólo podrá ser ejecutado en caso de mora del SOLICITANTE debidamente configurada conforme lo pactado en la cláusula SEXTA. Y en tal caso la ejecución podrá promoverse exclusivamente por el saldo adeudado por el SOLICITANTE a causa de la presente, con independencia del monto del pagare."),

  emptyP(),

  // 6ª
  p("6ª: MORA.", { bold: true }),
  p("La falta de pago de cualquiera de las obligaciones asumidas por el SOLICITANTE lo hará incurrir en mora de pleno derecho sin necesidad de interpelación alguna; en particular, serán causales de mora: a) La inexistencia de fondos suficientes para el débito de cualquiera de los pagos a cargo del SOLICITANTE, a cuya previsión está obligado él mismo conforme cláusula SEGUNDA. b) La revocación de la autorización de débito automático conferida en la cláusula SEGUNDA o el hecho de que el SOLICITANTE deje sin efecto cualquiera de los débitos que la OTORGANTE efectuara de conformidad con dicha cláusula. c) El cierre de la cuenta bancaria donde deben efectuarse los débitos, salvo que con carácter previo al cierre las partes hubieran acordado realizar los débitos de otra cuenta del SOLICITANTE. d) El cambio de la actual condición del SOLICITANTE o el incumplimiento de cualquier otra obligación con el OTORGANTE o terceros, que afectara su solvencia moral, personal o comercial. e) La existencia de inhibiciones y/o inhabilitaciones y/o embargos que recayeran sobre el SOLICITANTE o sus bienes. f) La solicitud del SOLICITANTE de su quiebra o concurso civil, o su petición por terceros, o declaración de concurso o quiebra. g) La falsedad o inexactitud de cualquier de las declaraciones o datos personales presentados por el SOLICITANTE. h) El cese o extinción de la relación laboral del SOLICITANTE, cualquiera sea la causa de la misma."),

  emptyP(),

  // 7ª
  p("7ª: CONSECUENCIAS DE LA MORA.", { bold: true }),
  p("La mora del SOLICITANTE motivará y dará derecho a la OTORGANTE a declarar el vencimiento anticipado del presente contrato y a reclamar el total adeudado que será considerado como capital de plazo vencido, con más los intereses que se calcularan a una vez y media la tasa del préstamo original que es del 97 % anual, desde la mora y hasta el efectivo pago. La OTORGANTE podrá a tal fin proceder a la ejecución del pagaré librado conforme cláusula QUINTA. Sin perjuicio de ello, dado que a resultas de la mora la OTORGANTE se verá obligada a efectuar una gestión de cobranza previa a la promoción de las acciones judiciales se conviene que el SOLICITANTE deberá abonar en ese caso los gastos de cada gestión de cobranza."),

  emptyP(),

  // 8ª
  p("8ª: COMPENSACION.", { bold: true }),
  p("En la medida que sea procedente de acuerdo al artículo 921 y siguientes del Código Civil y Comercial de la Nación y de corresponder conforme normas específicas aplicables el OTORGANTE queda facultado a compensar en todo o en parte cualquier crédito del OTORGANTE con cualquier suma de dinero en moneda local o extranjera, que por cualquier concepto o título existiera en favor del SOLICITANTE en la CTA. CTE., CA., Plazo Fijo u otro tipo de depósito independientemente de que se haya hecho o no requerimiento. A ese efecto los saldos a favor del SOLICITANTE en las cuentas corrientes y otros depósitos se considerarán líquidos y de plazo vencido para ser compensados sin intimación previa ni requisito alguno con las sumas devengadas en favor del OTORGANTE por motivo de cualquier operación de crédito. El OTORGANTE se compromete a notificar inmediatamente a los titulares de la cuenta luego de haber realizado cualquiera de dichas compensaciones e Imputaciones. Estipulándose que el no otorgamiento de dicho aviso no afectará la validez de dicha compensación e imputación."),

  emptyP(),

  // 9ª
  p("9ª ADECUACION NO PREVALENCIA.", { bold: true }),
  p("Para el hipotético supuesto que alguna cláusula de las contenidas en las presentes condiciones resultara inadecuada o no plenamente compatible (sea porque hubiese quedado desactualizada en su redacción o por algún otro motivo) con alguna disposición normativa, o regia de buenas prácticas a la que hubiese adherido el OTORGANTE, este se compromete a no prevalecerse de la misma, o en su caso, aplicarla solo en la medida que resulte compatible con tales normas o reglas que resulten aplicables."),

  emptyP(),

  // 10ª
  p("10ª MODIFICACIONES.", { bold: true }),
  p("Toda modificación a los cargos administrativos y/o comisiones será notificada a través del e mail registrado por el SOLICITANTE en el sitio, con sesenta (60) días de anticipación a la fecha en que se apliquen. Las modificaciones que impliquen incrementos en los cargos responderán exclusivamente a la incorporación o mejora de servicios tecnologías, prestaciones o variaciones en los costos involucrados en la actividad."),

  emptyP(),

  // 11ª
  p("11ª REQUERIMIENTO DE INFORMACION.", { bold: true }),
  p("Ante el requerimiento del OTORGANTE o del Banco Central de la República Argentina (en adelante el \"B.C.R.A.\") o de la normativa vigente, el Cliente deberá informar inmediatamente sobre su estado patrimonial, proveyendo la documentación que lo fundamente. El Cliente autoriza al OTORGANTE a verificar por los medios que considere convenientes la corrección de los datos que le hubiere proporcionado en relación con la solicitud de productos y/o servicios."),

  emptyP(),

  // 12ª
  p("12ª CONFORMIDAD.", { bold: true }),
  p("El OTORGANTE podrá ceder libremente los derechos resultantes de la presente, sin que ello pueda implicar modificación alguna de las obligaciones asumidas por el SOLICITANTE, quien presta a esos efectos su conformidad. En los casos que la cesión se realice de conformidad con lo previsto en los arts .70, 71 y 72 de la ley 24.441 no será requisito la notificación al solicitante."),

  emptyP(),

  // 13ª
  p("13ª Declaración jurada:", { bold: true }),
  p("El SOLICITANTE declara bajo juramento que todos los datos personales que ha Ingresado vía Internet son auténticos, exactos y permanecen vigentes a la fecha de la presente, ratificándolas íntegramente mediante la firma del anexo adjunto."),

  emptyP(),

  // 14ª
  p("14ª COMPETENCIA. Domicilios.", { bold: true }),
  p("Para todos los efectos de la presente, las partes se someten a la competencia de los Tribunales Ordinarios de la Primera Circunscripción de Neuquén y constituyen domicilios especiales en los indicados en el encabezamiento, donde serán válidas todas las notificaciones que deban practicarse. Asimismo, las partes acuerdan que las notificaciones cursadas a sus domicilios electrónicos serán válidas y vinculantes. A tal efecto, la OTORGANTE constituye como su domicilio electrónico la casilla de correo: contacto@zprest.com.ar, y el SOLICITANTE constituye como domicilio electrónico el correo electrónico informado en la presente Solicitud de Préstamo y/o el registrado en el sitio web de la OTORGANTE. Cualquier cambio de dichos domicilios electrónicos deberá ser comunicado de manera fehaciente a la otra parte y, en caso de incumplimiento de esta obligación, las notificaciones enviadas al último domicilio electrónico denunciado serán consideradas plenamente válidas y eficaces."),

  emptyP(),

  // 15ª
  p("15ª: POLITICA DE PROTECCION DE DATOS PERSONALES.", { bold: true }),
  p("ZAYIN SERVICIOS FINANCIEROS SAS posee una estricta POLÍTICA DE PROTECCIÓN DE DATOS PERSONALES, que tiene por objeto la protección integral de los datos personales asentados en sus Bases de Datos, para garantizar el derecho al honor y la intimidad de las personas, así como también el acceso a la información que sobre las mismas se registre, de conformidad con lo prescripto por el art. 43 de la Constitución Nacional. Esta política cumple acabadamente con los requerimientos exigidos por la LEY DE PROTECCIÓN DE DATOS PERSONALES (25.326) y con sus disposiciones reglamentarias. Esta ley es una norma de orden público que regula la actividad de las Bases de Datos que registran información de carácter personal. ZAYIN SERVICIOS FINANCIEROS SAS asume el carácter de Responsable Registrado, ya que ha cumplimentado todos los requisitos de licitud que exige la ley. El SOLICITANTE, titular de los datos personales, tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto, conforme lo establecido en el artículo 14, inciso 3 de la Ley No 25.326. El SOLICITANTE podrá ejercitar los derechos de acceso, actualización, cancelación, rectificación y oposición, así como tiene reconocido el derecho a ser informado de las cesiones de sus datos personales realizadas contactando a ZAYIN SERVICIOS FINANCIEROS SAS a través del correo electrónico contacto@zprest.com.ar o bien por escrito al domicilio del Titular. No obstante, ZAYIN SERVICIOS FINANCIEROS SAS podrá informar a las distintas empresas y/u organismos dedicados a la recopilación de información crediticia y/o financiera sobre el estado de las deudas contraídas por parte del SOLICITANTE con ZAYIN SERVICIOS FINANCIEROS SAS lo cual es consentido por el SOLICITANTE mediante la suscripción de la presente."),

  emptyP(),

  // 16ª
  p("16ª CLAUSULA DE REVOCACION.", { bold: true }),
  p("El SOLICITANTE tiene el derecho irrenunciable de revocar la aceptación del presente préstamo dentro del plazo de diez (10) días hábiles contados a partir de la disponibilidad efectiva del importe del mismo, notificando al OTORGANTE de manera fehaciente o por el mismo medio por el cual fue solicitado. Dicha revocación será sin costo ni responsabilidad alguna para el SOLICITANTE."),

  emptyP(),

  // 17ª
  p("17ª FIRMA ELECTRONICA Y DIGITAL.", { bold: true }),
  p("Las partes reconocen la validez de la firma electrónica y digital aplicada en el presente contrato, conforme lo dispuesto por la Ley Nº 25.506 y el artículo 288 del Código Civil y Comercial de la Nación. Dicha firma electrónica o digital es legalmente válida y vinculante, teniendo la misma eficacia jurídica y valor probatorio que la firma manuscrita (ológrafa) de las partes."),

  emptyP(),

  // 18ª
  p("18ª EQUIVALENCIA DIGITAL.", { bold: true }),
  p("Las partes acuerdan que el presente contrato, suscripto por medios electrónicos, constituye un documento electrónico original. Cualquier copia impresa del mismo que contenga la reproducción de la firma digital de las partes será considerada copia fiel del documento digital original a todos los efectos legales. Asimismo, las partes reconocen que este documento electrónico satisface los requisitos de firma y de instrumento escrito previstos en la normativa vigente, gozando de plena validez y eficacia probatoria."),

  emptyP(),
  emptyP(),

  // Firma
  p("Lugar y fecha: {{ciudad}}, {{fecha}}", { sz: SZ }),
  emptyP(),
  p("Nro de solicitud: {{numero_solicitud}}", { sz: SZ }),
  emptyP(),
  emptyP(),
  p("____________________________________", { center: true }),
  p("Firma del SOLICITANTE", { center: true }),
  p("{{nombre_completo}} — DNI {{dni}}", { center: true }),

].join("\n");

// ── Armado del DOCX ──────────────────────────────────────────────────────────

const NS = [
  'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"',
  'xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex"',
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"',
  'xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink"',
  'xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d"',
  'xmlns:o="urn:schemas-microsoft-com:office:office"',
  'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"',
  'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"',
  'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"',
  'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"',
  'xmlns:wne2="http://schemas.microsoft.com/office/word/2006/wordml"',
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
  'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"',
  'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"',
  'xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex"',
  'xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid"',
  'xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml"',
  'xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash"',
  'xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex"',
  'mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh"',
].join(" ");

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${NS}>
  <w:body>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

// Inyectamos el cuerpo ANTES del sectPr
const docXmlFinal = documentXml.replace(
  "<w:sectPr>",
  `${cuerpo}\n    <w:sectPr>`
);

// ── Ensamblar el ZIP ─────────────────────────────────────────────────────────

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:sz w:val="${SZ}"/>
        <w:szCs w:val="${SZ}"/>
        <w:lang w:val="es-AR"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
</w:styles>`;

const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
  <w:compat/>
</w:settings>`;

const zip = new PizZip();
zip.file("[Content_Types].xml", contentTypes);
zip.file("_rels/.rels", rels);
zip.file("word/document.xml", docXmlFinal);
zip.file("word/_rels/document.xml.rels", wordRels);
zip.file("word/styles.xml", stylesXml);
zip.file("word/settings.xml", settingsXml);

const buf = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
const dest = path.join(__dirname, "../src/lib/signatura/plantillas/contrato_personal.docx");
fs.writeFileSync(dest, buf);
console.log("✅ contrato_personal.docx generado en", dest);

// ── Verificar con docxtemplater ──────────────────────────────────────────────
const Docxtemplater = require("docxtemplater");

try {
  const content = fs.readFileSync(dest, "binary");
  const testZip = new PizZip(content);
  const doc = new Docxtemplater(testZip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
  });
  doc.render({
    nombre_completo: "JUAN GARCIA",
    dni: "32000000",
    domicilio: "Av. Siempreviva 742",
    ciudad: "Neuquén",
    provincia: "Neuquén",
    monto: "$1.000.000",
    monto_letras: "un millón pesos",
    cbu: "0000000000000000000000",
    banco: "Banco Nación",
    cuotas: "12",
    tna: "100%",
    tea: "120%",
    tem: "8%",
    cftea: "130%",
    primera_cuota_fecha: "1 de julio de 2026",
    fecha: "15 de mayo de 2026",
    numero_solicitud: "ABC12345",
    cuotas_tabla: [
      { fecha_vto: "01/07/2026", cuota_sin_iva: "$180.000", interes: "$80.000", amortiz: "$100.000", saldo: "$900.000", iva: "$16.800", cuota_pagar: "$196.800" },
      { fecha_vto: "01/08/2026", cuota_sin_iva: "$180.000", interes: "$72.000", amortiz: "$108.000", saldo: "$792.000", iva: "$15.120", cuota_pagar: "$195.120" },
    ],
  });
  console.log("✅ docxtemplater renderizó sin errores");
  const buf2 = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(path.join(__dirname, "../contrato_personal_TEST.docx"), buf2);
  console.log("✅ contrato_personal_TEST.docx generado para revisión visual");
} catch (err) {
  console.error("❌ Error en docxtemplater:", err.message || err);
  if (err.properties?.errors) {
    err.properties.errors.forEach(e => console.error(" -", e.message));
  }
}
