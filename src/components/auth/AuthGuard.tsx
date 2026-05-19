"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import SessionAnomalyOverlay from "./SessionAnomalyOverlay";

/**
 * Flujo de acceso al portal:
 *
 * 1. Sin sesión                        → /login
 * 2. Admin                             → /admin
 * 3. estado_registro = pendiente_aprobacion → /espera
 * 4. estado_registro = aprobado        → acceso completo al portal
 */

const RUTAS_ESPERA = ["/espera", "/registro"];
const RUTA_COMPLETAR = "/completar-perfil";

function perfilCompleto(usuario: { nombre?: string | null; dni?: string | null }) {
  return !!(usuario.nombre && usuario.dni);
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, usuario, loading, sessionAnomaly } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (sessionAnomaly) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (usuario?.role === "admin") {
      router.replace("/admin");
      return;
    }

    if (usuario) {
      const estadoRegistro = usuario.estado_registro ?? "pendiente_aprobacion";

      // Pendiente de aprobación → solo puede ver /espera
      if (estadoRegistro === "pendiente_aprobacion" && !RUTAS_ESPERA.includes(pathname)) {
        router.replace("/espera");
        return;
      }

      // Ya aprobado → sacar de /espera y /registro
      if (estadoRegistro === "aprobado" && RUTAS_ESPERA.includes(pathname)) {
        router.replace("/dashboard");
        return;
      }

      // Perfil incompleto → completar antes de acceder al portal
      if (estadoRegistro === "aprobado" && !perfilCompleto(usuario) && pathname !== RUTA_COMPLETAR) {
        router.replace(RUTA_COMPLETAR);
        return;
      }

      // Perfil ya completo → sacar de completar-perfil
      if (pathname === RUTA_COMPLETAR && perfilCompleto(usuario)) {
        router.replace("/dashboard");
        return;
      }
    }
  }, [user, usuario, loading, sessionAnomaly, router, pathname]);

  if (loading || (user && usuario === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (sessionAnomaly) return <SessionAnomalyOverlay />;

  if (!user) return null;

  return <>{children}</>;
}
