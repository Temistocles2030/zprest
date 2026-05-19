"use client";

import { motion } from "framer-motion";
import { formatearPesos } from "@/lib/loan-calculator";
import { Prestamo } from "@/types";

interface CreditCardProps {
  prestamo: Prestamo;
  /** Label de estado opcional (ej: "Activo", "Al día") */
  estadoLabel?: string;
  onClick?: () => void;
}

export default function CreditCard({ prestamo, estadoLabel, onClick }: CreditCardProps) {
  const progreso = prestamo.cuotas_pagadas / prestamo.cuotas_total;

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(30,58,138,0.18)" }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1e4a] to-[#1e3a8a] p-6 text-white shadow-md ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {/* Orb decorativo */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-blue-300">
            Préstamo #{prestamo.id?.slice(-6)}
          </p>
          <p className="mt-1 font-serif text-2xl font-bold">
            {formatearPesos(prestamo.capital_original)}
          </p>
        </div>
        {estadoLabel && (
          <span className="rounded-full bg-cyan-400/20 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
            {estadoLabel}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-blue-300">Cuota mensual</p>
          <p className="font-semibold">{formatearPesos(prestamo.cuotas_monto)}</p>
        </div>
        <div>
          <p className="text-blue-300">Cuotas</p>
          <p className="font-semibold">
            {prestamo.cuotas_pagadas}/{prestamo.cuotas_total}
          </p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mt-4">
        <div className="h-1.5 w-full rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${progreso * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-blue-300">
          {Math.round(progreso * 100)}% pagado
        </p>
      </div>
    </motion.div>
  );
}
