"use client";

import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/supabase/getToken";
import { ESTADOS_SOLICITUD } from "@/lib/constants";
import { formatearPesos } from "@/lib/loan-calculator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Solicitud, EstadoSolicitud } from "@/types";

type SolicitudEnriquecida = Solicitud & {
  usuarios?: { nombre: string | null; email: string; dni: string | null } | null;
  planes?: { nombre: string; tipo: string } | null;
};

const FILTROS: { value: EstadoSolicitud | "todas"; label: string }[] = [
  { value: "todas",        label: "Todas" },
  { value: "pendiente",    label: "Pendientes" },
  { value: "en_revision",  label: "En revisión" },
  { value: "pre_aprobado", label: "Pre-aprobadas" },
  { value: "pausado",      label: "Pausadas" },
  { value: "aprobado",     label: "Aprobadas" },
  { value: "rechazado",    label: "Rechazadas" },
];

const BADGE: Record<EstadoSolicitud, string> = {
  pendiente:    "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  en_revision:  "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  pre_aprobado: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  pausado:      "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  aprobado:     "bg-green-500/20 text-green-300 border border-green-500/30",
  rechazado:    "bg-red-500/20 text-red-300 border border-red-500/30",
  activo:       "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  completado:   "bg-gray-500/20 text-gray-300 border border-gray-500/30",
};

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudEnriquecida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<EstadoSolicitud | "todas">("pendiente");

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getAuthToken();
        if (!token) throw new Error("Sin sesión");

        const res = await fetch("/api/solicitudes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const json = await res.json();
        setSolicitudes(json.solicitudes ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const countPorEstado = (estado: EstadoSolicitud) =>
    solicitudes.filter((s) => s.estado === estado).length;

  const filtradas =
    filtro === "todas" ? solicitudes : solicitudes.filter((s) => s.estado === filtro);

  const pendientes = countPorEstado("pendiente");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Solicitudes</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {pendientes > 0
              ? `${pendientes} pendiente${pendientes !== 1 ? "s" : ""} de revisión`
              : "Sin solicitudes pendientes"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const count = f.value === "todas" ? solicitudes.length : countPorEstado(f.value as EstadoSolicitud);
          return (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filtro === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700"
              }`}
            >
              {f.label}
              {count > 0 && <span className="ml-1.5 text-xs opacity-60">({count})</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-800" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">{error}</div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-10 text-center text-gray-500">
          No hay solicitudes con el filtro seleccionado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Monto</th>
                <th className="px-5 py-3">Cuotas</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filtradas.map((s) => (
                <tr key={s.id} className="hover:bg-gray-700/50 transition">
                  <td className="px-5 py-3">
                    <p className="font-medium text-white">{s.usuarios?.nombre ?? "—"}</p>
                    <p className="text-xs text-gray-500">{s.usuarios?.email ?? s.user_id.slice(0, 8)}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-gray-300">{s.planes?.nombre ?? "—"}</p>
                    <p className="text-xs capitalize text-gray-500">{s.planes?.tipo ?? ""}</p>
                  </td>
                  <td className="px-5 py-3 font-semibold text-white">{formatearPesos(s.monto)}</td>
                  <td className="px-5 py-3 text-gray-400">{s.cuotas}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[s.estado]}`}>
                      {ESTADOS_SOLICITUD[s.estado]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {s.created_at ? format(new Date(s.created_at), "dd/MM/yy", { locale: es }) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <a
                      href={`/admin/solicitudes/${s.id}`}
                      className="rounded-lg bg-blue-600/20 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-600 hover:text-white transition"
                    >
                      Ver
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
