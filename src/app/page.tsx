import { Metadata } from "next";
import Link from "next/link";
import HeroSection from "@/components/landing/HeroSection";
import LandingNav from "@/components/landing/LandingNav";
import ZiroChat from "@/components/landing/ZiroChat";
import PandaPosnetCard from "@/components/landing/PandaPosnetCard";
import { createAdminClient } from "@/lib/supabase/server";
import type { PlanSimulador } from "@/types";


export const revalidate = 60;

export const metadata: Metadata = {
  title: "Zprest — Créditos 100% digitales en Argentina",
  description:
    "Préstamos personales, Pymes y en relación de dependencia. Aprobación rápida, acreditación en tu cuenta.",
  openGraph: {
    title: "Zprest — Créditos 100% digitales",
    description: "Simulá y solicitá tu préstamo en minutos.",
    type: "website",
  },
};

// ── Datos ─────────────────────────────────────────────────────────────────────

const SERVICIOS = [
  {
    icon: "👤",
    tag: "Personas físicas",
    titulo: "Crédito Personal",
    desc: "El dinero que necesitás, en tu cuenta en 24 hs. Sin garantes, sin papelería, 100% online.",
    items: [
      "Hasta $ 15.000.000",
      "3 a 18 cuotas mensuales",
      "Cuota calculada en sistema francés",
      "Solo DNI + CBU activo",
      "Acreditación en 24 hs hábiles",
    ],
    badge: "Desde $ 1.000.000",
    cta: "Solicitá ahora",
    color: "from-[#1e3a8a] to-[#2563eb]",
  },
  {
    icon: "🏢",
    tag: "Microemprendimientos y pymes",
    titulo: "Crédito Comercial",
    desc: "Capital de trabajo inmediato para tu negocio. Pago por día. Sujeto a aprobación crediticia.",
    items: [
      "Hasta $ 30.000.000",
      "30, 60, 90 y 120 días de plazo",
      "Cuota fija diaria",
      "Aprobación en el día",
      "Renovación express disponible",
    ],
    badge: "Desde $ 1.000.000",
    cta: "Consultá condiciones",
    color: "from-[#0f1e4a] to-[#1e3a8a]",
  },
];

const NUMEROS = [
  { valor: "100", label: "clientes activos" },
  { valor: "$ 350M", label: "acreditados" },
  { valor: "98%", label: "satisfacción" },
  { valor: "< 24 hs", label: "tiempo de aprobación" },
];

const FAQS = [
  { q: "¿Qué requisitos necesito?", a: "DNI, CBU activo y recibo de sueldo o documentación de la actividad comercial. Sin garantes ni hipotecas." },
  { q: "¿En cuánto tiempo se acredita el dinero?", a: "Una vez aprobado, el dinero se acredita en tu cuenta en 24-48 hs hábiles." },
  { q: "¿Cómo se cobran las cuotas?", a: "Automáticamente por DEBIN desde tu CBU en la fecha de vencimiento pactada." },
  { q: "¿Puedo cancelar anticipadamente?", a: "Sí, sin penalidades. Contactá a nuestro equipo para liquidar el saldo remanente con intereses compensatorios al día." },
  { q: "¿Operan solo en Neuquén?", a: "Actualmente nuestra base está en Plottier, Neuquén, pero operamos a nivel nacional con acreditación a cualquier CBU del país." },
  { q: "¿Puedo tomar un segundo crédito?", a: "Sí, una vez que estés al día con las cuotas podés solicitar una renovación o ampliar el monto disponible." },
];

// ── Componente ────────────────────────────────────────────────────────────────
export default async function HomePage() {
  let planes: PlanSimulador[] = [];
  const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
  if (!IS_MOCK) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("planes")
        .select("id, nombre, tipo, tna, tem, ted, frecuencia, monto_min, monto_max, plazo_min, plazo_max, activo")
        .eq("activo", true)
        .neq("tipo", "dependencia")
        .order("tipo")
        .order("plazo_min");
      if (data) planes = data as PlanSimulador[];
    } catch {
      // use empty planes, widget will use defaults
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#060d1f]">

      {/* ── NAVBAR ───────────────────────────────────────────────────────── */}
      <LandingNav planes={planes} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <HeroSection planes={planes} />

      {/* ── NÚMEROS ──────────────────────────────────────────────────────── */}
      <section id="nosotros" className="bg-azul-principal px-4 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 sm:grid-cols-4">
          {NUMEROS.map((n) => (
            <div key={n.label} className="text-center">
              <p className="font-serif text-3xl font-bold text-cyan-300">{n.valor}</p>
              <p className="mt-1 text-xs text-blue-200">{n.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── QUIÉNES SOMOS ────────────────────────────────────────────────── */}
      <section className="bg-[#060d1f] px-4 py-20">
        <div className="section-divider mb-14" />
        <div className="mx-auto max-w-6xl flex flex-col items-center gap-12 lg:flex-row">
          {/* Texto */}
          <div className="flex-1 text-center lg:text-left">
            <span className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-300">
              Fintech argentina desde 2024
            </span>
            <h2 className="font-serif text-4xl font-bold text-white leading-tight">
              Créditos sin burocracia,<br/>
              <span className="text-azul-claro">con respaldo real</span>
            </h2>
            <p className="mt-5 text-blue-200/70 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Somos una fintech neuquina que nació para democratizar el acceso al
              crédito en la Patagonia y el país. Operamos 100% online con
              procesos transparentes, tasas claras y personas reales del otro lado.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-blue-200/70">
              {[
                "Empresa registrada en Provincia de Neuquén",
                "Operamos bajo la Ley de Defensa del Consumidor 24.240",
                "Datos protegidos bajo la Ley de Protección de Datos Personales 25.326",
                "Atención personalizada en español",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 text-green-500">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Stats visual */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm flex-shrink-0">
            {[
              { n: "100", l: "Clientes", bg: "bg-azul-principal text-white" },
              { n: "100%", l: "Digital", bg: "bg-cyan-500 text-white" },
              { n: "24 hs", l: "Acreditación", bg: "bg-white/10 text-white" },
              { n: "$ 0", l: "Costo apertura", bg: "bg-green-900/30 text-green-300" },
            ].map((s) => (
              <div key={s.l} className={`card-glow rounded-2xl p-6 text-center ${s.bg}`}>
                <p className="font-serif text-2xl font-bold">{s.n}</p>
                <p className="mt-1 text-xs font-medium opacity-80">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICIOS ────────────────────────────────────────────────────── */}
      <section id="servicios" className="bg-[#0a1628] px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-300">
              Nuestros productos
            </span>
            <h2 className="font-serif text-4xl font-bold text-white">
              Nuestros Servicios
            </h2>
            <p className="mt-3 text-blue-200/70 max-w-xl mx-auto">
              Productos y servicios para cada etapa de tu vida financiera.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {SERVICIOS.map((s) => (
              <div
                key={s.titulo}
                className={`relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br ${s.color} p-7 text-white shadow-xl`}
              >
                {/* Orb */}
                <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/5 blur-2xl" />

                <div className="mb-4 flex items-start justify-between">
                  <span className="text-3xl">{s.icon}</span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-cyan-200">
                    {s.badge}
                  </span>
                </div>

                <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-300/70">
                  {s.tag}
                </p>
                <h3 className="mt-1 font-serif text-xl font-bold">{s.titulo}</h3>
                <p className="mt-2 text-sm text-blue-100/80 leading-relaxed">{s.desc}</p>

                <ul className="mt-5 flex-1 space-y-2">
                  {s.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-blue-100/90">
                      <span className="mt-0.5 text-cyan-300">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className="mt-6 block rounded-xl bg-white/15 py-2.5 text-center text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/25"
                >
                  {s.cta} →
                </Link>
              </div>
            ))}

            {/* Panda Posnet */}
            <PandaPosnetCard />
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ────────────────────────────────────────────────── */}
      <section id="planes" className="bg-[#060d1f] px-4 py-20">
        <div className="section-divider mb-14" />
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="font-serif text-4xl font-bold text-white">
              ¿Cómo funciona?
            </h2>
            <p className="mt-3 text-blue-200/60">Cuatro pasos y el dinero está en tu cuenta.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", titulo: "Simulá", desc: "Usá el simulador y elegí monto y plazo en segundos." },
              { n: "02", titulo: "Solicitá", desc: "Completá el formulario online con tu DNI y CBU. Sin papelería." },
              { n: "03", titulo: "Aprobación", desc: "Revisamos tu solicitud y te notificamos en menos de 24 hs." },
              { n: "04", titulo: "Acreditación", desc: "El dinero llega a tu cuenta bancaria. Empezás a pagar la primera cuota en 30 días." },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <span className="font-serif text-4xl font-bold text-azul-claro/40">{step.n}</span>
                <h3 className="mt-2 font-serif text-lg font-bold text-white">{step.titulo}</h3>
                <p className="mt-1 text-sm text-blue-200/60">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="bg-[#0a1628] px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center font-serif text-4xl font-bold text-white">
            Preguntas frecuentes
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <h3 className="font-serif font-semibold text-white">{faq.q}</h3>
                <p className="mt-1.5 text-sm text-blue-200/60">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f1e4a] to-[#1e3a8a] px-4 py-20 text-center text-white">
        <div className="ambient-orb ambient-orb-1 opacity-10" aria-hidden />
        <div className="ambient-orb ambient-orb-2 opacity-10" aria-hidden />
        <div className="relative">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-cyan-300">
            Tu finanza, tu decisión
          </p>
          <h2 className="font-serif text-4xl font-bold">¿Listo para empezar?</h2>
          <p className="mt-3 text-blue-200 max-w-md mx-auto">
            Creá tu cuenta gratis en minutos. Sin costos de apertura, sin sorpresas.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="btn-lift shimmer-blue rounded-xl bg-white px-10 py-3.5 font-bold text-azul-principal hover:bg-blue-50"
            >
              Comenzar ahora
            </Link>
            <a
              href="#servicios"
              className="rounded-xl border border-white/30 px-10 py-3.5 font-medium text-white hover:bg-white/10"
            >
              Ver servicios
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#0a1628] px-4 pt-14 pb-6 text-sm text-blue-200/70">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 pb-10 border-b border-white/10">

            {/* Col 1 — Marca */}
            <div className="col-span-2 sm:col-span-1">
              <p className="font-serif text-lg font-bold tracking-widest text-white mb-0">ZPREST</p>
              <p className="text-[12px] font-bold tracking-[0.18em] text-white/30 mb-1 transition-colors hover:text-[#D4AF37] cursor-default">IS45.123</p>
              <p className="text-xs leading-relaxed text-blue-300/60">
                Fintech argentina.<br />
                Créditos 100% digitales.
              </p>
              <div className="mt-4 flex gap-3">
                <a href="https://www.facebook.com/zprest/" target="_blank" rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-blue-200 transition hover:bg-white/20" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg>
                </a>
                <a href="https://www.instagram.com/zprestamos" target="_blank" rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-blue-200 transition hover:bg-white/20" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="https://wa.me/5492996583971" target="_blank" rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-blue-200 transition hover:bg-white/20" aria-label="WhatsApp">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                </a>
              </div>
            </div>

            {/* Col 2 — Links útiles */}
            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-white">Links útiles</h4>
              <ul className="space-y-2">
                <li><a href="#servicios" className="hover:text-white transition">Planes</a></li>
                <li><a href="#servicios" className="hover:text-white transition">Servicios</a></li>
                <li><a href="#nosotros" className="hover:text-white transition">Conocenos</a></li>
                <li><Link href="/arrepentimiento" className="hover:text-white transition">Botón de arrepentimiento</Link></li>
              </ul>
            </div>

            {/* Col 3 — Legales */}
            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-white">Legales</h4>
              <ul className="space-y-2">
                <li><Link href="/terminos" className="hover:text-white transition">Términos y condiciones</Link></li>
                <li><Link href="/politicas" className="hover:text-white transition">Política de privacidad</Link></li>
                <li>
                  <Link href="/modelo-de-contrato" className="hover:text-white transition">
                    Modelo de contrato<br/>
                    <span className="text-[11px] text-blue-300/50">Ley 24.240</span>
                  </Link>
                </li>
                <li><Link href="/arca" className="hover:text-white transition">Consulta ARCA</Link></li>
              </ul>
            </div>

            {/* Col 4 — Contacto */}
            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-white">Contacto</h4>
              <ul className="space-y-2 text-xs leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span>📍</span>
                  <span>Altos de CNEA, Duplex A, Lte 6, Mza 3D<br/>Collon Cura S/N — Plottier<br/>Provincia de Neuquén</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span>✉️</span>
                  <a href="mailto:contacto@zprest.com.ar" className="hover:text-white transition break-all">
                    contacto@zprest.com.ar
                  </a>
                </li>
                <li className="flex items-center gap-1.5">
                  <span>🌍</span>
                  <span>Neuquén, Argentina</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 pt-6 text-xs text-blue-300/40 sm:flex-row">
            <p>© {new Date().getFullYear()} Zprest. Todos los derechos reservados.</p>
            <p>zprest.com.ar</p>
          </div>
        </div>
      </footer>

      {/* ── ZIRO CHATBOT ─────────────────────────────────────────────────── */}
      <ZiroChat />
    </div>
  );
}
