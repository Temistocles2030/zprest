"use client";

import { useState, useRef } from "react";
import { getAuthToken } from "@/lib/supabase/getToken";
import * as XLSX from "xlsx";

interface Destinatario {
  nombre: string;
  telefono: string;
}

interface Resultado {
  nombre: string;
  telefono: string;
  ok: boolean;
  respuesta: string;
}

const getToken = getAuthToken;

export default function SMSPage() {

  // Destinatarios
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [nombreManual, setNombreManual] = useState("");
  const [telefonoManual, setTelefonoManual] = useState("");

  // Mensaje
  const [mensaje, setMensaje] = useState("");
  const [repeticiones, setRepeticiones] = useState(1);

  // Gemini
  const [geminiPrompt, setGeminiPrompt] = useState("");
  const [generando, setGenerando] = useState(false);
  const [geminiError, setGeminiError] = useState("");

  // Estado
  const [enviando, setEnviando] = useState(false);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [error, setError] = useState("");

  // Excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelError, setExcelError] = useState("");

  // ── Excel ──────────────────────────────────────────────────────────────
  function handleExcel(e: React.ChangeEvent<HTMLInputElement>) {
    setExcelError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

        if (!rows.length) {
          setExcelError("El archivo está vacío");
          return;
        }

        // Detectar columnas automáticamente (case-insensitive)
        const keys = Object.keys(rows[0]);
        const colNombre = keys.find((k) =>
          /nombre|apellido|name/i.test(k)
        );
        const colTel = keys.find((k) =>
          /tel[eé]fono|telefono|phone|cel[ular]*/i.test(k)
        ) || keys.find((k) => /tel|cel|mov/i.test(k));

        if (!colTel) {
          setExcelError(`No encontré columna de teléfono. Columnas disponibles: ${keys.join(", ")}`);
          return;
        }

        const nuevos: Destinatario[] = rows
          .filter((r) => r[colTel!]?.toString().trim())
          .map((r) => ({
            nombre: colNombre ? `${r[colNombre] || ""}`.trim() : "",
            telefono: r[colTel!].toString().trim(),
          }));

        setDestinatarios((prev) => {
          const existentes = new Set(prev.map((d) => d.telefono));
          const agregados = nuevos.filter((n) => !existentes.has(n.telefono));
          return [...prev, ...agregados];
        });

        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch {
        setExcelError("No se pudo leer el archivo. Usá formato .xlsx o .xls");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ── Manual ─────────────────────────────────────────────────────────────
  function agregarManual() {
    if (!telefonoManual.trim()) return;
    setDestinatarios((prev) => [
      ...prev,
      { nombre: nombreManual.trim(), telefono: telefonoManual.trim() },
    ]);
    setNombreManual("");
    setTelefonoManual("");
  }

  function eliminarDestinatario(i: number) {
    setDestinatarios((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── Gemini ─────────────────────────────────────────────────────────────
  async function generarConGemini() {
    if (!geminiPrompt.trim()) return;
    setGeminiError("");
    setGenerando(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/sms-generar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: geminiPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar");
      setMensaje(data.mensaje);
    } catch (e) {
      setGeminiError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setGenerando(false);
    }
  }

  // ── Enviar ─────────────────────────────────────────────────────────────
  async function enviar() {
    setError("");
    setResultados(null);

    if (!destinatarios.length) { setError("Agregá al menos un destinatario"); return; }
    if (!mensaje.trim()) { setError("Escribí el mensaje"); return; }

    setEnviando(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ destinatarios, mensaje, repeticiones }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar");
      setResultados(data.resultados);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setEnviando(false);
    }
  }

  const exitosos = resultados?.filter((r) => r.ok).length ?? 0;
  const fallidos = resultados ? resultados.length - exitosos : 0;

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">SMS Masivos</h1>
          <p className="mt-1 text-sm text-gray-400">Enviá SMS individuales o masivos desde la cuenta SMSMasivos</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* ── Panel izquierdo: Destinatarios ── */}
          <div className="space-y-4">

            {/* Excel */}
            <div className="rounded-xl border border-white/10 bg-gray-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-300">Importar desde Excel</h2>
              <p className="mb-3 text-xs text-gray-500">
                El archivo debe tener una columna de <strong className="text-gray-400">nombre/apellido</strong> y una de <strong className="text-gray-400">teléfono</strong>.
              </p>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/20 bg-gray-800 px-4 py-3 text-sm text-gray-300 hover:border-blue-500 hover:bg-gray-700 transition">
                <span>📂</span>
                <span>Elegir archivo .xlsx / .xls</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleExcel}
                />
              </label>
              {excelError && <p className="mt-2 text-xs text-red-400">{excelError}</p>}
            </div>

            {/* Manual */}
            <div className="rounded-xl border border-white/10 bg-gray-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-300">Agregar manualmente</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nombre (opcional)"
                  value={nombreManual}
                  onChange={(e) => setNombreManual(e.target.value)}
                  className="w-1/2 rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={telefonoManual}
                  onChange={(e) => setTelefonoManual(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && agregarManual()}
                  className="w-1/2 rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={agregarManual}
                disabled={!telefonoManual.trim()}
                className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition"
              >
                + Agregar
              </button>
            </div>

            {/* Lista destinatarios */}
            {destinatarios.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-gray-900 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-300">
                    Destinatarios <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs">{destinatarios.length}</span>
                  </h2>
                  <button
                    onClick={() => setDestinatarios([])}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Limpiar todo
                  </button>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {destinatarios.map((d, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-1.5 text-xs">
                      <span className="text-gray-300">
                        {d.nombre ? <><strong className="text-white">{d.nombre}</strong> — </> : null}
                        {d.telefono}
                      </span>
                      <button
                        onClick={() => eliminarDestinatario(i)}
                        className="ml-2 text-gray-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Panel derecho: Mensaje y envío ── */}
          <div className="space-y-4">

            {/* Gemini */}
            <div className="rounded-xl border border-purple-500/30 bg-gray-900 p-4">
              <h2 className="mb-1 text-sm font-semibold text-purple-300">✨ Generar mensaje con Gemini</h2>
              <p className="mb-3 text-xs text-gray-500">
                Describí el tema del SMS y Gemini redactará un mensaje cordial para clientes con deuda.
              </p>
              <textarea
                rows={3}
                placeholder="Ej: recordatorio de cuota vencida, ofrecer refinanciación, avisar que hay nuevos planes disponibles..."
                value={geminiPrompt}
                onChange={(e) => setGeminiPrompt(e.target.value)}
                className="w-full resize-none rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
              {geminiError && <p className="mt-1 text-xs text-red-400">{geminiError}</p>}
              <button
                onClick={generarConGemini}
                disabled={generando || !geminiPrompt.trim()}
                className="mt-2 w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40 transition"
              >
                {generando ? "Generando..." : "✨ Generar mensaje"}
              </button>
              {mensaje && (
                <div className="mt-3 rounded-lg border border-purple-500/20 bg-purple-900/20 px-3 py-2 text-xs text-purple-200">
                  <p className="mb-1 font-semibold text-purple-400">Vista previa del mensaje generado:</p>
                  <p className="whitespace-pre-wrap">{mensaje}</p>
                  <p className="mt-1 text-gray-500">Podés editarlo abajo antes de enviar.</p>
                </div>
              )}
            </div>

            {/* Mensaje */}
            <div className="rounded-xl border border-white/10 bg-gray-900 p-4">
              <h2 className="mb-1 text-sm font-semibold text-gray-300">Mensaje</h2>
              <p className="mb-3 text-xs text-gray-500">
                Usá <code className="rounded bg-gray-800 px-1 text-blue-400">{"{nombre}"}</code> para personalizar con el nombre del destinatario.
              </p>
              <textarea
                rows={5}
                maxLength={160}
                placeholder="Ej: Hola {nombre}, te informamos que tu crédito en Zprest está disponible."
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                className="w-full resize-none rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>160 caracteres máximo por SMS</span>
                <span className={mensaje.length > 150 ? "text-yellow-400" : ""}>{mensaje.length}/160</span>
              </div>
            </div>

            {/* Repeticiones */}
            <div className="rounded-xl border border-white/10 bg-gray-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-300">Repeticiones</h2>
              <div className="flex gap-3">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRepeticiones(n)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                      repeticiones === n
                        ? "bg-blue-600 text-white"
                        : "border border-white/10 bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
              {repeticiones > 1 && (
                <p className="mt-2 text-xs text-yellow-400">
                  ⚠️ Cada SMS se enviará {repeticiones} veces con 1 segundo de intervalo.
                </p>
              )}
            </div>

            {/* Botón enviar */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={enviar}
              disabled={enviando || !destinatarios.length || !mensaje.trim()}
              className="w-full rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white hover:bg-green-700 disabled:opacity-40 transition"
            >
              {enviando
                ? "Enviando..."
                : `Enviar ${destinatarios.length > 1 ? `a ${destinatarios.length} destinatarios` : "SMS"}`}
            </button>
          </div>
        </div>

        {/* ── Resultados ── */}
        {resultados && (
          <div className="rounded-xl border border-white/10 bg-gray-900 p-5">
            <div className="mb-4 flex items-center gap-4">
              <h2 className="text-base font-semibold text-white">Resultados del envío</h2>
              <span className="rounded-full bg-green-600/20 px-3 py-0.5 text-xs text-green-400">
                ✓ {exitosos} enviados
              </span>
              {fallidos > 0 && (
                <span className="rounded-full bg-red-600/20 px-3 py-0.5 text-xs text-red-400">
                  ✗ {fallidos} fallidos
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-500">
                    <th className="pb-2 text-left">Nombre</th>
                    <th className="pb-2 text-left">Teléfono</th>
                    <th className="pb-2 text-left">Estado</th>
                    <th className="pb-2 text-left">Respuesta</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2 text-gray-300">{r.nombre || "—"}</td>
                      <td className="py-2 text-gray-400">{r.telefono}</td>
                      <td className="py-2">
                        {r.ok
                          ? <span className="text-green-400">✓ OK</span>
                          : <span className="text-red-400">✗ Error</span>
                        }
                      </td>
                      <td className="py-2 font-mono text-xs text-gray-500">{r.respuesta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
