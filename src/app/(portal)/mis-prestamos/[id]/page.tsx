"use client";

import { use } from "react";
import Link from "next/link";
import { useDeuda } from "@/hooks/useDeuda";
import CreditCard from "@/components/ui/CreditCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatearPesos } from "@/lib/loan-calculator";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DetallePrestamo({ params }: PageProps) {
  const { id } = use(params);
  const { prestamos, cuotas, loading } = useDeuda();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  const prestamo = prestamos.find((p) => p.id === id);

  if (!prestamo) {
    return (
      <div className="rounded-xl border bg-white dark:bg-gray-900 p-10 text-center">
        <p className="text-texto-muted">Préstamo no encontrado.</p>
        <Link href="/mis-prestamos" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Volver a mis préstamos
        </Link>
      </div>
    );
  }

  const cuotasDePrestamo = cuotas
    .filter((c) => c.prestamo_id === id)
    .sort((a, b) => a.numero_cuota - b.numero_cuota);

  const pagado = prestamo.total_abonado;
  const restante = prestamo.saldo_remanente;
  const capital = prestamo.capital_original;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link href="/mis-prestamos" className="text-sm text-texto-muted hover:text-texto">
          ← Mis préstamos
        </Link>
      </div>

      {/* Tarjeta del préstamo */}
      <CreditCard prestamo={prestamo} />

      {/* Resumen financiero */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-4 text-center shadow-sm">
          <p className="text-xs text-texto-muted">Capital original</p>
          <p className="mt-1 font-bold text-texto">{formatearPesos(capital)}</p>
        </div>
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-4 text-center shadow-sm">
          <p className="text-xs text-texto-muted">Total abonado</p>
          <p className="mt-1 font-bold text-green-600">{formatearPesos(pagado)}</p>
        </div>
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-4 text-center shadow-sm">
          <p className="text-xs text-texto-muted">Saldo restante</p>
          <p className="mt-1 font-bold text-texto">{formatearPesos(restante)}</p>
        </div>
      </div>

      {/* Timeline de cuotas */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-texto">
          Cuotas ({prestamo.cuotas_pagadas}/{prestamo.cuotas_total} pagadas)
        </h2>

        <div className="overflow-hidden rounded-xl border bg-white dark:bg-gray-900 shadow-sm">
          {cuotasDePrestamo.length === 0 ? (
            <p className="p-6 text-center text-sm text-texto-muted">Sin cuotas registradas.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {cuotasDePrestamo.map((cuota) => {
                const fecha = new Date(cuota.fecha_vencimiento);
                const isPagada = cuota.estado === "pagada";
                const isVencida = cuota.estado === "vencida";

                return (
                  <li
                    key={cuota.id}
                    className={`flex items-center justify-between px-5 py-4 ${
                      isVencida ? "bg-red-50 dark:bg-red-900/10" : ""
                    }`}
                  >
                    {/* Ícono estado */}
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          isPagada
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : isVencida
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {isPagada ? "✓" : isVencida ? "!" : cuota.numero_cuota}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-texto">
                          Cuota {cuota.numero_cuota}
                        </p>
                        <p className="text-xs text-texto-muted">
                          Vence: {format(fecha, "d MMM yyyy", { locale: es })}
                          {cuota.fecha_pago && (
                            <span className="ml-2 text-green-600">
                              · Pagada {format(new Date(cuota.fecha_pago), "d MMM", { locale: es })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Monto + badge */}
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-texto">
                        {formatearPesos(cuota.monto)}
                      </span>
                      <StatusBadge status={cuota.estado} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
