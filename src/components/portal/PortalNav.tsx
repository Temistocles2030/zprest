"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

const links = [
  { href: "/dashboard",     label: "RESUMEN" },
  { href: "/mis-prestamos", label: "MIS PRÉSTAMOS" },
  { href: "/solicitar",     label: "SOLICITAR" },
];

const BCRA_BADGE: Record<number, { label: string; cls: string }> = {
  0: { label: "BCRA S0", cls: "bg-green-500/20 text-green-300 border-green-500/30" },
  1: { label: "BCRA S1", cls: "bg-green-500/20 text-green-300 border-green-500/30" },
  2: { label: "BCRA S2", cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  3: { label: "BCRA S3", cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  4: { label: "BCRA S4", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
  5: { label: "BCRA S5", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
};

export default function PortalNav() {
  const pathname = usePathname();
  const { usuario, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);

  const iniciales = usuario?.nombre
    ? usuario.nombre.trim().split(/\s+/).map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const avatarUrl = usuario?.avatar_url ?? null;

  const esPyme = usuario?.tipo_cliente === "pyme" || usuario?.tipo_interes === "pyme";

  const bcra = usuario?.bcra_situacion != null ? BCRA_BADGE[usuario.bcra_situacion] : null;

  function AvatarCircle({ size = "sm" }: { size?: "sm" | "lg" }) {
    const dim = size === "lg" ? "h-20 w-20 text-2xl ring-2 ring-[#d4af37]/50" : "h-8 w-8 text-xs ring-1 ring-[#d4af37]/40";
    return avatarUrl ? (
      <img
        src={avatarUrl}
        alt="Avatar"
        className={`${dim} rounded-full object-cover bg-gray-800`}
      />
    ) : (
      <span className={`${dim} rounded-full flex items-center justify-center font-bold bg-gradient-to-br from-[#d4af37]/30 to-[#d4af37]/10 text-[#d4af37]`}>
        {iniciales}
      </span>
    );
  }

  return (
    <>
      <nav className="border-b border-gray-800 bg-gray-950/90 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">

          {/* Logo */}
          <Link href="/dashboard" className="flex-shrink-0 flex flex-col items-center leading-none">
            <span className="text-[10px] font-bold tracking-widest text-gray-500">MI CUENTA</span>
            <span className="font-serif text-xl font-bold tracking-widest text-white">ZPREST</span>
            <span className="text-[12px] font-bold tracking-[0.18em] text-white/30 self-center transition-colors hover:text-[#D4AF37]">IS45.123</span>
          </Link>

          {/* Links desktop */}
          <div className="hidden items-center gap-1 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  pathname === link.href
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Derecha: toggle + avatar */}
          <div className="hidden items-center gap-3 sm:flex">
            <ThemeToggle />
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setModalPerfil(true)}
                title="Mi perfil"
                className="transition hover:scale-105 hover:ring-2 hover:ring-[#d4af37]/60 rounded-full"
              >
                <AvatarCircle size="sm" />
              </button>
              <span className="max-w-[140px] truncate text-center text-xs text-gray-400 block">
                {usuario?.nombre ?? usuario?.email}
              </span>
            </div>
            <button
              onClick={signOut}
              className="rounded-md px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition"
            >
              Salir
            </button>
          </div>

          {/* Hamburger mobile */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex sm:hidden flex-col gap-1.5 p-2"
            aria-label="Menú"
          >
            <span className={`block h-0.5 w-5 bg-gray-400 transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 bg-gray-400 transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-gray-400 transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="border-t border-gray-800 bg-gray-950 px-4 py-3 sm:hidden">
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    pathname === link.href
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 border-t border-gray-800" />
              <button
                onClick={() => { setOpen(false); setModalPerfil(true); }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition text-left"
              >
                <AvatarCircle size="sm" />
                <span>{usuario?.nombre ?? usuario?.email}</span>
              </button>
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="rounded-lg px-3 py-2.5 text-left text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition"
              >
                Salir
              </button>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-400">Tema</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Modal MI PERFIL */}
      {modalPerfil && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalPerfil(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden">

            {/* Header dorado */}
            <div className="relative bg-gradient-to-br from-[#d4af37]/15 to-transparent border-b border-[#d4af37]/20 px-6 pt-8 pb-6 flex flex-col items-center">
              <button
                onClick={() => setModalPerfil(false)}
                className="absolute right-4 top-4 text-gray-500 hover:text-white transition text-lg leading-none"
              >
                ✕
              </button>

              <AvatarCircle size="lg" />

              <h2 className="mt-3 text-lg font-bold text-white text-center">
                {usuario?.nombre ?? "—"}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{usuario?.email}</p>

              {/* Badges */}
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {usuario?.tipo_cliente && usuario.tipo_cliente !== "pendiente" && (
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${esPyme ? "bg-purple-500/20 text-purple-300 border-purple-500/30" : "bg-blue-500/20 text-blue-300 border-blue-500/30"}`}>
                    {esPyme ? "🏢 Comercial" : "👤 Personal"}
                  </span>
                )}
                {usuario?.estado_registro === "aprobado" ? (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                    ✓ Aprobado
                  </span>
                ) : (
                  <span className="rounded-full border border-gray-600 bg-gray-700/40 px-2.5 py-0.5 text-xs font-semibold text-gray-400">
                    ⏳ Pendiente
                  </span>
                )}
                {bcra && (
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${bcra.cls}`}>
                    {bcra.label}
                  </span>
                )}
              </div>
            </div>

            {/* Info rápida */}
            <div className="grid grid-cols-3 divide-x divide-gray-700/60 border-b border-gray-700/60">
              {[
                { label: "DNI", value: usuario?.dni ?? "—" },
                { label: "CUIL", value: usuario?.cuil ? `${usuario.cuil.slice(0,2)}-${usuario.cuil.slice(2,-1)}-${usuario.cuil.slice(-1)}` : "—" },
                { label: "Teléfono", value: usuario?.telefono ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center py-3 px-2">
                  <span className="text-[10px] uppercase tracking-wide text-gray-500">{label}</span>
                  <span className="mt-0.5 text-xs font-medium text-gray-200 text-center leading-tight">{value}</span>
                </div>
              ))}
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-2 p-4">
              <Link
                href="/mis-datos"
                onClick={() => setModalPerfil(false)}
                className="w-full rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 py-2.5 text-center text-sm font-semibold text-[#d4af37] hover:bg-[#d4af37]/20 transition"
              >
                Editar perfil completo
              </Link>
              <button
                onClick={() => { setModalPerfil(false); signOut(); }}
                className="w-full rounded-xl border border-gray-700 py-2.5 text-center text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
