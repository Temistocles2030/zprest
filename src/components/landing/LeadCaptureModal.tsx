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
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    cuil: "",
    tipo_credito: "personal" as "personal" | "pyme",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, monto: montoSugerido }),
      });
      if (!res.ok) throw new Error("error");
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 placeholder-gray-500";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            className="relative w-full max-w-md rounded-2xl bg-gray-900 p-8 shadow-2xl border border-gray-700"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            {status === "ok" ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-900 text-3xl text-green-400">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-white">¡Listo!</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Recibimos tus datos. Un asesor te contactará a la brevedad.
                </p>
                <button
                  onClick={onClose}
                  className="mt-6 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white">Dejanos tus datos</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Un asesor te contactará para avanzar con tu solicitud.
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                  {/* Tipo de crédito */}
                  <div className="grid grid-cols-2 gap-2">
                    {(["personal", "pyme"] as const).map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setForm({ ...form, tipo_credito: tipo })}
                        className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
                          form.tipo_credito === tipo
                            ? "border-blue-500 bg-blue-600 text-white"
                            : "border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500"
                        }`}
                      >
                        {tipo === "personal" ? "Crédito Personal" : "Crédito Pyme"}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Nombre completo"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono (opcional)"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="CUIL / CUIT (ej: 20-12345678-9)"
                    value={form.cuil}
                    onChange={(e) => setForm({ ...form, cuil: e.target.value })}
                    className={inputClass}
                  />

                  {status === "error" && (
                    <p className="text-xs text-red-400">
                      Hubo un error. Intentá de nuevo.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="btn-lift w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
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
