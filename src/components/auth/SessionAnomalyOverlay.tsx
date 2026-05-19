"use client";

import { useEffect, useState } from "react";

export default function SessionAnomalyOverlay() {
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          window.location.href = "/login";
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-red-700/50 bg-gray-950 p-8 text-center shadow-2xl">
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-900/40 border border-red-700/50 text-3xl">
            🔐
          </div>
        </div>
        <h2 className="text-xl font-bold text-red-400">Sesión cerrada por seguridad</h2>
        <p className="mt-3 text-sm text-gray-300 leading-relaxed">
          Se detectó un inicio de sesión desde otro dispositivo.<br/>
          Tu sesión anterior fue cerrada automáticamente.
        </p>
        <div className="mt-5 rounded-xl border border-yellow-700/40 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300 text-left leading-relaxed">
          <p className="font-semibold mb-1">Procedimiento de seguridad</p>
          <p>
            Se notificó automáticamente a{" "}
            <a href="mailto:seguridad@zprest.com.ar" className="underline hover:text-yellow-200">
              seguridad@zprest.com.ar
            </a>{" "}
            con los datos del acceso. Si no fuiste vos, comunicate con nosotros de inmediato.
          </p>
        </div>
        <p className="mt-6 text-xs text-gray-500">
          Redirigiendo al login en{" "}
          <span className="font-bold text-gray-300">{countdown}</span> segundos...
        </p>
        <button
          onClick={() => { window.location.href = "/login"; }}
          className="mt-4 w-full rounded-xl bg-[#d4af37] py-2.5 font-semibold text-black hover:bg-[#c9a227] transition-colors"
        >
          Ir al login ahora
        </button>
      </div>
    </div>
  );
}
