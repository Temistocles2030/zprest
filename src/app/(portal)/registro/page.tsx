"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Esta página no se usa — el registro está en /login
// El AuthGuard ya no redirige aquí. Por las dudas, redirigir a /espera.
export default function RegistroRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/espera"); }, [router]);
  return null;
}
