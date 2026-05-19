import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Políticas de Privacidad — Zprest",
  description: "Política de privacidad y tratamiento de datos personales de Zprest.",
};

export default function PoliticasPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="border-b border-white/10 bg-[#0d1326] px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#d4af37]">Zprest</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">← Volver al inicio</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-bold text-[#d4af37]">Políticas de privacidad</h1>

        <div className="space-y-8 text-gray-300 leading-relaxed">

          <section>
            <p className="mb-3">Estimado usuario</p>
            <p className="mb-3">
              Para nosotros es sumamente importante proteger la privacidad de nuestros clientes. Por lo tanto, toda la información
              recopilada sobre nuestros clientes en el sitio web: <strong className="text-white">ZPREST.COM.AR</strong> (en adelante
              el &ldquo;Sitio&rdquo;) se mantendrá según las políticas de confidencialidad que se exponen a continuación. La presente
              política de privacidad se aplica a este Sitio, y a las direcciones que pertenecen a{" "}
              <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong>.
            </p>
            <p>
              Mediante la utilización del Sitio usted (el &ldquo;Usuario&rdquo;) acepta nuestra política de privacidad y presta su
              consentimiento expreso para que se realicen los actos que se mencionan a continuación. En caso de no estar de acuerdo
              con la misma, por favor, no acceda a este Sitio, o a cualquier página del mismo.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Archivos de datos:</h2>
            <p>
              Sus datos personales y la información que suministre serán tratados de manera confidencial e incorporada a bases
              de datos de titularidad de <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">¿Qué Datos recolecta y trata zprest.com.ar?</h2>
            <p className="mb-3">Los Datos de los Clientes que zprest.com.ar recolecta y trata son:</p>
            <ul className="space-y-1">
              <li><strong className="text-white">a)</strong> Nombre y apellido</li>
              <li><strong className="text-white">b)</strong> Números de teléfono (fijo o celular).</li>
              <li><strong className="text-white">c)</strong> Dirección de correo electrónico.</li>
              <li><strong className="text-white">d)</strong> Dirección domiciliaria.</li>
              <li><strong className="text-white">e)</strong> Datos del Documento Nacional de Identidad.</li>
              <li><strong className="text-white">f)</strong> Datos de Clave Única Identificación Laboral.</li>
              <li><strong className="text-white">g)</strong> Datos informados a través de recibo de sueldo.</li>
              <li><strong className="text-white">h)</strong> Número de la cuenta bancaria que posee.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">¿Existen restricciones de edad?</h2>
            <p>
              Los menores de edad no pueden contratar los servicios de <strong className="text-white">zprest.com.ar</strong> y
              por lo tanto no están autorizados a enviar sus datos personales.
            </p>
          </section>

          <section>
            <p>
              <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> podrá ceder el uso de sus datos personales
              y la información que usted suministre a terceras empresas que provean servicios de administración de datos a fin de
              que usted pueda operar con nosotros y con otras sociedades con las cuales tenga un vínculo comercial o sean consideradas
              aliados comerciales en relación a ciertos productos y servicios que ofrecemos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">INFORMACION:</h2>
            <p>
              Salvo en los campos en que se indique lo contrario, las respuestas a las preguntas sobre datos personales son
              voluntarias, sin que la falta de contestación implique una merma en la calidad o cantidad de los servicios
              correspondientes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">CALIDAD DE DATOS:</h2>
            <p>
              Usted garantiza que los datos personales e información que suministre a{" "}
              <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> son veraces y actuales y, por lo tanto,
              asume la responsabilidad de comunicar a cualquier modificación en los mismos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">FINALIDAD:</h2>
            <p>
              El tratamiento automatizado de sus datos personales tiene como finalidad el mantenimiento de la relación contractual
              que en su caso establezca con <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> así como la
              gestión, administración, prestación, ampliación y mejora de los servicios que usted decida suscribir, darse de alta
              o utilizar la adecuación de dichos servicios a sus preferencias y gustos, el estudio de la utilización de los
              servicios por parte de los usuarios, el diseño de nuevos servicios relacionados con dichos servicios, el envío de
              actualizaciones de los servicios, el envío de información técnica, operativa y comercial acerca de productos y
              servicios ofrecidos por <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> y por terceros
              actualmente y en el futuro. La finalidad del levantamiento y tratamiento automatizado de sus datos personales
              incluye igualmente el envío de formularios de encuestas, que usted no estará obligado a contestar.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">SEGURIDAD:</h2>
            <p>
              <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> ha adoptado los niveles de seguridad de
              protección de los datos personales legalmente requeridos, y tomará la preocupación de instalar aquellos otros medios
              y medidas técnicas adicionales a su alcance para evitar la pérdida, mal uso, alteración, acceso no autorizado y
              robo de los datos personales suministrados. Sin perjuicio de ello, usted debe ser consciente que las medidas de
              seguridad en Internet no son inexpugnables.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">DERECHO DE RECTIFICACION, ACTUALIZACION O SUPRESION:</h2>
            <p>
              Usted podrá ejercitar los derechos de acceso, actualización, cancelación, rectificación y oposición, así como
              tiene reconocido el derecho a ser informado de las cesiones de sus datos personales realizadas contactando a{" "}
              <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> a través del correo electrónico{" "}
              <a href="mailto:contacto@zprest.com.ar" className="text-[#d4af37] hover:underline">contacto@zprest.com.ar</a>.
            </p>
          </section>

          <section>
            <p className="mb-3">
              <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> cumple con la normativa vigente que hace
              a la <strong className="text-white">protección de datos Personales Ley 25.326</strong>.{" "}
              <strong className="text-white">ZAYIN SERVICIOS FINANCIEROS SAS</strong> podrá revelar los datos personales:
            </p>
            <ul className="list-none space-y-2 pl-2">
              <li>
                (i) si estamos obligados a hacerlo por la normativa aplicable (incluyendo pero no limitándose al Banco Central
                de la República Argentina (&ldquo;BCRA&rdquo;), la Unidad de la Información Financiera (&ldquo;UIF&rdquo;), la
                Agencia Federal de Ingresos Públicos (AFIP), la Administración Nacional de la Seguridad Social (ANSES),
                Registro Nacional de las Personas (RENAPER) entre otros);
              </li>
              <li>
                (ii) en el marco de un proceso judicial o en cumplimiento de un requerimiento de autoridad competente,
              </li>
              <li>
                (iii) a las fuerzas y cuerpos de seguridad o a otros funcionarios públicos cuando lo soliciten legítimamente,
              </li>
              <li>
                (iv) cuando consideremos que dicha revelación es necesaria o conveniente para evitar daños físicos o pérdidas
                económicas, o
              </li>
              <li>
                (v) en el marco de una investigación de actividades fraudulentas o ilegales, o que se presuman fraudulentas o ilegales.
              </li>
            </ul>
          </section>

          <section>
            <p className="text-gray-400 italic">
              Agradecemos su confianza y compromiso con nuestra política de privacidad. Para cualquier consulta, no dude en
              ponerse en contacto con nosotros en{" "}
              <a href="mailto:contacto@zprest.com.ar" className="text-[#d4af37] hover:underline">contacto@zprest.com.ar</a>.
            </p>
          </section>

        </div>

        <div className="mt-12 flex gap-4 border-t border-white/10 pt-8">
          <Link href="/terminos" className="text-sm text-[#d4af37] hover:underline">Términos y Condiciones</Link>
          <span className="text-gray-600">·</span>
          <Link href="/modelo-de-contrato" className="text-sm text-[#d4af37] hover:underline">Modelo de Contrato</Link>
        </div>
      </main>
    </div>
  );
}
