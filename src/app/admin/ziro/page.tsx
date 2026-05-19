"use client";

import { useState, useEffect } from "react";

interface ZiroConfig {
  prompt_vendedor: string;
  prompt_asesor: string;
  model: string;
  temperature: number;
  from_db: boolean;
}

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

export default function ZiroAdminPage() {
  const [config, setConfig] = useState<ZiroConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/admin/ziro")
      .then((r) => r.json())
      .then((d) => { setConfig(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ziro", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_vendedor: config.prompt_vendedor,
          prompt_asesor: config.prompt_asesor,
          model: config.model,
          temperature: config.temperature,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      showToast("Configuración guardada", true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error", false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!config) {
    return <p className="text-red-400">Error cargando configuración de Ziro.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ziro IA — Configuración</h1>
          <p className="mt-1 text-sm text-gray-400">
            {config.from_db
              ? "Configuración cargada desde la base de datos."
              : "Usando valores por defecto (tabla ziro_config no encontrada en Supabase)."}
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {/* Model + Temperature */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-gray-800 p-4">
          <label className="mb-2 block text-sm font-medium text-gray-300">Modelo</label>
          <select
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="rounded-xl bg-gray-800 p-4">
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Temperatura: <span className="text-blue-400">{config.temperature}</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={config.temperature}
            onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
            className="w-full accent-blue-500"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>0 — preciso</span>
            <span>1 — creativo</span>
          </div>
        </div>
      </div>

      {/* Prompt Vendedor */}
      <div className="rounded-xl bg-gray-800 p-4">
        <label className="mb-2 block text-sm font-semibold text-white">
          Prompt — modo Vendedor
          <span className="ml-2 text-xs font-normal text-gray-400">(landing pública, visitantes sin cuenta)</span>
        </label>
        <textarea
          value={config.prompt_vendedor}
          onChange={(e) => setConfig({ ...config, prompt_vendedor: e.target.value })}
          rows={14}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 font-mono text-xs text-gray-200 focus:border-blue-500 focus:outline-none resize-y"
        />
        <p className="mt-1 text-xs text-gray-500">
          Variables disponibles: ninguna. El nombre del usuario se agrega automáticamente si está logueado.
        </p>
      </div>

      {/* Prompt Asesor */}
      <div className="rounded-xl bg-gray-800 p-4">
        <label className="mb-2 block text-sm font-semibold text-white">
          Prompt — modo Asesor
          <span className="ml-2 text-xs font-normal text-gray-400">(portal Mi Z, usuarios registrados)</span>
        </label>
        <textarea
          value={config.prompt_asesor}
          onChange={(e) => setConfig({ ...config, prompt_asesor: e.target.value })}
          rows={14}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 font-mono text-xs text-gray-200 focus:border-blue-500 focus:outline-none resize-y"
        />
        <p className="mt-1 text-xs text-gray-500">
          El nombre del usuario y sus datos de préstamos se agregan automáticamente al prompt.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg transition ${
            toast.ok ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
