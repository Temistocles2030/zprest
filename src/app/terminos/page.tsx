import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Zprest",
  description: "Términos y condiciones generales de uso de la plataforma Zprest.",
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="border-b border-white/10 bg-[#0d1326] px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#d4af37]">Zprest</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">← Volver al inicio</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-bold text-[#d4af37]">TÉRMINOS Y CONDICIONES</h1>

        <div className="space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">INTRODUCCION. PRINCIPIOS BASICOS</h2>
            <p className="mb-3">
              El acceso y uso de ZPREST.COM.AR y sus servicios requiere que los usuarios acepten los términos aquí establecidos.
              Los usuarios deben leer, entender y aceptar todas las políticas establecidas. En caso de no aceptarlas, deberán
              abstenerse de utilizar el sitio. El contrato se basa en los principios de buena fe y cooperación mutua.
            </p>
            <p className="mb-3">
              ZAYIN SERVICIOS FINANCIEROS SAS se reserva el derecho de modificar los términos, siendo efectivos a partir de su publicación.
              La empresa no asume responsabilidad por errores tipográficos o inexactitudes. Todo el contenido del sitio y sus derechos
              pertenecen exclusivamente a la empresa salvo que se indique lo contrario, prohibiéndose la copia, distribución o uso
              comercial no autorizado sin permiso escrito.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">OTORGAMIENTO DE LOS CRÉDITOS - SERVICIO</h2>
            <p>
              El servicio implica la gestión y el otorgamiento online de préstamos personales y/o préstamos pyme a través del sitio web.
              Los términos muestran permanentemente los montos, la cantidad de cuotas, las modalidades de pago y las condiciones contractuales.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">REQUISITOS</h2>
            <p>
              Los usuarios deben completar todos los descriptores requeridos por el sitio y presentar la documentación a través de la
              página web de solicitud de préstamo.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">FORMULARIO DE SOLICITUD DE CRÉDITO – REGISTRACIÓN DEL USUARIO</h2>
            <p className="mb-3">
              El registro requiere completar los campos obligatorios con información válida y veraz. Los usuarios deben reportar cambios
              de inmediato. La documentación requerida incluye: nombre, monto solicitado, comprobante de ingresos, copia del DNI, email,
              recibos de trabajador autónomo/monotributista, contratos de alquiler comercial y documentación de servicios municipales.
            </p>
            <p className="mb-3">
              La respuesta llega dentro de las 48 hs. hábiles por email. Los usuarios autorizan solicitar información de bases de datos
              complementaria para la evaluación crediticia. La empresa posee exclusiva y libre potestad de la aprobación, sin asumir
              obligación alguna de otorgar el crédito.
            </p>
            <p className="mb-3 font-medium text-white">Una vez aprobado:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                La notificación por email incluye el monto accesible, el valor de la cuota incluyendo capital, intereses, IVA,
                seguro de vida, gastos de originación y fechas de vencimiento de pago.
              </li>
              <li>
                Los usuarios eligen fechas de liquidación dentro de los 35 días de la aprobación, solicitándola por email con
                al menos 5 días hábiles de anticipación a la fecha de acreditación deseada.
              </li>
              <li>
                Al solicitar la liquidación, los usuarios reciben el contrato en el cual deben realizar su firma verificando
                la identidad mediante reconocimiento facial. Las leyes N° 25.506 y N° 27.446 reconocen las firmas electrónicas
                y digitales.
              </li>
              <li>
                Los usuarios podrán guardar o imprimir las solicitudes de préstamo y los pagarés correspondientes.
              </li>
              <li>
                Los usuarios se obligan a devolver el monto recibido, más los intereses y comisiones correspondientes,
                y los costos del seguro de saldo.
              </li>
              <li>
                Los pagos se ejecutan mediante débitos automáticos en cuenta utilizando CBU o tarjeta de débito vía DEBIN,
                enlaces de pago voluntario o plataformas digitales. La empresa autoriza débitos exclusivamente por los importes
                y en las fechas de vencimiento pactadas.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">MODALIDAD DEL CONTRATO</h2>
            <p>
              Los usuarios pueden pre-cancelar parcialmente el saldo pendiente en cualquier momento sin atrasos, con la reducción
              calculada en la próxima cuota. El nuevo cálculo del saldo es: Saldo deudor - capital amortizado - importe pre-cancelado.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">RENUNCIAS</h2>
            <p>
              El retraso de la empresa en hacer valer los términos no podrá interpretarse como renuncia a sus derechos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">NOTIFICACIONES</h2>
            <p>
              Los usuarios aceptan la plena validez de las notificaciones vía email, SMS o WhatsApp de la empresa o el acreedor.
              Las notificaciones de los usuarios a la empresa por email poseen igualmente plena validez.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">OTRAS DISPOSICIONES</h2>
            <p>
              Los usuarios consienten que la empresa pueda ceder libremente los derechos resultantes del préstamo. La cesión
              conforme a los artículos 70-72 de la Ley 24.441 no requiere notificación al usuario.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">COMPROMISO DEL USUARIO</h2>
            <p className="mb-3">Los usuarios se comprometen a evitar:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Mensajes anónimos o bajo seudónimo</li>
              <li>
                Mensajes o información injuriosa, intimidatoria, engañosa, difamatoria u obscena que viole la privacidad
                o la propiedad intelectual
              </li>
              <li>
                Archivos que contengan virus o elementos destructivos, incluidos robots, spiders, worms o troyanos
              </li>
              <li>Material publicitario o promocional excepto en las áreas designadas</li>
              <li>Emails masivos no solicitados a usuarios</li>
              <li>
                Intentos de acceso no autorizado o uso del sitio que cause daños, sobrecarga o deterioro
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">RESPONSABILIDAD DEL TITULAR</h2>
            <p>
              ZAYIN SERVICIOS FINANCIEROS SAS no se responsabiliza por publicidad de terceros ni por conexiones establecidas
              por usuarios, ni por fallas del sistema, servidores o Internet. La empresa no garantiza el acceso y uso continuado
              o ininterrumpido, y no se hace responsable por dificultades técnicas ni por la falta de disponibilidad del sistema,
              ni por errores u omisiones.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">JURISDICCION – LEY APLICABLE</h2>
            <p>
              Ambas partes se someten a los tribunales ordinarios de la Primera Circunscripción de la Provincia de Neuquén.
              ZAYIN SERVICIOS FINANCIEROS SAS tiene su sede en Collón Cura SN, Altos de C.N.E.A, Mza 3D Duplex A, Plottier,
              Provincia de Neuquén.
            </p>
            <p className="mt-3">
              Los usuarios confirman haber leído y comprendido todos los términos, y que pueden obtener copias para imprimir
              o firmar en el domicilio de la empresa.
            </p>
          </section>

        </div>

        <div className="mt-12 flex gap-4 border-t border-white/10 pt-8">
          <Link href="/politicas" className="text-sm text-[#d4af37] hover:underline">Política de Privacidad</Link>
          <span className="text-gray-600">·</span>
          <Link href="/modelo-de-contrato" className="text-sm text-[#d4af37] hover:underline">Modelo de Contrato</Link>
        </div>
      </main>
    </div>
  );
}
