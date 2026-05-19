"use client";

import { useAuth } from "@/hooks/useAuth";

export default function EsperaPage() {
  const { usuario, signOut } = useAuth();

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
