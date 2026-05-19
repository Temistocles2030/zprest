"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthToken } from "@/lib/supabase/getToken";

type Firma = {
  id: string;
  estado: string;
  monto: number;
  plazo: number;
  cuotas: number;
  signatura_documento_id: string;
  contrato_enviado_at: string | null;
  contrato_firmado: boolean;
  contrato_firmado_at: string | null;
  biometria_firmante: Record<string, unknown> | null;
  usuarios: { nombre: string; email: string; dni: string } | null;
  planes: { nombre: string; tipo: string } | null;
};

type Evento = {
  id: string;
  received_at: string;
  notification_action: string;
  document_id: string;
  signature_id: string | null;
  new_status: string | null;
  raw_payload: Record<string, unknown>;
  procesado: boolean;
  error_msg: string | null;
  solicitudes: { id: string; estado: string; usuarios: { nombre: string; email: string } | null } | null;
};

type DetalleDoc = {
  id: string;
  status: string;
  title: string;
  created_at: string;
  completed_at?: string;
  download_url?: string;
  signatures: Array<{
    id?: string;
    status: string;
    email?: string;
    signed_at?: string;
    biometria: {
      full_name: string;
      document_number: string;
      country: string;
      attempts: number;
      photos: Array<{ url: string; type: string }>;
    } | null;
  }>;
};

const ACCION_LABEL: Record<string, string> = {
  DS: "Firma completada",
  DC: "Cambio de estado",
  SD: "Firma rechazada",
};

const STATUS_COLOR: Record<string, string> = {
  CO: "text-green-400",
  CA: "text-red-400",
  PE: "text-yellow-400",
};

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export default function SignaturaAdminPage() {
  const [tab, setTab] = useState<"firmas" | "eventos">("firmas");
  const [firmas, setFirmas] = useState<Firma[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalleDocId, setDetalleDocId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetalleDoc | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    getAuthToken().then(setToken);
  }, []);

  const cargar = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/signatura?tab=${tab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (tab === "firmas") setFirmas(data.solicitudes ?? []);
      else setEventos(data.eventos ?? []);
    } finally {
      setLoading(false);
    }
  }, [token, tab]);

  useEffect(() => { cargar(); }, [cargar]);

  const verDetalle = async (docId: string) => {
    if (detalleDocId === docId) {
      setDetalleDocId(null);
      setDetalle(null);
      return;
    }
    setDetalleDocId(docId);
    setDetalle(null);
    setErrorDetalle(null);
    setLoadingDetalle(true);
    try {
      const res = await fetch(`/api/admin/signatura/documento/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setDetalle(data.documento);
    } catch (e) {
      setErrorDetalle(e instanceof Error ? e.message : "Error");
    } finally {
      setLoadingDetalle(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Signatura</h1>
        <p className="text-gray-400 text-sm mt-1">Panel de contratos electrónicos y firmas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["firmas", "eventos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t
                ? "bg-blue-600 text-white"
                : "bg-white/10 text-gray-300 hover:bg-white/15"
            }`}
          >
            {t === "firmas" ? "Firmas" : "Eventos webhook"}
          </button>
        ))}
        <button
          onClick={cargar}
          className="ml-auto px-3 py-2 rounded-lg text-sm bg-white/10 text-gray-300 hover:bg-white/15"
        >
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">Cargando...</div>
      ) : tab === "firmas" ? (
        <FirmasTab firmas={firmas} detalleDocId={detalleDocId} detalle={detalle}
          loadingDetalle={loadingDetalle} errorDetalle={errorDetalle} onVerDetalle={verDetalle} />
      ) : (
        <EventosTab eventos={eventos} />
      )}
    </div>
  );
}

function FirmasTab({
  firmas, detalleDocId, detalle, loadingDetalle, errorDetalle, onVerDetalle,
}: {
  firmas: Firma[];
  detalleDocId: string | null;
  detalle: DetalleDoc | null;
  loadingDetalle: boolean;
  errorDetalle: string | null;
  onVerDetalle: (id: string) => void;
}) {
  if (!firmas.length) return <div className="text-gray-400 text-center py-16">Sin documentos enviados aún</div>;

  return (
    <div className="space-y-3">
      {firmas.map((f) => (
        <div key={f.id} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="flex items-center gap-4 p-4">
            {/* Estado firma */}
            <div className="flex-shrink-0">
              {f.contrato_firmado ? (
                <span className="text-2xl">✅</span>
              ) : (
                <span className="text-2xl">⏳</span>
              )}
            </div>

            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-medium">{f.usuarios?.nombre ?? "—"}</span>
                <span className="text-gray-400 text-sm">{f.usuarios?.email}</span>
                <span className="text-gray-500 text-xs">DNI {f.usuarios?.dni}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-gray-300 text-sm">{formatARS(f.monto)}</span>
                <span className="text-gray-500 text-xs">{f.planes?.nombre}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  f.estado === "aprobado" ? "bg-green-500/20 text-green-400" :
                  f.estado === "pre_aprobado" ? "bg-blue-500/20 text-blue-400" :
                  "bg-gray-500/20 text-gray-400"
                }`}>{f.estado}</span>
              </div>
              <div className="flex gap-4 mt-1 text-xs text-gray-500">
                <span>Enviado: {fmt(f.contrato_enviado_at)}</span>
                {f.contrato_firmado && <span className="text-green-400">Firmado: {fmt(f.contrato_firmado_at)}</span>}
              </div>
              <div className="text-xs text-gray-600 mt-0.5 font-mono">{f.signatura_documento_id}</div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => onVerDetalle(f.signatura_documento_id)}
                className="px-3 py-1.5 rounded-lg text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/20"
              >
                {detalleDocId === f.signatura_documento_id ? "Cerrar" : "Ver firma"}
              </button>
            </div>
          </div>

          {/* Panel de detalle expandido */}
          {detalleDocId === f.signatura_documento_id && (
            <div className="border-t border-white/10 bg-black/20 p-4">
              {loadingDetalle && <div className="text-gray-400 text-sm">Consultando Signatura...</div>}
              {errorDetalle && <div className="text-red-400 text-sm">{errorDetalle}</div>}
              {detalle && <DetalleDocumento doc={detalle} />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DetalleDocumento({ doc }: { doc: DetalleDoc }) {
  const statusLabel: Record<string, string> = {
    CO: "Completado", CA: "Cancelado", PE: "Pendiente", SI: "Enviado",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-gray-500 text-xs mb-0.5">Estado documento</div>
          <div className={`font-medium ${STATUS_COLOR[doc.status] ?? "text-gray-300"}`}>
            {statusLabel[doc.status] ?? doc.status}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-xs mb-0.5">Creado</div>
          <div className="text-gray-300">{fmt(doc.created_at)}</div>
        </div>
        {doc.completed_at && (
          <div>
            <div className="text-gray-500 text-xs mb-0.5">Completado</div>
            <div className="text-green-400">{fmt(doc.completed_at)}</div>
          </div>
        )}
        {doc.download_url && (
          <div>
            <div className="text-gray-500 text-xs mb-0.5">PDF firmado</div>
            <a href={doc.download_url} target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:underline text-xs">
              Descargar PDF
            </a>
          </div>
        )}
      </div>

      {doc.signatures.map((sig, i) => (
        <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-white font-medium text-sm">Firmante {i + 1}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              sig.status === "CO" ? "bg-green-500/20 text-green-400" :
              sig.status === "CA" ? "bg-red-500/20 text-red-400" :
              "bg-yellow-500/20 text-yellow-400"
            }`}>{statusLabel[sig.status] ?? sig.status}</span>
            {sig.email && <span className="text-gray-400 text-xs">{sig.email}</span>}
          </div>

          {sig.biometria ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-gray-500 text-xs mb-0.5">Nombre completo</div>
                  <div className="text-white">{sig.biometria.full_name}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-0.5">Documento</div>
                  <div className="text-white">{sig.biometria.document_number}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-0.5">País</div>
                  <div className="text-white">{sig.biometria.country}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-0.5">Intentos</div>
                  <div className="text-white">{sig.biometria.attempts}</div>
                </div>
              </div>

              {sig.biometria.photos?.length > 0 && (
                <div>
                  <div className="text-gray-500 text-xs mb-2">Fotos biométricas</div>
                  <div className="flex gap-3 flex-wrap">
                    {sig.biometria.photos.map((foto, j) => (
                      <a key={j} href={foto.url} target="_blank" rel="noopener noreferrer"
                        className="group relative">
                        <img
                          src={foto.url}
                          alt={foto.type}
                          className="w-24 h-24 object-cover rounded-lg border border-white/20 group-hover:border-blue-400 transition"
                        />
                        <div className="text-center text-xs text-gray-400 mt-1">
                          {foto.type === "front" ? "DNI Frente" :
                           foto.type === "back" ? "DNI Dorso" : "Selfie"}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              {sig.status === "PE" || sig.status === "SI"
                ? "Pendiente de firma — biometría no disponible aún"
                : "Sin datos biométricos"}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EventosTab({ eventos }: { eventos: Evento[] }) {
  if (!eventos.length) return <div className="text-gray-400 text-center py-16">Sin eventos registrados</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs border-b border-white/10">
            <th className="text-left pb-3 pr-4">Fecha</th>
            <th className="text-left pb-3 pr-4">Acción</th>
            <th className="text-left pb-3 pr-4">Estado</th>
            <th className="text-left pb-3 pr-4">Documento</th>
            <th className="text-left pb-3 pr-4">Cliente</th>
            <th className="text-left pb-3">Procesado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {eventos.map((ev) => (
            <tr key={ev.id} className="hover:bg-white/5 transition">
              <td className="py-2.5 pr-4 text-gray-400 whitespace-nowrap">{fmt(ev.received_at)}</td>
              <td className="py-2.5 pr-4">
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  ev.notification_action === "DS" ? "bg-green-500/20 text-green-400" :
                  ev.notification_action === "SD" ? "bg-red-500/20 text-red-400" :
                  "bg-blue-500/20 text-blue-400"
                }`}>
                  {ACCION_LABEL[ev.notification_action] ?? ev.notification_action}
                </span>
              </td>
              <td className="py-2.5 pr-4">
                {ev.new_status ? (
                  <span className={`text-xs ${STATUS_COLOR[ev.new_status] ?? "text-gray-400"}`}>
                    {ev.new_status}
                  </span>
                ) : "—"}
              </td>
              <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">
                {ev.document_id.slice(0, 8)}...
              </td>
              <td className="py-2.5 pr-4 text-gray-300">
                {ev.solicitudes?.usuarios?.nombre ?? <span className="text-gray-600">Sin solicitud</span>}
              </td>
              <td className="py-2.5">
                {ev.procesado ? (
                  <span className="text-green-400 text-xs">✓ OK</span>
                ) : (
                  <span className="text-red-400 text-xs" title={ev.error_msg ?? ""}>✗ {ev.error_msg ?? "Error"}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
