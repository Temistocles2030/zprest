"use client";

import { useState, useEffect } from "react";
import { calcularCuotaPersonal, calcularCuotaDiariaComercial } from "@/lib/loan-calculator";
import type { Plan, TipoPlan, FrecuenciaPlan } from "@/types";

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

const PLAN_VACIO: Omit<Plan, "id" | "created_at"> = {
  nombre: "",
  tipo: "personal",
  tna: 96,
  tem: null,
  ted: null,
  frecuencia: "mensual",
  monto_min: 1000000,
  monto_max: 7000000,
  plazo_min: 3,
  plazo_max: 3,
  activo: true,
  es_preferencial: false,
};

const INPUT_CLS =
  "w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLS = "mb-1.5 block text-[13px] font-medium text-gray-400";

function pesos(n: number) {
  return "$ " + n.toLocaleString("es-AR");
}

export default function PlanesPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(PLAN_VACIO);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const cargar = async () => {
    setLoading(true);
    if (IS_MOCK) {
      // En mock mode, simular datos de ejemplo
      setPlanes([]);
      setLoading(false);
      return;
    }
    const res = await fetch("/api/admin/planes");
    const data = await res.json();
    setPlanes(data);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const resetForm = () => {
    setForm(PLAN_VACIO);
    setEditId(null);
  };

  const field = (key: keyof typeof form, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (IS_MOCK) {
        if (editId) {
          setPlanes((prev) => prev.map((p) => p.id === editId ? { ...p, ...payload } : p));
        } else {
          setPlanes((prev) => [...prev, { id: `plan-mock-${Date.now()}`, ...payload, created_at: new Date().toISOString() }]);
        }
        resetForm();
        showToast(editId ? "Plan actualizado" : "Plan creado");
        return;
      }
      if (editId) {
        const res = await fetch(`/api/admin/planes/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Error al actualizar");
      } else {
        const res = await fetch("/api/admin/planes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Error al crear");
      }
      await cargar();
      resetForm();
      showToast(editId ? "Plan actualizado" : "Plan creado");
    } catch {
      showToast("Error al guardar el plan", false);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditId(plan.id);
    setForm({
      nombre: plan.nombre,
      tipo: plan.tipo,
      tna: plan.tna,
      tem: plan.tem,
      ted: plan.ted,
      frecuencia: plan.frecuencia,
      monto_min: plan.monto_min,
      monto_max: plan.monto_max,
      plazo_min: plan.plazo_min,
      plazo_max: plan.plazo_max,
      activo: plan.activo,
      es_preferencial: plan.es_preferencial ?? false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este plan?")) return;
    if (IS_MOCK) {
      setPlanes((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    await fetch(`/api/admin/planes/${id}`, { method: "DELETE" });
    await cargar();
    showToast("Plan eliminado", false);
  };

  const handleToggle = async (plan: Plan) => {
    const newActivo = !plan.activo;
    if (IS_MOCK) {
      setPlanes((prev) => prev.map((p) => p.id === plan.id ? { ...p, activo: newActivo } : p));
      return;
    }
    await fetch(`/api/admin/planes/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: newActivo }),
    });
    await cargar();
    showToast(newActivo ? "Plan activado" : "Plan desactivado");
  };

  // Preview de cuota según form actual
  const previewCuota = (() => {
    if (form.tipo === "personal" && form.tem) {
      return calcularCuotaPersonal(form.monto_min, form.tem, form.plazo_min);
    }
    if ((form.tipo === "pyme") && form.ted) {
      return calcularCuotaDiariaComercial(form.monto_min, form.ted, form.plazo_min);
    }
    return null;
  })();

  // Agrupar planes por tipo
  const planesPersonal = planes.filter((p) => p.tipo === "personal");
  const planesComercial = planes.filter((p) => p.tipo === "pyme");
  const planesDependencia = planes.filter((p) => p.tipo === "dependencia");

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 rounded-xl px-5 py-3 text-sm font-semibold shadow-2xl transition ${
          toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-100">Gestor de Planes</h1>

      {/* Formulario */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-200">
          {editId ? "Editar plan" : "Nuevo plan"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={LABEL_CLS}>Nombre del plan</label>
              <input
                required
                value={form.nombre}
                onChange={(e) => field("nombre", e.target.value)}
                placeholder="Ej: Personal 12 cuotas"
                className={INPUT_CLS}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => field("tipo", e.target.value as TipoPlan)}
                className={INPUT_CLS}
              >
                <option value="personal">Personal</option>
                <option value="pyme">Comercial (Pyme)</option>
                <option value="dependencia">Dependencia</option>
              </select>
            </div>

            <div>
              <label className={LABEL_CLS}>Frecuencia de cobro</label>
              <select
                value={form.frecuencia}
                onChange={(e) => field("frecuencia", e.target.value as FrecuenciaPlan)}
                className={INPUT_CLS}
              >
                <option value="mensual">Mensual</option>
                <option value="diario">Diario</option>
                <option value="quincenal">Quincenal</option>
              </select>
            </div>

            <div>
              <label className={LABEL_CLS}>TNA (%)</label>
              <input
                type="number" step="0.01" required
                value={form.tna}
                onChange={(e) => field("tna", parseFloat(e.target.value))}
                className={INPUT_CLS}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Activo</label>
              <select
                value={form.activo ? "true" : "false"}
                onChange={(e) => field("activo", e.target.value === "true")}
                className={INPUT_CLS}
              >
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>

            <div>
              <label className={LABEL_CLS}>
                Tasa preferencial <span className="text-gray-500">(solo se asigna a clientes específicos)</span>
              </label>
              <select
                value={form.es_preferencial ? "true" : "false"}
                onChange={(e) => field("es_preferencial", e.target.value === "true")}
                className={INPUT_CLS}
              >
                <option value="false">No</option>
                <option value="true">Sí — plan preferencial</option>
              </select>
            </div>

            {/* TEM — solo para personal/dependencia */}
            <div>
              <label className={LABEL_CLS}>
                TEM % <span className="text-gray-500">(Tasa Efectiva Mensual — plan personal)</span>
              </label>
              <input
                type="number" step="0.01"
                value={form.tem ?? ""}
                onChange={(e) => field("tem", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Ej: 8"
                className={INPUT_CLS}
              />
            </div>

            {/* TED — solo para pyme */}
            <div>
              <label className={LABEL_CLS}>
                TED % <span className="text-gray-500">(Tasa Efectiva Diaria — plan comercial)</span>
              </label>
              <input
                type="number" step="0.01"
                value={form.ted ?? ""}
                onChange={(e) => field("ted", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Ej: 1.52"
                className={INPUT_CLS}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Monto mínimo</label>
              <input type="number" required value={form.monto_min} onChange={(e) => field("monto_min", parseInt(e.target.value))} className={INPUT_CLS} />
            </div>

            <div>
              <label className={LABEL_CLS}>Monto máximo</label>
              <input type="number" required value={form.monto_max} onChange={(e) => field("monto_max", parseInt(e.target.value))} className={INPUT_CLS} />
            </div>

            <div>
              <label className={LABEL_CLS}>Plazo (cuotas o días)</label>
              <input type="number" required value={form.plazo_min} onChange={(e) => {
                const v = parseInt(e.target.value);
                field("plazo_min", v);
                field("plazo_max", v);
              }} className={INPUT_CLS} />
              <p className="mt-1 text-[11px] text-gray-500">Cada plan tiene plazo fijo (plazo_min = plazo_max)</p>
            </div>

            {/* Preview */}
            {previewCuota !== null && (
              <div className="rounded-lg border border-blue-800/40 bg-blue-950/30 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-blue-400">
                  {form.tipo === "pyme" ? "Cuota diaria" : "Primera cuota"} para {pesos(form.monto_min)}
                </p>
                <p className="mt-1 text-2xl font-bold text-cyan-400">{pesos(previewCuota)}</p>
                <p className="mt-0.5 text-[10px] text-gray-500">
                  {form.tipo === "pyme"
                    ? `Capital/día + interés diario + IVA 21% · ${form.plazo_min} días`
                    : `Sistema francés + IVA 21% sobre interés · ${form.plazo_min} cuotas`}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? "Guardando..." : editId ? "Actualizar plan" : "Crear plan"}
            </button>
            {editId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-600 px-6 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista agrupada */}
      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-gray-700" />
      ) : (
        <div className="space-y-6">
          {[
            { label: "Planes Personales", color: "blue", lista: planesPersonal },
            { label: "Planes Comerciales", color: "amber", lista: planesComercial },
            { label: "Planes Dependencia", color: "teal", lista: planesDependencia },
          ].map(({ label, color, lista }) => lista.length > 0 && (
            <div key={label} className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden shadow-sm">
              <div className={`border-b border-gray-700 px-5 py-3 text-xs font-bold uppercase tracking-wider text-${color}-400`}>
                {label} ({lista.length})
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-700/30 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2.5">Nombre</th>
                    <th className="px-4 py-2.5">Plazo</th>
                    <th className="px-4 py-2.5">TNA</th>
                    <th className="px-4 py-2.5">TEM / TED</th>
                    <th className="px-4 py-2.5">Montos</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60">
                  {lista.map((plan) => {
                    const cuota = plan.tipo === "pyme" && plan.ted
                      ? calcularCuotaDiariaComercial(plan.monto_min, plan.ted, plan.plazo_min)
                      : plan.tem
                      ? calcularCuotaPersonal(plan.monto_min, plan.tem, plan.plazo_min)
                      : null;
                    return (
                      <tr key={plan.id} className={`hover:bg-gray-700/30 ${!plan.activo ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-200">{plan.nombre}</p>
                            {plan.es_preferencial && (
                              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                                ⭐ PREF
                              </span>
                            )}
                          </div>
                          {cuota && (
                            <p className="text-[11px] text-gray-500">
                              {plan.tipo === "pyme" ? "Cuota/día" : "1ª cuota"}: {pesos(cuota)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {plan.plazo_min} {plan.tipo === "pyme" ? "días" : "cuotas"}
                        </td>
                        <td className="px-4 py-3 text-gray-400">{plan.tna}%</td>
                        <td className="px-4 py-3 text-gray-400">
                          {plan.tem != null ? `TEM ${plan.tem}%` : plan.ted != null ? `TED ${plan.ted}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {pesos(plan.monto_min)} — {pesos(plan.monto_max)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggle(plan)}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                              plan.activo
                                ? "bg-green-900/60 text-green-400 hover:bg-red-900/40 hover:text-red-400"
                                : "bg-gray-700 text-gray-500 hover:bg-green-900/40 hover:text-green-400"
                            }`}
                          >
                            {plan.activo ? "Activo" : "Inactivo"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-3">
                            <button onClick={() => handleEdit(plan)} className="text-xs text-blue-400 hover:underline">Editar</button>
                            <button onClick={() => handleDelete(plan.id)} className="text-xs text-red-400 hover:underline">Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
          {planes.length === 0 && (
            <p className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center text-gray-500">
              No hay planes creados aún. Creá el primero arriba.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
