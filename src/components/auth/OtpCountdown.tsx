"use client";
import { useState, useEffect, useCallback } from "react";

interface Props {
  seconds: number;
  onExpire: () => void;
  onResend: () => void;
}

export default function OtpCountdown({ seconds, onExpire, onResend }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [expired, setExpired] = useState(false);

  const reset = useCallback(() => {
    setRemaining(seconds);
    setExpired(false);
  }, [seconds]);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (remaining <= 0) {
      setExpired(true);
      onExpire();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onExpire]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");
  const pct = (remaining / seconds) * 100;

  if (expired) {
    return (
      <div className="text-center">
        <p className="text-sm text-white/50">Código expirado</p>
        <button
          onClick={() => { reset(); onResend(); }}
          className="mt-1 text-sm font-semibold text-yellow-400 hover:underline"
        >
          Reenviar código →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-center text-sm text-white/60">
        Código válido por: <span className="font-mono font-bold text-white">{mins}:{secs}</span>
      </p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-yellow-400 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
