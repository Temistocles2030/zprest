"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function SolicitarRouter() {
  const { usuario } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!usuario) return;
    if (usuario.role === "admin") { router.replace("/admin"); return; }
    const tipo = (usuario as unknown as { tipo_cliente?: string }).tipo_cliente;
    if (tipo === "personal") router.replace("/solicitar/personal");
    else if (tipo === "pyme") router.replace("/solicitar/pyme");
  }, [usuario, router]);

  if (!usuario) return null;

  const tipo = (usuario as unknown as { tipo_cliente?: string }).tipo_cliente;
  if (usuario.role === "admin") return null;

  if (!tipo || tipo === "pendiente") {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
        <div className="text-5xl">⏳</div>
        <h1 className="text-xl font-bold text-white">Cuenta pendiente de aprobación</h1>
        <p className="text-sm text-gray-400">
          Tu cuenta está siendo revisada por nuestro equipo. Una vez aprobada podrás solicitar tu crédito.
        </p>
        <a href="/dashboard" className="inline-block rounded-lg border border-gray-600 px-5 py-2.5 text-sm text-white hover:bg-gray-800">
          Volver al dashboard
        </a>
      </div>
    );
  }

  return null;
}
