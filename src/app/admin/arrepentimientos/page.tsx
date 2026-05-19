"use client";

import { useEffect, useState, useCallback } from "react";
import { getAuthToken } from "@/lib/supabase/getToken";

type Arrepentimiento = {
  id: string;
  prestamo_id: string;
  estado: "pendiente" | "resuelto" | "rechazado";
  motivo: string | null;
  notas_admin: string | null;
  created_at: string;
  resuelto_at: string | null;
  usuarios: { id: string; nombre: string; email: string; dni: string | null; telefono: string | null } | null;
  prestamos: { id: string; capital_original: number; created_at: string } | null;
};

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  resuelto: "bg-green-500/20 text-green-300 border border-green-500/30",
  rechazado: "bg-red-500/20 text-red-300 border border-red-500/30",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  resuelto: "Resuelto",
  rechazado: "Rechazado",
};

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const getToken = getAuthToken;

export default function ArrepentimientosPage() {
  const [lista, setLista] = useState<Arrepentimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | "pendiente" | "resuelto" | "rechazado">("todos");
  const [modal, setModal] = useState<Arrepentimiento | null>(null);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/arrepentimientos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLista(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const resolver = async (estado: "resuelto" | "rechazado") => {
    if (!modal) return;
    const token = await getToken();
    if (!token) return;
    setSaving(true);
    try {
      await fetch("/api/admin/arrepentimientos", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: modal.id, estado, notas_admin: notas }),
      });
      setModal(null);
      setNotas("");
      cargar();
    } finally {
      setSaving(false);
    }
  };

  const filtrados = lista.filter((a) => filtro === "todos" || a.estado === filtro);
  const cuentas = {
    pendiente: lista.filter((a) => a.estado === "pendiente").length,
    resuelto: lista.filter((a) => a.estado === "resuelto").length,
    rechazado: lista.filter((a) => a.estado === "rechazado").length,
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Arrepentimientos</h1>
          <p className="mt-1 text-sm text-gray-400">Clientes que ejercieron el derecho de arrepentimiento (Art. 34, Ley 24.240)</p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
            <p className="text-2xl font-bold text-yellow-300">{cuentas.pendiente}</p>
            <p className="text-sm text-gray-400">Pendientes</p>
          </div>
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-2xl font-bold text-green-300">{cuentas.resuelto}</p>
            <p className="text-sm text-gray-400">Resueltos</p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-2xl font-bold text-red-300">{cuentas.rechazado}</p>
            <p className="text-sm text-gray-400">Rechazados</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-4 flex gap-2">
          {(["todos", "pendiente", "resuelto", "rechazado"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                filtro === f
                  ? "bg-[#d4af37] text-black"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {f === "todos" ? `Todos (${lista.length})` : `${ESTADO_LABEL[f]} (${cuentas[f]})`}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1326]">
          {loading ? (
            <div className="py-16 text-center text-gray-400">Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div className="py-16 text-center text-gray-400">No hay arrepentimientos en esta categoría</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Monto</th>
                  <th className="px-4 py-3 text-left">Fecha préstamo</th>
                  <th className="px-4 py-3 text-left">Fecha solicitud</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtrados.map((a) => (
                  <tr key={a.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">
                        {a.usuarios?.nombre}
                      </p>
                      <p className="text-xs text-gray-400">{a.usuarios?.email}</p>
                      {a.usuarios?.dni && <p className="text-xs text-gray-500">DNI: {a.usuarios.dni}</p>}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {a.prestamos?.capital_original ? formatARS(a.prestamos.capital_original) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {a.prestamos?.created_at ? formatDate(a.prestamos.created_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(a.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[a.estado]}`}>
                        {ESTADO_LABEL[a.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.estado === "pendiente" && (
                        <button
                          onClick={() => { setModal(a); setNotas(""); }}
                          className="rounded-lg bg-[#d4af37]/10 px-3 py-1 text-xs text-[#d4af37] hover:bg-[#d4af37]/20 transition-colors"
                        >
                          Gestionar
                        </button>
                      )}
                      {a.estado !== "pendiente" && a.notas_admin && (
                        <span className="text-xs text-gray-500 italic">{a.notas_admin.slice(0, 40)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1326] p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-bold">Gestionar arrepentimiento</h2>
            <p className="mb-4 text-sm text-gray-400">
              {modal.usuarios?.nombre} — {modal.usuarios?.email}
            </p>

            <div className="mb-4 rounded-lg bg-white/5 p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Monto del préstamo:</span>
                <span className="font-medium">{modal.prestamos?.capital_original ? formatARS(modal.prestamos.capital_original) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fecha préstamo:</span>
                <span>{modal.prestamos?.created_at ? formatDate(modal.prestamos.created_at) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fecha arrepentimiento:</span>
                <span>{formatDate(modal.created_at)}</span>
              </div>
              {modal.motivo && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <p className="text-gray-400 text-xs">Motivo del cliente:</p>
                  <p className="mt-1 text-white">{modal.motivo}</p>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm text-gray-400">Notas internas (opcional)</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                placeholder="Detalle de la gestión, devolución confirmada, etc."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#d4af37]/50 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => resolver("resuelto")}
                disabled={saving}
                className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
              >
                {saving ? "Guardando..." : "Marcar como resuelto"}
              </button>
              <button
                onClick={() => resolver("rechazado")}
                disabled={saving}
                className="flex-1 rounded-xl bg-red-700 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                Rechazar solicitud
              </button>
            </div>
            <button
              onClick={() => setModal(null)}
              className="mt-3 w-full rounded-xl py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
