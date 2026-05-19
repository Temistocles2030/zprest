"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getAuthToken } from "@/lib/supabase/getToken";

type Prestamo = {
  id: string;
  capital_original: number;
  created_at: string;
  estado: string;
};

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ArrepentimientoPage() {
  const [step, setStep] = useState<"loading" | "noauth" | "form" | "success" | "error">("loading");
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [prestamoId, setPrestamoId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setStep("noauth"); return; }

      const { data } = await supabase
        .from("prestamos")
        .select("id, capital_original, created_at, estado")
        .eq("user_id", user.id)
        .in("estado", ["activo", "aprobado"])
        .order("created_at", { ascending: false });

      setPrestamos(data ?? []);
      setStep("form");
    });
  }, []);

  const enviar = async () => {
    if (!prestamoId) { setErrorMsg("Seleccioná un préstamo."); return; }
    setEnviando(true);
    setErrorMsg("");
    try {
      const token = await getAuthToken();
      if (!token) { setStep("noauth"); return; }

      const res = await fetch("/api/portal/arrepentimiento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prestamo_id: prestamoId, motivo }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? "Error al enviar la solicitud.");
      } else {
        setStep("success");
      }
    } catch {
      setErrorMsg("Error de conexión. Intentá nuevamente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="border-b border-white/10 bg-[#0d1326] px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#d4af37]">Zprest</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">← Volver al inicio</Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#d4af37]">Botón de Arrepentimiento</h1>
          <p className="mt-2 text-sm text-gray-400">
            Derecho de revocación — Art. 34, Ley 24.240 de Defensa del Consumidor
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 text-sm text-blue-200 leading-relaxed">
          <p className="font-semibold text-white mb-2">¿Qué es el derecho de arrepentimiento?</p>
          <p>
            Conforme al Art. 34 de la Ley 24.240, tenés derecho a revocar la aceptación de un préstamo
            dentro de los <strong className="text-white">10 días hábiles</strong> contados desde la acreditación del dinero en tu cuenta,
            sin costo ni responsabilidad alguna.
          </p>
          <p className="mt-2">
            Para ejercer este derecho debés devolver el capital acreditado en su totalidad.
            Zprest te contactará para coordinar la devolución.
          </p>
        </div>

        {step === "loading" && (
          <div className="py-16 text-center text-gray-400">Cargando...</div>
        )}

        {step === "noauth" && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="mb-4 text-gray-300">Necesitás iniciar sesión para ejercer este derecho.</p>
            <Link
              href="/login"
              className="inline-block rounded-xl bg-[#d4af37] px-6 py-2.5 font-semibold text-black hover:bg-[#c9a227] transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        )}

        {step === "form" && (
          <div className="space-y-5">
            {prestamos.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                <p className="text-gray-400">No tenés préstamos activos en el período de revocación.</p>
                <p className="mt-2 text-sm text-gray-500">
                  El plazo de 10 días hábiles debe estar vigente desde la acreditación.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Seleccioná el préstamo que querés revocar
                  </label>
                  <select
                    value={prestamoId}
                    onChange={(e) => setPrestamoId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#d4af37]/50 focus:outline-none"
                  >
                    <option value="" className="bg-gray-900">— Seleccioná un préstamo —</option>
                    {prestamos.map((p) => (
                      <option key={p.id} value={p.id} className="bg-gray-900">
                        {formatARS(p.capital_original)} — otorgado el {formatDate(p.created_at)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Motivo (opcional)
                  </label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={4}
                    placeholder="Podés indicar el motivo de tu solicitud de revocación..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-[#d4af37]/50 focus:outline-none"
                  />
                </div>

                {errorMsg && (
                  <p className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-300 border border-red-500/20">
                    {errorMsg}
                  </p>
                )}

                <button
                  onClick={enviar}
                  disabled={enviando}
                  className="w-full rounded-xl bg-[#d4af37] py-3.5 font-bold text-black hover:bg-[#c9a227] disabled:opacity-50 transition-colors"
                >
                  {enviando ? "Enviando solicitud..." : "Ejercer derecho de arrepentimiento"}
                </button>

                <p className="text-center text-xs text-gray-500">
                  Al confirmar, un representante de Zprest te contactará para coordinar la devolución del capital.
                </p>
              </>
            )}
          </div>
        )}

        {step === "success" && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-8 text-center">
            <div className="mb-4 text-4xl">✓</div>
            <h2 className="mb-2 text-lg font-bold text-green-300">Solicitud recibida</h2>
            <p className="text-gray-300 leading-relaxed">
              Tu solicitud de arrepentimiento fue registrada correctamente. Un representante de Zprest
              te contactará en las próximas 48 horas hábiles para coordinar la devolución del capital.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              También podés comunicarte a{" "}
              <a href="mailto:contacto@zprest.com.ar" className="text-[#d4af37] hover:underline">
                contacto@zprest.com.ar
              </a>
            </p>
          </div>
        )}

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-gray-500 text-center">
          <Link href="/terminos" className="hover:text-gray-300 transition">Términos y Condiciones</Link>
          <span className="mx-2">·</span>
          <Link href="/politicas" className="hover:text-gray-300 transition">Política de Privacidad</Link>
          <span className="mx-2">·</span>
          <Link href="/modelo-de-contrato" className="hover:text-gray-300 transition">Modelo de Contrato</Link>
        </div>
      </main>
    </div>
  );
}
