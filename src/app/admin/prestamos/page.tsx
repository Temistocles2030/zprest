"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAuthToken } from "@/lib/supabase/getToken";
import { formatearPesos } from "@/lib/loan-calculator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Prestamo } from "@/types";

type PrestamoConCliente = Prestamo & {
  usuarios: { nombre: string | null; email: string } | null;
  eliminado_at?: string | null;
};

const BADGE: Record<string, string> = {
  activo:     "bg-green-500/20 text-green-300 border border-green-500/30",
  vencida:    "bg-red-500/20 text-red-300 border border-red-500/30",
  completado: "bg-gray-500/20 text-gray-300 border border-gray-500/30",
};

export default function PrestamosAdminPage() {
  const [tab, setTab]             = useState<"activos" | "papelera">("activos");
  const [prestamos, setPrestamos] = useState<PrestamoConCliente[]>([]);
  const [papelera, setPapelera]   = useState<PrestamoConCliente[]>([]);
  const [loading, setLoading]     = useState(true);

  // modal eliminar (soft)
  const [modalEliminar, setModalEliminar]   = useState<PrestamoConCliente | null>(null);
  const [motivoEliminar, setMotivoEliminar] = useState("");
  const [guardando, setGuardando]           = useState(false);

  // modal eliminar definitivo
  const [modalDefinitivo, setModalDefinitivo] = useState<PrestamoConCliente | null>(null);
  const [guardandoDefin, setGuardandoDefin]   = useState(false);

  const fetchPrestamos = useCallback(async () => {
    setLoading(true);
    const token = await getAuthToken();
    if (!token) { setLoading(false); return; }

    const headers = { Authorization: `Bearer ${token}` };

    const [resActivos, resPapelera] = await Promise.all([
      fetch("/api/admin/prestamos", { headers }),
      fetch("/api/admin/prestamos?papelera=true", { headers }),
    ]);

    if (resActivos.ok)  setPrestamos((await resActivos.json()).prestamos ?? []);
    if (resPapelera.ok) setPapelera((await resPapelera.json()).prestamos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPrestamos(); }, [fetchPrestamos]);

  async function getToken() {
    return await getAuthToken() ?? "";
  }

  async function handleEliminar() {
    if (!modalEliminar) return;
    setGuardando(true);
    const token = await getToken();
    const res = await fetch(`/api/admin/prestamos/${modalEliminar.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "eliminar", motivo: motivoEliminar || undefined }),
    });
    if (res.ok) {
      setModalEliminar(null);
      setMotivoEliminar("");
      fetchPrestamos();
    }
    setGuardando(false);
  }

  async function handleEliminarDefinitivo() {
    if (!modalDefinitivo) return;
    setGuardandoDefin(true);
    const token = await getToken();
    await fetch(`/api/admin/prestamos/${modalDefinitivo.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setModalDefinitivo(null);
    fetchPrestamos();
    setGuardandoDefin(false);
  }

  async function handleRestaurar(p: PrestamoConCliente) {
    const token = await getToken();
    await fetch(`/api/admin/prestamos/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "restaurar" }),
    });
    fetchPrestamos();
  }

  const hoy = new Date();
  const totalCapital   = prestamos.reduce((a, p) => a + p.capital_original, 0);
  const totalRemanente = prestamos.reduce((a, p) => a + p.saldo_remanente, 0);
  const totalCobrado   = totalCapital - totalRemanente;

  const lista = tab === "activos" ? prestamos : papelera;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Préstamos</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          {prestamos.length} crédito{prestamos.length !== 1 ? "s" : ""} activo{prestamos.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stats — solo activos */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Capital total",   valor: formatearPesos(totalCapital),   color: "text-white" },
          { label: "Remanente total", valor: formatearPesos(totalRemanente), color: "text-blue-400" },
          { label: "Cobrado total",   valor: formatearPesos(totalCobrado),   color: "text-green-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`mt-1 text-lg font-bold ${s.color}`}>{s.valor}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700">
        <button
          onClick={() => setTab("activos")}
          className={`px-4 py-2 text-sm font-medium transition ${tab === "activos" ? "border-b-2 border-blue-500 text-white" : "text-gray-400 hover:text-white"}`}
        >
          Activos ({prestamos.length})
        </button>
        <button
          onClick={() => setTab("papelera")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition ${tab === "papelera" ? "border-b-2 border-red-500 text-white" : "text-gray-400 hover:text-white"}`}
        >
          🗑 Papelera {papelera.length > 0 && <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">{papelera.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-800" />)}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Capital</th>
                <th className="px-5 py-3">Cuotas</th>
                <th className="px-5 py-3">Remanente</th>
                <th className="px-5 py-3">{tab === "papelera" ? "Eliminado" : "Próx. vto."}</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {lista.map((p) => {
                const completado = p.cuotas_pagadas >= p.cuotas_total;
                const atrasado   = !completado && p.proximo_vencimiento && new Date(p.proximo_vencimiento) < hoy;
                const estado     = completado ? "completado" : atrasado ? "vencida" : "activo";
                return (
                  <tr key={p.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-5 py-3">
                      <p className="font-medium text-white">{p.usuarios?.nombre ?? "—"}</p>
                      <p className="text-xs text-gray-500">{p.usuarios?.email}</p>
                    </td>
                    <td className="px-5 py-3 font-semibold text-white">{formatearPesos(p.capital_original)}</td>
                    <td className="px-5 py-3 text-gray-400">{p.cuotas_pagadas}/{p.cuotas_total}</td>
                    <td className="px-5 py-3 text-gray-300">{formatearPesos(p.saldo_remanente)}</td>
                    <td className={`px-5 py-3 text-sm ${atrasado ? "font-semibold text-red-400" : "text-gray-400"}`}>
                      {tab === "papelera"
                        ? (p.eliminado_at ? format(new Date(p.eliminado_at), "d MMM yyyy", { locale: es }) : "—")
                        : (p.proximo_vencimiento ? format(new Date(p.proximo_vencimiento), "d MMM yyyy", { locale: es }) : "—")}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[estado]}`}>
                        {estado}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/solicitudes/${p.solicitud_id}`}
                          className="rounded-lg bg-gray-700 px-2.5 py-1 text-xs text-gray-300 hover:bg-blue-600 hover:text-white transition"
                        >
                          Ver solicitud
                        </Link>
                        {tab === "activos" ? (
                          <button
                            onClick={() => { setModalEliminar(p); setMotivoEliminar(""); }}
                            title="Eliminar préstamo"
                            className="rounded-lg bg-gray-700 px-2.5 py-1 text-xs text-yellow-400 hover:bg-red-600 hover:text-white transition flex items-center gap-1"
                          >
                            <span>Eliminar</span>
                            <span>🗑</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestaurar(p)}
                              title="Restaurar préstamo"
                              className="rounded-lg bg-gray-700 px-2.5 py-1 text-xs text-green-400 hover:bg-green-700 hover:text-white transition"
                            >
                              ↩ Restaurar
                            </button>
                            <button
                              onClick={() => setModalDefinitivo(p)}
                              title="Eliminar definitivamente"
                              className="rounded-lg bg-gray-700 px-2.5 py-1 text-xs text-red-400 hover:bg-red-700 hover:text-white transition"
                            >
                              🗑 Definitivo
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {lista.length === 0 && (
            <p className="p-8 text-center text-gray-500">
              {tab === "papelera" ? "La papelera está vacía." : "No hay préstamos activos."}
            </p>
          )}
        </div>
      )}

      {/* Modal eliminación definitiva */}
      {modalDefinitivo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalDefinitivo(null); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-red-700 bg-gray-900 p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-bold text-red-400">Eliminar definitivamente</h2>
            <p className="mb-4 text-sm text-gray-400">
              {modalDefinitivo.usuarios?.nombre ?? "Cliente"} · {formatearPesos(modalDefinitivo.capital_original)}
            </p>
            <p className="mb-5 text-sm text-red-300 font-medium">
              Esta acción es irreversible. Se borrarán el préstamo y todas sus cuotas permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModalDefinitivo(null)}
                className="flex-1 rounded-xl border border-gray-600 py-2.5 text-sm text-gray-400 hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarDefinitivo}
                disabled={guardandoDefin}
                className="flex-1 rounded-xl bg-red-700 py-2.5 text-sm font-semibold text-white hover:bg-red-800 transition disabled:opacity-60"
              >
                {guardandoDefin ? "Eliminando..." : "Eliminar para siempre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {modalEliminar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalEliminar(null); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-bold text-white">Eliminar préstamo</h2>
            <p className="mb-4 text-sm text-gray-400">
              {modalEliminar.usuarios?.nombre ?? "Cliente"} · {formatearPesos(modalEliminar.capital_original)}
            </p>
            <p className="mb-1 text-xs font-medium text-gray-400">Motivo (opcional)</p>
            <textarea
              value={motivoEliminar}
              onChange={(e) => setMotivoEliminar(e.target.value)}
              rows={3}
              placeholder="Ej: Error en carga, préstamo duplicado..."
              className="w-full rounded-xl border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none mb-5"
            />
            <p className="mb-4 text-xs text-gray-500">El cliente recibirá un email de notificación y el préstamo pasará a la papelera (puede restaurarse).</p>
            <div className="flex gap-3">
              <button
                onClick={() => setModalEliminar(null)}
                className="flex-1 rounded-xl border border-gray-600 py-2.5 text-sm text-gray-400 hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={guardando}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-60"
              >
                {guardando ? "Eliminando..." : "Eliminar préstamo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
