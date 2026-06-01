"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/lib/supabase/getToken";
import { formatearPesos } from "@/lib/loan-calculator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Solicitud, EstadoSolicitud, HistorialEstado } from "@/types";

interface PageProps { params: Promise<{ id: string }> }

type Domicilio = { calle?: string; numero?: string; piso?: string; depto?: string; localidad?: string; provincia?: string; codigo_postal?: string };

type SolicitudDetalle = Solicitud & {
  usuarios: { nombre: string | null; email: string; dni: string | null; telefono: string | null; cuil?: string | null; nombre_comercio?: string | null; empleador?: string | null; domicilio?: Domicilio | null } | null;
  planes: { nombre: string; tipo: string; tem: number | null; ted: number | null; plazo_min: number } | null;
  signatura_documento_id?: string | null;
  contrato_enviado_at?: string | null;
  contrato_firmado?: boolean | null;
  contrato_firmado_at?: string | null;
  contrato_rechazado?: boolean | null;
  contrato_url?: string | null;
  biometria_firmante?: {
    nombre_completo?: string;
    numero_documento?: string;
    pais?: string;
    fotos?: Array<{ url: string; type: string }>;
    intentos?: number;
    verificado_at?: string;
  } | null;
};

const BADGE: Record<EstadoSolicitud, string> = {
  pendiente:    "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  en_revision:  "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  pre_aprobado: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  pausado:      "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  aprobado:     "bg-green-500/20 text-green-300 border border-green-500/30",
  rechazado:    "bg-red-500/20 text-red-300 border border-red-500/30",
  activo:       "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  completado:   "bg-gray-500/20 text-gray-300 border border-gray-500/30",
};

const ESTADO_LABEL: Record<EstadoSolicitud, string> = {
  pendiente: "Pendiente", en_revision: "En revisión", pre_aprobado: "Pre-aprobado",
  pausado: "Pausado", aprobado: "Aprobada", rechazado: "Rechazada",
  activo: "Activa", completado: "Completada",
};

const HISTORIAL_ICONO: Record<string, string> = {
  pendiente: "○", en_revision: "◐", pre_aprobado: "◑", pausado: "⏸",
  aprobado: "●", rechazado: "✕", activo: "●", completado: "✓",
};

function iconDocumento(url: string) {
  if (url.includes(".pdf")) return "📄";
  if (url.includes(".doc")) return "📝";
  return "🖼️";
}

type ModalTipo = "revision" | "pre_aprobar" | "pausar" | "aprobar" | "rechazar" | null;

export default function DetalleSolicitudPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [solicitud, setSolicitud] = useState<SolicitudDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null);

  // Modal
  const [modal, setModal] = useState<ModalTipo>(null);
  const [procesando, setProcesando] = useState(false);
  const [enviandoContrato, setEnviandoContrato] = useState(false);
  const [descargandoContrato, setDescargandoContrato] = useState(false);
  const [verificandoFirma, setVerificandoFirma] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [condiciones, setCondiciones] = useState("");
  const [pausaMotivo, setPausaMotivo] = useState("");
  const [pausaHasta, setPausaHasta] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [notasAprobar, setNotasAprobar] = useState("");
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const getToken = useCallback(getAuthToken, []);

  const cargar = useCallback(async () => {
    const token = await getToken();
    if (!token) { setNotFound(true); setLoading(false); return; }

    const res = await fetch(`/api/admin/solicitudes/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { setNotFound(true); setLoading(false); return; }
    const json = await res.json();
    setSolicitud(json.solicitud as SolicitudDetalle);
    setLoading(false);
  }, [id, getToken]);

  useEffect(() => { cargar(); }, [cargar]);

  const patch = useCallback(async (body: Record<string, unknown>) => {
    const token = await getToken();
    if (!token) throw new Error("Sin sesión");
    const res = await fetch(`/api/admin/solicitudes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
  }, [id, getToken]);

  const postAccion = useCallback(async (ruta: string, body: Record<string, unknown>) => {
    const token = await getToken();
    if (!token) throw new Error("Sin sesión");
    const res = await fetch(`/api/admin/solicitudes/${id}/${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
  }, [id, getToken]);

  const descargarContrato = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setDescargandoContrato(true);
    try {
      const res = await fetch(`/api/admin/solicitudes/${id}/descargar-contrato`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Contrato_${id.slice(0, 8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setResultado({ tipo: "error", msg: e instanceof Error ? e.message : "Error descargando contrato" });
    } finally {
      setDescargandoContrato(false);
    }
  }, [id, getToken]);

  const enviarContrato = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setEnviandoContrato(true);
    setResultado(null);
    try {
      const res = await fetch(`/api/admin/solicitudes/${id}/enviar-contrato`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      setResultado({ tipo: "ok", msg: "Contrato generado y enviado a Signatura. El cliente recibirá un email para firmar." });
      await cargar();
    } catch (e) {
      setResultado({ tipo: "error", msg: e instanceof Error ? e.message : "Error enviando contrato" });
    } finally {
      setEnviandoContrato(false);
    }
  }, [id, getToken, cargar]);

  const verificarFirma = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setVerificandoFirma(true);
    setResultado(null);
    try {
      const res = await fetch(`/api/admin/solicitudes/${id}/verificar-firma`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error");
      setResultado({ tipo: "ok", msg: json.mensaje });
      await cargar();
    } catch (e) {
      setResultado({ tipo: "error", msg: e instanceof Error ? e.message : "Error verificando firma" });
    } finally {
      setVerificandoFirma(false);
    }
  }, [id, getToken, cargar]);

  const eliminarSolicitud = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setEliminando(true);
    try {
      const res = await fetch(`/api/admin/solicitudes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error eliminando");
      router.push("/admin/solicitudes");
    } catch (e) {
      setResultado({ tipo: "error", msg: e instanceof Error ? e.message : "Error eliminando solicitud" });
      setModalEliminar(false);
    } finally {
      setEliminando(false);
    }
  }, [id, getToken, router]);

  const ejecutar = useCallback(async (fn: () => Promise<void>, msgOk: string) => {
    setProcesando(true);
    try {
      await fn();
      setResultado({ tipo: "ok", msg: msgOk });
      setModal(null);
      await cargar();
    } catch (e) {
      setResultado({ tipo: "error", msg: e instanceof Error ? e.message : "Error" });
    } finally {
      setProcesando(false);
    }
  }, [cargar]);

  const accionPorModal: Record<NonNullable<ModalTipo>, () => Promise<void>> = {
    revision:    () => patch({ estado: "en_revision" }),
    pre_aprobar: () => postAccion("pre-aprobar", { condiciones }),
    pausar:      () => postAccion("pausar", { motivo: pausaMotivo, hasta: pausaHasta || undefined }),
    aprobar:     async () => {
      const token = await getToken();
      if (!token) throw new Error("Sin sesión");
      const res = await fetch(`/api/solicitudes/${id}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comprobante, notas: notasAprobar }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al aprobar");
    },
    rechazar:    async () => {
      const token = await getToken();
      if (!token) throw new Error("Sin sesión");
      const res = await fetch(`/api/solicitudes/${id}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ motivo: motivoRechazo }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al rechazar");
    },
  };

  const MSG_OK: Record<NonNullable<ModalTipo>, string> = {
    revision:    "Solicitud puesta en revisión.",
    pre_aprobar: "Pre-aprobación enviada al cliente.",
    pausar:      "Solicitud pausada. Se notificó al cliente.",
    aprobar:     "Solicitud aprobada. Préstamo y cuotas creados.",
    rechazar:    "Solicitud rechazada.",
  };

  if (loading) return (
    <div className="max-w-2xl space-y-4">
      {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-800" />)}
    </div>
  );

  if (notFound || !solicitud) return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-10 text-center">
      <p className="text-gray-400">Solicitud no encontrada.</p>
      <Link href="/admin/solicitudes" className="mt-3 inline-block text-sm text-blue-400 hover:underline">← Volver</Link>
    </div>
  );

  const plan    = solicitud.planes;
  const cliente = solicitud.usuarios;
  const esPyme  = plan?.tipo === "pyme";
  const estadosActivos: EstadoSolicitud[] = ["pendiente", "en_revision", "pre_aprobado", "pausado"];
  const puedeActuar = estadosActivos.includes(solicitud.estado) && !resultado;

  const historial = (solicitud.historial_estados ?? []) as HistorialEstado[];

  return (
    <div className="max-w-2xl space-y-5">
      <Link href="/admin/solicitudes" className="text-sm text-gray-500 hover:text-gray-300 transition">
        ← Solicitudes
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Solicitud #{solicitud.id.slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-gray-400">
            Recibida {format(new Date(solicitud.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${BADGE[solicitud.estado]}`}>
            {ESTADO_LABEL[solicitud.estado]}
          </span>
          <button
            onClick={() => { setConfirmEliminar(""); setModalEliminar(true); }}
            title="Eliminar solicitud"
            className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-400 hover:bg-red-600 hover:text-white transition"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Cliente */}
      <div className="rounded-xl border border-gray-700 bg-gray-800">
        <div className="border-b border-gray-700 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-300">Cliente</h2>
        </div>
        <dl className="divide-y divide-gray-700 text-sm">
          {([
            ["Nombre",    cliente?.nombre ?? "—"],
            ["Email",     cliente?.email ?? "—"],
            ["DNI",       cliente?.dni ?? "—"],
            ["CUIL/CUIT", cliente?.cuil ?? "—"],
            ["Teléfono",  cliente?.telefono ?? "—"],
            ...(esPyme && cliente?.nombre_comercio ? [["Comercio", cliente.nombre_comercio]] : []),
            ...(!esPyme && cliente?.empleador ? [["Empleador", cliente.empleador]] : []),
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="flex justify-between px-5 py-3">
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-white text-right">{value}</dd>
            </div>
          ))}
          {esPyme && (
            <div className="flex justify-between px-5 py-3">
              <dt className="text-gray-500">Domicilio comercial</dt>
              <dd className="font-medium text-white text-right text-xs max-w-[60%]">
                {cliente?.domicilio?.calle
                  ? [cliente.domicilio.calle, cliente.domicilio.numero, cliente.domicilio.piso && `P${cliente.domicilio.piso}`, cliente.domicilio.localidad, cliente.domicilio.provincia].filter(Boolean).join(" ")
                  : "—"}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Crédito */}
      <div className="rounded-xl border border-gray-700 bg-gray-800">
        <div className="border-b border-gray-700 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-300">
            Detalle del crédito — {esPyme ? "Plan Comercial" : "Plan Personal"}
          </h2>
        </div>
        <dl className="divide-y divide-gray-700 text-sm">
          {([
            ["Plan",              plan?.nombre ?? solicitud.plan_id],
            ["Monto solicitado",  formatearPesos(solicitud.monto)],
            [esPyme ? "Plazo" : "Cuotas", esPyme ? `${solicitud.plazo} días` : `${solicitud.cuotas} cuotas`],
            [esPyme ? "TED" : "TEM",      esPyme ? `${plan?.ted ?? "—"}%` : `${plan?.tem ?? "—"}%`],
            ["CBU destino",       solicitud.cbu ?? "—"],
            ...((solicitud as any).banco ? [["Banco", (solicitud as any).banco]] : []),
            ...(solicitud.comprobante_transferencia ? [["Comprobante", solicitud.comprobante_transferencia]] : []),
            ...(solicitud.notas_admin         ? [["Notas admin",  solicitud.notas_admin]]         : []),
            ...(solicitud.motivo_rechazo      ? [["Motivo rechazo", solicitud.motivo_rechazo]]    : []),
            ...(solicitud.pre_aprobado_condiciones ? [["Condiciones pre-aprobación", solicitud.pre_aprobado_condiciones]] : []),
            ...(solicitud.pausado_motivo      ? [["Motivo pausa", solicitud.pausado_motivo]]       : []),
            ...(solicitud.pausado_hasta       ? [["Pausa hasta",  format(new Date(solicitud.pausado_hasta), "d MMM yyyy", { locale: es })]] : []),
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-5 py-3">
              <dt className="shrink-0 text-gray-500">{label}</dt>
              <dd className="font-medium text-white text-right break-all">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Documentos */}
      {solicitud.documentos?.length > 0 && (
        <div className="rounded-xl border border-gray-700 bg-gray-800">
          <div className="border-b border-gray-700 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-300">
              Documentos adjuntos ({solicitud.documentos.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-700">
            {solicitud.documentos.map((url, i) => {
              const nombre = decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? `Documento ${i + 1}`);
              const nombreLimpio = nombre.replace(/^\d+_/, "").replace(/_/g, " ");
              return (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-700/50 transition">
                  <span className="text-xl shrink-0">{iconDocumento(url)}</span>
                  <p className="truncate text-sm text-blue-400 hover:text-blue-300 flex-1">{nombreLimpio}</p>
                  <span className="shrink-0 text-xs text-gray-500">↗ Ver</span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Contrato digital — visible siempre excepto rechazado */}
      {solicitud.estado !== "rechazado" && (
        <div className="rounded-xl border border-gray-700 bg-gray-800">
          <div className="border-b border-gray-700 px-5 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">Contrato digital</h2>
            <div className="flex items-center gap-2">
              {solicitud.contrato_firmado && (
                <span className="rounded-full bg-green-500/20 border border-green-500/30 px-3 py-0.5 text-xs font-semibold text-green-300">
                  ✓ Firmado
                </span>
              )}
              {solicitud.contrato_rechazado && !solicitud.contrato_firmado && (
                <span className="rounded-full bg-red-500/20 border border-red-500/30 px-3 py-0.5 text-xs font-semibold text-red-300">
                  ✕ Firma rechazada
                </span>
              )}
              {solicitud.contrato_enviado_at && !solicitud.contrato_firmado && !solicitud.contrato_rechazado && (
                <span className="rounded-full bg-yellow-500/20 border border-yellow-500/30 px-3 py-0.5 text-xs font-semibold text-yellow-300">
                  ⏳ Pendiente de firma
                </span>
              )}
              <button
                onClick={descargarContrato}
                disabled={descargandoContrato}
                className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-600 transition disabled:opacity-50"
              >
                {descargandoContrato ? "Generando..." : "⬇ Descargar PDF"}
              </button>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3 text-sm">
            {!solicitud.contrato_enviado_at ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-gray-400">El contrato aún no fue enviado al cliente.</p>
                <div className="flex gap-2">
                  <button
                    onClick={descargarContrato}
                    disabled={descargandoContrato}
                    className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-600 transition disabled:opacity-50"
                  >
                    {descargandoContrato ? "Generando..." : "⬇ Descargar PDF"}
                  </button>
                  <button
                    onClick={enviarContrato}
                    disabled={enviandoContrato}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50"
                  >
                    {enviandoContrato ? "Generando..." : "📄 Enviar a Signatura"}
                  </button>
                </div>
              </div>
            ) : (
              <dl className="divide-y divide-gray-700">
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500">Enviado</dt>
                  <dd className="text-white">{format(new Date(solicitud.contrato_enviado_at), "d MMM yyyy, HH:mm", { locale: es })}</dd>
                </div>
                {solicitud.signatura_documento_id && (
                  <div className="flex justify-between py-2">
                    <dt className="text-gray-500">ID Signatura</dt>
                    <dd className="font-mono text-xs text-gray-300">{solicitud.signatura_documento_id}</dd>
                  </div>
                )}
                {solicitud.contrato_firmado_at && (
                  <div className="flex justify-between py-2">
                    <dt className="text-gray-500">Firmado</dt>
                    <dd className="text-white">{format(new Date(solicitud.contrato_firmado_at), "d MMM yyyy, HH:mm", { locale: es })}</dd>
                  </div>
                )}
                {solicitud.contrato_url && (
                  <div className="flex justify-between py-2">
                    <dt className="text-gray-500">Documento</dt>
                    <dd>
                      <a href={solicitud.contrato_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline text-xs">
                        Descargar PDF firmado ↗
                      </a>
                    </dd>
                  </div>
                )}
                {solicitud.contrato_firmado && solicitud.biometria_firmante && (
                  <div className="mt-3 rounded-lg border border-green-500/20 bg-green-500/5 p-3 space-y-2">
                    <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">Identidad biométrica verificada</p>
                    {solicitud.biometria_firmante.nombre_completo && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Nombre</span>
                        <span className="text-white font-medium">{solicitud.biometria_firmante.nombre_completo}</span>
                      </div>
                    )}
                    {solicitud.biometria_firmante.numero_documento && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Documento</span>
                        <span className="text-white font-medium">{solicitud.biometria_firmante.numero_documento}</span>
                      </div>
                    )}
                    {solicitud.biometria_firmante.intentos !== undefined && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Intentos</span>
                        <span className="text-white">{solicitud.biometria_firmante.intentos}</span>
                      </div>
                    )}
                    {solicitud.biometria_firmante.fotos && solicitud.biometria_firmante.fotos.length > 0 && (
                      <div className="pt-1">
                        <p className="text-xs text-gray-500 mb-2">Fotos capturadas</p>
                        <div className="flex gap-2">
                          {Object.values(
                            solicitud.biometria_firmante.fotos.reduce((acc, foto) => {
                              if (!acc[foto.type]) acc[foto.type] = foto;
                              return acc;
                            }, {} as Record<string, typeof solicitud.biometria_firmante.fotos[0]>)
                          ).map((foto) => (
                            <a key={foto.type} href={foto.url} target="_blank" rel="noopener noreferrer"
                              className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:text-white transition capitalize">
                              {foto.type === "front" ? "DNI Frente" : foto.type === "back" ? "DNI Dorso" : "Selfie"} ↗
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Firmado pero estado no aprobado: botón de confirmación prominente */}
                {(solicitud.contrato_firmado && !["aprobado", "activo", "completado"].includes(solicitud.estado)) && (
                  <div className="pt-3">
                    <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-300 mb-3">
                      ✓ El cliente ya firmó biométricamente. Confirmá la aprobación para crear el préstamo.
                    </div>
                    <button
                      onClick={() => ejecutar(
                        async () => {
                          const token = await getToken();
                          if (!token) throw new Error("Sin sesión");
                          const res = await fetch(`/api/solicitudes/${id}/aprobar`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ comprobante: "contrato_signatura_firmado" }),
                          });
                          if (!res.ok) throw new Error((await res.json()).error ?? "Error al aprobar");
                        },
                        "Préstamo aprobado y creado correctamente."
                      )}
                      disabled={procesando}
                      className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-500 transition disabled:opacity-50"
                    >
                      {procesando ? "Aprobando..." : "✓ Confirmar aprobación del préstamo"}
                    </button>
                  </div>
                )}
                {(!solicitud.contrato_firmado && solicitud.contrato_enviado_at) && (
                  <div className="pt-3 flex gap-2">
                    <button
                      onClick={verificarFirma}
                      disabled={verificandoFirma}
                      className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-semibold text-green-300 hover:bg-green-600 hover:text-white transition disabled:opacity-50"
                    >
                      {verificandoFirma ? "Verificando..." : "🔄 Verificar firma"}
                    </button>
                    <button
                      onClick={enviarContrato}
                      disabled={enviandoContrato}
                      className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-600 hover:text-white transition disabled:opacity-50"
                    >
                      {enviandoContrato ? "Generando..." : "↩ Reenviar contrato"}
                    </button>
                    <button
                      onClick={descargarContrato}
                      disabled={descargandoContrato}
                      className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-600 transition disabled:opacity-50"
                    >
                      {descargandoContrato ? "Generando..." : "⬇ Descargar PDF corregido"}
                    </button>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>
      )}

      {/* Historial de estados */}
      {historial.length > 0 && (
        <div className="rounded-xl border border-gray-700 bg-gray-800">
          <div className="border-b border-gray-700 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-300">Historial de estados</h2>
          </div>
          <ul className="divide-y divide-gray-700">
            {historial.map((h, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 text-lg text-gray-500">{HISTORIAL_ICONO[h.estado] ?? "○"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white capitalize">{h.estado.replace(/_/g, " ")}</span>
                    <time className="text-xs text-gray-500">
                      {format(new Date(h.fecha), "d MMM yyyy, HH:mm", { locale: es })}
                    </time>
                  </div>
                  {h.motivo && <p className="mt-0.5 text-xs text-gray-400 truncate">{h.motivo}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className={`rounded-xl border p-4 text-sm font-medium ${
          resultado.tipo === "ok"
            ? "border-green-500/30 bg-green-500/10 text-green-300"
            : "border-red-500/30 bg-red-500/10 text-red-300"
        }`}>
          {resultado.msg}
          {resultado.tipo === "ok" && (
            <button onClick={() => router.push("/admin/solicitudes")} className="ml-3 text-xs underline opacity-70 hover:opacity-100">
              Volver al listado
            </button>
          )}
        </div>
      )}

      {/* Acciones */}
      {puedeActuar && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</p>
          <div className="flex flex-wrap gap-3">
            {solicitud.estado === "pendiente" && (
              <button onClick={() => ejecutar(accionPorModal.revision, MSG_OK.revision)}
                disabled={procesando}
                className="rounded-lg bg-blue-600/20 border border-blue-500/30 px-5 py-2.5 text-sm font-semibold text-blue-300 hover:bg-blue-600 hover:text-white transition disabled:opacity-50">
                En revisión
              </button>
            )}
            <button onClick={() => setModal("pre_aprobar")} disabled={procesando}
              className="rounded-lg bg-cyan-600/20 border border-cyan-500/30 px-5 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-600 hover:text-white transition disabled:opacity-50">
              ✅ Pre-aprobar
            </button>
            <button onClick={() => setModal("pausar")} disabled={procesando}
              className="rounded-lg bg-orange-600/20 border border-orange-500/30 px-5 py-2.5 text-sm font-semibold text-orange-300 hover:bg-orange-600 hover:text-white transition disabled:opacity-50">
              ⏸️ Pausar
            </button>
            <button onClick={() => setModal("aprobar")} disabled={procesando}
              className="rounded-lg border border-green-500/30 bg-green-500/10 px-6 py-2.5 text-sm font-semibold text-green-300 hover:bg-green-600 hover:text-white transition disabled:opacity-50">
              ✓ Aprobar sin Signatura
            </button>
            <button onClick={() => setModal("rechazar")} disabled={procesando}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-6 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-600 hover:text-white transition disabled:opacity-50">
              ✕ Rechazar
            </button>
          </div>
        </div>
      )}

      {/* ── Modales ───────────────────────────────────────────────────────── */}

      {/* Pre-aprobar */}
      {modal === "pre_aprobar" && (
        <ModalBase titulo="Pre-aprobar solicitud" onCancelar={() => setModal(null)}
          onConfirmar={() => ejecutar(accionPorModal.pre_aprobar, MSG_OK.pre_aprobar)}
          procesando={procesando} disabled={!condiciones.trim()}>
          <p className="text-sm text-gray-400">Indicá las condiciones que debe cumplir el cliente para la aprobación final.</p>
          <textarea className="mt-3 w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500 resize-none"
            rows={3} placeholder="Ej: Presentar recibo de sueldo de los últimos 3 meses"
            value={condiciones} onChange={(e) => setCondiciones(e.target.value)} />
        </ModalBase>
      )}

      {/* Pausar */}
      {modal === "pausar" && (
        <ModalBase titulo="Pausar solicitud" onCancelar={() => setModal(null)}
          onConfirmar={() => ejecutar(accionPorModal.pausar, MSG_OK.pausar)}
          procesando={procesando} disabled={!pausaMotivo.trim()}>
          <textarea className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 resize-none"
            rows={2} placeholder="Motivo de la pausa (obligatorio)"
            value={pausaMotivo} onChange={(e) => setPausaMotivo(e.target.value)} />
          <div className="mt-3">
            <label className="mb-1 block text-xs text-gray-500">Reanudar revisión el (opcional):</label>
            <input type="date" value={pausaHasta} onChange={(e) => setPausaHasta(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-orange-500" />
          </div>
        </ModalBase>
      )}

      {/* Aprobar */}
      {modal === "aprobar" && (
        <ModalBase titulo="Aprobar solicitud" onCancelar={() => setModal(null)}
          onConfirmar={() => ejecutar(accionPorModal.aprobar, MSG_OK.aprobar)}
          procesando={procesando} disabled={!comprobante.trim()}
          colorBtn="bg-green-600 hover:bg-green-500">
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-300">
            Aprobación directa sin firma Signatura. Usá esta opción solo si el cliente ya firmó por otro medio. El flujo normal es enviar el contrato a Signatura y esperar la firma del cliente.
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Monto a acreditar</label>
              <p className="text-sm font-bold text-white">{formatearPesos(solicitud.monto)}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">CBU del cliente</label>
              <p className="font-mono text-sm text-gray-300">{solicitud.cbu ?? "—"}</p>
              {(solicitud as any).banco && (
                <p className="text-xs text-gray-500 mt-0.5">{(solicitud as any).banco}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Nro. comprobante / referencia *</label>
              <input value={comprobante} onChange={(e) => setComprobante(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-green-500"
                placeholder="TRF-20240406-001" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Notas adicionales (opcional)</label>
              <input value={notasAprobar} onChange={(e) => setNotasAprobar(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-green-500"
                placeholder="Observaciones..." />
            </div>
          </div>
        </ModalBase>
      )}

      {/* Rechazar */}
      {modal === "rechazar" && (
        <ModalBase titulo="Rechazar solicitud" onCancelar={() => setModal(null)}
          onConfirmar={() => ejecutar(accionPorModal.rechazar, MSG_OK.rechazar)}
          procesando={procesando} disabled={!motivoRechazo.trim()}
          colorBtn="bg-red-600 hover:bg-red-500">
          <p className="text-sm text-gray-400">El cliente verá este motivo en su portal.</p>
          <textarea className="mt-3 w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500 resize-none"
            rows={3} placeholder="Ej: Historial crediticio con deuda activa en BCRA"
            value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} />
        </ModalBase>
      )}

      {/* Eliminar solicitud */}
      {modalEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-gray-900 p-6">
            <h3 className="text-base font-bold text-white">Eliminar solicitud</h3>
            <p className="mt-2 text-sm text-gray-400">
              Esta acción borra la solicitud y todos sus préstamos y cuotas asociados. Es irreversible.
            </p>
            <p className="mt-4 text-sm text-gray-300">
              Escribí <span className="font-mono font-bold text-red-400">ELIMINAR</span> para confirmar:
            </p>
            <input
              type="text"
              value={confirmEliminar}
              onChange={(e) => setConfirmEliminar(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
              placeholder="ELIMINAR"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setModalEliminar(false)}
                className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarSolicitud}
                disabled={confirmEliminar !== "ELIMINAR" || eliminando}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition disabled:opacity-40"
              >
                {eliminando ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal base reutilizable ────────────────────────────────────────────────────
function ModalBase({
  titulo, children, onCancelar, onConfirmar, procesando, disabled = false, colorBtn = "bg-blue-600 hover:bg-blue-500",
}: {
  titulo: string;
  children: React.ReactNode;
  onCancelar: () => void;
  onConfirmar: () => void;
  procesando: boolean;
  disabled?: boolean;
  colorBtn?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white">{titulo}</h3>
        <div className="mt-3">{children}</div>
        <div className="mt-5 flex gap-3">
          <button onClick={onConfirmar} disabled={procesando || disabled}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-40 ${colorBtn}`}>
            {procesando ? "Procesando..." : "Confirmar"}
          </button>
          <button onClick={onCancelar}
            className="flex-1 rounded-lg border border-gray-600 py-2.5 text-sm text-gray-400 hover:bg-gray-800 transition">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
