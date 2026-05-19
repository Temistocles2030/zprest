"use client";

import { useState, useEffect, useRef } from "react";
import type { Usuario } from "@/types";

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
const MOCK_SESSION_KEY = "zprest_mock_session";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthState {
  user: AuthUser | null;
  usuario: Usuario | null;
  loading: boolean;
  isAdmin: boolean;
  sessionAnomaly: boolean;
}

// Flag de módulo: true cuando el cierre de sesión es intencional (botón Salir)
let intentionalSignOut = false;

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    usuario: null,
    loading: true,
    isAdmin: false,
    sessionAnomaly: false,
  });

  // Cache del usuario por ID — evita el flash cuando TOKEN_REFRESHED dispara
  const usuarioCache = useRef<{ id: string; data: Usuario; isAdmin: boolean } | null>(null);

  useEffect(() => {
    if (IS_MOCK) {
      const { MOCK_USUARIO, MOCK_ADMIN } = require("@/lib/mock/data");
      const saved = localStorage.getItem(MOCK_SESSION_KEY);
      if (saved) {
        const u = saved === "admin" ? MOCK_ADMIN : MOCK_USUARIO;
        setState({
          user: { uid: u.id ?? u.uid, email: u.email, displayName: u.nombre },
          usuario: u,
          loading: false,
          isAdmin: u.role === "admin",
          sessionAnomaly: false,
        });
      } else {
        setState({ user: null, usuario: null, loading: false, isAdmin: false, sessionAnomaly: false });
      }
      return;
    }

    // PRODUCCIÓN — Supabase Auth
    const { createClient } = require("@/lib/supabase/client");
    const supabase = createClient();

    // Timeout de seguridad: si en 8 segundos no resuelve, desbloquear
    const timeout = setTimeout(() => {
setState(prev => prev.loading
        ? { user: null, usuario: null, loading: false, isAdmin: false, sessionAnomaly: false }
        : prev
      );
    }, 8000);

    // onAuthStateChange dispara INITIAL_SESSION al montar — patrón correcto para SSR
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: { user: { id: string; email?: string; user_metadata?: Record<string, string> } } | null) => {
        if (session?.user) {
          clearTimeout(timeout);

          const cached = usuarioCache.current;
          const sameUser = cached?.id === session.user.id;

          // Si ya tenemos el usuario cargado para esta sesión, no flashear
          setState({
            user: {
              uid: session.user.id,
              email: session.user.email ?? null,
              displayName: session.user.user_metadata?.full_name ?? null,
            },
            usuario: sameUser ? cached!.data : null,
            loading: false,
            isAdmin: sameUser ? cached!.isAdmin : false,
            sessionAnomaly: false,
          });

          // Solo ir a la DB si no tenemos el usuario cacheado
          if (!sameUser) {
            supabase
              .from("usuarios")
              .select("*")
              .eq("id", session.user.id)
              .single()
              .then(({ data: usuarioDB }: { data: Usuario | null; error: unknown }) => {
                if (usuarioDB) {
                  const estado = usuarioDB.estado ?? "activo";
                  if (estado === "inactivo" || estado === "bloqueado" || estado === "eliminado") {
                    usuarioCache.current = null;
                    supabase.auth.signOut().then(() => {
                      window.location.href = `/login?error=${estado}`;
                    });
                    return;
                  }
                  usuarioCache.current = { id: session.user.id, data: usuarioDB, isAdmin: usuarioDB.role === "admin" };
                  setState(prev => ({ ...prev, usuario: usuarioDB, isAdmin: usuarioDB.role === "admin" }));
                } else {
                  usuarioCache.current = null;
                  setState(prev => ({ ...prev, user: null, loading: false }));
                }
              })
              .catch(() => {
                setState(prev => ({ ...prev, user: null, loading: false }));
              });
          }
        } else {
          clearTimeout(timeout);
          // Si había sesión activa y el cierre NO fue intencional → anomalía
          if (!intentionalSignOut) {
            setState(prev => {
              if (prev.user) {
                // Notificar a seguridad en background
                fetch("/api/portal/session-anomaly", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: prev.user.email,
                    dispositivo: navigator.userAgent,
                  }),
                }).catch(() => {});
                return { user: null, usuario: null, loading: false, isAdmin: false, sessionAnomaly: true };
              }
              return { user: null, usuario: null, loading: false, isAdmin: false, sessionAnomaly: false };
            });
          } else {
            intentionalSignOut = false;
            setState({ user: null, usuario: null, loading: false, isAdmin: false, sessionAnomaly: false });
          }
        }
      }
    );

    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  const signInWithGoogle = async () => {
    if (IS_MOCK) {
      const { MOCK_USUARIO } = require("@/lib/mock/data");
      localStorage.setItem(MOCK_SESSION_KEY, "user");
      setState({
        user: { uid: MOCK_USUARIO.id ?? MOCK_USUARIO.uid, email: MOCK_USUARIO.email, displayName: MOCK_USUARIO.nombre },
        usuario: MOCK_USUARIO,
        loading: false,
        isAdmin: false,
        sessionAnomaly: false,
      });
      return;
    }
    const { createClient } = require("@/lib/supabase/client");
    const supabase = createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${appUrl}/auth/callback`,
      },
    });
  };

  const signInAsAdmin = async () => {
    if (!IS_MOCK) return;
    const { MOCK_ADMIN } = require("@/lib/mock/data");
    localStorage.setItem(MOCK_SESSION_KEY, "admin");
    setState({
      user: { uid: MOCK_ADMIN.id ?? MOCK_ADMIN.uid, email: MOCK_ADMIN.email, displayName: MOCK_ADMIN.nombre },
      usuario: MOCK_ADMIN,
      loading: false,
      isAdmin: true,
      sessionAnomaly: false,
    });
  };

  const signOut = async () => {
    intentionalSignOut = true;
    usuarioCache.current = null;
    if (IS_MOCK) {
      localStorage.removeItem(MOCK_SESSION_KEY);
      setState({ user: null, usuario: null, loading: false, isAdmin: false, sessionAnomaly: false });
      return;
    }
    const { createClient } = require("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return { ...state, signInWithGoogle, signInAsAdmin, signOut };
}
