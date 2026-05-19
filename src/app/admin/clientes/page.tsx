"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { getAuthToken } from "@/lib/supabase/getToken";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Usuario, EstadoUsuario, TipoCliente } from "@/types";

type PrestamoMin = { id: string };
type SolicitudMin = { id: string; cbu: string | null; bcra_situacion: number | null; bcra_advertencia: string | null; estado: string; created_at: string };

type ClienteConStats = Usuario & {
  cuil: string | null;
  telefono: string | null;
  telefono_verificado: boolean | null;
  bcra_situacion: number | null;
  bcra_advertencia: string | null;
  afip_activo: boolean | null;
  afip_actividad: string | null;
  tipo_interes: string | null;
  estado_motivo: string | null;
  estado_cambiado_at: string | null;
  updated_at: string;
  domicilio: { calle?: string; numero?: string; piso?: string; depto?: string; localidad?: string; provincia?: string; codigo_postal?: string } | null;
  nombre_comercio: string | null;
  empleador: string | null;
  plan_preferencial_id: string | null;
  prestamos: PrestamoMin[];
  solicitudes: SolicitudMin[];
};

type PlanPreferencial = {
  id: string;
  nombre: string;
  tipo: string;
  tem: number | null;
  ted: number | null;
  plazo_min: number;
  monto_min: number;
  monto_max: number;
};

type EmailBaneado = {
  email: string;
  motivo: string | null;
  banned_at: string;
  banned_by: string | null;
  bloqueado_hasta: string | null;
  dni: string | null;
  tipo: "permanente" | "temporal" | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatWA(tel: string | null): string | null {
  if (!tel) return null;
  const d = tel.replace(/\D/g, "");
  if (d.length === 0) return null;
  if (d.startsWith("54")) return `+${d}`;
  if (d.startsWith("0")) return `+549${d.slice(1)}`;
  if (d.length === 10) return `+549${d}`;
  return `+549${d}`;
}

const BCRA_BADGE: Record<number, string> = {
  0: "bg-green-500/20 text-green-300 border border-green-500/30",
  1: "bg-green-500/20 text-green-300 border border-green-500/30",
  2: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  3: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  4: "bg-red-500/20 text-red-300 border border-red-500/30",
  5: "bg-red-500/20 text-red-300 border border-red-500/30",
};
const BCRA_LABEL: Record<number, string> = {
  0: "S0 ✓", 1: "S1 ✓", 2: "S2 ⚠", 3: "S3 ⚠", 4: "S4 ✗", 5: "S5 ✗",
};

type FiltroEstado = "todos" | EstadoUsuario;
type FiltroTipo = "todos" | TipoCliente;

const BADGE_ESTADO: Record<EstadoUsuario, string> = {
  activo:    "bg-green-500/20 text-green-300 border border-green-500/30",
  inactivo:  "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  bloqueado: "bg-red-500/20 text-red-300 border border-red-500/30",
  eliminado: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
};
const ICONO_ESTADO: Record<EstadoUsuario, string> = {
  activo: "🟢", inactivo: "🟡", bloqueado: "🔴", eliminado: "⚫",
};

const BADGE_TIPO: Record<TipoCliente, string> = {
  personal:  "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  pyme:      "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  pendiente: "bg-gray-500/20 text-gray-400 border border-gray-600",
};
const LABEL_TIPO: Record<TipoCliente, string> = {
  personal: "Personal", pyme: "Pyme", pendiente: "⏳ Sin calificar",
};

type ModalTipo = "desactivar" | "bloquear" | "bloquear_hasta" | "activar" | "eliminar" | "eliminar_hard" | "mensaje" | "clasificar" | "tasa_preferencial" | null;

export default function ClientesAdminPage() {
  const [clientes, setClientes] = useState<ClienteConStats[]>([]);
  const [baneados, setBaneados] = useState<EmailBaneado[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [desbaneando, setDesbaneando] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");

  // Modal estado
  const [modal, setModal] = useState<{ tipo: ModalTipo; cliente: ClienteConStats | null }>({ tipo: null, cliente: null });
  const [motivoModal, setMotivoModal] = useState("");
  const [hastaModal, setHastaModal] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [msgAsunto, setMsgAsunto] = useState("");
  const [msgTexto, setMsgTexto] = useState("");
  const [tipoElim, setTipoElim] = useState<"banear" | "temporal">("banear");
  const [diasElim, setDiasElim] = useState<number>(90);
  const [procesando, setProcesando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  // Selección múltiple
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState("");
  const [modalBulk, setModalBulk] = useState(false);
  const [progresoBulk, setProgresoBulk] = useState<{ ok: number; err: number } | null>(null);

  // Tasa preferencial
  const [planesPrefs, setPlanesPrefs] = useState<PlanPreferencial[]>([]);
  const [planPrefSel, setPlanPrefSel] = useState<string | "quitar" | null>(null);

  // Menú ⋯ — posición fixed para evitar clipping del overflow del contenedor
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0, abreArriba: false });
  const [sortCol, setSortCol] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const menuRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setErrorCarga("");
    const token = await getAuthToken();
    if (!token) { setLoading(false); return; }

    const [res, resBan] = await Promise.all([
      fetch("/api/admin/clientes", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/clientes/baneados", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const json = await res.json();
    if (res.ok) {
      setClientes(json.clientes ?? []);
    } else {
      setErrorCarga(json.error ?? "Error al cargar clientes");
    }
    const jsonBan = await resBan.json();
    if (resBan.ok) setBaneados(jsonBan.baneados ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Cerrar menú al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuAbierto(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getToken = getAuthToken;

  const clasificarCliente = async (clienteId: string, tipo: TipoCliente) => {
    setProcesando(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/clientes/${clienteId}/tipo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipo_cliente: tipo }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await cargar();
    } finally {
      setProcesando(false);
      cerrarModal();
    }
  };

  const cambiarEstado = async (
    clienteId: string,
    estado: EstadoUsuario,
    motivo?: string,
    hasta?: string
  ) => {
    setProcesando(true);
    setErrorModal("");
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/clientes/${clienteId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado, motivo, hasta }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorModal(data.error ?? "Error al cambiar estado");
        return;
      }
      await cargar();
      cerrarModal();
    } catch (e) {
      setErrorModal(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setProcesando(false);
    }
  };

  const eliminarDefinitivo = async (clienteId: string) => {
    setProcesando(true);
    setErrorModal("");
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/clientes/${clienteId}/eliminar`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: tipoElim, dias: tipoElim === "temporal" ? diasElim : undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorModal(data.error ?? "Error al eliminar");
        return;
      }
      await cargar();
      cerrarModal();
    } catch (e) {
      setErrorModal(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setProcesando(false);
    }
  };

  const eliminarSeleccionados = async () => {
    setProcesando(true);
    setProgresoBulk({ ok: 0, err: 0 });
    const token = await getToken();
    let ok = 0; let err = 0;
    for (const id of seleccionados) {
      try {
        const res = await fetch(`/api/admin/clientes/${id}/eliminar`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) ok++; else err++;
      } catch { err++; }
      setProgresoBulk({ ok, err });
    }
    await cargar();
    setSeleccionados(new Set());
    setModalBulk(false);
    setConfirmBulk("");
    setProgresoBulk(null);
    setProcesando(false);
  };

  const enviarMensaje = async (clienteId: string) => {
    setProcesando(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/clientes/${clienteId}/mensaje`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ asunto: msgAsunto, mensaje: msgTexto }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } finally {
      setProcesando(false);
      cerrarModal();
    }
  };

  const cargarPlanesPrefs = async () => {
    if (planesPrefs.length > 0) return;
    const token = await getToken();
    const res = await fetch("/api/admin/clientes/planes-preferenciales", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setPlanesPrefs(data.planes ?? []);
  };

  const asignarTasaPreferencial = async (clienteId: string, planId: string | null) => {
    setProcesando(true);
    setErrorModal("");
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/clientes/${clienteId}/tasa-preferencial`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: planId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorModal(data.error ?? "Error al actualizar");
        return;
      }
      await cargar();
      cerrarModal();
    } catch (e) {
      setErrorModal(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setProcesando(false);
    }
  };

  const abrirModal = (tipo: ModalTipo, cliente: ClienteConStats) => {
    setModal({ tipo, cliente });
    setMotivoModal("");
    setHastaModal("");
    setConfirmText("");
    setMsgAsunto("");
    setMsgTexto("");
    setTipoElim("banear");
    setDiasElim(90);
    setErrorModal("");
    setMenuAbierto(null);
    if (tipo === "tasa_preferencial") {
      setPlanPrefSel(cliente.plan_preferencial_id ?? null);
      cargarPlanesPrefs();
    }
  };
  const cerrarModal = () => setModal({ tipo: null, cliente: null });

  const confirmarModal = async () => {
    if (!modal.cliente) return;
    const { tipo, cliente } = modal;
    if (tipo === "activar")       await cambiarEstado(cliente.id, "activo");
    if (tipo === "desactivar")    await cambiarEstado(cliente.id, "inactivo", motivoModal || undefined);
    if (tipo === "bloquear")      await cambiarEstado(cliente.id, "bloqueado", motivoModal);
    if (tipo === "bloquear_hasta") await cambiarEstado(cliente.id, "bloqueado", motivoModal, hastaModal);
    if (tipo === "eliminar" && confirmText === "CONFIRMAR")
                                  await cambiarEstado(cliente.id, "eliminado", "Eliminación manual por admin");
    if (tipo === "eliminar_hard" && confirmText === "ELIMINAR")
                                  await eliminarDefinitivo(cliente.id);
    if (tipo === "mensaje")       await enviarMensaje(cliente.id);
    // clasificar se maneja directo desde el modal, no por confirmarModal
  };

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const filtrados = clientes
    .filter((c) => {
      const q = busqueda.toLowerCase();
      const matchBusq = !q || c.nombre?.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.dni?.includes(q) || c.cuil?.includes(q) || c.telefono?.includes(q);
      const matchEstado = filtroEstado === "todos" || (c.estado ?? "activo") === filtroEstado;
      const matchTipo = filtroTipo === "todos" || (c.tipo_cliente ?? "pendiente") === filtroTipo;
      return matchBusq && matchEstado && matchTipo;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortCol) {
        case "nombre":    return dir * ((a.nombre ?? "").localeCompare(b.nombre ?? "", "es"));
        case "email":     return dir * (a.email.localeCompare(b.email, "es"));
        case "dni":       return dir * ((a.dni ?? "").localeCompare(b.dni ?? ""));
        case "estado":    return dir * ((a.estado ?? "activo").localeCompare(b.estado ?? "activo"));
        case "solicitudes": return dir * ((a.solicitudes?.length ?? 0) - (b.solicitudes?.length ?? 0));
        case "prestamos": return dir * ((a.prestamos?.length ?? 0) - (b.prestamos?.length ?? 0));
        case "created_at":
        default:          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    });

  const tienePrestamoActivo = (c: ClienteConStats) =>
    (c.prestamos?.length ?? 0) > 0;
  const nSolicitudes = (c: ClienteConStats) => c.solicitudes?.length ?? 0;
  const ultimaSolicitud = (c: ClienteConStats): SolicitudMin | null =>
    (c.solicitudes ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
  const getCbu = (c: ClienteConStats) => ultimaSolicitud(c)?.cbu ?? null;
  const getBcra = (c: ClienteConStats) => {
    // Primero usar BCRA del registro del usuario (más reciente), si no, de la última solicitud
    if (c.bcra_situacion !== null && c.bcra_situacion !== undefined) return c.bcra_situacion;
    const s = ultimaSolicitud(c);
    return s?.bcra_situacion ?? null;
  };
  const getAfip = (c: ClienteConStats) => ({
    activo: c.afip_activo,
    actividad: c.afip_actividad,
  });

  const desbanear = async (email: string) => {
    setDesbaneando(email);
    const token = await getToken();
    await fetch("/api/admin/clientes/baneados", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email }),
    });
    await cargar();
    setDesbaneando(null);
  };

  const countPorEstado = (e: EstadoUsuario) =>
    clientes.filter((c) => (c.estado ?? "activo") === e).length;
  const countPorTipo = (t: TipoCliente) =>
    clientes.filter((c) => (c.tipo_cliente ?? "pendiente") === t).length;

  const exportarExcel = () => {
    const headers = [
      "ID", "Email", "Nombre", "DNI", "CUIL/CUIT", "Teléfono", "Tel. Verificado",
      "Tipo cliente", "Tipo interés", "Estado", "Estado motivo", "Estado hasta", "Estado registro",
      "Nombre Comercio", "Empleador",
      "BCRA Situación", "BCRA Advertencia", "AFIP Activo", "AFIP Actividad",
      "Calle", "Altura", "Piso", "Depto", "Localidad", "Provincia", "Código Postal",
      "CBU", "N° Solicitudes", "N° Préstamos", "Última solicitud", "Fecha alta", "Última actualización",
    ];
    const rows = clientes.map((c) => {
      const ult = ultimaSolicitud(c);
      return [
        c.id,
        c.email,
        c.nombre ?? "",
        c.dni ?? "",
        c.cuil ?? "",
        c.telefono ?? "",
        c.telefono_verificado ? "Sí" : "No",
        c.tipo_cliente ?? "",
        c.tipo_interes ?? "",
        c.estado ?? "activo",
        c.estado_motivo ?? "",
        c.estado_hasta ? new Date(c.estado_hasta).toLocaleDateString("es-AR") : "",
        c.estado_registro ?? "",
        c.nombre_comercio ?? "",
        c.empleador ?? "",
        c.bcra_situacion !== null ? c.bcra_situacion : "",
        c.bcra_advertencia ?? "",
        c.afip_activo !== null ? (c.afip_activo ? "Sí" : "No") : "",
        c.afip_actividad ?? "",
        c.domicilio?.calle ?? "",
        c.domicilio?.numero ?? "",
        c.domicilio?.piso ?? "",
        c.domicilio?.depto ?? "",
        c.domicilio?.localidad ?? "",
        c.domicilio?.provincia ?? "",
        c.domicilio?.codigo_postal ?? "",
        getCbu(c) ?? "",
        c.solicitudes?.length ?? 0,
        c.prestamos?.length ?? 0,
        ult ? new Date(ult.created_at).toLocaleDateString("es-AR") : "",
        new Date(c.created_at).toLocaleDateString("es-AR"),
        new Date(c.updated_at).toLocaleDateString("es-AR"),
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const bom = "﻿";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_zprest_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {clientes.length} usuario{clientes.length !== 1 ? "s" : ""} registrado{clientes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={exportarExcel}
          disabled={clientes.length === 0}
          className="flex items-center gap-2 rounded-lg border border-green-700 bg-green-900/30 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-900/50 disabled:opacity-40 transition"
        >
          ⬇ Exportar CSV / Excel
        </button>
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2">
        {([
          { value: "todos",    label: "Todos",      count: clientes.length },
          { value: "activo",   label: "🟢 Activos",   count: countPorEstado("activo") },
          { value: "inactivo", label: "🟡 Inactivos", count: countPorEstado("inactivo") },
          { value: "bloqueado",label: "🔴 Bloqueados",count: countPorEstado("bloqueado") },
          { value: "eliminado",label: "⚫ Eliminados", count: countPorEstado("eliminado") + baneados.length },
        ] as { value: FiltroEstado; label: string; count: number }[]).map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroEstado(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filtroEstado === f.value
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
            }`}
          >
            {f.label} <span className="opacity-60">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Filtros por tipo */}
      <div className="flex flex-wrap gap-2">
        {([
          { value: "todos",     label: "Todos los tipos", count: clientes.length },
          { value: "pendiente", label: "⏳ Sin calificar", count: countPorTipo("pendiente") },
          { value: "personal",  label: "👤 Personal",      count: countPorTipo("personal") },
          { value: "pyme",      label: "🏢 Pyme",          count: countPorTipo("pyme") },
        ] as { value: FiltroTipo; label: string; count: number }[]).map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroTipo(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filtroTipo === f.value
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
            }`}
          >
            {f.label} <span className="opacity-60">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <input
        type="search"
        placeholder="Buscar por nombre, email o DNI..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full max-w-sm rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
      />

      {errorCarga && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Error al cargar clientes: {errorCarga}
        </div>
      )}

      {/* Barra de acciones en lote */}
      {seleccionados.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3">
          <span className="text-sm font-medium text-red-300">
            {seleccionados.size} cliente{seleccionados.size !== 1 ? "s" : ""} seleccionado{seleccionados.size !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => { setModalBulk(true); setConfirmBulk(""); }}
            className="rounded-lg bg-red-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-600 transition"
          >
            💀 Eliminar definitivamente
          </button>
          <button
            onClick={() => setSeleccionados(new Set())}
            className="ml-auto rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 transition"
          >
            Deseleccionar
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-800" />)}
        </div>
      ) : (
        <div className="overflow-x-scroll overflow-y-auto rounded-xl border border-gray-700 bg-gray-800" style={{ maxHeight: "calc(100vh - 280px)" }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-800">
              <tr className="border-b border-gray-700 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 accent-red-600 cursor-pointer"
                    checked={filtrados.length > 0 && filtrados.every((c) => seleccionados.has(c.id))}
                    onChange={(e) => {
                      if (e.target.checked) setSeleccionados(new Set(filtrados.map((c) => c.id)));
                      else setSeleccionados(new Set());
                    }}
                    title="Seleccionar todos"
                  />
                </th>
                {([
                  ["nombre",      "Nombre / Email"],
                  ["dni",         "DNI / CUIL-CUIT"],
                  [null,          "Teléfono"],
                  [null,          "Tel. Ver."],
                  [null,          "Tipo"],
                  [null,          "Tipo interés"],
                  [null,          "Comercio"],
                  [null,          "Empleador"],
                  [null,          "Tasa Pref."],
                  [null,          "BCRA"],
                  [null,          "BCRA advertencia"],
                  [null,          "AFIP"],
                  [null,          "Domicilio"],
                  [null,          "Localidad"],
                  [null,          "Provincia"],
                  [null,          "C. Postal"],
                  [null,          "CBU"],
                  ["solicitudes", "Solicitudes"],
                  ["prestamos",   "Crédito"],
                  ["estado",      "Estado"],
                  [null,          "Motivo estado"],
                  [null,          "Registro"],
                  ["created_at",  "Alta"],
                  [null,          "Actualiz."],
                ] as [string | null, string][]).map(([col, label]) =>
                  col ? (
                    <th key={label} className="px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-white transition"
                      onClick={() => toggleSort(col)}>
                      {label}{sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                  ) : (
                    <th key={label} className="px-4 py-3 whitespace-nowrap">{label}</th>
                  )
                )}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filtrados.map((c) => {
                const estadoReal = (c.estado ?? "activo") as EstadoUsuario;
                const wa = formatWA(c.telefono);
                const cbu = getCbu(c);
                const bcra = getBcra(c);
                const afip = getAfip(c);
                const activo = tienePrestamoActivo(c);
                const esPyme = (c.tipo_cliente ?? "pendiente") === "pyme";
                return (
                  <tr key={c.id} className={`transition ${estadoReal === "eliminado" ? "opacity-40" : "hover:bg-gray-700/50"} ${seleccionados.has(c.id) ? "bg-red-950/20" : ""}`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 accent-red-600 cursor-pointer"
                        checked={seleccionados.has(c.id)}
                        onChange={(e) => {
                          const next = new Set(seleccionados);
                          if (e.target.checked) next.add(c.id); else next.delete(c.id);
                          setSeleccionados(next);
                        }}
                      />
                    </td>
                    {/* Nombre / Email */}
                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="font-medium text-white truncate">{c.nombre ?? "—"}</p>
                      <p className="text-xs text-gray-500 truncate">{c.email}</p>
                    </td>
                    {/* DNI / CUIL-CUIT */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.dni && <p className="font-mono text-xs text-gray-300">{c.dni}</p>}
                      {c.cuil && (
                        <p className="font-mono text-xs text-gray-500">
                          {esPyme ? "CUIT" : "CUIL"} {c.cuil}
                        </p>
                      )}
                      {!c.dni && !c.cuil && <span className="text-xs text-gray-600">—</span>}
                    </td>
                    {/* Teléfono */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {wa ? (
                        <a
                          href={`https://wa.me/${wa.replace("+", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition"
                          title="Abrir en WhatsApp"
                        >
                          <svg className="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.528 5.847L.057 23.943l6.25-1.641A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.783 9.783 0 01-4.99-1.366l-.358-.213-3.712.974.99-3.617-.234-.372A9.784 9.784 0 012.182 12C2.182 6.573 6.573 2.182 12 2.182S21.818 6.573 21.818 12 17.427 21.818 12 21.818z"/>
                          </svg>
                          {c.telefono}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    {/* Tel verificado */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {c.telefono_verificado
                        ? <span className="text-xs font-medium text-emerald-400">✓</span>
                        : <span className="text-xs text-amber-400/70">⚠</span>}
                    </td>
                    {/* Tipo */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_TIPO[(c.tipo_cliente ?? "pendiente") as TipoCliente]}`}>
                        {LABEL_TIPO[(c.tipo_cliente ?? "pendiente") as TipoCliente]}
                      </span>
                    </td>
                    {/* Tipo interés */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400 capitalize">
                      {c.tipo_interes ?? <span className="text-gray-600">—</span>}
                    </td>
                    {/* Nombre comercio */}
                    <td className="px-4 py-3 max-w-[140px]">
                      {c.nombre_comercio
                        ? <span className="text-xs text-purple-300 font-medium truncate block" title={c.nombre_comercio}>{c.nombre_comercio}</span>
                        : <span className="text-xs text-gray-600">—</span>}
                    </td>
                    {/* Empleador */}
                    <td className="px-4 py-3 max-w-[140px]">
                      {c.empleador
                        ? <span className="text-xs text-blue-300 truncate block" title={c.empleador}>{c.empleador}</span>
                        : <span className="text-xs text-gray-600">—</span>}
                    </td>
                    {/* Tasa preferencial */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.plan_preferencial_id ? (
                        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/30">
                          ⭐ Activa
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    {/* BCRA */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {bcra !== null ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BCRA_BADGE[bcra] ?? "bg-gray-500/20 text-gray-400 border border-gray-600"}`}>
                          {BCRA_LABEL[bcra] ?? `S${bcra}`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    {/* BCRA advertencia */}
                    <td className="px-4 py-3 max-w-[160px]">
                      {c.bcra_advertencia
                        ? <span className="text-[10px] text-yellow-400/80 truncate block" title={c.bcra_advertencia}>{c.bcra_advertencia}</span>
                        : <span className="text-xs text-gray-600">—</span>}
                    </td>
                    {/* AFIP */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.cuil ? (
                        <div className="flex flex-col gap-0.5">
                          {afip.activo !== null && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold inline-block ${afip.activo ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"}`}>
                              {afip.activo ? "✓ Activo" : "✗ Inactivo"}
                            </span>
                          )}
                          {afip.actividad && (
                            <span className="text-[10px] text-gray-500 max-w-[100px] truncate" title={afip.actividad}>{afip.actividad}</span>
                          )}
                          <a
                            href={`/admin/afip?cuit=${c.cuil.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-400 hover:text-blue-300 transition"
                          >
                            Ver →
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">Sin CUIL</span>
                      )}
                    </td>
                    {/* Domicilio (calle + altura + piso + depto) */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-300">
                      {c.domicilio?.calle ? (
                        <span title={[c.domicilio.calle, c.domicilio.numero, c.domicilio.piso ? `P${c.domicilio.piso}` : null, c.domicilio.depto ? `D${c.domicilio.depto}` : null].filter(Boolean).join(" ")}>
                          {c.domicilio.calle} {c.domicilio.numero}{c.domicilio.piso ? ` P${c.domicilio.piso}` : ""}{c.domicilio.depto ? ` D${c.domicilio.depto}` : ""}
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    {/* Localidad */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-300">
                      {c.domicilio?.localidad ?? <span className="text-gray-600">—</span>}
                    </td>
                    {/* Provincia */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
                      {c.domicilio?.provincia ?? <span className="text-gray-600">—</span>}
                    </td>
                    {/* Código Postal */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-300">
                      {c.domicilio?.codigo_postal ?? <span className="text-gray-600">—</span>}
                    </td>
                    {/* CBU */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {cbu ? (
                        <span className="font-mono text-xs text-gray-300" title={cbu}>
                          {cbu.slice(0, 8)}…{cbu.slice(-4)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    {/* N° Solicitudes */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="text-xs text-gray-400">{nSolicitudes(c)}</span>
                    </td>
                    {/* Crédito activo */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {activo ? (
                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                          ● Activo
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    {/* Estado */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_ESTADO[estadoReal]}`}>
                          {ICONO_ESTADO[estadoReal]} {estadoReal}
                        </span>
                        {c.estado_hasta && estadoReal === "bloqueado" && (
                          <p className="mt-0.5 text-[10px] text-gray-500">
                            hasta {format(new Date(c.estado_hasta), "dd/MM/yy", { locale: es })}
                          </p>
                        )}
                      </div>
                    </td>
                    {/* Motivo estado */}
                    <td className="px-4 py-3 max-w-[140px]">
                      {c.estado_motivo
                        ? <span className="text-[10px] text-gray-400 truncate block" title={c.estado_motivo}>{c.estado_motivo}</span>
                        : <span className="text-xs text-gray-600">—</span>}
                    </td>
                    {/* Estado registro */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        c.estado_registro === "aprobado"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-gray-500/20 text-gray-400 border border-gray-600"
                      }`}>
                        {c.estado_registro === "aprobado" ? "Aprobado" : "Pendiente"}
                      </span>
                    </td>
                    {/* Alta */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(c.created_at), "d MMM yy", { locale: es })}
                    </td>
                    {/* Última actualización */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {c.updated_at ? format(new Date(c.updated_at), "d MMM yy", { locale: es }) : "—"}
                    </td>
                    <td className="relative px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => abrirModal("eliminar_hard", c)}
                          title="Eliminar definitivamente"
                          className="rounded-lg px-2 py-1 text-red-600/60 hover:bg-red-950/50 hover:text-red-400 transition"
                        >
                          🗑
                        </button>
                        <button
                          onClick={(e) => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const abreArriba = window.innerHeight - rect.bottom < 220;
                            setMenuPos({
                              top: abreArriba ? rect.top : rect.bottom + 4,
                              right: window.innerWidth - rect.right,
                              abreArriba,
                            });
                            setMenuAbierto(menuAbierto === c.id ? null : c.id);
                          }}
                          className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-700 hover:text-white transition"
                        >
                          ⋯
                        </button>
                      </div>
                      {menuAbierto === c.id && typeof document !== "undefined" && createPortal(
                        <div
                          ref={menuRef}
                          style={{
                            position: "fixed",
                            right: menuPos.right,
                            ...(menuPos.abreArriba
                              ? { bottom: window.innerHeight - menuPos.top }
                              : { top: menuPos.top }),
                            zIndex: 9999,
                          }}
                          className="min-w-[200px] rounded-xl border border-gray-700 bg-gray-900 shadow-2xl py-1"
                        >
                          <button onClick={() => abrirModal("clasificar", c)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-indigo-400 hover:bg-gray-800">
                            🏷️ Clasificar cliente
                          </button>
                          <button onClick={() => abrirModal("tasa_preferencial", c)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-amber-400 hover:bg-gray-800">
                            ⭐ Tasa preferencial
                            {c.plan_preferencial_id && <span className="ml-auto text-[10px] font-bold text-amber-500">ACTIVA</span>}
                          </button>
                          <div className="my-1 border-t border-gray-700" />
                          {estadoReal !== "activo" && (
                            <button onClick={() => abrirModal("activar", c)}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-green-400 hover:bg-gray-800">
                              ✅ Activar
                            </button>
                          )}
                          {estadoReal === "activo" && (
                            <button onClick={() => abrirModal("desactivar", c)}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-yellow-400 hover:bg-gray-800">
                              🔕 Desactivar
                            </button>
                          )}
                          <button onClick={() => abrirModal("mensaje", c)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-blue-400 hover:bg-gray-800">
                            ✉️ Enviar mensaje
                          </button>
                          {estadoReal !== "eliminado" && (
                            <>
                              <button onClick={() => abrirModal("bloquear", c)}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800">
                                🔒 Bloquear
                              </button>
                              <button onClick={() => abrirModal("bloquear_hasta", c)}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-orange-400 hover:bg-gray-800">
                                ⏸️ Bloquear hasta...
                              </button>
                              <div className="my-1 border-t border-gray-700" />
                              <button onClick={() => abrirModal("eliminar", c)}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-800">
                                🗑️ Ocultar (soft)
                              </button>
                            </>
                          )}
                          <div className="my-1 border-t border-gray-700" />
                          <button onClick={() => abrirModal("eliminar_hard", c)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-950/50 font-semibold">
                            💀 Eliminar definitivamente
                          </button>
                        </div>,
                        document.body
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtroEstado === "eliminado" && baneados.filter((b) => !busqueda || b.email.toLowerCase().includes(busqueda.toLowerCase()) || b.dni?.includes(busqueda)).map((b) => {
                const esTemoral = b.tipo === "temporal";
                const vencido = esTemoral && b.bloqueado_hasta && new Date(b.bloqueado_hasta) <= new Date();
                return (
                <tr key={b.email} className={`border-t border-red-900/30 ${vencido ? "bg-yellow-950/10" : "bg-red-950/10"}`}>
                  <td className="px-3 py-3" />
                  <td className="px-4 py-3 max-w-[180px]" colSpan={2}>
                    <p className="font-medium text-red-300 truncate">{b.email}</p>
                    {b.dni && <p className="font-mono text-[10px] text-gray-500">DNI {b.dni}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate" colSpan={4}>
                    {b.motivo ?? "Sin motivo"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" colSpan={2}>
                    {esTemoral ? (
                      <div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${vencido ? "bg-yellow-900/40 text-yellow-400 border-yellow-700/40" : "bg-orange-900/40 text-orange-400 border-orange-700/40"}`}>
                          {vencido ? "⏳ Vencido" : "⏳ Temporal"}
                        </span>
                        {b.bloqueado_hasta && (
                          <p className="mt-0.5 text-[10px] text-gray-500">
                            {vencido ? "Venció el" : "Vence el"} {new Date(b.bloqueado_hasta).toLocaleDateString("es-AR")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="rounded-full bg-red-900/40 px-2.5 py-0.5 text-xs font-semibold text-red-400 border border-red-700/40">
                        🚫 Permanente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(b.banned_at).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-3 py-3" colSpan={10}>
                    <button
                      onClick={() => desbanear(b.email)}
                      disabled={desbaneando === b.email}
                      className="rounded-lg bg-green-700/30 px-3 py-1 text-xs text-green-400 hover:bg-green-700/50 disabled:opacity-40 transition"
                    >
                      {desbaneando === b.email ? "..." : "Desbanear"}
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {filtrados.length === 0 && !(filtroEstado === "eliminado" && baneados.length > 0) && (
            <p className="p-8 text-center text-gray-500">
              {busqueda || filtroEstado !== "todos" ? "Sin resultados." : "No hay clientes registrados."}
            </p>
          )}
        </div>
      )}

      {/* Modal de acción */}
      {modal.tipo && modal.cliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">

            {modal.tipo === "activar" && (
              <>
                <h3 className="text-lg font-bold text-white">Activar cuenta</h3>
                <p className="mt-2 text-sm text-gray-400">
                  ¿Reactivar la cuenta de <strong className="text-white">{modal.cliente.nombre ?? modal.cliente.email}</strong>?
                  El usuario podrá volver a ingresar al portal.
                </p>
              </>
            )}

            {modal.tipo === "desactivar" && (
              <>
                <h3 className="text-lg font-bold text-white">Desactivar cuenta</h3>
                <p className="mt-2 text-sm text-gray-400">
                  El usuario no podrá ingresar al portal hasta que sea reactivado.
                </p>
                <textarea
                  className="mt-4 w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500 resize-none"
                  rows={2} placeholder="Motivo (opcional)" value={motivoModal}
                  onChange={(e) => setMotivoModal(e.target.value)}
                />
              </>
            )}

            {modal.tipo === "bloquear" && (
              <>
                <h3 className="text-lg font-bold text-white">🔒 Bloquear cuenta</h3>
                <p className="mt-2 text-sm text-gray-400">
                  El usuario verá un mensaje de cuenta bloqueada al intentar ingresar.
                </p>
                <textarea
                  className="mt-4 w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500 resize-none"
                  rows={2} placeholder="Motivo del bloqueo (obligatorio)" value={motivoModal}
                  onChange={(e) => setMotivoModal(e.target.value)}
                />
              </>
            )}

            {modal.tipo === "bloquear_hasta" && (
              <>
                <h3 className="text-lg font-bold text-white">⏸️ Bloqueo temporal</h3>
                <textarea
                  className="mt-4 w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 resize-none"
                  rows={2} placeholder="Motivo del bloqueo" value={motivoModal}
                  onChange={(e) => setMotivoModal(e.target.value)}
                />
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-gray-500">Desbloquear automáticamente el:</label>
                  <input type="date" value={hastaModal} onChange={(e) => setHastaModal(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </>
            )}

            {modal.tipo === "eliminar" && (
              <>
                <h3 className="text-lg font-bold text-red-400">🗑️ Ocultar cuenta</h3>
                <p className="mt-2 text-sm text-gray-400">
                  El usuario no podrá ingresar. Los datos se conservan en la base de datos (soft delete).
                  Escribí <strong className="text-white">CONFIRMAR</strong> para continuar.
                </p>
                <input
                  className="mt-4 w-full rounded-lg border border-red-500/30 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500"
                  placeholder="Escribí CONFIRMAR" value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              </>
            )}

            {modal.tipo === "eliminar_hard" && (
              <>
                <h3 className="text-lg font-bold text-red-500">💀 Eliminar usuario</h3>
                <p className="mt-1 text-sm text-gray-400">
                  <strong className="text-white">{modal.cliente.email}</strong>
                  {modal.cliente.dni && <span className="ml-2 font-mono text-xs text-gray-500">DNI {modal.cliente.dni}</span>}
                </p>

                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 p-3">
                  <p className="text-xs text-red-400/80">
                    Se borrarán solicitudes, préstamos, cuotas y billetera. <strong>No se puede deshacer.</strong>
                  </p>
                </div>

                {/* Selector de tipo */}
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo de eliminación</p>
                <div className="mt-2 space-y-2">
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${tipoElim === "banear" ? "border-red-500/60 bg-red-950/30" : "border-gray-700 bg-gray-800 hover:border-gray-600"}`}>
                    <input
                      type="radio" name="tipoElim" value="banear"
                      checked={tipoElim === "banear"}
                      onChange={() => setTipoElim("banear")}
                      className="mt-0.5 accent-red-500"
                    />
                    <div>
                      <p className="text-sm font-semibold text-red-300">🚫 Eliminar y banear permanentemente</p>
                      <p className="text-xs text-gray-500">El email y DNI quedan bloqueados. No puede volver a registrarse.</p>
                    </div>
                  </label>
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${tipoElim === "temporal" ? "border-orange-500/60 bg-orange-950/20" : "border-gray-700 bg-gray-800 hover:border-gray-600"}`}>
                    <input
                      type="radio" name="tipoElim" value="temporal"
                      checked={tipoElim === "temporal"}
                      onChange={() => setTipoElim("temporal")}
                      className="mt-0.5 accent-orange-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-orange-300">⏳ Eliminar temporalmente</p>
                      <p className="text-xs text-gray-500">Se borran los datos pero puede re-registrarse después del período. Útil para BCRA situación 2-3.</p>
                      {tipoElim === "temporal" && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-400">Puede volver en:</span>
                          <select
                            value={diasElim}
                            onChange={(e) => setDiasElim(Number(e.target.value))}
                            className="rounded-lg border border-orange-500/40 bg-gray-900 px-2 py-1 text-sm text-white outline-none focus:border-orange-500"
                          >
                            <option value={30}>30 días</option>
                            <option value={60}>60 días</option>
                            <option value={90}>90 días</option>
                            <option value={180}>180 días</option>
                            <option value={365}>1 año</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                <p className="mt-4 text-xs text-gray-500">
                  Escribí <strong className="text-red-400">ELIMINAR</strong> para confirmar:
                </p>
                <input
                  className="mt-2 w-full rounded-lg border border-red-600/50 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-red-600"
                  placeholder="Escribí ELIMINAR" value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              </>
            )}

            {modal.tipo === "clasificar" && (
              <>
                <h3 className="text-lg font-bold text-white">🏷️ Clasificar cliente</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Asigná el tipo de crédito disponible para{" "}
                  <strong className="text-white">{modal.cliente.nombre ?? modal.cliente.email}</strong>.
                  Esto determina qué planes puede solicitar.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    disabled={procesando}
                    onClick={() => clasificarCliente(modal.cliente!.id, "personal")}
                    className={`rounded-xl border p-4 text-left transition hover:border-blue-500 disabled:opacity-40 ${
                      (modal.cliente.tipo_cliente ?? "pendiente") === "personal"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-600 bg-gray-800 hover:bg-blue-500/5"
                    }`}
                  >
                    <p className="text-2xl">👤</p>
                    <p className="mt-1 font-semibold text-white">Personal</p>
                    <p className="text-xs text-gray-400">Créditos mensuales (TEM)</p>
                  </button>
                  <button
                    disabled={procesando}
                    onClick={() => clasificarCliente(modal.cliente!.id, "pyme")}
                    className={`rounded-xl border p-4 text-left transition hover:border-purple-500 disabled:opacity-40 ${
                      (modal.cliente.tipo_cliente ?? "pendiente") === "pyme"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-gray-600 bg-gray-800 hover:bg-purple-500/5"
                    }`}
                  >
                    <p className="text-2xl">🏢</p>
                    <p className="mt-1 font-semibold text-white">Pyme</p>
                    <p className="text-xs text-gray-400">Créditos diarios (TED)</p>
                  </button>
                </div>
                {(modal.cliente.tipo_cliente && modal.cliente.tipo_cliente !== "pendiente") && (
                  <button
                    disabled={procesando}
                    onClick={() => clasificarCliente(modal.cliente!.id, "pendiente")}
                    className="mt-3 w-full rounded-lg border border-gray-600 py-2 text-xs text-gray-500 hover:bg-gray-800 transition disabled:opacity-40"
                  >
                    Volver a "Sin calificar"
                  </button>
                )}
              </>
            )}

            {modal.tipo === "mensaje" && (
              <>
                <h3 className="text-lg font-bold text-white">✉️ Enviar mensaje</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Se enviará por email a <span className="text-gray-300">{modal.cliente?.email}</span>
                </p>
                <div className="mt-4 space-y-3">
                  <input
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
                    placeholder="Asunto *" value={msgAsunto}
                    onChange={(e) => setMsgAsunto(e.target.value)}
                  />
                  <textarea
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 resize-none"
                    rows={5} placeholder="Escribí el mensaje..." value={msgTexto}
                    onChange={(e) => setMsgTexto(e.target.value)}
                  />
                </div>
              </>
            )}

            {modal.tipo === "tasa_preferencial" && (
              <>
                <h3 className="text-lg font-bold text-white">⭐ Tasa preferencial</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Asignar plan preferencial a{" "}
                  <strong className="text-white">{modal.cliente.nombre ?? modal.cliente.email}</strong>
                </p>

                {modal.cliente.plan_preferencial_id && (
                  <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <p className="text-xs text-amber-400">
                      ⭐ Ya tiene asignado:{" "}
                      <strong>{planesPrefs.find(p => p.id === modal.cliente?.plan_preferencial_id)?.nombre ?? modal.cliente.plan_preferencial_id}</strong>
                    </p>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {planesPrefs.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No hay planes preferenciales creados. Creá uno en{" "}
                      <strong className="text-gray-300">/admin/planes</strong> marcándolo como &quot;Tasa preferencial&quot;.
                    </p>
                  ) : (
                    planesPrefs.map((plan) => (
                      <label
                        key={plan.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                          planPrefSel === plan.id
                            ? "border-amber-500/60 bg-amber-500/10"
                            : "border-gray-700 bg-gray-800 hover:border-gray-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name="planPref"
                          value={plan.id}
                          checked={planPrefSel === plan.id}
                          onChange={() => setPlanPrefSel(plan.id)}
                          className="mt-0.5 accent-amber-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-amber-300">{plan.nombre}</p>
                          <p className="text-xs text-gray-400">
                            {plan.tem != null ? `TEM ${plan.tem}%` : plan.ted != null ? `TED ${plan.ted}%` : "—"} ·{" "}
                            {plan.plazo_min} {plan.tipo === "pyme" ? "días" : "cuotas"} ·{" "}
                            ${(plan.monto_min / 1000000).toFixed(0)}M–${(plan.monto_max / 1000000).toFixed(0)}M
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                {errorModal && (
                  <p className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                    {errorModal}
                  </p>
                )}

                <div className="mt-5 flex gap-3">
                  <button
                    disabled={procesando || !planPrefSel}
                    onClick={() => asignarTasaPreferencial(modal.cliente!.id, planPrefSel!)}
                    className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-40 transition"
                  >
                    {procesando ? "Guardando..." : "Asignar tasa preferencial"}
                  </button>
                  {modal.cliente.plan_preferencial_id && (
                    <button
                      disabled={procesando}
                      onClick={() => asignarTasaPreferencial(modal.cliente!.id, null)}
                      className="rounded-lg border border-red-500/40 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30 disabled:opacity-40 transition"
                    >
                      Quitar
                    </button>
                  )}
                  <button onClick={cerrarModal}
                    className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-800 transition">
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {errorModal && modal.tipo !== "tasa_preferencial" && (
              <p className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                {errorModal}
              </p>
            )}

            {modal.tipo !== "clasificar" && modal.tipo !== "tasa_preferencial" && (
              <div className="mt-5 flex gap-3">
                <button
                  onClick={confirmarModal}
                  disabled={
                    procesando ||
                    (modal.tipo === "bloquear" && !motivoModal.trim()) ||
                    (modal.tipo === "bloquear_hasta" && (!motivoModal.trim() || !hastaModal)) ||
                    (modal.tipo === "eliminar" && confirmText !== "CONFIRMAR") ||
                    (modal.tipo === "eliminar_hard" && confirmText !== "ELIMINAR") ||
                    (modal.tipo === "mensaje" && (!msgAsunto.trim() || !msgTexto.trim()))
                  }
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-40 transition ${
                    modal.tipo === "eliminar_hard"
                      ? "bg-red-700 hover:bg-red-600"
                      : "bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  {procesando ? "Procesando..." : modal.tipo === "eliminar_hard" ? "Eliminar definitivamente" : "Confirmar"}
                </button>
                <button onClick={cerrarModal}
                  className="flex-1 rounded-lg border border-gray-600 py-2.5 text-sm text-gray-400 hover:bg-gray-800 transition">
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Modal eliminación masiva */}
      {modalBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-700/40 bg-gray-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-red-500">💀 Eliminar {seleccionados.size} cliente{seleccionados.size !== 1 ? "s" : ""}</h3>
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-950/30 p-3">
              <p className="text-sm font-semibold text-red-300">⚠️ Acción irreversible</p>
              <p className="mt-1 text-xs text-red-400/80">
                Se borrarán completamente todos los datos de los {seleccionados.size} clientes seleccionados: solicitudes, préstamos, cuotas, billeteras y acceso al sistema.
              </p>
            </div>
            {progresoBulk && (
              <div className="mt-3 rounded-lg bg-gray-800 px-3 py-2 text-sm">
                <span className="text-green-400">✓ {progresoBulk.ok} eliminados</span>
                {progresoBulk.err > 0 && <span className="ml-3 text-red-400">✗ {progresoBulk.err} errores</span>}
              </div>
            )}
            <p className="mt-4 text-xs text-gray-500">
              Escribí <strong className="text-red-400">ELIMINAR</strong> para confirmar:
            </p>
            <input
              className="mt-2 w-full rounded-lg border border-red-600/50 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-red-600"
              placeholder="Escribí ELIMINAR"
              value={confirmBulk}
              onChange={(e) => setConfirmBulk(e.target.value)}
              disabled={procesando}
            />
            <div className="mt-5 flex gap-3">
              <button
                onClick={eliminarSeleccionados}
                disabled={procesando || confirmBulk !== "ELIMINAR"}
                className="flex-1 rounded-lg bg-red-700 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40 transition"
              >
                {procesando ? `Eliminando... (${progresoBulk?.ok ?? 0}/${seleccionados.size})` : "Eliminar definitivamente"}
              </button>
              <button
                onClick={() => { setModalBulk(false); setConfirmBulk(""); setProgresoBulk(null); }}
                disabled={procesando}
                className="flex-1 rounded-lg border border-gray-600 py-2.5 text-sm text-gray-400 hover:bg-gray-800 transition disabled:opacity-40"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
