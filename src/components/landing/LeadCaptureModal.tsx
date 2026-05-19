"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  montoSugerido?: number;
}

export default function LeadCaptureModal({
  isOpen,
  onClose,
  montoSugerido,
}: LeadCaptureModalProps) {
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, monto: montoSugerido }),
      });
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-900"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            {status === "ok" ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
                  ✓
                </div>
                <h3 className="font-serif text-xl font-bold text-texto">
                  ¡Listo!
                </h3>
                <p className="mt-2 text-sm text-texto-muted">
                  Te contactaremos a la brevedad para avanzar con tu solicitud.
                </p>
                <button
                  onClick={onClose}
                  className="mt-6 rounded-xl bg-azul-principal px-6 py-2.5 text-sm font-medium text-white"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-serif text-xl font-bold text-texto">
                  Dejanos tus datos
                </h3>
                <p className="mt-1 text-sm text-texto-muted">
                  Un asesor te contactará para completar tu solicitud.
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-azul-claro dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-azul-claro dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono (opcional)"
                    value={form.telefono}
                    onChange={(e) =>
                      setForm({ ...form, telefono: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-azul-claro dark:bg-gray-800 dark:text-white"
                  />

                  {status === "error" && (
                    <p className="text-xs text-red-500">
                      Hubo un error. Intentá de nuevo.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="btn-lift shimmer-blue w-full rounded-xl bg-azul-principal py-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {status === "loading" ? "Enviando..." : "Quiero que me contacten"}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
