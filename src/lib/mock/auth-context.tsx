"use client";

/**
 * Contexto de auth mock — reemplaza Firebase Auth en modo demo.
 * Se activa con NEXT_PUBLIC_MOCK_MODE=true
 */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MOCK_ADMIN, MOCK_USUARIO } from "./data";
import type { Usuario } from "@/types";

const MOCK_SESSION_KEY = "zprest_mock_session";

interface MockAuthContextType {
  usuario: Usuario | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsAdmin: () => Promise<void>;
  signOut: () => void;
}

const MockAuthContext = createContext<MockAuthContextType | null>(null);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Restaurar sesión del localStorage
    const saved = localStorage.getItem(MOCK_SESSION_KEY);
    if (saved) {
      setUsuario(saved === "admin" ? MOCK_ADMIN : MOCK_USUARIO);
    }
    setLoading(false);
  }, []);

  const signInWithGoogle = async () => {
    localStorage.setItem(MOCK_SESSION_KEY, "user");
    setUsuario(MOCK_USUARIO);
    router.push("/dashboard");
  };

  const signInAsAdmin = async () => {
    localStorage.setItem(MOCK_SESSION_KEY, "admin");
    setUsuario(MOCK_ADMIN);
    router.push("/admin");
  };

  const signOut = () => {
    localStorage.removeItem(MOCK_SESSION_KEY);
    setUsuario(null);
    router.push("/login");
  };

  return (
    <MockAuthContext.Provider
      value={{
        usuario,
        loading,
        isAdmin: usuario?.role === "admin",
        signInWithGoogle,
        signInAsAdmin,
        signOut,
      }}
    >
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockAuth() {
  const ctx = useContext(MockAuthContext);
  if (!ctx) throw new Error("useMockAuth must be inside MockAuthProvider");
  return ctx;
}
