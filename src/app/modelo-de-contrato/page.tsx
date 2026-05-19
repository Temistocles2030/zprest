import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Modelo de Contrato — Zprest",
  description: "Solicitud de préstamo comercial — Modelo de contrato de Zprest.",
};

export default function ModeloContratoPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="border-b border-white/10 bg-[#0d1326] px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#d4af37]">Zprest</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">← Volver al inicio</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold text-[#d4af37]">Modelo de Contrato</h1>
        <p className="mb-8 text-sm text-gray-400">Los campos marcados con líneas de puntos o guiones se completan con los datos del solicitante al momento del otorgamiento.</p>

        <div className="rounded-xl border border-white/10 bg-white/5 p-8 space-y-6 text-gray-300 leading-relaxed text-sm">

          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wide mb-4">SOLICITUD DE PRESTAMO COMERCIAL</h2>
            <p>
              El que suscribe: ___________________________ DNI Nº ___________________ con domicilio
              _____________________________ C.P. _______ de la Ciudad de __________________,
              en adelante el <strong className="text-white">SOLICITANTE</strong> solicita de{" "}
              <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> con domicilio en _________________
              de la Ciudad de Neuquén Capital, en adelante la <strong className="text-white">OTORGANTE</strong>, el otorgamiento de un préstamo para
              consumo que quedará sujeto a las siguientes cláusulas y condiciones:
            </p>
          </div>

          <section>
            <h3 className="font-bold text-white mb-2">1ª: MONTO. ACREDITACION.</h3>
            <p className="mb-3">
              El monto del préstamo será de $_______________________ (PESOS ______________________10/100 CENTAVOS); y será depositado por la OTORGANTE, deducido el Gasto de Otorgamiento por una suma de
              $ _____________ y el monto equivalente al impuesto de Sellos, en la cuenta identificada con CBU No
              __________________ titularidad del Solicitante en el Banco _____________________.
            </p>
            <p className="mb-3">
              <strong className="text-white">El OTORGANTE</strong> se reserva el derecho a su exclusivo criterio, de rechazar o disminuir el monto de la
              presente Solicitud de Otorgamiento de Préstamo, sin que ello origine a favor del{" "}
              <strong className="text-white">SOLICITANTE</strong> derecho a reclamar ningún tipo de indemnización. Asimismo, en caso de disminución del monto solicitado en la
              presente cláusula, el <strong className="text-white">OTORGANTE</strong> podrá posteriormente ir ampliándole al{" "}
              <strong className="text-white">SOLICITANTE</strong> el monto del préstamo, en caso de que el{" "}
              <strong className="text-white">OTORGANTE</strong> a su exclusivo criterio así lo decidiera. La acreditación del monto
              que sea aprobado finalmente por el <strong className="text-white">OTORGANTE</strong>, y las futuras acreditaciones que posteriormente el{" "}
              <strong className="text-white">SOLICITANTE</strong> le otorgue, serán realizadas en la cuenta indicada en la presente cláusula siendo suficiente
              constancia del recibo de la suma convenida por el <strong className="text-white">SOLICITANTE</strong>, así como de la aceptación de la{" "}
              <strong className="text-white">OTORGANTE</strong> a los términos de la presente, que será considerada a partir de la primera acreditación como el
              contrato que vincula a las partes. En caso de haberse cancelado parte del dinero prestado antes de la fecha
              establecida en la Cláusula Segunda, el cupo se podrá liberar a opción del OTORGANTE y siempre dentro del
              límite descripto en la Cláusula Primera. Dicho cupo se podrá otorgar en las mismas condiciones pactadas en
              el presente, o bien de acuerdo a las condiciones que se pacten en un futuro. En dicho caso, se suscribirá una
              adenda a la presente solicitud de otorgamiento de préstamo, en la cual se fijarán las condiciones de este
              nuevo otorgamiento.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">2ª: FORMA DE PAGO.</h3>
            <p className="mb-3">
              El <strong className="text-white">SOLICITANTE</strong> se obliga a devolver la suma recibida en (XX) cuotas (FORMA DE
              DEVOLUCION diaria, semanal, mensual, según préstamo personal o préstamo comercial) de
              $....................................…………(PESOS…………………………100 CENTAVOS). Dicho monto incluye tanto
              la parte correspondiente al capital adeudado, como los intereses y porcentual correspondiente al Seguro de
              Saldo Deudor.
            </p>
            <p className="mb-1"><strong className="text-white">CAPITAL:</strong>………………………Pesos.</p>
            <p className="mb-1"><strong className="text-white">TNA</strong> (Tasa Nominal Anual)………%</p>
            <p className="mb-3"><strong className="text-white">TEA</strong> (Tasa Efectiva Anual)……..%</p>
            <p className="mb-3">
              <strong className="text-white">CFTEFA</strong> (Costo Financiero Total Efectivo Anual)…………%, el I.V.A sobre los intereses correspondientes, las
              comisiones por Administración de Cuota (pesos veinte) más impuestos por cada orden de débito de las
              cuotas y el costo del seguro de Saldo Deudor. Detalle de cuotas y Vencimiento.
            </p>
            <p className="mb-3">
              Todos los pagos que deba efectuar el <strong className="text-white">SOLICITANTE</strong> a causa de la presente, se harán efectivos mediante
              débitos automáticos de la cuenta indicada en la cláusula <strong className="text-white">PRIMERA</strong> y/o pago por link de pago enviado al
              solicitante. A ese fin, el <strong className="text-white">SOLICITANTE</strong> autoriza a la <strong className="text-white">OTORGANTE</strong> a efectuar tales débitos por los importes y
              en las fechas de vencimiento pactadas o las derivadas del uso de modalidades acordadas en la cláusula <strong className="text-white">SEGUNDA</strong>.
            </p>
            <p className="mb-3">
              El <strong className="text-white">SOLICITANTE</strong> se obliga a mantener en su referida cuenta bancaria los fondos suficientes para que esos
              débitos puedan hacerse efectivos. Caso contrario se procederán a efectuar los mencionados débitos por los
              importes pactados en fechas posteriores a los vencimientos que fueron establecidos, pudiendo el{" "}
              <strong className="text-white">OTORGANTE</strong> adicionalmente efectuar también los débitos correspondientes por la mora en el pago de la
              cuota conforme se detalla en la cláusula <strong className="text-white">SEPTIMA</strong>. Asimismo, se deja expresa constancia que el{" "}
              <strong className="text-white">SOLICITANTE</strong> podrá realizar los pagos en forma voluntaria, respetando las fechas de vencimiento pactadas
              con el <strong className="text-white">OTORGANTE</strong>. Dichos pagos se efectuarán a través de los medios de pago que establezca el{" "}
              <strong className="text-white">OTORGANTE</strong>, los cuales se informarán a través de la página web del <strong className="text-white">OTORGANTE</strong>. De generarse gastos
              adicionales por efectuarse el pago voluntario, los mismos estarán a cargo exclusivamente del <strong className="text-white">SOLICITANTE</strong>.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">3ª MODALIDADES.</h3>
            <p className="mb-3">
              El <strong className="text-white">SOLICITANTE</strong> podrá hacer uso de las siguientes facilidades que se establecen a su
              favor, las cuales operarán a través del sitio de Internet de la <strong className="text-white">OTORGANTE</strong>, el que se regirán por las
              condiciones ahí establecidas, las que el SOLICITANTE declara conocer y aceptar, y que se consideran parte
              integrante de la presente Solicitud.
            </p>
            <p className="mb-3">
              <strong className="text-white">a) Pre-cancelación total del préstamo:</strong> El <strong className="text-white">SOLICITANTE</strong> podrá realizar la pre-cancelación total del saldo
              de deuda en la fecha de vencimiento de cualquiera de las cuotas pactadas. No se aplicará ningún cargo
              adicional cuando al momento de efectuarla haya transcurrido al menos la cuarta parte del plazo original de la
              financiación o 180 días corridos desde su otorgamiento, de ambos el mayor.
            </p>
            <p>
              <strong className="text-white">b) Opción de diferimiento del vencimiento de la primera cuota:</strong> el <strong className="text-white">SOLICITANTE</strong> podrá a su exclusivo criterio y decisión diferir el
              vencimiento de la primera cuota hasta un máximo de 30 días desde la fecha estipulada inicialmente, a
              efectos de hacer vencer esa primera cuota y las restantes en una fecha determinada que seleccione. Dicho
              diferimiento implicará el cálculo de intereses compensatorios adicionales calculados a la tasa de interés del
              préstamo por la cantidad de días diferidos desde la fecha estipulada inicialmente por el <strong className="text-white">OTORGANTE</strong> hasta
              la fecha finalmente seleccionada por el <strong className="text-white">SOLICITANTE</strong>. Los Intereses así calculados se acumularán al capital
              original del préstamo y se deducirán al momento de la liquidación del mismo como intereses pagados por
              adelantado. La opción por parte del <strong className="text-white">SOLICITANTE</strong> de este diferimiento implicará su consentimiento expreso
              a la capitalización de los intereses adicionales en los términos del Art. 770 del Código Civil y Comercial de la
              Nación.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">4ª ANTECEDENTES. COMPROMISO DE TRANSPARENCIA y BUENA FE.</h3>
            <p className="mb-2">Se hace constar:</p>
            <p className="mb-2">
              <strong className="text-white">a)</strong> Que el <strong className="text-white">SOLICITANTE</strong> ha tomado conocimiento previo de los &ldquo;Términos y Condiciones&rdquo; que regulan el otorgamiento
              del préstamo solicitado, incluyendo la conformación en detalle de cada uno de los rubros que componen el
              monto a devolver y el texto íntegro de esta solicitud, de la cual tiene copia en su poder, en el sitio de Internet
              de la <strong className="text-white">OTORGANTE</strong>.
            </p>
            <p className="mb-2">
              <strong className="text-white">b)</strong> Que, a los efectos del otorgamiento del préstamo, la <strong className="text-white">OTORGANTE</strong> tiene en cuenta
              con especial consideración la condición del <strong className="text-white">SOLICITANTE</strong> en su vinculación con el sistema financiero
              informada por el Banco Central de la República Argentina, quien revista actualmente en la categoría
              &ldquo;Situación 1&rdquo; (según la categoría definida por el BCRA), dato que el <strong className="text-white">SOLICITANTE</strong> ratifica en este acto.
            </p>
            <p className="mb-2">
              <strong className="text-white">c)</strong> Que en dicho sitio el <strong className="text-white">SOLICITANTE</strong> podrá consultar en cualquier momento ese estado de cuenta incluyendo
              monto del préstamo, cuotas programadas, cuotas abonadas, saldo pendiente de pago y uso de las
              modalidades establecidas en la cláusula <strong className="text-white">TERCERA</strong>.
            </p>
            <p className="mb-2">
              <strong className="text-white">d)</strong> Que las partes confieren plena validez a las comunicaciones que se cursen a través del referido sitio de Internet y se obligan a prestar su activa
              colaboración para el cumplimiento de las pautas contractuales aquí contenidas.
            </p>
            <p className="mb-2">
              <strong className="text-white">e)</strong> Que el <strong className="text-white">SOLICITANTE</strong> se hace responsable por el uso de la clave personal por él registrada en el sitio de Internet de la OTORGANTE,
              asumiendo y consintiendo plenamente que dicha clave personal quede establecida como firma electrónica
              convencional, y lo obligue respecto de todas las acciones e instrucciones que curse por su intermedio, con
              los mismos e idénticos efectos que una firma hológrafa. Igualmente se hace responsable por la operatoria de
              la cuenta bancaria por él designada, conforme cláusula PRIMERA, a los fines de la acreditación y débito de
              las sumas convenidas en este contrato.
            </p>
            <p className="mb-2">
              <strong className="text-white">f)</strong> Que el <strong className="text-white">SOLICITANTE</strong> da su conformidad y autoriza expresamente al <strong className="text-white">OTORGANTE</strong> a:
            </p>
            <div className="pl-4 space-y-2">
              <p><strong className="text-white">i)</strong> Informar a cualquier institución oficial o entidad privada con la cual intercambie información referente al estado de cumplimiento de pagos y situación del producto y/o servicio contratado, los datos del SOLICITANTE siempre que dicha información no se aparte de lo prescripto por las disposiciones legales vigentes.</p>
              <p><strong className="text-white">ii)</strong> Transmitir la información correspondiente a los productos y/o servicios contratados y datos personales del SOLICITANTE a terceras empresas para fines de evaluación crediticia, operativos o de guarda o almacenamiento de datos, ya sean vinculadas o no.</p>
              <p><strong className="text-white">iii)</strong> Utilizar y/o suministrar a empresas vinculadas, los datos personales del SOLICITANTE, a los fines del ofrecimiento de productos y/o servicios, y acciones de marketing en general.</p>
              <p><strong className="text-white">iv)</strong> Acceder y conocer la información crediticia que sobre él exista en la Central de Deudores del Sistema Financiero o en las Entidades de información crediticia en las formas legalmente habilitadas al efecto.</p>
              <p><strong className="text-white">v)</strong> A solicitud de cada cliente, dentro de los 10 días corridos del pedido, El OTORGANTE comunicará al mismo la última clasificación asignada junto con los fundamentos que la justifican según la evaluación realizada, el importe total de deudas con el sistema financiero y las clasificaciones asignadas que surjan de la última información disponible en la &ldquo;Central de deudores del sistema financiero&rdquo;. En caso de falsedad o error en algún dato que se le asigne, el SOLICITANTE tiene derecho de solicitar a la entidad generadora de la información la supresión, rectificación o actualización de los datos erróneos.</p>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">5ª: PAGARE.</h3>
            <p>
              El <strong className="text-white">SOLICITANTE</strong> suscribe en este acto un pagaré con cláusula &ldquo;sin protesto&rdquo; y a la vista a
              favor de la <strong className="text-white">OTORGANTE</strong> por la suma de $..........................................PESOS 10/100 CENTAVOS. Se
              conviene al respecto que ese documento sólo podrá ser ejecutado en caso de mora del <strong className="text-white">SOLICITANTE</strong> debidamente configurada conforme lo pactado en la cláusula <strong className="text-white">SEXTA</strong>. Y en tal caso la ejecución podrá
              promoverse exclusivamente por el saldo adeudado por el <strong className="text-white">SOLICITANTE</strong> a causa de la presente, con
              independencia del monto del pagaré.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">6ª: MORA</h3>
            <p className="mb-2">
              La falta de pago de cualquiera de las obligaciones asumidas por el <strong className="text-white">SOLICITANTE</strong> lo hará incurrir
              en mora de pleno derecho sin necesidad de interpelación alguna; en particular, serán causales de mora:
            </p>
            <p className="mb-1"><strong className="text-white">a)</strong> La inexistencia de fondos suficientes para el débito de cualquiera de los pagos a cargo del <strong className="text-white">SOLICITANTE</strong>, a cuya previsión está obligado él mismo conforme cláusula SEGUNDA.</p>
            <p className="mb-1"><strong className="text-white">b)</strong> La revocación de la autorización de débito automático conferida en la cláusula SEGUNDA o el hecho de que el <strong className="text-white">SOLICITANTE</strong> deje sin efecto cualquiera de los débitos que la <strong className="text-white">OTORGANTE</strong> efectuara de conformidad con dicha cláusula.</p>
            <p className="mb-1"><strong className="text-white">c)</strong> El cierre de la cuenta bancaria donde deben efectuarse los débitos, salvo que con carácter previo al cierre las partes hubieran acordado realizar los débitos de otra cuenta del <strong className="text-white">SOLICITANTE</strong>.</p>
            <p className="mb-1"><strong className="text-white">d)</strong> El cambio de la actual condición del <strong className="text-white">SOLICITANTE</strong> o el incumplimiento de cualquier otra obligación con el <strong className="text-white">OTORGANTE</strong> o terceros, que afectara su solvencia moral, personal o comercial.</p>
            <p className="mb-1"><strong className="text-white">e)</strong> La existencia de inhibiciones y/o inhabilitaciones y/o embargos que recayeran sobre el <strong className="text-white">SOLICITANTE</strong> o sus bienes.</p>
            <p className="mb-1"><strong className="text-white">f)</strong> La solicitud del <strong className="text-white">SOLICITANTE</strong> de su quiebra o concurso civil, o su petición por terceros, o declaración de concurso o quiebra.</p>
            <p><strong className="text-white">g)</strong> La falsedad o inexactitud de cualquier de las declaraciones o datos personales presentados por el <strong className="text-white">SOLICITANTE</strong>.</p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">7ª: CONSECUENCIAS DE LA MORA.</h3>
            <p>
              La mora del SOLICITANTE motivará y dará derecho a la OTORGANTE a reclamar el total adeudado que será considerado como capital de plazo vencido, con más los intereses que se calcularán a una vez y media la tasa del préstamo original, desde la mora y hasta el efectivo pago. La <strong className="text-white">OTORGANTE</strong> podrá a tal fin proceder a la ejecución del pagaré librado conforme cláusula QUINTA. Sin perjuicio de ello, dado que a resultas de la mora la OTORGANTE se verá obligada a efectuar una gestión de cobranza previa a la promoción de las acciones judiciales se conviene que el SOLICITANTE deberá abonar en ese caso los gastos de cada gestión de cobranza.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">8ª: COMPENSACION.</h3>
            <p>
              En la medida que sea procedente de acuerdo al artículo 921 y siguientes del Código Civil y Comercial de la Nación y de corresponder conforme normas específicas aplicables el OTORGANTE queda facultado a compensar en todo o en parte cualquier crédito del OTORGANTE con cualquier suma de dinero en moneda local o extranjera, que por cualquier concepto o título existiera en favor del SOLICITANTE en la CTA. CTE., CA., Plazo Fijo u otro tipo de depósito independientemente de que se haya hecho o no requerimiento. A ese efecto los saldos a favor del SOLICITANTE en las cuentas corrientes y otros depósitos se considerarán líquidos y de plazo vencido para ser compensados sin intimación previa ni requisito alguno con las sumas devengadas en favor del OTORGANTE por motivo de cualquier operación de crédito. El OTORGANTE se compromete a notificar inmediatamente a los titulares de la cuenta luego de haber realizado cualquiera de dichas compensaciones e imputaciones, estipulándose que el no otorgamiento de dicho aviso no afectará la validez de dicha compensación e imputación.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">9ª ADECUACION NO PREVALENCIA.</h3>
            <p>
              Para el hipotético supuesto que alguna cláusula de las contenidas en las presentes condiciones resultara inadecuada o no plenamente compatible (sea porque hubiese quedado desactualizada en su redacción o por algún otro motivo) con alguna disposición normativa, o regia de buenas prácticas a la que hubiese adherido el <strong className="text-white">OTORGANTE</strong>, este se compromete a no prevalecerse de la misma, o en su caso, aplicarla solo en la medida que resulte compatible con tales normas o reglas que resulten aplicables.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">10ª MODIFICACIONES.</h3>
            <p>
              Toda modificación a los cargos administrativos y/o comisiones será notificada a través del e-mail registrado por el <strong className="text-white">SOLICITANTE</strong> en el sitio, con sesenta (60) días de anticipación a la fecha en que se apliquen. Las modificaciones que impliquen incrementos en los cargos responderán exclusivamente a la incorporación o mejora de servicios, tecnologías, prestaciones o variaciones en los costos involucrados en la actividad.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">11ª CONDICION FISCAL.</h3>
            <p>
              El <strong className="text-white">SOLICITANTE</strong> manifiesta hallarse inscripto ante la AFIP bajo CUIT/CUIL …..-……………….-….. ante el I.V.A.: ………. A efectos de cubrir los montos adeudados a causa de la presente, el solicitante abonará en concepto de &ldquo;Seguro Saldo Deudor&rdquo; el ………..% del capital adeudado, el cual será incluido en las sumas a devolver conforme cláusula <strong className="text-white">SEGUNDA</strong>. En caso de fallecimiento del solicitante, el mismo se encontrará asegurado quedando sin efecto el presente contrato y la deuda pendiente quedará cancelada.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">12ª REQUERIMIENTO DE INFORMACION.</h3>
            <p>
              Ante el requerimiento del <strong className="text-white">OTORGANTE</strong> o del Banco Central de la República Argentina (en adelante el &ldquo;B.C.R.A.&rdquo;) o de la normativa vigente, el Cliente deberá informar inmediatamente sobre su estado patrimonial, proveyendo la documentación que lo fundamente. El Cliente autoriza al <strong className="text-white">OTORGANTE</strong> a verificar por los medios que considere convenientes la corrección de los datos que le hubiere proporcionado en relación con la solicitud de productos y/o servicios.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">13ª CONFORMIDAD.</h3>
            <p>
              El <strong className="text-white">OTORGANTE</strong> podrá ceder libremente los derechos resultantes de la presente, sin que ello pueda implicar modificación alguna de las obligaciones asumidas por el <strong className="text-white">SOLICITANTE</strong>, quien presta a esos efectos su conformidad. En los casos que la cesión se realice de conformidad con lo previsto en los arts. 70, 71 y 72 de la ley 24.441 no será requisito la notificación al solicitante.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">14ª Declaración jurada:</h3>
            <p>
              El <strong className="text-white">SOLICITANTE</strong> declara bajo juramento que todos los datos personales que ha ingresado vía Internet son auténticos, exactos y permanecen vigentes a la fecha de la presente, ratificándolas íntegramente mediante la firma del anexo adjunto.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">15ª COMPETENCIA. Domicilios.</h3>
            <p>
              Para todos los efectos de la presente, las partes se someten a la competencia de los Tribunales Ordinarios de la Primera Circunscripción de Neuquén y constituyen domicilios especiales en los indicados en el encabezamiento, donde serán válidas todas las notificaciones que deban practicarse.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">16ª: POLITICA DE PROTECCIÓN DE DATOS PERSONALES.</h3>
            <p className="mb-3">
              <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> posee una estricta <strong className="text-white">POLÍTICA DE PROTECCIÓN DE DATOS PERSONALES</strong>, que tiene por objeto la protección integral de los datos personales asentados en sus Bases de Datos, para garantizar el derecho al honor y la intimidad de las personas, así como también el acceso a la información que sobre las mismas se registre, de conformidad con lo prescripto por el art. 43 de la Constitución Nacional. Esta política cumple acabadamente con los requerimientos exigidos por la <strong className="text-white">LEY DE PROTECCIÓN DE DATOS PERSONALES (25.326)</strong> y con sus disposiciones reglamentarias. Esta ley es una norma de orden público que regula la actividad de las Bases de Datos que registran información de carácter personal.
            </p>
            <p className="mb-3">
              <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> asume el carácter de Responsable Registrado, ya que ha cumplimentado todos los requisitos de licitud que exige la ley. El <strong className="text-white">SOLICITANTE</strong>, titular de los datos personales, tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto, conforme lo establecido en el artículo 14, inciso 3 de la Ley No 25.326. El <strong className="text-white">SOLICITANTE</strong> podrá ejercitar los derechos de acceso, actualización, cancelación, rectificación y oposición, así como tiene reconocido el derecho a ser informado de las cesiones de sus datos personales realizadas contactando a <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> a través del correo electrónico{" "}
              <a href="mailto:contacto@zprest.com.ar" className="text-[#d4af37] hover:underline">contacto@zprest.com.ar</a>.
            </p>
            <p>
              No obstante, <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> podrá informar a las distintas empresas y/u organismos dedicados a la recopilación de información crediticia y/o financiera sobre el estado de las deudas contraídas por parte del SOLICITANTE con <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> lo cual es consentido por el <strong className="text-white">SOLICITANTE</strong> mediante la suscripción de la presente.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">17ª CLAUSULA DE REVOCACION:</h3>
            <p>
              El <strong className="text-white">SOLICITANTE</strong> tiene el derecho irrenunciable de revocar la aceptación del presente préstamo dentro del plazo de diez (10) días hábiles contados a partir de la disponibilidad efectiva del importe del mismo, notificando al <strong className="text-white">OTORGANTE</strong> de manera fehaciente o por el mismo medio por el cual fue solicitado. Dicha revocación será sin costo ni responsabilidad alguna para el <strong className="text-white">SOLICITANTE</strong>.
            </p>
          </section>

          <div className="border-t border-white/10 pt-6 mt-6">
            <h3 className="text-base font-bold text-white uppercase tracking-wide mb-4">PAGARÉ</h3>
            <p className="mb-3">
              <strong className="text-white">Canal de Ventas:</strong> Sitio web: www.zprest.com.ar
            </p>
            <p className="mb-4">
              A la vista pagaré sin protesto (art. 50 - Ley 5965/63), a <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> o a su orden, la cantidad de pesos $................................................. por igual valor recibido en efectivo a nuestra entera satisfacción.
            </p>
            <p className="mb-4">
              Dejamos expresamente aclarado que, en nuestro carácter de libradores, de conformidad con lo dispuesto en el Art. 36 del Dec. Ley 5965/63, ampliamos el plazo de presentación del documento hasta un máximo de 1 año, a contar desde la fecha de libramiento del presente.
            </p>
            <div className="space-y-2">
              <p><strong className="text-white">Deudor:</strong></p>
              <p><strong className="text-white">Nombre y apellido:</strong></p>
              <p><strong className="text-white">Tipo y número de documento:</strong></p>
              <p><strong className="text-white">Carácter:</strong> TITULAR</p>
              <p><strong className="text-white">Número de cliente:</strong></p>
            </div>
          </div>

        </div>

        <div className="mt-12 flex gap-4 border-t border-white/10 pt-8">
          <Link href="/terminos" className="text-sm text-[#d4af37] hover:underline">Términos y Condiciones</Link>
          <span className="text-gray-600">·</span>
          <Link href="/politicas" className="text-sm text-[#d4af37] hover:underline">Política de Privacidad</Link>
        </div>
      </main>
    </div>
  );
}
