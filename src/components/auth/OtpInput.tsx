"use client";
import { useRef, useState, useEffect } from "react";

interface Props {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: string;
}

export default function OtpInput({ length = 6, onComplete, disabled, error }: Props) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (values.every((v) => v !== "") && values.join("").length === length) {
      onComplete(values.join(""));
    }
  }, [values, length, onComplete]);

  const handleChange = (i: number, val: string) => {
    // Pegado inteligente
    if (val.length > 1) {
      const digits = val.replace(/\D/g, "").slice(0, length);
      const next = Array(length).fill("");
      digits.split("").forEach((d, idx) => { next[idx] = d; });
      setValues(next);
      inputs.current[Math.min(digits.length, length - 1)]?.focus();
      return;
    }
    if (!/^\d?$/.test(val)) return;
    const next = [...values];
    next[i] = val;
    setValues(next);
    if (val && i < length - 1) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !values[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2">
        {values.map((v, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={v}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`h-14 w-12 rounded-xl border-2 bg-white/5 text-center text-xl font-bold text-white outline-none transition
              ${error ? "border-red-500" : v ? "border-yellow-400" : "border-white/20"}
              focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20
              disabled:opacity-50`}
          />
        ))}
      </div>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}
