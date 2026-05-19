"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { calcularCuotaPersonal, calcularCuotaDiariaComercial } from "@/lib/loan-calculator";
import type { PlanSimulador } from "@/types";

interface Props {
  planes: PlanSimulador[];
}

// Montos disponibles
const MONTOS_PERSONAL = [1000000, 1500000, 2000000, 2500000, 3000000, 3500000, 4000000, 4500000, 5000000, 5500000, 6000000, 6500000, 7000000];
const MONTOS_COMERCIAL = [1000000, 2000000, 3000000, 4000000, 5000000, 6000000, 7000000, 8000000, 9000000, 10000000, 11000000, 12000000, 13000000, 14000000, 15000000];

function pesos(n: number) {
  return "$ " + n.toLocaleString("es-AR");
}

function DiscreteSlider({
  label,
  options,
  index,
  display,
  onChange,
}: {
  label: string;
  options: number[];
  index: number;
  display: string;
  onChange: (i: number) => void;
}) {
  const pct = options.length > 1 ? (index / (options.length - 1)) * 100 : 0;
  return (
    <div className="mb-5">
      <div className="mb-2 inline-block rounded-lg bg-azul-principal px-3 py-1 text-sm font-bold text-white">
        {display}
      </div>
      <div className="relative py-2">
        <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-white/15" />
        <div
          className="pointer-events-none absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-dorado"
          style={{ width: `${pct}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dorado shadow-md ring-2 ring-white/30"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={0}
          max={options.length - 1}
          step={1}
          value={index}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative z-10 w-full cursor-pointer opacity-0"
          style={{ height: "20px" }}
        />
      </div>
      <p className="text-center text-xs text-blue-300/60">{label}</p>
    </div>
  );
}

export default function SimuladorWidget({ planes }: Props) {
  const [plan, setPlan] = useState<"personal" | "pyme">("personal");
  const [montoIdxP, setMontoIdxP] = useState(2); // $2.000.000
  const [cuotasP, setCuotasP] = useState(12);
  const [montoIdxC, setMontoIdxC] = useState(0); // $1.000.000
  const [diasC, setDiasC] = useState(60);

  useEffect(() => {
    const handler = (e: Event) => {
      const tipo = (e as CustomEvent<"personal" | "pyme">).detail;
      if (tipo === "personal" || tipo === "pyme") setPlan(tipo);
    };
    window.addEventListener("zprest:switch-plan", handler);
    return () => window.removeEventListener("zprest:switch-plan", handler);
  }, []);

  // Planes filtrados por tipo
  const planesPersonal = planes.filter((p) => p.tipo === "personal" && p.activo);
  const planesComercial = planes.filter((p) => p.tipo === "pyme" && p.activo);

  // Opciones de cuotas/días desde los planes
  const opcionesCuotas = planesPersonal.length > 0
    ? [...new Set(planesPersonal.map((p) => p.plazo_min))].sort((a, b) => a - b)
    : [3, 6, 9, 12, 18];

  const opcionesDias = planesComercial.length > 0
    ? [...new Set(planesComercial.map((p) => p.plazo_min))].sort((a, b) => a - b)
    : [30, 60, 90, 120];

  // Cálculo Personal
  const montoP = MONTOS_PERSONAL[montoIdxP];
  const planPersonalActivo = planesPersonal.find((p) => p.plazo_min === cuotasP);
  const cuotaPersonal = planPersonalActivo?.tem
    ? calcularCuotaPersonal(montoP, planPersonalActivo.tem, cuotasP)
    : 0;

  // Cálculo Comercial
  const montoC = MONTOS_COMERCIAL[montoIdxC];
  const planComercialActivo = planesComercial.find((p) => p.plazo_min === diasC);
  const cuotaComercial = planComercialActivo?.ted
    ? calcularCuotaDiariaComercial(montoC, planComercialActivo.ted, diasC)
    : 0;

  const solicitudParams =
    plan === "personal"
      ? `?plan=personal&monto=${montoP}&cuotas=${cuotasP}`
      : `?plan=pyme&monto=${montoC}&plazo=${diasC}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
      <h3 className="mb-5 text-center font-serif text-lg font-bold text-white">
        Conocé nuestra oferta
      </h3>

      {plan === "personal" ? (
        <>
          <DiscreteSlider
            label="Monto solicitado"
            options={MONTOS_PERSONAL}
            index={montoIdxP}
            display={pesos(montoP)}
            onChange={setMontoIdxP}
          />
          <p className="mb-2 text-xs text-blue-300/70">Cantidad de cuotas</p>
          <div className="mb-5 flex flex-wrap gap-2">
            {opcionesCuotas.map((c) => (
              <button
                key={c}
                onClick={() => setCuotasP(c)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                  cuotasP === c
                    ? "bg-azul-principal text-white shadow-sm"
                    : "border border-white/20 text-white/80 hover:bg-white/15"
                }`}
              >
                {c} meses
              </button>
            ))}
          </div>
          <div className="my-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-200/70">
              PRIMERA CUOTA A PAGAR:
            </p>
            <p className="mt-0.5 font-serif text-3xl font-bold text-cyan-400">
              {pesos(cuotaPersonal)}
            </p>
            <span className="mt-1 inline-block rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-cyan-300">
              Plan Mensual
            </span>
            <p className="mt-1 text-[10px] text-blue-300/50">
              + IVA s/intereses (decrece cada mes) · Sistema francés · TNA 96%
            </p>
          </div>
        </>
      ) : (
        <>
          <DiscreteSlider
            label="Monto solicitado"
            options={MONTOS_COMERCIAL}
            index={montoIdxC}
            display={pesos(montoC)}
            onChange={setMontoIdxC}
          />
          <p className="mb-2 text-xs text-amber-300/70">Plazo</p>
          <div className="mb-5 flex gap-2">
            {opcionesDias.map((d) => (
              <button
                key={d}
                onClick={() => setDiasC(d)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                  diasC === d
                    ? "bg-azul-principal text-white shadow-sm"
                    : "border border-white/20 text-white/80 hover:bg-white/15"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <div className="my-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-200/70">
              CUOTA DIARIA DE:
            </p>
            <p className="mt-0.5 font-serif text-3xl font-bold text-cyan-400">
              {pesos(cuotaComercial)}
            </p>
            <span className="mt-1 inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
              Plan Comercial
            </span>
            <p className="mt-1 text-[10px] text-blue-300/50">
              Capital + intereses + IVA · Se cobra todos los días hábiles
            </p>
          </div>
        </>
      )}

      <Link
        href={`/login${solicitudParams}`}
        className="btn-lift block w-full rounded-full bg-dorado py-3 text-center text-sm font-bold uppercase tracking-wide text-white hover:bg-dorado-hover"
      >
        Pedilo ahora
      </Link>

      <div className="mt-4 flex justify-center gap-2 border-t border-white/10 pt-4">
        <button
          onClick={() => setPlan("personal")}
          className={`flex flex-col items-center rounded-xl px-4 py-2 text-xs font-semibold transition ${
            plan === "personal"
              ? "bg-azul-principal text-white shadow-sm"
              : "border border-white/20 text-white/80 hover:bg-white/15"
          }`}
        >
          <span className="font-bold">Mensual</span>
          <span className={`text-[10px] font-normal ${plan === "personal" ? "text-blue-200" : "text-white/50"}`}>
            Personas físicas
          </span>
        </button>
        <button
          onClick={() => setPlan("pyme")}
          className={`flex flex-col items-center rounded-xl px-4 py-2 text-xs font-semibold transition ${
            plan === "pyme"
              ? "bg-azul-principal text-white shadow-sm"
              : "border border-white/20 text-white/80 hover:bg-white/15"
          }`}
        >
          <span className="font-bold">Comercial</span>
          <span className={`text-[10px] font-normal ${plan === "pyme" ? "text-blue-200" : "text-white/50"}`}>
            Pymes
          </span>
        </button>
      </div>

      <p className="mt-3 text-center text-[10px] leading-relaxed text-blue-300/40">
        Período mínimo: 3 meses (Personal) / 30 días (Comercial).
        TNA varía por plazo. Sujeto a aprobación crediticia.
      </p>
    </div>
  );
}
