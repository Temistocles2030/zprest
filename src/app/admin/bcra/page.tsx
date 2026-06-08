"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthToken } from "@/lib/supabase/getToken";
import { BCRA_SITUACIONES, formatARS } from "@/lib/constants";

interface BCRAExcepcion {
  id: string;
  cuil: string;
  motivo: string | null;
  created_at: string;
  usuarios: { nombre: string | null; email: string } | null;
}

interface BCRAResultData {
  denominacion: string;
  identificacion: number;
  periodos: Array<{
    periodo: string;
    entidades: Array<{
      entidad: string;
      situacion: number;
      monto: number;
      diasAtrasoPago: number;
    }>;
  }>;
}

export default function AdminBCRAPage() {
  const [identificacion, setIdentificacion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BCRAResultData | null>(null);
  const [noData, setNoData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Excepciones BCRA ──────────────────────────────────────────────────────
  const [excepciones, setExcepciones] = useState<BCRAExcepcion[]>([]);
  const [excLoading, setExcLoading] = useState(true);
  const [nuevoCuil, setNuevoCuil] = useState("");
  const [nuevoMotivo, setNuevoMotivo] = useState("");
  const [excGuardando, setExcGuardando] = useState(false);
  const [excError, setExcError] = useState<string | null>(null);

  const cargarExcepciones = useCallback(async () => {
    setExcLoading(true);
    const token = await getAuthToken();
    if (!token) { setExcLoading(false); return; }
    const res = await fetch("/api/admin/bcra/excepciones", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const json = await res.json();
      setExcepciones(json.excepciones ?? []);
    }
    setExcLoading(false);
  }, []);

  useEffect(() => { cargarExcepciones(); }, [cargarExcepciones]);

  const agregarExcepcion = async () => {
    const cuilLimpio = nuevoCuil.replace(/\D/g, "");
    if (!/^\d{11}$/.test(cuilLimpio)) { setExcError("CUIL/CUIT inválido (11 dígitos)"); return; }
    setExcGuardando(true);
    setExcError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/admin/bcra/excepciones", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cuil: cuilLimpio, motivo: nuevoMotivo.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      setNuevoCuil("");
      setNuevoMotivo("");
      await cargarExcepciones();
    } catch (e) {
      setExcError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setExcGuardando(false);
    }
  };

  const quitarExcepcion = async (cuil: string) => {
    if (!confirm(`¿Quitar la excepción BCRA para CUIL ${cuil}? El cliente volverá a quedar sujeto al filtro normal.`)) return;
    const token = await getAuthToken();
    const res = await fetch("/api/admin/bcra/excepciones", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cuil }),
    });
    if (res.ok) await cargarExcepciones();
  };

  const handleSearch = async () => {
    if (!identificacion.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setNoData(false);

    try {
      const res = await fetch(`/api/bcra/deudas/${identificacion.replace(/\D/g, "")}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (!data.results) {
        setNoData(true);
      } else {
        setResult(data.results);
      }
    } catch {
      setError("Error al consultar la API del BCRA");
    } finally {
      setLoading(false);
    }
  };

  const worstSituacion =
    result?.periodos?.[0]?.entidades?.length
      ? Math.max(...result.periodos[0].entidades.map((e) => e.situacion))
      : null;

  const sitInfo = worstSituacion ? BCRA_SITUACIONES[worstSituacion as keyof typeof BCRA_SITUACIONES] : null;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Consulta BCRA</h1>
        <p className="mt-1 text-sm text-gray-400">Central de Deudores del Sistema Financiero</p>
      </div>

      {/* Formulario */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-300">Buscar por CUIL / CUIT / DNI</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Ej: 20270338411"
            value={identificacion}
            onChange={(e) => setIdentificacion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !identificacion.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <span>🔍</span>
            )}
            Consultar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-700 bg-red-900/30 p-4 text-sm text-red-400">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Sin deudas */}
      {noData && (
        <div className="rounded-xl border border-green-700 bg-green-900/30 p-6 text-center">
          <p className="text-2xl">✅</p>
          <p className="mt-2 font-semibold text-green-400">Sin deudas registradas</p>
          <p className="text-sm text-green-500">El cliente no tiene antecedentes en el sistema financiero</p>
          <p className="mt-1 text-sm font-medium text-green-300">Pre-aprobado para crédito Zprest</p>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="space-y-4">
          {/* Cabecera persona */}
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-900/40 text-xl">
                👤
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">{result.denominacion || "Sin datos"}</p>
                <p className="text-sm text-gray-400">ID: {result.identificacion}</p>
              </div>
              {worstSituacion !== null && sitInfo && (
                <div className="text-right">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-xl font-bold ${
                      worstSituacion <= 2
                        ? "border-green-500 bg-green-900/30 text-green-400"
                        : worstSituacion <= 3
                        ? "border-orange-500 bg-orange-900/30 text-orange-400"
                        : "border-red-500 bg-red-900/30 text-red-400"
                    }`}
                  >
                    {worstSituacion}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{sitInfo.label}</p>
                </div>
              )}
            </div>
          </div>

          {/* Badge pre-aprobación */}
          {worstSituacion !== null && (
            <div
              className={`flex items-center gap-3 rounded-xl border-2 p-4 ${
                worstSituacion <= 2
                  ? "border-green-700 bg-green-900/20"
                  : "border-red-700 bg-red-900/20"
              }`}
            >
              <span className="text-xl">{worstSituacion <= 2 ? "✅" : "❌"}</span>
              <div>
                <p className={`font-semibold ${worstSituacion <= 2 ? "text-green-400" : "text-red-400"}`}>
                  {worstSituacion <= 2 ? "Pre-aprobado para crédito Zprest" : "No apto para crédito Zprest"}
                </p>
                <p className="text-sm text-gray-400">
                  {worstSituacion <= 2
                    ? "El perfil crediticio cumple con los requisitos mínimos."
                    : `Situación ${worstSituacion}: ${sitInfo?.description || ""}`}
                </p>
              </div>
            </div>
          )}

          {/* Detalle por entidad */}
          {result.periodos?.[0]?.entidades?.length > 0 && (
            <div className="rounded-xl border border-gray-700 bg-gray-800">
              <div className="border-b border-gray-700 px-5 py-3">
                <h2 className="text-sm font-semibold text-gray-300">
                  Detalle por Entidad — Período {result.periodos[0].periodo}
                </h2>
              </div>
              <div className="divide-y divide-gray-700 p-4 space-y-0">
                {result.periodos[0].entidades.map((entidad, i) => {
                  const info = BCRA_SITUACIONES[entidad.situacion as keyof typeof BCRA_SITUACIONES];
                  return (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{entidad.entidad}</p>
                        <p className="text-xs text-gray-400">
                          Monto: {formatARS(entidad.monto * 1000)}
                          {entidad.diasAtrasoPago > 0 && ` · ${entidad.diasAtrasoPago} días de atraso`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${info?.color || "text-gray-400"}`}>
                          {entidad.situacion}
                        </p>
                        <p className="text-xs text-gray-400">{info?.label || "—"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Excepciones BCRA */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
        <h2 className="text-sm font-semibold text-gray-300">Excepciones BCRA</h2>
        <p className="mt-1 text-xs text-gray-400">
          Por elección del admin, un CUIL/CUIT acá cargado podrá registrarse y solicitar crédito
          aunque su situación BCRA sea 3 o superior — el filtro automático se omite solo para esos CUILs.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="CUIL/CUIT (11 dígitos)"
            value={nuevoCuil}
            onChange={(e) => setNuevoCuil(e.target.value)}
            className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-48"
          />
          <input
            type="text"
            placeholder="Motivo (opcional)"
            value={nuevoMotivo}
            onChange={(e) => setNuevoMotivo(e.target.value)}
            className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={agregarExcepcion}
            disabled={excGuardando || !nuevoCuil.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {excGuardando ? "Guardando..." : "+ Agregar excepción"}
          </button>
        </div>
        {excError && <p className="mt-2 text-sm text-red-400">{excError}</p>}

        <div className="mt-5 divide-y divide-gray-700">
          {excLoading && <p className="py-3 text-sm text-gray-400">Cargando excepciones...</p>}
          {!excLoading && excepciones.length === 0 && (
            <p className="py-3 text-sm text-gray-500">No hay excepciones cargadas.</p>
          )}
          {!excLoading && excepciones.map((exc) => (
            <div key={exc.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-mono text-sm font-semibold text-white">{exc.cuil}</p>
                <p className="text-xs text-gray-400">
                  {exc.motivo || "Sin motivo especificado"}
                  {exc.usuarios?.nombre ? ` · autorizado por ${exc.usuarios.nombre}` : ""}
                </p>
                <p className="text-xs text-gray-500">{new Date(exc.created_at).toLocaleDateString("es-AR")}</p>
              </div>
              <button
                onClick={() => quitarExcepcion(exc.cuil)}
                className="rounded-lg border border-red-700 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
