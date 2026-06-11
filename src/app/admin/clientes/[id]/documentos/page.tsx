"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAuthToken } from "@/lib/supabase/getToken";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import type { EstadoSolicitud } from "@/types";

interface PageProps { params: Promise<{ id: string }> }

type Cliente = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string;
  dni: string | null;
  cuil: string | null;
};

type SolicitudDocs = {
  id: string;
  estado: EstadoSolicitud;
  documentos: string[];
  created_at: string;
  planes: { nombre: string; tipo: string } | null;
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

function safeFmt(val: string | null | undefined, fmt: string): string {
  if (!val) return "—";
  const d = new Date(val);
  return isValid(d) ? format(d, fmt, { locale: es }) : "—";
}

function iconDocumento(url: string) {
  if (url.includes(".pdf")) return "📄";
  if (url.includes(".doc")) return "📝";
  return "🖼️";
}

export default function DocumentosClientePage({ params }: PageProps) {
  const { id } = use(params);

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudDocs[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const cargar = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) { setNotFound(true); setLoading(false); return; }

    const res = await fetch(`/api/admin/clientes/${id}/documentos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { setNotFound(true); setLoading(false); return; }
    const json = await res.json();
    setCliente(json.cliente as Cliente);
    setSolicitudes((json.solicitudes ?? []) as SolicitudDocs[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return (
    <div className="max-w-2xl space-y-4">
      {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-800" />)}
    </div>
  );

  if (notFound || !cliente) return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-10 text-center">
      <p className="text-gray-400">Cliente no encontrado.</p>
      <Link href="/admin/clientes" className="mt-3 inline-block text-sm text-blue-400 hover:underline">← Volver</Link>
    </div>
  );

  const conDocumentos = solicitudes.filter((s) => s.documentos?.length > 0);

  return (
    <div className="max-w-2xl space-y-5">
      <Link href="/admin/clientes" className="text-sm text-gray-500 hover:text-gray-300 transition">
        ← Clientes
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">
          Documentación de {cliente.nombre ?? cliente.email}
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {cliente.email}
          {cliente.dni && <span className="ml-2 font-mono text-xs text-gray-500">DNI {cliente.dni}</span>}
          {cliente.cuil && <span className="ml-2 font-mono text-xs text-gray-500">CUIL {cliente.cuil}</span>}
        </p>
      </div>

      {conDocumentos.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-10 text-center">
          <p className="text-gray-400">Este cliente no tiene documentos adjuntos.</p>
        </div>
      ) : (
        conDocumentos.map((s) => (
          <div key={s.id} className="rounded-xl border border-gray-700 bg-gray-800">
            <div className="border-b border-gray-700 px-5 py-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-300">
                  {s.planes?.nombre ?? "Solicitud"} · {safeFmt(s.created_at, "d MMM yyyy")}
                </h2>
                <Link href={`/admin/solicitudes/${s.id}`} className="text-xs text-blue-400 hover:text-blue-300 transition">
                  Ver solicitud #{s.id.slice(0, 8)} →
                </Link>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${BADGE[s.estado]}`}>
                {ESTADO_LABEL[s.estado]}
              </span>
            </div>
            <div className="divide-y divide-gray-700">
              {s.documentos.map((url, i) => {
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
        ))
      )}
    </div>
  );
}
