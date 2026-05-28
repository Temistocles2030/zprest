"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthToken } from "@/lib/supabase/getToken";
import { formatearPesos } from "@/lib/loan-calculator";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type CuotaRaw = {
  id: string;
  prestamo_id: string;
  numero_cuota: number;
  monto: number;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  estado: string;
  metodo_pago: string | null;
  comprobante: string | null;
  bind_operacion_id: string | null;
  usuarios: { nombre: string | null; email: string } | null;
  prestamos: {
    id: string;
    capital_original: number;
    saldo_remanente: number;
    cuotas_total: number;
    cuotas_pagadas: number;
    proximo_vencimiento: string | null;
  } | null;
};

type PrestamoGrupo = {
  prestamo_id: string;
  usuario: { nombre: string | null; email: string } | null;
  prestamo: {
    capital_original: number;
    saldo_remanente: number;
    cuotas_total: number;
    cuotas_pagadas: number;
  };
  cuotasAbiertas: CuotaRaw[];
};

type PrestamoFinalizado = {
  id: string;
  capital_original: number;
  saldo_remanente: number;
  cuotas_total: number;
  cuotas_pagadas: number;
  created_at: string;
  usuario: { nombre: string | null; email: string } | null;
};

const METODOS = [
  { value: "efectivo",      label: "Efectivo",      icon: "💵" },
  { value: "tarjeta",       label: "Tarjeta",        icon: "💳" },
  { value: "mercadopago",   label: "Mercado Pago",   icon: "🔵" },
  { value: "transferencia", label: "Transferencia",  icon: "🏦" },
];

const BADGE: Record<string, string> = {
  pendiente: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  pagada:    "bg-green-500/20 text-green-300 border border-green-500/30",
  vencida:   "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  fallida:   "bg-red-500/20 text-red-300 border border-red-500/30",
};

const FILTROS_HIST = [
  { value: "todas",     label: "Todas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "vencida",   label: "Vencidas" },
  { value: "fallida",   label: "Fallidas" },
  { value: "pagada",    label: "Pagadas" },
];

// Parsea fecha YYYY-MM-DD como hora local (evita el desfase UTC → Argentina)
function parseFecha(s: string): Date { return new Date(s + "T12:00:00"); }

function clasificar(c: CuotaRaw): string {
  if (c.estado === "pendiente" && parseFecha(c.fecha_vencimiento) < new Date()) return "vencida";
  return c.estado;
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-4 w-4"} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );
}

export default function CobrosAdminPage() {
  const [cuotas, setCuotas] = useState<CuotaRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [tab, setTab] = useState<"pendientes" | "historial" | "finalizados">("pendientes");
  const [filtroHist, setFiltroHist] = useState("pendiente");

  // Finalizados
  const [finalizados, setFinalizados] = useState<PrestamoFinalizado[]>([]);
  const [loadingFin, setLoadingFin] = useState(false);
  const [finalizadosCargados, setFinalizadosCargados] = useState(false);

  // Modal pago
  const [modalGrupo, setModalGrupo] = useState<PrestamoGrupo | null>(null);
  const [modalPaso, setModalPaso] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [montoRcbStr, setMontoRcbStr] = useState("0");
  const [metodoPago, setMetodoPago] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState("");
  const [exito, setExito] = useState(false);

  // Modal eliminar
  const [eliminarGrupo, setEliminarGrupo] = useState<PrestamoGrupo | null>(null);
  const [motivoEliminar, setMotivoEliminar] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    const token = await getAuthToken();
    if (!token) { setLoading(false); return; }

    const res = await fetch("/api/admin/cobros", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setCuotas(json.cuotas ?? []);
      setApiError(null);
    } else {
      const json = await res.json().catch(() => ({}));
      setApiError(json.error ?? `Error ${res.status}`);
    }
    setLoading(false);
  }, []);

  const cargarFinalizados = useCallback(async () => {
    setLoadingFin(true);
    const token = await getAuthToken();
    if (!token) { setLoadingFin(false); return; }

    const res = await fetch("/api/admin/cobros/finalizados", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setFinalizados(json.prestamos ?? []);
    }
    setFinalizadosCargados(true);
    setLoadingFin(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (tab === "finalizados" && !finalizadosCargados) cargarFinalizados();
  }, [tab, finalizadosCargados, cargarFinalizados]);

  const hoy = new Date();

  // Stats
  const vencidas  = cuotas.filter(c => c.estado === "pendiente" && parseFecha(c.fecha_vencimiento) < hoy);
  const fallidas  = cuotas.filter(c => c.estado === "fallida");
  const abiertas  = cuotas.filter(c => c.estado !== "pagada");
  const montoPend = abiertas.reduce((a, c) => a + c.monto, 0);

  // Grupos por préstamo para tab pendientes
  const grupos = useMemo((): PrestamoGrupo[] => {
    const map = new Map<string, PrestamoGrupo>();
    for (const c of cuotas) {
      if (!map.has(c.prestamo_id)) {
        map.set(c.prestamo_id, {
          prestamo_id: c.prestamo_id,
          usuario: c.usuarios,
          prestamo: c.prestamos ?? { capital_original: 0, saldo_remanente: 0, cuotas_total: 0, cuotas_pagadas: 0 },
          cuotasAbiertas: [],
        });
      }
      const g = map.get(c.prestamo_id)!;
      if (c.prestamos && !g.prestamo.capital_original) g.prestamo = c.prestamos;
      if (clasificar(c) !== "pagada") g.cuotasAbiertas.push(c);
    }
    return Array.from(map.values())
      .filter(g => g.cuotasAbiertas.length > 0)
      .sort((a, b) => {
        const aV = a.cuotasAbiertas.some(c => clasificar(c) === "vencida");
        const bV = b.cuotasAbiertas.some(c => clasificar(c) === "vencida");
        return aV === bV ? 0 : aV ? -1 : 1;
      });
  }, [cuotas]);

  // Abrir modal pago
  const abrirModal = (g: PrestamoGrupo) => {
    setModalGrupo(g);
    setSelectedIds(new Set());
    setMontoRcbStr("0");
    setMetodoPago("");
    setComprobante("");
    setModalPaso(1);
    setErrorModal("");
    setExito(false);
  };

  // Abrir modal eliminar
  const abrirEliminar = (g: PrestamoGrupo) => {
    setEliminarGrupo(g);
    setMotivoEliminar("");
    setErrorEliminar("");
  };

  const toggleCuota = (c: CuotaRaw) => {
    const next = new Set(selectedIds);
    if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
    setSelectedIds(next);
    const total = modalGrupo!.cuotasAbiertas
      .filter(x => next.has(x.id))
      .reduce((a, x) => a + x.monto, 0);
    setMontoRcbStr(total.toString());
  };

  const confirmarPago = async () => {
    if (!modalGrupo || !metodoPago) return;
    setGuardando(true); setErrorModal("");
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Sin sesión");

      const res = await fetch("/api/admin/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cuota_ids: Array.from(selectedIds),
          metodo_pago: metodoPago,
          comprobante: comprobante || null,
          monto_recibido: parseInt(montoRcbStr) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al registrar pago");
      setExito(true);
      await cargar();
      setTimeout(() => setModalGrupo(null), 1800);
    } catch (e) {
      setErrorModal(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!eliminarGrupo) return;
    setEliminando(true); setErrorEliminar("");
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Sin sesión");

      const res = await fetch(`/api/admin/prestamos/${eliminarGrupo.prestamo_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "eliminar",
          motivo: motivoEliminar || "Archivado desde cobros",
          notify: false,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al eliminar");
      setEliminarGrupo(null);
      await cargar();
    } catch (e) {
      setErrorEliminar(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEliminando(false);
    }
  };

  // Historial filtrado
  const histFiltradas = filtroHist === "todas"
    ? cuotas
    : filtroHist === "vencida"
      ? cuotas.filter(c => c.estado === "pendiente" && parseFecha(c.fecha_vencimiento) < hoy)
      : cuotas.filter(c => c.estado === filtroHist);

  const montoSeleccionado = modalGrupo?.cuotasAbiertas
    .filter(c => selectedIds.has(c.id))
    .reduce((a, c) => a + c.monto, 0) ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Cobros</h1>
        <p className="mt-0.5 text-sm text-gray-400">Gestión de pagos de cuotas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Monto pendiente",     valor: formatearPesos(montoPend),    color: "text-yellow-400" },
          { label: "Cuotas vencidas",     valor: String(vencidas.length),      color: "text-orange-400" },
          { label: "DEBIN fallidos",      valor: String(fallidas.length),      color: "text-red-400" },
          { label: "Préstamos con deuda", valor: String(grupos.length),        color: "text-blue-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.valor}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700">
        {[
          { value: "pendientes",  label: "Cobros pendientes" },
          { value: "historial",   label: "Historial de cuotas" },
          { value: "finalizados", label: "Préstamos finalizados" },
        ].map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value as typeof tab)}
            className={`pb-2.5 px-1 mr-4 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t.value
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
            {t.value === "pendientes" && grupos.length > 0 && (
              <span className="ml-2 rounded-full bg-blue-600/30 px-1.5 py-0.5 text-xs text-blue-300">{grupos.length}</span>
            )}
            {t.value === "finalizados" && finalizadosCargados && finalizados.length > 0 && (
              <span className="ml-2 rounded-full bg-green-600/30 px-1.5 py-0.5 text-xs text-green-300">{finalizados.length}</span>
            )}
          </button>
        ))}
      </div>

      {apiError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Error al cargar cobros: {apiError}
        </div>
      )}

      {/* ── Tab Pendientes ── */}
      {!loading && tab === "pendientes" && (
        grupos.length === 0 ? (
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-10 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-400 font-medium">Sin cuotas pendientes</p>
            <p className="text-xs text-gray-600 mt-1">Todos los préstamos están al día.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grupos.map(g => {
              const tieneVencidas = g.cuotasAbiertas.some(c => clasificar(c) === "vencida");
              const montoAbierto  = g.cuotasAbiertas.reduce((a, c) => a + c.monto, 0);
              return (
                <div
                  key={g.prestamo_id}
                  className={`rounded-xl border bg-gray-800 overflow-hidden ${
                    tieneVencidas ? "border-orange-500/40" : "border-gray-700"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white">{g.usuario?.nombre ?? "—"}</p>
                        {tieneVencidas && (
                          <span className="rounded-full border border-orange-500/30 bg-orange-500/20 px-2 py-0.5 text-xs text-orange-300">
                            ⚠ Vencida
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{g.usuario?.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => abrirEliminar(g)}
                        title="Archivar préstamo"
                        className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition"
                      >
                        <TrashIcon />
                      </button>
                      <button
                        onClick={() => abrirModal(g)}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                      >
                        💰 Registrar pago
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 divide-x divide-gray-700 border-t border-gray-700 text-center">
                    <div className="px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Capital</p>
                      <p className="mt-0.5 text-sm font-semibold text-white">{formatearPesos(g.prestamo.capital_original)}</p>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Saldo</p>
                      <p className="mt-0.5 text-sm font-semibold text-blue-400">{formatearPesos(g.prestamo.saldo_remanente)}</p>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Cuotas</p>
                      <p className="mt-0.5 text-sm font-semibold text-white">{g.prestamo.cuotas_pagadas}/{g.prestamo.cuotas_total}</p>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Pendiente</p>
                      <p className={`mt-0.5 text-sm font-semibold ${tieneVencidas ? "text-orange-400" : "text-yellow-400"}`}>
                        {formatearPesos(montoAbierto)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {loading && tab !== "finalizados" && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-800" />)}
        </div>
      )}

      {/* ── Tab Historial ── */}
      {!loading && tab === "historial" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {FILTROS_HIST.map(f => {
              const count = f.value === "todas"   ? cuotas.length
                : f.value === "vencida" ? vencidas.length
                : cuotas.filter(c => c.estado === f.value).length;
              return (
                <button
                  key={f.value}
                  onClick={() => setFiltroHist(f.value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    filtroHist === f.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
                  }`}
                >
                  {f.label}
                  <span className="ml-1.5 text-xs opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Cuota</th>
                  <th className="px-5 py-3">Monto</th>
                  <th className="px-5 py-3">Vencimiento</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {histFiltradas.map(c => {
                  const est = clasificar(c);
                  return (
                    <tr key={c.id} className={`transition ${est === "vencida" ? "bg-red-500/5" : "hover:bg-gray-700/50"}`}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-white">{c.usuarios?.nombre ?? "—"}</p>
                        <p className="text-xs text-gray-500">{c.usuarios?.email}</p>
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-400">#{c.numero_cuota}</td>
                      <td className="px-5 py-3 font-semibold text-white">{formatearPesos(c.monto)}</td>
                      <td className={`px-5 py-3 ${est === "vencida" ? "font-semibold text-red-400" : "text-gray-400"}`}>
                        {format(parseFecha(c.fecha_vencimiento), "d MMM yyyy", { locale: es })}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[est] ?? BADGE.pendiente}`}>
                          {est}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400 capitalize">
                        {c.metodo_pago ?? (c.bind_operacion_id ? "DEBIN" : "—")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {histFiltradas.length === 0 && (
              <p className="p-8 text-center text-gray-500">No hay cuotas con ese filtro.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Finalizados ── */}
      {tab === "finalizados" && (
        loadingFin ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-800" />)}
          </div>
        ) : finalizados.length === 0 ? (
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-10 text-center">
            <p className="text-4xl mb-3">🏁</p>
            <p className="text-gray-400 font-medium">Sin préstamos finalizados</p>
            <p className="text-xs text-gray-600 mt-1">Los préstamos completamente pagados aparecen aquí.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {finalizados.map(p => (
              <div key={p.id} className="rounded-xl border border-green-500/20 bg-gray-800 overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{p.usuario?.nombre ?? "—"}</p>
                    <p className="text-xs text-gray-500">{p.usuario?.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-green-500/30 bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">
                    ✓ Completado
                  </span>
                </div>
                <div className="grid grid-cols-4 divide-x divide-gray-700 border-t border-gray-700 text-center">
                  <div className="px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Capital</p>
                    <p className="mt-0.5 text-sm font-semibold text-white">{formatearPesos(p.capital_original)}</p>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Cuotas</p>
                    <p className="mt-0.5 text-sm font-semibold text-green-400">{p.cuotas_pagadas}/{p.cuotas_total}</p>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Saldo final</p>
                    <p className="mt-0.5 text-sm font-semibold text-white">{formatearPesos(p.saldo_remanente)}</p>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Fecha</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-400">
                      {format(new Date(p.created_at), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Modal Registrar pago ── */}
      {modalGrupo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={e => { if (e.target === e.currentTarget && !guardando) setModalGrupo(null); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden">

            {exito ? (
              <div className="p-10 text-center">
                <div className="text-5xl mb-3">✅</div>
                <h2 className="text-lg font-bold text-white">¡Pago registrado!</h2>
                <p className="mt-1 text-sm text-gray-400">
                  {selectedIds.size} cuota{selectedIds.size !== 1 ? "s" : ""} marcada{selectedIds.size !== 1 ? "s" : ""} como pagada{selectedIds.size !== 1 ? "s" : ""}.
                </p>
              </div>
            ) : (
              <>
                {/* Header modal */}
                <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
                  <div>
                    <h2 className="font-semibold text-white">Registrar pago</h2>
                    <p className="text-xs text-gray-400">{modalGrupo.usuario?.nombre}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">Paso {modalPaso}/2</span>
                    <button
                      onClick={() => !guardando && setModalGrupo(null)}
                      className="text-gray-500 hover:text-white text-xl leading-none transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Paso 1: selección */}
                {modalPaso === 1 && (
                  <div className="p-6 space-y-4">
                    <p className="text-sm font-medium text-gray-300">Seleccioná las cuotas a registrar</p>

                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {modalGrupo.cuotasAbiertas.map(c => {
                        const est = clasificar(c);
                        const checked = selectedIds.has(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                              checked ? "border-emerald-500/50 bg-emerald-900/10" : "border-gray-700 hover:border-gray-600"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCuota(c)}
                              className="h-4 w-4 accent-emerald-500 shrink-0"
                            />
                            <span className="text-sm text-white flex-1">
                              Cuota #{c.numero_cuota}
                              <span className="ml-2 text-xs text-gray-500">
                                {format(parseFecha(c.fecha_vencimiento), "d MMM", { locale: es })}
                              </span>
                            </span>
                            <span className={`text-xs rounded-full px-2 py-0.5 ${BADGE[est] ?? BADGE.pendiente}`}>{est}</span>
                            <span className="text-sm font-semibold text-white shrink-0">{formatearPesos(c.monto)}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Monto */}
                    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Total seleccionado</span>
                        <span className="font-semibold text-white">{formatearPesos(montoSeleccionado)}</span>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">Monto recibido (editable)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400">$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={parseInt(montoRcbStr || "0").toLocaleString("es-AR")}
                            onChange={e => setMontoRcbStr(e.target.value.replace(/\D/g, "") || "0")}
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 py-2 pl-8 pr-3 text-sm font-semibold text-white outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setModalPaso(2)}
                      disabled={selectedIds.size === 0}
                      className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}

                {/* Paso 2: método */}
                {modalPaso === 2 && (
                  <div className="p-6 space-y-4">
                    <p className="text-sm font-medium text-gray-300">Método de cobro</p>

                    <div className="grid grid-cols-2 gap-2">
                      {METODOS.map(m => (
                        <button
                          key={m.value}
                          onClick={() => setMetodoPago(m.value)}
                          className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition ${
                            metodoPago === m.value
                              ? "border-emerald-500 bg-emerald-900/20 text-white"
                              : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
                          }`}
                        >
                          <span>{m.icon}</span> {m.label}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm text-gray-400">Comprobante / referencia <span className="text-gray-600">(opcional)</span></label>
                      <input
                        type="text"
                        value={comprobante}
                        onChange={e => setComprobante(e.target.value)}
                        placeholder="Nº de comprobante, referencia, etc."
                        className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Resumen */}
                    <div className="rounded-lg bg-gray-800 p-3 text-xs text-gray-400 space-y-1.5">
                      <div className="flex justify-between">
                        <span>Cuotas a marcar</span>
                        <span className="font-semibold text-white">{selectedIds.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monto recibido</span>
                        <span className="font-semibold text-emerald-400">{formatearPesos(parseInt(montoRcbStr) || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Método</span>
                        <span className="font-semibold text-white capitalize">{metodoPago || "—"}</span>
                      </div>
                    </div>

                    {errorModal && (
                      <p className="rounded-lg bg-red-900/20 p-3 text-sm text-red-400">{errorModal}</p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => setModalPaso(1)}
                        disabled={guardando}
                        className="flex-1 rounded-xl border border-gray-700 py-3 text-sm font-medium text-gray-400 hover:bg-gray-800 disabled:opacity-50 transition"
                      >
                        ← Atrás
                      </button>
                      <button
                        onClick={confirmarPago}
                        disabled={!metodoPago || guardando}
                        className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                      >
                        {guardando ? "Registrando..." : "Confirmar pago"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Eliminar préstamo ── */}
      {eliminarGrupo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={e => { if (e.target === e.currentTarget && !eliminando) setEliminarGrupo(null); }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                <TrashIcon className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Archivar préstamo</h2>
                <p className="text-xs text-gray-400">{eliminarGrupo.usuario?.nombre}</p>
              </div>
            </div>

            <p className="text-sm text-gray-400">
              Este préstamo será archivado y dejará de aparecer en cobros activos. No se envía notificación al cliente.
            </p>

            <div>
              <label className="mb-1 block text-xs text-gray-500">Motivo (opcional)</label>
              <input
                type="text"
                value={motivoEliminar}
                onChange={e => setMotivoEliminar(e.target.value)}
                placeholder="Ej: Crédito saldado, acuerdo extrajudicial..."
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500"
              />
            </div>

            {errorEliminar && (
              <p className="rounded-lg bg-red-900/20 p-3 text-sm text-red-400">{errorEliminar}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEliminarGrupo(null)}
                disabled={eliminando}
                className="flex-1 rounded-xl border border-gray-700 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 disabled:opacity-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                disabled={eliminando}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
              >
                {eliminando ? "Archivando..." : "Archivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
