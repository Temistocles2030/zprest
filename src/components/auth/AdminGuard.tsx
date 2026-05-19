"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, usuario, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (usuario !== null && usuario.role !== "admin") {
        // Solo redirigir cuando usuario cargó Y no es admin
        router.replace("/dashboard");
      }
    }
  }, [user, usuario, loading, router]);

  // Spinner mientras carga la sesión o mientras usuario todavía es null (cargando en background)
  if (loading || (user && usuario === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!user || usuario?.role !== "admin") return null;

  return <>{children}</>;
}
