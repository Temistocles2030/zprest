"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
const POLL_INTERVAL = 20_000; // 20 segundos

export default function EsperaPage() {
  const { user, usuario, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000);

  const checkStatus = useCallback(async () => {
    if (!user?.uid || IS_MOCK) return;
    setChecking(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("usuarios")
        .select("estado_registro")
        .eq("id", user.uid)
        .single();

      setLastCheck(new Date());
      setCountdown(POLL_INTERVAL / 1000);

      if (data?.estado_registro === "aprobado") {
        window.location.href = "/dashboard";
      }
    } catch {
      // silencioso — reintenta en el próximo ciclo
    } finally {
      setChecking(false);
    }
  }, [user?.uid]);

  // Polling automático
  useEffect(() => {
    if (!user?.uid || IS_MOCK) return;
    const interval = setInterval(checkStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [user?.uid, checkStatus]);

  // Countdown visual
  useEffect(() => {
    if (IS_MOCK) return;
    const tick = setInterval(() => {
      setCountdown((c) => (c <= 1 ? POLL_INTERVAL / 1000 : c - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      {/* Icono animado */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20">
        <svg className="h-10 w-10 text-blue-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-white">Tu cuenta está siendo revisada</h1>
      <p className="mt-3 max-w-md text-gray-400">
        Hola{usuario?.nombre ? `, ${usuario.nombre.split(" ")[0]}` : ""}. Tu registro fue recibido correctamente.
        Nuestro equipo está calificando tu perfil para asignarte el tipo de crédito disponible.
      </p>

      <div className="mt-8 w-full max-w-sm rounded-xl border border-gray-700 bg-gray-800/60 p-5 text-left space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-sm font-bold">✓</span>
          <span className="text-sm text-gray-300">Registro completado</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20 border border-blue-500/30">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          </span>
          <span className="text-sm text-gray-300">Calificación de perfil en proceso</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-gray-500 text-sm">3</span>
          <span className="text-sm text-gray-500">Acceso al portal habilitado</span>
        </div>
      </div>

      {/* Botón verificar + estado */}
      {!IS_MOCK && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            onClick={checkStatus}
            disabled={checking}
            className="flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-5 py-2.5 text-sm font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition"
          >
            {checking ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                Verificando...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Verificar estado
              </>
            )}
          </button>
          <p className="text-xs text-gray-600">
            {lastCheck
              ? `Última verificación: ${lastCheck.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · próxima en ${countdown}s`
              : `Verificación automática en ${countdown}s`}
          </p>
        </div>
      )}

      <p className="mt-6 text-xs text-gray-600">
        Te notificaremos por email cuando tu cuenta esté activa.
        Ante cualquier consulta escribinos a{" "}
        <a href="mailto:contacto@zprest.com.ar" className="text-blue-400 hover:underline">
          contacto@zprest.com.ar
        </a>
      </p>

      <button
        onClick={signOut}
        className="mt-8 text-sm text-gray-600 hover:text-gray-400 transition"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
