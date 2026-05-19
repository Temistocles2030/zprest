"use client";

import { useState } from "react";
import type { AFIPPersona } from "@/lib/afip/padron";

function InfoField({ label, value, icon }: { label: string; value: string | null | undefined; icon?: string }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-gray-400 flex items-center gap-1">
        {icon && <span>{icon}</span>}
        {label}
      </p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  );
}

export default function AdminAFIPPage() {
  const [cuit, setCuit] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AFIPPersona | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [certStatus, setCertStatus] = useState<Record<string, string> | null>(null);
  const [loadingCert, setLoadingCert] = useState(false);

  const checkCert = async () => {
    setLoadingCert(true);
    try {
      const { data: { session } } = await (await import("@/lib/supabase/client")).createClient().auth.getSession();
      const res = await fetch("/api/admin/afip/status", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      setCertStatus(await res.json());
    } catch {
      setCertStatus({ error: "No se pudo obtener el estado del certificado" });
    } finally {
      setLoadingCert(false);
    }
  };

  const handleSearch = async () => {
    const clean = cuit.replace(/\D/g, "");
    if (clean.length !== 11) {
      setError("El CUIL/CUIT debe tener 11 dígitos");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/afip/padron/${clean}`);
      const data = await res.json();

      if (data.error) {
        if (data.error.includes("AFIP_CERT_BASE64") || data.error.includes("AFIP_KEY_BASE64")) {
          setError("AFIP no está configurado en este entorno. Cargá AFIP_CERT_BASE64, AFIP_KEY_BASE64 y AFIP_CUIT en las variables de entorno de Vercel.");
        } else {
          setError(data.error);
        }
        return;
      }

      setResult(data.persona || null);
    } catch {
      setError("Error al consultar la API de AFIP");
    } finally {
      setLoading(false);
    }
  };

  const isActive = result?.estadoClave === "ACTIVO";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Consulta AFIP</h1>
        <p className="mt-1 text-sm text-gray-400">Padrón de Contribuyentes — ws_sr_padron_a13</p>
      </div>

      {/* Diagnóstico certificado */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">🔐 Estado del certificado AFIP</h2>
          <button
            onClick={checkCert}
            disabled={loadingCert}
            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
          >
            {loadingCert ? "Verificando..." : "Verificar →"}
          </button>
        </div>
        {certStatus && (
          <div className="space-y-1.5 text-xs font-mono">
            {Object.entries(certStatus).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-gray-500 min-w-[180px]">{k}:</span>
                <span className={String(v).startsWith("❌") ? "text-red-400" : String(v).startsWith("✅") ? "text-green-400" : "text-gray-300"}>
                  {String(v)}
                </span>
              </div>
            ))}
          </div>
        )}
        {!certStatus && (
          <p className="text-xs text-gray-500">Hacé click en "Verificar" para ver si el certificado es válido o está vencido.</p>
        )}
      </div>

      {/* Formulario */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-300">Buscar por CUIL / CUIT (11 dígitos)</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Ej: 20270338411"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            maxLength={13}
            className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading || cuit.replace(/\D/g, "").length !== 11}
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

      {/* Resultado */}
      {result && (
        <div className="space-y-4">
          {/* Cabecera */}
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-900/40 text-xl">
                {result.tipoPersona === "FISICA" ? "👤" : "🏢"}
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">{result.denominacion || "Sin datos"}</p>
                <p className="text-sm text-gray-400">
                  {result.tipoClave}: {result.idPersona}
                </p>
              </div>
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    isActive
                      ? "bg-green-900/40 text-green-400 ring-1 ring-green-700"
                      : "bg-red-900/40 text-red-400 ring-1 ring-red-700"
                  }`}
                >
                  {isActive ? "✅" : "❌"} {result.estadoClave}
                </span>
              </div>
            </div>
          </div>

          {/* Datos del contribuyente */}
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-300">Datos del Contribuyente</h2>
            <div className="grid grid-cols-2 gap-4">
              {result.tipoPersona === "FISICA" && (
                <>
                  <InfoField label="Nombre" value={result.nombre} icon="👤" />
                  <InfoField label="Apellido" value={result.apellido} icon="👤" />
                  <InfoField label="Fecha de Nacimiento" value={result.fechaNacimiento} icon="📅" />
                  <InfoField
                    label="Sexo"
                    value={result.sexo ? (result.sexo === "M" ? "Masculino" : "Femenino") : null}
                    icon="👤"
                  />
                </>
              )}
              {result.tipoPersona === "JURIDICA" && (
                <InfoField label="Razón Social" value={result.razonSocial} icon="🏢" />
              )}
              <InfoField label="Tipo Documento" value={result.tipoDocumento} icon="📄" />
              <InfoField label="N° Documento" value={result.numeroDocumento} icon="📄" />
              <InfoField label="Tipo Persona" value={result.tipoPersona} icon="📋" />
              <InfoField label="Tipo Clave" value={result.tipoClave} icon="🔑" />
            </div>
          </div>

          {/* Domicilio fiscal */}
          {result.domicilioFiscal && (
            <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-300">📍 Domicilio Fiscal</h2>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Dirección" value={result.domicilioFiscal.direccion} />
                <InfoField label="Localidad" value={result.domicilioFiscal.localidad} />
                <InfoField label="Provincia" value={result.domicilioFiscal.provincia} />
                <InfoField label="Código Postal" value={result.domicilioFiscal.codigoPostal} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
