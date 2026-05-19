"use client";

import { useDeuda } from "@/hooks/useDeuda";
import { formatearPesos } from "@/lib/loan-calculator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import StatusBadge from "@/components/ui/StatusBadge";

const MOCK_PROXIMO = {
  monto: 45000,
  fecha: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  estado: "pendiente" as const,
  numero_cuota: 4,
};

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER ?? "5491100000000";

export default function ProximoVencimiento() {
  const { proximoVencimiento, loading, prestamos } = useDeuda();
  const useMock = !loading && prestamos.length === 0;

  const monto  = useMock ? MOCK_PROXIMO.monto  : proximoVencimiento?.monto ?? null;
  const fecha  = useMock ? MOCK_PROXIMO.fecha  : proximoVencimiento?.fecha_vencimiento ? new Date(proximoVencimiento.fecha_vencimiento) : null;
  const estado = useMock ? MOCK_PROXIMO.estado : proximoVencimiento?.estado;
  const numero = useMock ? MOCK_PROXIMO.numero_cuota : proximoVencimiento?.numero_cuota;

  const isVencida = estado === "vencida";

  if (loading) {
    return <div className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />;
  }

  if (!monto) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 dark:border-green-800 dark:bg-green-900/20">
        <p className="font-medium text-green-700 dark:text-green-400">
          No tenés cuotas pendientes. ¡Bien!
        </p>
      </div>
    );
  }

  return (
    <div
      className={`card-glow flex items-center justify-between rounded-xl px-5 py-4 ${
        isVencida
          ? "border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20"
          : "bg-white dark:bg-gray-900"
      }`}
    >
      <div>
        <p className="text-sm text-texto-muted">
          Próximo vencimiento — Cuota {numero}
        </p>
        <p className="mt-1 font-serif text-2xl font-bold text-texto">
          {formatearPesos(monto)}
        </p>
        {fecha && (
          <p className="mt-0.5 text-sm text-texto-muted">
            {format(fecha, "d 'de' MMMM yyyy", { locale: es })}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        {estado && <StatusBadge status={estado} />}

        {isVencida && (
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
              "Hola, quiero regularizar mi cuota vencida."
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Regularizar
          </a>
        )}
      </div>
    </div>
  );
}
