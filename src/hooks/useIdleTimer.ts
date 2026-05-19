"use client";

import { useEffect, useRef, useCallback } from "react";

const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

interface Options {
  /** Minutos de inactividad antes de cerrar sesión (default 10) */
  idleMinutes?: number;
  /** Minutos antes de idleMinutes para mostrar el aviso (default 2) */
  warningMinutes?: number;
  onWarning: () => void;
  onIdle: () => void;
}

export function useIdleTimer({
  idleMinutes = 10,
  warningMinutes = 2,
  onWarning,
  onIdle,
}: Options) {
  const idleTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warned       = useRef(false);

  const clearTimers = useCallback(() => {
    if (idleTimer.current)    clearTimeout(idleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    warned.current = false;

    const warningMs = (idleMinutes - warningMinutes) * 60 * 1000;
    const idleMs    = idleMinutes * 60 * 1000;

    warningTimer.current = setTimeout(() => {
      warned.current = true;
      onWarning();
    }, warningMs);

    idleTimer.current = setTimeout(() => {
      onIdle();
    }, idleMs);
  }, [idleMinutes, warningMinutes, onWarning, onIdle, clearTimers]);

  useEffect(() => {
    reset();
    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimers();
      EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [reset, clearTimers]);
}
