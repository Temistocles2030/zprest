"use client";

import { useState, useEffect, useCallback } from "react";
import { formatearPesos } from "@/lib/loan-calculator";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface BindSaldo {
  disponible: number;
  acreditado: number;
  cbu: string;
  alias: string;
}

interface EstadoBindX {
  configurado: boolean;
  saldo: BindSaldo | null;
  faltantes?: string[];
  error?: string;
}

interface Movimiento {
  id: string;
  tipo: "credito" | "debito";
  monto: number;
  concepto: string;
  fecha: string;
  estado: string;
}

interface DebinRow {
  id: string;
  numero_cuota: number;
  monto: number;
  fecha_vencimiento: string;
  estado: string;
  bind_operacion_id: string | null;
  bind_estado: string | null;
  reintentos_count: number;
  usuarios: { nombre: string | null; email: string } | null;
}

interface TransferenciaRow {
  id: string;
  monto: number;
  cbu: string | null;
  bind_transferencia_id: string | null;
  estado: string;
  created_at: string;
  usuarios: { nombre: string | null; email: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADO_DEBIN_BADGE: Record<string, string> = {
  pendiente: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  pagada:    "bg-green-500/20 text-green-300 border border-green-500/30",
  fallida:   "bg-red-500/20 text-red-300 border border-red-500/30",
  vencida:   "bg-orange-500/20 text-orange-300 border border-orange-500/30",
};

function Badge({ estado }: { estado: string }) {
  const cls = ESTADO_DEBIN_BADGE[estado] ?? "bg-gray-500/20 text-gray-300 border border-gray-700";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {estado}
    </span>
  );
}

function fmt(fecha: string) {
  return format(new Date(fecha), "dd/MM/yy HH:mm", { locale: es });
}

// ─── Componentes por tab ──────────────────────────────────────────────────────

function SetupPanel() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function obtenerAccountId() {
    setLoading(true);
    setResultado(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/bind/setup");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");
      if (data.cuentas?.length > 0) {
        const ids = data.cuentas.map((c: { id: string; label: string }) => `${c.id} — ${c.label}`).join("\n");
        setResultado(ids);
      } else {
        setError("BindX no devolvió cuentas. Verificá las credenciales con el equipo BindX.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-6">
      <p className="text-sm font-semibold text-blue-300 mb-1">Obtener Account ID</p>
      <p className="text-xs text-blue-400/80 mb-4">
        Llamá al endpoint de setup para obtener el <code className="bg-blue-900/40 px-1 rounded">BINDX_ACCOUNT_ID</code> y cargarlo en Vercel.
      </p>
      <button
        onClick={obtenerAccountId}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? "Consultando..." : "Obtener Account ID"}
      </button>
      {resultado && (
        <div className="mt-4 rounded-lg bg-green-900/30 border border-green-500/30 p-3">
          <p className="text-xs text-green-400 font-semibold mb-1">Cuentas disponibles:</p>
          <pre className="text-xs text-green-300 whitespace-pre-wrap font-mono">{resultado}</pre>
          <p className="mt-2 text-xs text-green-400/70">Copiá el ID y cargalo en Vercel como <code>BINDX_ACCOUNT_ID</code></p>
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg bg-red-900/30 border border-red-500/30 p-3 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

function TabCuenta({ estado }: { estado: EstadoBindX | null }) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingMov, setLoadingMov] = useState(false);

  useEffect(() => {
    if (!estado?.configurado) return;
    setLoadingMov(true);
    fetch("/api/admin/bind/movimientos?limite=20")
      .then((r) => r.json())
      .then((d) => setMovimientos(d.movimientos ?? []))
      .catch(() => {})
      .finally(() => setLoadingMov(false));
  }, [estado?.configurado]);

  if (!estado) return <Spinner />;

  if (!estado.configurado) {
    const varsCriticasFaltantes = (estado.faltantes ?? []).filter(
      (v) => v.startsWith("BINDX_USERNAME") || v.startsWith("BINDX_PASSWORD") || v.startsWith("BINDX_ACCOUNT_ID")
    );
    const soloFaltaWebhook = varsCriticasFaltantes.length === 0 && estado.error;

    return (
      <div className="space-y-4">
        {soloFaltaWebhook ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
            <p className="text-lg font-semibold text-red-300">Error de conexión con BindX</p>
            <p className="mt-1 text-sm text-red-400/80">
              Las credenciales están configuradas pero BindX rechaza el request:
            </p>
            <p className="mt-3 font-mono text-sm text-red-300 bg-red-900/30 rounded-lg px-3 py-2">
              {estado.error}
            </p>
            <p className="mt-3 text-xs text-red-400/70">
              Revisá los logs de Vercel para más detalle. Si el error es 401, verificá usuario/contraseña con el equipo BindX.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-6">
            <p className="text-lg font-semibold text-yellow-300">BindX no configurado</p>
            <p className="mt-1 text-sm text-yellow-400/80">
              Cargá las siguientes variables de entorno en Vercel:
            </p>
            <ul className="mt-3 space-y-1">
              {(estado.faltantes ?? []).map((v) => (
                <li key={v} className="font-mono text-sm text-yellow-300">
                  • {v}
                </li>
              ))}
            </ul>
          </div>
        )}
        <SetupPanel />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Saldo */}
      {estado.saldo ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card label="Saldo disponible" value={formatearPesos(estado.saldo.disponible)} accent="green" />
          <Card label="Saldo acreditado" value={formatearPesos(estado.saldo.acreditado)} accent="blue" />
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">CBU / Alias</p>
            <p className="mt-1 font-mono text-sm text-white">{estado.saldo.cbu}</p>
            <p className="text-xs text-gray-400">{estado.saldo.alias}</p>
          </div>
        </div>
      ) : estado.error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          Error al consultar saldo: {estado.error}
        </div>
      ) : null}

      {/* Movimientos */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Últimos movimientos
        </h2>
        {loadingMov ? (
          <Spinner />
        ) : movimientos.length === 0 ? (
          <Empty text="Sin movimientos recientes" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Concepto</th>
                  <th className="px-5 py-3">Monto</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {movimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-700/50">
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        m.tipo === "credito"
                          ? "bg-green-500/20 text-green-300"
                          : "bg-red-500/20 text-red-300"
                      }`}>
                        {m.tipo === "credito" ? "↓ Crédito" : "↑ Débito"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-300">{m.concepto}</td>
                    <td className={`px-5 py-3 font-semibold ${
                      m.tipo === "credito" ? "text-green-400" : "text-red-400"
                    }`}>
                      {m.tipo === "credito" ? "+" : "-"}{formatearPesos(m.monto)}
                    </td>
                    <td className="px-5 py-3"><Badge estado={m.estado} /></td>
                    <td className="px-5 py-3 text-gray-500">{fmt(m.fecha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TabDebins() {
  const [debins, setDebins] = useState<DebinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todas");
  const [accionando, setAccionando] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const cargar = useCallback(() => {
    setLoading(true);
    const url = filtro === "todas" ? "/api/admin/bind/debins" : `/api/admin/bind/debins?estado=${filtro}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setDebins(d.debins ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (bindId: string, tipo: "cancelar" | "reintentar") => {
    setAccionando(bindId);
    try {
      const res = await fetch(`/api/admin/bind/debins/${bindId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: tipo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: tipo === "cancelar" ? "DEBIN cancelado" : "Reintento enviado", ok: true });
      cargar();
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : "Error", ok: false });
    } finally {
      setAccionando(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const FILTROS = ["todas", "pendiente", "fallida", "pagada"];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition capitalize ${
              filtro === f
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
            }`}
          >
            {f === "todas" ? "Todos" : f}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : debins.length === 0 ? (
        <Empty text="No hay DEBINs con ese filtro" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Cuota</th>
                <th className="px-5 py-3">Monto</th>
                <th className="px-5 py-3">Vencimiento</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Reintentos</th>
                <th className="px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {debins.map((d) => (
                <tr key={d.id} className="hover:bg-gray-700/50">
                  <td className="px-5 py-3">
                    <p className="text-white">{d.usuarios?.nombre ?? "—"}</p>
                    <p className="text-xs text-gray-500">{d.usuarios?.email}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-400">#{d.numero_cuota}</td>
                  <td className="px-5 py-3 font-semibold text-white">{formatearPesos(d.monto)}</td>
                  <td className="px-5 py-3 text-gray-400">
                    {format(new Date(d.fecha_vencimiento), "dd/MM/yy", { locale: es })}
                  </td>
                  <td className="px-5 py-3"><Badge estado={d.estado} /></td>
                  <td className="px-5 py-3 text-gray-400">{d.reintentos_count}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {d.estado === "fallida" && d.bind_operacion_id && (
                        <button
                          disabled={accionando === d.bind_operacion_id}
                          onClick={() => accion(d.bind_operacion_id!, "reintentar")}
                          className="rounded-lg bg-blue-600/20 px-2.5 py-1 text-xs text-blue-400 hover:bg-blue-600 hover:text-white transition disabled:opacity-40"
                        >
                          Reintentar
                        </button>
                      )}
                      {d.estado === "pendiente" && d.bind_operacion_id && (
                        <button
                          disabled={accionando === d.bind_operacion_id}
                          onClick={() => accion(d.bind_operacion_id!, "cancelar")}
                          className="rounded-lg bg-red-600/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-600 hover:text-white transition disabled:opacity-40"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <ToastMsg msg={toast.msg} ok={toast.ok} />
      )}
    </div>
  );
}

function TabTransferencias() {
  const [transferencias, setTransferencias] = useState<TransferenciaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ cbu: "", monto: "", concepto: "" });
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const cargar = () => {
    setLoading(true);
    fetch("/api/admin/bind/transferencias")
      .then((r) => r.json())
      .then((d) => setTransferencias(d.transferencias ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cbu || !form.monto || !form.concepto) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/admin/bind/transferencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cbu_destino: form.cbu,
          monto: Number(form.monto),
          concepto: form.concepto,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: "Transferencia enviada correctamente", ok: true });
      setForm({ cbu: "", monto: "", concepto: "" });
      cargar();
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : "Error", ok: false });
    } finally {
      setEnviando(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulario nueva transferencia */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Nueva transferencia manual</h2>
        <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">CBU destino (22 dígitos)</label>
            <input
              value={form.cbu}
              onChange={(e) => setForm({ ...form, cbu: e.target.value.replace(/\D/g, "").slice(0, 22) })}
              placeholder="0000000000000000000000"
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Monto ($)</label>
            <input
              type="number"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              placeholder="0"
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Concepto</label>
            <input
              value={form.concepto}
              onChange={(e) => setForm({ ...form, concepto: e.target.value })}
              placeholder="Préstamo Zprest"
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={enviando || form.cbu.length !== 22 || !form.monto || !form.concepto}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 transition"
            >
              {enviando ? "Enviando..." : "Enviar transferencia"}
            </button>
          </div>
        </form>
      </div>

      {/* Historial */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Historial de acreditaciones
        </h2>
        {loading ? <Spinner /> : transferencias.length === 0 ? (
          <Empty text="Sin transferencias registradas" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">CBU destino</th>
                  <th className="px-5 py-3">Monto</th>
                  <th className="px-5 py-3">ID BindX</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {transferencias.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-700/50">
                    <td className="px-5 py-3">
                      <p className="text-white">{t.usuarios?.nombre ?? "—"}</p>
                      <p className="text-xs text-gray-500">{t.usuarios?.email}</p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{t.cbu ?? "—"}</td>
                    <td className="px-5 py-3 font-semibold text-white">{formatearPesos(t.monto)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">
                      {t.bind_transferencia_id?.slice(0, 12)}…
                    </td>
                    <td className="px-5 py-3"><Badge estado={t.estado} /></td>
                    <td className="px-5 py-3 text-gray-500">{fmt(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <ToastMsg msg={toast.msg} ok={toast.ok} />}
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Card({ label, value, accent }: { label: string; value: string; accent: "green" | "blue" }) {
  const color = accent === "green" ? "text-green-400" : "text-blue-400";
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex h-24 items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-10 text-center text-gray-500">
      {text}
    </div>
  );
}

function ToastMsg({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${
      ok ? "bg-green-600" : "bg-red-600"
    }`}>
      {msg}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const TABS = ["Cuenta", "DEBINs", "Transferencias"] as const;
type Tab = typeof TABS[number];

export default function BindAdminPage() {
  const [tab, setTab] = useState<Tab>("Cuenta");
  const [estado, setEstado] = useState<EstadoBindX | null>(null);

  useEffect(() => {
    fetch("/api/admin/bind/estado")
      .then((r) => r.json())
      .then(setEstado)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">BindX</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Gestión de pagos, DEBINs y transferencias
          </p>
        </div>
        {estado && (
          <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            estado.configurado
              ? "bg-green-500/20 text-green-300 border border-green-500/30"
              : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${estado.configurado ? "bg-green-400" : "bg-yellow-400"}`} />
            {estado.configurado ? "Conectado" : "No configurado"}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-800 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
              tab === t ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === "Cuenta" && <TabCuenta estado={estado} />}
      {tab === "DEBINs" && <TabDebins />}
      {tab === "Transferencias" && <TabTransferencias />}
    </div>
  );
}
