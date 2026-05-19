"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthToken } from "@/lib/supabase/getToken";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ActividadAdmin } from "@/types";

type ActividadConAdmin = ActividadAdmin & {
  usuarios: { nombre: string | null; email: string } | null;
};

const ICONO_ACCION: Record<string, string> = {
  aprobar_solicitud:  "✅",
  rechazar_solicitud: "❌",
  crear_plan:         "📐",
  editar_plan:        "✏️",
  eliminar_plan:      "🗑️",
  cobro_exitoso:      "💰",
  cobro_fallido:      "⚠️",
};

const BADGE_ACCION: Record<string, string> = {
  aprobar_solicitud:  "bg-green-500/20 text-green-300 border border-green-500/30",
  rechazar_solicitud: "bg-red-500/20 text-red-300 border border-red-500/30",
  crear_plan:         "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  editar_plan:        "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  eliminar_plan:      "bg-red-500/20 text-red-300 border border-red-500/30",
  cobro_exitoso:      "bg-green-500/20 text-green-300 border border-green-500/30",
  cobro_fallido:      "bg-orange-500/20 text-orange-300 border border-orange-500/30",
};

export default function ActividadAdminPage() {
  const [actividad, setActividad] = useState<ActividadConAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const token = await getAuthToken();
    if (!token) { setLoading(false); return; }

    const res = await fetch("/api/admin/actividad", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setActividad(json.actividad ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Actividad</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          Registro de acciones realizadas por administradores
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-800" />
          ))}
        </div>
      ) : actividad.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-10 text-center text-gray-500">
          No hay actividad registrada.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          <ul className="divide-y divide-gray-700">
            {actividad.map((item) => (
              <li key={item.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-700/50 transition">
                <span className="mt-0.5 text-xl">
                  {ICONO_ACCION[item.accion] ?? "📋"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_ACCION[item.accion] ?? "bg-gray-700 text-gray-300 border border-gray-600"}`}>
                        {item.accion.replace(/_/g, " ")}
                      </span>
                      {item.usuarios && (
                        <span className="text-xs text-gray-500">
                          {item.usuarios.nombre ?? item.usuarios.email}
                        </span>
                      )}
                    </div>
                    <time className="flex-shrink-0 text-xs text-gray-500">
                      {format(new Date(item.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                    </time>
                  </div>
                  {item.detalle && (
                    <p className="mt-1 text-xs text-gray-400 truncate">{item.detalle}</p>
                  )}
                  {item.entidad_tipo && item.entidad_id && (
                    <p className="mt-0.5 text-xs text-gray-600">
                      {item.entidad_tipo}: <span className="font-mono">{item.entidad_id}</span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
