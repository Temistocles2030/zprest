"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { getAuthToken } from "@/lib/supabase/getToken";

export default function CompletarPerfilPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [form, setForm] = useState({
    nombre: "", dni: "", cuil: "", telefono: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-rellenar con datos existentes del usuario
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("usuarios")
        .select("nombre, dni, cuil, telefono")
        .eq("id", user.id)
        .single();
      if (data) {
        setForm({
          nombre: data.nombre || "",
          dni: data.dni || "",
          cuil: data.cuil || "",
          telefono: data.telefono || "",
        });
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.nombre || !form.dni || !form.cuil || !form.telefono) {
      setError("Todos los campos son obligatorios");
      return;
    }
    if (!/^\d{7,8}$/.test(form.dni.replace(/\D/g, ""))) {
      setError("DNI inválido (7-8 dígitos)");
      return;
    }
    if (!/^\d{11}$/.test(form.cuil.replace(/\D/g, ""))) {
      setError("CUIL/CUIT inválido (11 dígitos, ej: 20-12345678-9)");
      return;
    }
    if (!/^\+?[\d\s\-()]{8,20}$/.test(form.telefono)) {
      setError("Teléfono inválido (ej: 1123456789)");
      return;
    }

    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) { router.replace("/login"); return; }

      const res = await fetch("/api/auth/perfil", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");

      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const INPUT = "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/10";
  const LABEL = "mb-1 block text-xs font-medium text-white/60";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060d1f] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="font-serif text-2xl font-bold tracking-widest text-white">ZPREST</span>
          <span className="block text-[12px] font-bold tracking-[0.18em] text-white/30 transition-colors hover:text-[#D4AF37]">IS45.123</span>
          <h2 className="mt-4 text-xl font-bold text-white">Completá tu perfil</h2>
          <p className="mt-2 text-sm text-white/50">
            Necesitamos tus datos para habilitarte el acceso al portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div>
            <label className={LABEL}>Nombre y apellido <span className="text-red-400">*</span></label>
            <input
              className={INPUT}
              placeholder="Juan García"
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>DNI <span className="text-red-400">*</span></label>
              <input
                className={INPUT}
                placeholder="32000000"
                value={form.dni}
                onChange={(e) => setForm((p) => ({ ...p, dni: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
              />
            </div>
            <div>
              <label className={LABEL}>CUIL/CUIT <span className="text-red-400">*</span></label>
              <input
                className={INPUT}
                placeholder="20-32000000-9"
                value={form.cuil}
                onChange={(e) => setForm((p) => ({ ...p, cuil: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={LABEL}>Teléfono <span className="text-red-400">*</span></label>
            <input
              className={INPUT}
              placeholder="+54 9 11 1234-5678"
              value={form.telefono}
              onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-yellow-400 py-3 text-sm font-bold text-gray-900 transition hover:bg-yellow-300 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar y continuar →"}
          </button>
        </form>
      </div>
    </div>
  );
}
