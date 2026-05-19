/**
 * Genera contrato_comercial.docx desde cero con loop de tabla correcto para docxtemplater.
 * Corre con: node scripts/generar-plantilla-comercial.js
 */

const PizZip = require("pizzip");
const fs = require("fs");
const path = require("path");

// ── Helpers XML ──────────────────────────────────────────────────────────────

function x(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const SZ = 20; // 10pt

function rPr(bold = false, sz = SZ) {
  return `<w:rPr>${bold ? "<w:b/>" : ""}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>`;
}

function p(text, opts = {}) {
  const { bold = false, center = false, sz = SZ, spacing = 120 } = opts;
  const pp = `<w:pPr>${center ? '<w:jc w:val="center"/>' : ""}<w:spacing w:before="0" w:after="${spacing}"/></w:pPr>`;
  const rp = rPr(bold, sz);
  return `<w:p>${pp}<w:r>${rp}<w:t xml:space="preserve">${x(text)}</w:t></w:r></w:p>`;
}

function emptyP() {
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="60"/></w:pPr></w:p>`;
}

// ── Contenido del contrato ───────────────────────────────────────────────────

const cuerpo = [

  // Encabezado
  p("En el día de la fecha {{fecha}}, quien suscribe: {{nombre_completo}} DNI Nº {{dni}}, con domicilio en {{domicilio}} de la Ciudad de {{ciudad}} (C.P. {{cp}}), Provincia {{provincia}} Profesión {{profesion}} CUIT {{cuil}}, titular del comercio sito en calle {{domicilio_comercial}} en la ciudad de {{ciudad_comercial}} (C.P {{cp_comercial}}) Nombre de Fantasía: {{nombre_comercio}} (en adelante, el SOLICITANTE); solicita de ZAYIN SERVICIOS FINANCIEROS S.A.S., con domicilio en Altos de CNEA, Dúplex A, Lote 6, Manzana 3D, Collón Curá S/N, de la Ciudad de Plottier, Provincia de Neuquén (en adelante, la OTORGANTE), a traves del sitio web: Zprest.com.ar, el otorgamiento de un préstamo para capital de trabajo, que quedará sujeto a las siguientes cláusulas y condiciones:"),

  emptyP(),

  // 1ª
  p("1ª. MONTO Y ACREDITACIÓN.", { bold: true }),
  p("El monto del préstamo es la suma de {{monto}} ({{monto_letras}}) que LA OTORGANTE entregará (acreditará) al SOLICITANTE. La suma será depositada en la cuenta indicada por EL SOLICITANTE (CVU/CBU Nº {{cbu}}, Titular {{nombre_completo}} en BILLETERA VIRTUAL/BANCO nombre: {{banco}}) Dicha acreditación en la cuenta mencionada servirá como suficiente constancia de recepción del monto por parte del SOLICITANTE. Asimismo, la aceptación del crédito por LA OTORGANTE, una vez efectuada la primera acreditación, implicará la celebración del presente contrato que vincula a ambas partes bajo estos términos."),
  p("En caso de que EL SOLICITANTE cancele anticipadamente parte del dinero prestado antes de la fecha fijada para el vencimiento total (Cláusula Segunda), LA OTORGANTE podrá, a su sola opción, liberar el cupo dentro del límite del monto acordado en esta cláusula. Esto significa que EL SOLICITANTE podría volver a disponer de fondos adicionales (hasta completar el monto total de {{monto}}) bajo las mismas condiciones pactadas en este contrato, o bajo condiciones que se pacten en el futuro mediante acuerdo expreso. En tal supuesto, las partes suscribirán una adenda a la presente solicitud de préstamo en la cual se establecerán las condiciones del nuevo desembolso."),
  p("Finalmente, una vez cumplido el pago total de todas las obligaciones emergentes del presente contrato (es decir, canceladas la totalidad de las cuotas pactadas y demás sumas adeudadas), el contrato se considerará finalizado de pleno derecho. Cualquier nuevo préstamo que el SOLICITANTE desee obtener de LA OTORGANTE después de la finalización del presente deberá instrumentarse mediante la celebración de un nuevo contrato independiente, salvo acuerdo expreso en contrario entre las partes."),

  emptyP(),

  // 2ª
  p("2ª. FORMA DE PAGO E INTERESES.", { bold: true }),
  p("EL SOLICITANTE se obliga a reembolsar el préstamo en {{plazo_dias}} cuotas diarias, iguales y consecutivas, de {{cuota_diaria}} ({{cuota_diaria_letras}}) cada una. Cada cuota diaria comprende la porción de capital, los intereses compensatorios devengados y el IVA (21%) sobre dichos intereses. Las cuotas se abonarán en forma diaria; la primera cuota vencerá el día {{primera_cuota_fecha}} y las cuotas siguientes vencerán cada día según el cronograma de pagos (ver Anexo)."),
  p("El monto total a pagar por el SOLICITANTE en concepto de capital, intereses e IVA asciende a la suma de {{total_a_pagar}} ({{total_a_pagar_letras}})."),
  p("El préstamo devengará intereses compensatorios calculados diariamente sobre el saldo de capital adeudado, de acuerdo a un esquema de cálculo diario atípico."),
  p("La Tasa Nominal Anual (TNA) aplicada es del {{tna}}, lo que equivale a una Tasa Efectiva Diaria (TED) de aproximadamente {{ted}}. En base a esta última, la Tasa Efectiva Anual (TEA) resultante asciende al {{tea}}. Cada cuota diaria incluye los intereses generados hasta ese día, más el Impuesto al Valor Agregado (IVA, 21%) correspondiente a dichos intereses. El Costo Financiero Total Efectivo Anual (CFTEA) para el presente préstamo es del {{cftea}}, e incluye todos los intereses, el IVA sobre los intereses devengados y los gastos administrativos aplicables. (Se adjunta en el Anexo el detalle del cálculo de las cuotas, con sus componentes de capital, interés e IVA, y fechas de vencimiento)."),
  p("Todos los pagos que deba efectuar EL SOLICITANTE en virtud de este contrato se realizarán en forma diaria mediante transferencia bancaria o mediante pago QR a la cuenta Mercado Pago de LA OTORGANTE, en la oportunidad en que el cobrador designado por LA OTORGANTE concurra al domicilio comercial del SOLICITANTE. Bajo ninguna circunstancia el cobrador recibirá dinero en efectivo; su función se limita a facilitar y verificar la realización del pago a través de los medios electrónicos mencionados."),
  p("EL SOLICITANTE se obliga a mantener fondos suficientes en su cuenta o billetera para que, al momento de presentarse el cobrador, los pagos puedan hacerse efectivos sin demoras. Se deja expresa constancia de que EL SOLICITANTE podrá, si lo desea, anticipar o adelantar pagos voluntariamente, siempre respetando las fechas de vencimiento pactadas, utilizando los medios de pago establecidos por LA OTORGANTE (los cuales serán informados a través de la página web de LA OTORGANTE u otros canales oficiales). En caso de que el SOLICITANTE opte por realizar pagos en forma voluntaria por su cuenta y ello genere gastos adicionales (por ejemplo, comisiones por el uso de ciertos medios de pago), dichos gastos serán asumidos exclusivamente por EL SOLICITANTE."),

  emptyP(),

  // 3ª
  p("3ª: MODALIDADES DE PAGO.", { bold: true }),
  p("El SOLICITANTE podrá hacer uso de las facilidades de pago especiales que la OTORGANTE pudiera establecer a su favor, las cuales operarán a través del sitio de Internet de la OTORGANTE, y que se regirán por las condiciones allí establecidas. En este acto, el SOLICITANTE declara conocer y aceptar plenamente esas modalidades especiales de pago, considerándose las mismas, parte integrante de la presente solicitud de préstamo."),

  emptyP(),

  // 4ª
  p("4ª: ANTECEDENTES. COMPROMISO DE TRANSPARENCIA Y BUENA FE.", { bold: true }),
  p("Se hace constar: a) Que el SOLICITANTE ha tomado conocimiento previo de los \"Términos y Condiciones\" que regulan el otorgamiento del préstamo solicitado, incluyendo el detalle de cada uno de los rubros que componen el monto total a devolver y el texto íntegro de esta solicitud (contrato), todo lo cual tiene a su disposición y copia en su poder en el sitio de Internet de la OTORGANTE. b) Que, a los efectos del otorgamiento del préstamo, la OTORGANTE ha evaluado la condición crediticia del SOLICITANTE en base a la información obtenida de la Central de Deudores del BCRA u otras fuentes pertinentes, circunstancia que el SOLICITANTE reconoce y acepta. c) Que en el mencionado sitio web el SOLICITANTE podrá consultar en cualquier momento el estado de cuenta de su préstamo, incluyendo el monto otorgado, el cronograma de cuotas programadas, las cuotas ya abonadas, el saldo pendiente de pago y el uso de las modalidades especiales de pago establecidas en la cláusula Tercera. d) Que las partes confieren plena validez legal a las comunicaciones que cursen a través del referido sitio de Internet, y se obligan a prestar activa colaboración para el cumplimiento de las pautas contractuales aquí contenidas."),
  p("e) Que el SOLICITANTE se hace responsable por la correcta operatoria de la cuenta bancaria por él designada (conforme cláusula Primera) a los fines de la acreditación de las sumas convenidas en este contrato, debiendo notificar de inmediato a la OTORGANTE cualquier cambio en dicha cuenta."),
  p("f) Que el SOLICITANTE da su conformidad y autoriza expresamente a la OTORGANTE a: (i) Transmitir información sobre los productos y/o servicios contratados, así como los datos personales proporcionados por el SOLICITANTE, a terceras empresas con fines de evaluación crediticia, operativos o de guarda/almacenamiento de datos, sean empresas vinculadas o no a la OTORGANTE; y (ii) Acceder y consultar la información crediticia que sobre el SOLICITANTE exista en la Central de Deudores del Sistema Financiero o en las entidades de información crediticia que correspondan, en las formas legalmente habilitadas a tal efecto."),

  emptyP(),

  // 5ª
  p("5ª. PAGARÉ.", { bold: true }),
  p("En garantía de las obligaciones asumidas, EL SOLICITANTE entrega en este acto a LA OTORGANTE un pagaré suscripto \"sin protesto\" y a la vista, a favor de LA OTORGANTE, por la suma de {{total_a_pagar}} ({{total_a_pagar_letras}}). Las partes acuerdan que dicho pagaré solo podrá ser completado y ejecutado en caso de mora del SOLICITANTE configurada conforme lo pactado en la Cláusula 7ª. En tal situación de mora, LA OTORGANTE queda facultada para reclamar mediante la ejecución del pagaré únicamente el saldo adeudado por EL SOLICITANTE en virtud del presente contrato (capital, intereses compensatorios devengados, intereses punitorios, cargos y gastos aplicables), con independencia de la suma nominal por la que fue emitido el pagaré. Es decir, el pagaré servirá de título ejecutivo hasta por el monto realmente adeudado al momento de su ejecución, aunque su importe original sea mayor."),

  emptyP(),

  // 6ª
  p("6ª: GASTOS Y RESPONSABILIDAD DEL SOLICITANTE.", { bold: true }),
  p("El SOLICITANTE reconoce que es de su cargo exclusivo el pago de cualquier gasto o impuesto presente o futuro que grave al crédito otorgado, incluyendo sellados, impuestos de crédito y débito bancario, IVA u otros, eximiendo de toda responsabilidad a la OTORGANTE por dichos conceptos. Asimismo, el SOLICITANTE declara que dispone de capacidad de pago suficiente para afrontar el presente compromiso sin afectar la normal marcha de su negocio."),

  emptyP(),

  // 7ª
  p("7ª. MORA.", { bold: true }),
  p("La falta de pago de cualquiera de las obligaciones asumidas por EL SOLICITANTE en este contrato hará que incurra en mora automática y de pleno derecho, sin necesidad de interpelación o reclamo previo de ninguna clase. En particular, constituirán causas de mora: a) La inexistencia de fondos suficientes en la cuenta designada o medio de pago provisto por EL SOLICITANTE para el pago de cualquiera de las cuotas o pagos a su cargo (obligación de provisión de fondos asumida en Cláusula 2ª). b) El cambio adverso en la condición financiera o crediticia actual del SOLICITANTE, o el incumplimiento de cualquier otra obligación que éste tenga con LA OTORGANTE o con terceros, si tal circunstancia afectare su solvencia moral, personal o comercial de manera significativa. c) La falsedad o inexactitud de cualquiera de las declaraciones, manifestaciones o datos personales proporcionados por EL SOLICITANTE, ya sea en la presente solicitud o en la documentación entregada durante el proceso de evaluación crediticia."),

  emptyP(),

  // 8ª
  p("8ª: CONSECUENCIAS DE LA MORA.", { bold: true }),
  p("Incurrida la mora por parte del SOLICITANTE, la OTORGANTE quedará habilitada a exigir inmediatamente el pago de la totalidad del saldo adeudado del préstamo, el cual será considerado automáticamente vencido y exigible en su totalidad (vencimiento anticipado de plazo). El saldo adeudado se considerará como capital de plazo vencido y devengará los intereses compensatorios pactados, más los accesorios y gastos que correspondan, calculados desde la fecha de mora y hasta el efectivo pago total."),
  p("Asimismo, desde el momento de la mora y hasta la cancelación total de lo adeudado, el monto reclamado devengará, además de los intereses compensatorios, un interés punitorio (mora) equivalente al cincuenta por ciento (50%) de la tasa convenida para los intereses compensatorios. El interés punitorio comenzará a correr a partir del incumplimiento o configuración de la mora y se calculará sobre el capital vencido impago."),
  p("Para hacer efectivo lo anterior, la OTORGANTE podrá proceder a la ejecución judicial del pagaré firmado conforme la cláusula Quinta. Sin perjuicio de ello, ante la mora del SOLICITANTE, la OTORGANTE podrá realizar gestiones de cobranza extrajudicial previas a la iniciación de acciones judiciales de cobro. Queda expresamente convenido que serán a cargo exclusivo del SOLICITANTE todos los gastos, costas y honorarios profesionales que se originen tanto en la eventual gestión de cobranza extrajudicial como en la judicial del crédito adeudado."),

  emptyP(),

  // 9ª
  p("9ª: ADECUACIÓN – NO PREVALENCIA.", { bold: true }),
  p("En el hipotético supuesto de que alguna cláusula de las contenidas en las presentes condiciones resultare incompatible o no plenamente acorde con alguna disposición normativa vigente, o con alguna regla de buenas prácticas a la que hubiere adherido la OTORGANTE, esta se compromete a no prevalerse de dicha cláusula en perjuicio del SOLICITANTE. En su caso, la OTORGANTE aplicará la cláusula cuestionada solo en la medida en que resulte compatible con las normas legales o reglamentarias o con las referidas reglas de buenas prácticas que resulten aplicables al presente contrato."),

  emptyP(),

  // 10ª
  p("10ª: MODIFICACIONES.", { bold: true }),
  p("Cualquier modificación a los cargos administrativos y/o comisiones pactadas será notificada al SOLICITANTE a través del email registrado por este en el sitio web de la OTORGANTE, con no menos de treinta (30) días de anticipación a la fecha en que dicha modificación deba entrar en vigencia. Las modificaciones que impliquen incrementos en los cargos o comisiones responderán exclusivamente a la incorporación o mejora de servicios tecnológicos o prestaciones brindadas, o a variaciones en los costos operativos involucrados en la actividad financiera de la OTORGANTE."),

  emptyP(),

  // 11ª
  p("11ª: CONDICION FISCAL.", { bold: true }),
  p("El SOLICITANTE manifiesta estar inscripto ante la ARCA."),

  emptyP(),

  // 12ª
  p("12ª: CONFORMIDAD – CESIÓN.", { bold: true }),
  p("La OTORGANTE podrá ceder o transferir libremente los derechos resultantes de la presente relación contractual, sin que ello implique modificación alguna de las obligaciones asumidas por el SOLICITANTE, quien desde ya presta su conformidad a tal cesión. En los casos en que la cesión se realice de conformidad con lo previsto en los arts. 70, 71 y 72 de la Ley 24.441, las partes acuerdan que no será requisito la notificación previa de dicha cesión al SOLICITANTE."),

  emptyP(),

  // 13ª
  p("13ª. DECLARACIÓN JURADA.", { bold: true }),
  p("EL SOLICITANTE declara bajo juramento que todos los datos personales y comerciales que ingresó por medios electrónicos (vía Internet) al solicitar el presente crédito son verdaderos, exactos y actuales a la fecha de la suscripción del contrato. Asimismo, ratifica dicha información de manera íntegra mediante la firma del Anexo que se adjunta al presente, considerándose dichas declaraciones juradas como parte integrante del contrato. Cualquier falsedad o inexactitud en estos datos habilitará a LA OTORGANTE a considerar incumplida la obligación de información veraz por parte del SOLICITANTE (ver Cláusula 6ª.c) y a adoptar las medidas correspondientes."),

  emptyP(),

  // 14ª
  p("14ª. COMPETENCIA Y DOMICILIOS.", { bold: true }),
  p("Para todos los efectos judiciales y extrajudiciales derivados del presente contrato, las partes acuerdan someterse a la competencia de los Tribunales Ordinarios de la Primera Circunscripción Judicial de la Provincia de Neuquén, con sede en la ciudad de Neuquén, República Argentina. A tal efecto, constituyen domicilios especiales en los indicados en el encabezamiento de este contrato, donde serán válidas todas las notificaciones y comunicaciones que deban practicarse. Cualquier cambio de domicilio deberá ser notificado fehacientemente a la otra parte dentro de las 48 horas de producido. En caso contrario, las notificaciones cursadas al último domicilio constituido válido surtirán plenos efectos."),

  emptyP(),

  // 15ª
  p("15ª. PROTECCIÓN DE DATOS PERSONALES.", { bold: true }),
  p("LA OTORGANTE manifiesta poseer y aplicar una estricta Política de Protección de Datos Personales, cuyo objeto es la protección integral de los datos personales asentados en sus bases de datos, a fin de garantizar el derecho a la intimidad y al honor de las personas, así como el acceso solamente autorizado a la información que sobre las mismas se registre, de conformidad con lo prescripto por el art. 43 de la Constitución Nacional Argentina (derecho de hábeas data) y la Ley 25.326 (Ley de Protección de Datos Personales). No obstante, EL SOLICITANTE consiente expresamente que LA OTORGANTE pueda informar a empresas y/u organismos dedicados a la recopilación de información crediticia y/o financiera sobre el estado de cumplimiento de las obligaciones asumidas por EL SOLICITANTE en el presente contrato. En particular, EL SOLICITANTE autoriza que, en caso de incurrir en mora o impago, LA OTORGANTE comunique tal circunstancia (incluyendo sus datos personales y el monto de la deuda vencida) a las bases de datos crediticias del sistema financiero (tales como Veraz, Fidelitas, BCRA Central de Deudores, u otras equivalentes), conforme a la normativa vigente."),

  emptyP(),

  // 16ª
  p("16ª. CLÁUSULA DE REVOCACIÓN.", { bold: true }),
  p("EL SOLICITANTE tiene el derecho irrenunciable de revocar su aceptación del presente préstamo dentro del plazo de 10 (diez) días hábiles, contados a partir de la fecha en que el monto del préstamo haya sido puesto efectivamente a su disposición. Para ejercer esta revocación, EL SOLICITANTE deberá notificar fehacientemente su decisión a LA OTORGANTE (por escrito en soporte papel o mediante el mismo medio electrónico por el cual solicitó el préstamo, a elección del SOLICITANTE). El ejercicio en tiempo y forma de este derecho de revocación no generará costo ni responsabilidad alguna para EL SOLICITANTE, siempre y cuando no haya hecho uso del importe del préstamo. En caso de revocación válida, EL SOLICITANTE deberá reintegrar inmediatamente el capital acreditado (si ya hubiese sido depositado en su cuenta), sin intereses ni penalidades, quedando las partes liberadas de sus obligaciones recíprocas bajo este contrato."),

  emptyP(),

  // 17ª
  p("17ª: CARÁCTER COMERCIAL – EXCLUSIÓN DE RELACIÓN DE CONSUMO.", { bold: true }),
  p("El SOLICITANTE manifiesta expresamente que el préstamo objeto del presente contrato ha sido solicitado y será utilizado exclusivamente con fines comerciales y/o de inversión en su emprendimiento, quedando excluido del ámbito de destinación personal, familiar o doméstica. En virtud de ello, ambas partes acuerdan que no resultan aplicables al presente contrato las disposiciones de la Ley de Defensa del Consumidor Nº 24.240, por no configurarse una relación de consumo. El SOLICITANTE, con su firma, reconoce el carácter estrictamente comercial de este préstamo y renuncia a invocar la aplicación de las normas de protección al consumidor para el presente caso."),

  emptyP(),

  // 18ª
  p("18ª: FIRMA ELECTRÓNICA Y VALIDEZ JURÍDICA.", { bold: true }),
  p("Las partes acuerdan suscribir el presente contrato mediante firma electrónica con validación biométrica, utilizando los mecanismos provistos por el Prestamista (plataforma de firma digital/electrónica). En virtud de la Ley N° 25.506 de Firma Digital y el art. 288 del Código Civil y Comercial de la Nación, cuando la ley requiera una firma manuscrita, este requisito queda satisfecho por una firma digital que asegure indubitablemente la autoría e integridad del instrumento. La firma electrónica utilizada (que puede consistir en la firma biométrica capturada en pantalla, credenciales digitales, códigos one-time password, u otro medio de autenticación electrónica) vincula jurídicamente a las partes con su declaración de voluntad. Las partes reconocen que el documento electrónico firmado de este modo constituye un \"instrumento privado\" plenamente válido y exigible, teniendo la misma fuerza probatoria que un documento en soporte papel firmado de puño y letra. Cada parte puede solicitar una copia digital firmada del contrato, la cual se considera original única. Fundamento legal: La validez de la firma electrónica se basa en la Ley 25.506 y decretos reglamentarios, que reconocen la eficacia jurídica de la firma electrónica y digital, y en el principio de neutralidad tecnológica consagrado en el CCCN. En caso de que alguna de las partes desconozca la autenticidad de una firma electrónica, la carga de la prueba corresponderá a quien la presentó, conforme lo previsto en la normativa vigente. No obstante, si la firma utilizada es firma digital certificada, gozará de la presunción legal de autoría e integridad (\"iuris tantum\") establecida en la ley, equiparándose plenamente a la firma ológrafa. Ambas partes renuncian a cuestionar la validez del presente contrato por la forma en que ha sido firmado, salvo prueba de adulteración o vicio en el consentimiento."),

  emptyP(),

  // 19ª
  p("19ª. EQUIVALENCIA DIGITAL Y COPIAS.", { bold: true }),
  p("El presente contrato celebrado en formato digital será considerado como original único. Las partes acuerdan que no será necesario firmar ejemplares en papel, dado que la versión electrónica firmada goza de plena validez. En caso de requerirse por algún motivo formal una copia en soporte papel, se podrá imprimir el documento digital y cada parte podrá suscribir manualmente un ejemplar para su archivo, dejando constancia que se trata de copia fiel del original electrónico. No obstante, para todos los efectos legales entre las partes, prevalecerá el documento digital firmado electrónicamente, salvo que se demuestre su inautenticidad. Ninguna de las partes podrá alegar la nulidad o inaplicabilidad de las obligaciones asumidas aduciendo la falta de soporte papel o de firma manuscrita, habida cuenta de lo acordado precedentemente (Ley 25.506, art. 288 CCCN, art. 1106 CCCN y concordantes)."),

  emptyP(),
  emptyP(),

  // Firma
  p("Lugar y fecha: {{ciudad}}, {{fecha}}"),
  emptyP(),
  p("Nro de solicitud: {{numero_solicitud}}"),
  emptyP(),
  emptyP(),
  p("____________________________________", { center: true }),
  p("Firma del SOLICITANTE", { center: true }),
  p("{{nombre_completo}} — DNI {{dni}}", { center: true }),

].join("\n");

// ── Armado del DOCX ──────────────────────────────────────────────────────────

const NS = [
  'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"',
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"',
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
  'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"',
  'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"',
  'mc:Ignorable="w14 w15"',
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

const docXmlFinal = documentXml.replace("<w:sectPr>", `${cuerpo}\n    <w:sectPr>`);

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
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
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
      <w:pPr><w:spacing w:after="120"/></w:pPr>
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
const dest = path.join(__dirname, "../src/lib/signatura/plantillas/contrato_comercial.docx");
fs.writeFileSync(dest, buf);
console.log("✅ contrato_comercial.docx generado en", dest);

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
    fecha: "18 de mayo de 2026",
    nombre_completo: "JUAN GARCIA",
    dni: "32000000",
    domicilio: "Av. Siempreviva 742",
    ciudad: "Neuquén",
    cp: "8300",
    provincia: "Neuquén",
    profesion: "Comerciante",
    cuil: "20-32000000-9",
    domicilio_comercial: "Av. Argentina 100",
    ciudad_comercial: "Neuquén",
    cp_comercial: "8300",
    nombre_comercio: "El Buen Gusto",
    monto: "$1.000.000",
    monto_letras: "un millón pesos",
    total_a_pagar: "$1.560.000",
    total_a_pagar_letras: "un millón quinientos sesenta mil pesos",
    cbu: "0000000000000000000000",
    banco: "Banco Nación",
    plazo_dias: "30",
    cuota_diaria: "$52.000",
    cuota_diaria_letras: "cincuenta y dos mil pesos",
    primera_cuota_fecha: "19 de mayo de 2026",
    tna: "503%",
    ted: "1.38%",
    tea: "1.450.000%",
    cftea: "1.750.000%",
    numero_solicitud: "ABC12345",
  });
  console.log("✅ docxtemplater renderizó sin errores");
  const buf2 = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(path.join(__dirname, "../contrato_comercial_TEST.docx"), buf2);
  console.log("✅ contrato_comercial_TEST.docx generado para revisión visual");
} catch (err) {
  console.error("❌ Error en docxtemplater:", err.message || err);
  if (err.properties?.errors) {
    err.properties.errors.forEach(e => console.error(" -", e.message));
  }
}
