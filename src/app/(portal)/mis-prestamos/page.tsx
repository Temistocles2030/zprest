"use client";

import Link from "next/link";
import { useDeuda } from "@/hooks/useDeuda";
import CreditCard from "@/components/ui/CreditCard";
import type { Cuota } from "@/types";

function estadoLabel(cuotasDePrestamo: Cuota[]): string {
  if (cuotasDePrestamo.some((c) => c.estado === "vencida")) return "Atrasado";
  if (cuotasDePrestamo.every((c) => c.estado === "pagada")) return "Completado";
  return "Al día";
}

export default function MisPrestamosPage() {
  const { prestamos, cuotas, loading } = useDeuda();

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-texto">Mis Préstamos</h1>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (prestamos.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-texto">Mis Préstamos</h1>
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-10 text-center shadow-sm">
          <p className="text-texto-muted">No tenés préstamos activos aún.</p>
          <Link
            href="/solicitar"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Solicitar un préstamo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-texto">Mis Préstamos</h1>
        <p className="mt-1 text-sm text-texto-muted">
          {prestamos.length} crédito{prestamos.length !== 1 ? "s" : ""} activo{prestamos.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {prestamos.map((prestamo) => {
          const cuotasDePrestamo = cuotas.filter((c) => c.prestamo_id === prestamo.id);
          const label = estadoLabel(cuotasDePrestamo);
          return (
            <Link key={prestamo.id} href={`/mis-prestamos/${prestamo.id}`}>
              <CreditCard
                prestamo={prestamo}
                estadoLabel={label}
                onClick={() => {}}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
