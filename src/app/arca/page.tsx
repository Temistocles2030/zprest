"use client";

import { useState } from "react";
import Link from "next/link";
import type { AFIPPersona } from "@/lib/afip/padron";

export default function ARCAPage() {
  const [cuit, setCuit] = useState("");
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState<AFIPPersona | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const clean = cuit.replace(/\D/g, "");
    if (clean.length !== 11) {
      setError("El CUIL/CUIT debe tener 11 dígitos");
      return;
    }
    setLoading(true);
    setError(null);
    setPersona(null);
    try {
      const res = await fetch(`/api/afip/padron/${clean}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setPersona(data.persona);
    } catch {
      setError("Error al consultar el padrón ARCA. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const descargarPDF = () => {
    if (!persona) return;
    const nombre = persona.denominacion || [persona.apellido, persona.nombre].filter(Boolean).join(" ") || persona.razonSocial || "—";
    const domicilio = [
      persona.domicilioFiscal?.direccion,
      persona.domicilioFiscal?.localidad,
      persona.domicilioFiscal?.provincia,
      persona.domicilioFiscal?.codigoPostal,
    ].filter(Boolean).join(", ") || "—";
    const fecha = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Constancia ARCA — ${persona.idPersona}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #1a1a2e; background: white; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a3a6e; padding-bottom: 20px; margin-bottom: 30px; }
    .brand { font-size: 22px; font-weight: bold; color: #1a3a6e; letter-spacing: 2px; }
    .brand-sub { font-size: 11px; color: #666; margin-top: 2px; }
    .fecha { font-size: 12px; color: #666; text-align: right; }
    .titulo { font-size: 18px; font-weight: bold; color: #1a3a6e; margin-bottom: 24px; }
    .estado { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-bottom: 24px; }
    .activo { background: #dcfce7; color: #16a34a; border: 1px solid #86efac; }
    .inactivo { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .campo label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 3px; }
    .campo p { font-size: 14px; color: #1a1a2e; font-weight: 500; }
    .campo-full { grid-column: 1 / -1; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 14px; font-size: 11px; color: #aaa; text-align: center; margin-top: 30px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">ZPREST</div>
      <div class="brand-sub">IS45.123 — zprest.com.ar</div>
    </div>
    <div class="fecha">
      <strong>Consulta ARCA</strong><br/>
      Fecha: ${fecha}
    </div>
  </div>
  <div class="titulo">Constancia de Consulta al Padrón de Contribuyentes</div>
  <span class="estado ${persona.estadoClave === "ACTIVO" ? "activo" : "inactivo"}">${persona.estadoClave}</span>
  <div class="grid">
    <div class="campo campo-full">
      <label>Nombre / Razón Social</label>
      <p style="font-size:17px;font-weight:bold">${nombre}</p>
    </div>
    <div class="campo">
      <label>CUIT / CUIL</label>
      <p>${persona.idPersona}</p>
    </div>
    <div class="campo">
      <label>Tipo de Persona</label>
      <p>${persona.tipoPersona}</p>
    </div>
    ${persona.tipoDocumento && persona.numeroDocumento ? `
    <div class="campo">
      <label>${persona.tipoDocumento}</label>
      <p>${persona.numeroDocumento}</p>
    </div>` : ""}
    ${persona.fechaNacimiento ? `
    <div class="campo">
      <label>Fecha de Nacimiento</label>
      <p>${persona.fechaNacimiento}</p>
    </div>` : ""}
    <div class="campo campo-full">
      <label>Domicilio Fiscal</label>
      <p>${domicilio}</p>
    </div>
  </div>
  <div class="footer">
    Consulta realizada a través del servicio ws_sr_padron_a13 de ARCA (ex AFIP) · ${fecha} · zprest.com.ar
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  };

  const isActivo = persona?.estadoClave === "ACTIVO";

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Nav mínima */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link href="/" className="font-bold tracking-widest text-white text-lg">ZPREST</Link>
        <Link href="/login" className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-700 transition">
          Ingresar
        </Link>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-900/40 border border-blue-700/40 px-4 py-1.5 text-sm text-blue-300 mb-4">
            <span>🏛️</span> Servicio público · Sin registro requerido
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Consulta ARCA</h1>
          <p className="text-gray-400 text-sm">
            Consultá los datos de cualquier contribuyente en el padrón de ARCA (ex AFIP) ingresando su CUIL o CUIT.
          </p>
        </div>

        {/* Buscador */}
        <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">CUIL / CUIT (11 dígitos)</label>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Ej: 20-27033841-1"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !cuit.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading
                ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <span>🔍</span>}
              Consultar
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-700 bg-red-900/20 p-4 text-sm text-red-400 mb-6">
            <span className="mt-0.5">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {/* Resultado */}
        {persona && (
          <div className="space-y-4">
            {/* Card principal */}
            <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-xl font-bold text-white">
                    {persona.denominacion || [persona.apellido, persona.nombre].filter(Boolean).join(" ") || persona.razonSocial || "—"}
                  </p>
                  <p className="text-sm text-gray-400 mt-0.5">CUIT/CUIL: {persona.idPersona}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  isActivo
                    ? "bg-green-900/40 text-green-400 border border-green-700"
                    : "bg-red-900/40 text-red-400 border border-red-700"
                }`}>
                  {persona.estadoClave}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tipo de Persona</p>
                  <p className="text-white font-medium">{persona.tipoPersona}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tipo de Clave</p>
                  <p className="text-white font-medium">{persona.tipoClave}</p>
                </div>
                {persona.tipoDocumento && persona.numeroDocumento && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{persona.tipoDocumento}</p>
                    <p className="text-white font-medium">{persona.numeroDocumento}</p>
                  </div>
                )}
                {persona.fechaNacimiento && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fecha de Nacimiento</p>
                    <p className="text-white font-medium">{persona.fechaNacimiento}</p>
                  </div>
                )}
                {(persona.domicilioFiscal?.direccion || persona.domicilioFiscal?.localidad) && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Domicilio Fiscal</p>
                    <p className="text-white font-medium">
                      {[
                        persona.domicilioFiscal.direccion,
                        persona.domicilioFiscal.localidad,
                        persona.domicilioFiscal.provincia,
                        persona.domicilioFiscal.codigoPostal,
                      ].filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Botón PDF */}
            <button
              onClick={descargarPDF}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-blue-700 bg-blue-900/30 px-6 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-900/50 transition"
            >
              <span>📄</span> Descargar constancia en PDF
            </button>

            <p className="text-center text-xs text-gray-600">
              Datos provistos por ARCA (ex AFIP) · ws_sr_padron_a13
            </p>
          </div>
        )}
      </main>

      {/* Footer mínimo */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-gray-600 mt-12">
        © {new Date().getFullYear()} Zprest · IS45.123 ·{" "}
        <Link href="/" className="hover:text-gray-400 transition">Volver al inicio</Link>
      </footer>
    </div>
  );
}
