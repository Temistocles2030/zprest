"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIdleTimer } from "@/hooks/useIdleTimer";

const IDLE_MINUTES    = 10;
const WARNING_MINUTES = 2;

export default function IdleGuard() {
  const { signOut, user } = useAuth();
  const [showWarning, setShowWarning] = useState(false);

  const handleWarning = useCallback(() => {
    setShowWarning(true);
  }, []);

  const handleIdle = useCallback(() => {
    setShowWarning(false);
    signOut();
  }, [signOut]);

  const handleContinue = useCallback(() => {
    setShowWarning(false);
    // El hook ya resetea el timer con cualquier interacción del usuario
  }, []);

  // Solo activar si hay sesión
  useIdleTimer({
    idleMinutes: user ? IDLE_MINUTES : 999,
    warningMinutes: WARNING_MINUTES,
    onWarning: handleWarning,
    onIdle: handleIdle,
  });

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-yellow-500/30 bg-gray-900 p-6 shadow-2xl text-center">
        <div className="mb-3 text-4xl">⏱</div>
        <h2 className="mb-1 text-lg font-bold text-white">¿Seguís ahí?</h2>
        <p className="mb-5 text-sm text-gray-400">
          Tu sesión se cerrará automáticamente en{" "}
          <span className="font-semibold text-yellow-400">{WARNING_MINUTES} minutos</span>{" "}
          por inactividad.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { setShowWarning(false); signOut(); }}
            className="flex-1 rounded-xl border border-gray-600 py-2.5 text-sm text-gray-400 hover:bg-gray-800 transition"
          >
            Cerrar sesión
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 rounded-xl bg-yellow-500 py-2.5 text-sm font-bold text-black hover:bg-yellow-400 transition"
          >
            Seguir
          </button>
        </div>
      </div>
    </div>
  );
}
