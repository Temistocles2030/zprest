"use client";

import { useDeuda } from "@/hooks/useDeuda";
import AmountDisplay from "@/components/ui/AmountDisplay";

const MOCK_DATA = {
  totalDeuda: 500000,
  totalAbonado: 120000,
  saldoRemanente: 380000,
};

interface StatCardProps {
  label: string;
  amount: number;
  sub?: string;
  accent: string;
}

function StatCard({ label, amount, sub, accent }: StatCardProps) {
  return (
    <div className="card-glow rounded-2xl bg-white p-6 dark:bg-gray-900">
      <p className="text-xs font-semibold uppercase tracking-wider text-texto-muted">
        {label}
      </p>
      <div className={`mt-2 ${accent}`}>
        <AmountDisplay amount={amount} size="lg" />
      </div>
      {sub && <p className="mt-1 text-xs text-texto-muted">{sub}</p>}
    </div>
  );
}

export default function DeudaResumen() {
  const { prestamos, loading, totalDeuda, totalAbonado, saldoRemanente } =
    useDeuda();

  const useMock = !loading && prestamos.length === 0;
  const deuda    = useMock ? MOCK_DATA.totalDeuda    : totalDeuda;
  const abonado  = useMock ? MOCK_DATA.totalAbonado  : totalAbonado;
  const remanente = useMock ? MOCK_DATA.saldoRemanente : saldoRemanente;
  const porcentaje = deuda > 0 ? Math.round((abonado / deuda) * 100) : 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {useMock && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          Mostrando datos de ejemplo. Tus préstamos aparecerán aquí una vez aprobados.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Deuda original"
          amount={deuda}
          accent="text-azul-principal dark:text-blue-400"
        />
        <StatCard
          label="Total abonado"
          amount={abonado}
          sub={`${porcentaje}% del total`}
          accent="text-green dark:text-green-400"
        />
        <StatCard
          label="Saldo remanente"
          amount={remanente}
          accent="text-amber dark:text-amber-400"
        />
      </div>

      {/* Barra de progreso global */}
      <div className="rounded-2xl bg-white p-5 dark:bg-gray-900 card-glow">
        <div className="mb-2 flex justify-between text-xs text-texto-muted">
          <span>Progreso de pago</span>
          <span className="font-semibold text-green">{porcentaje}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-azul-principal to-cyan transition-all duration-700"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
    </div>
  );
}
