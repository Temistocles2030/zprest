"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import SimuladorWidget from "./SimuladorWidget";
import LeadCaptureModal from "./LeadCaptureModal";
import type { PlanSimulador } from "@/types";

const STATS = [
  { value: "100", label: "clientes" },
  { value: "24 hs", label: "acreditación" },
  { value: "0%", label: "comisión inicial" },
];

export default function HeroSection({ planes }: { planes: PlanSimulador[] }) {
  const [leadOpen, setLeadOpen] = useState(false);

  return (
    <>
      <section className="hero-grid relative overflow-hidden bg-gradient-to-br from-[#040d24] via-[#0f1e4a] to-[#1e3a8a] px-4 pb-16 pt-14 text-white">
        <div className="ambient-orb ambient-orb-1" aria-hidden />
        <div className="ambient-orb ambient-orb-2" aria-hidden />

        <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">

          {/* Badge */}
          <div className="hero-anim-1 mb-5 flex flex-col items-center gap-1">
            <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold tracking-widest text-yellow-400 uppercase backdrop-blur-sm">
              🇦🇷 Fintech argentina
            </span>
            <span className="text-xs font-medium text-white/70">desde 2024</span>
          </div>

          {/* Corona */}
          <div className="hero-anim-2 mb-4 overflow-hidden" style={{ width: 200, height: 90 }}>
            <Image
              src="/logo-header-430x293.png"
              alt="Zprest"
              width={200}
              height={136}
              className="object-contain object-top brightness-0 invert"
              priority
            />
          </div>

          {/* Heading */}
          <h1 className="hero-anim-2 text-4xl font-bold leading-tight text-white md:text-6xl">
            Tu préstamo,{" "}
            <span className="text-cyan-400">100% digital</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-anim-3 mt-5 text-base text-white/70 md:text-lg">
            Personales, Microemprendimientos y Pymes
            <br />
            Solicitá en minutos, recibí en horas.
          </p>

          {/* CTAs */}
          <div className="hero-anim-4 mt-8 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="btn-lift shimmer-blue w-full rounded-xl bg-white px-8 py-3 text-center font-bold text-azul-principal hover:bg-blue-50 sm:w-auto"
            >
              Solicitar préstamo
            </Link>
            <button
              onClick={() => setLeadOpen(true)}
              className="w-full rounded-xl border border-white/30 px-8 py-3 font-medium text-white backdrop-blur-sm transition hover:bg-white/10 sm:w-auto"
            >
              Que me contacten
            </button>
          </div>

          {/* Stats */}
          <div className="hero-anim-5 mt-10 grid w-full grid-cols-3">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`text-center ${
                  i > 0 ? "border-l border-white/15" : ""
                }`}
              >
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="mt-0.5 text-xs text-white/50">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Divider + Simulador */}
          <div id="simulador" className="hero-anim-6 mt-12 w-full">
            <div className="mb-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                Simulá tu cuota
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Simulator */}
            <SimuladorWidget planes={planes} />
          </div>
        </div>
      </section>

      <LeadCaptureModal isOpen={leadOpen} onClose={() => setLeadOpen(false)} />
    </>
  );
}
