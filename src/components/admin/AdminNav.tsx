"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const navLinks = [
  { href: "/admin", label: "Inicio", icon: "🏠" },
  { href: "/admin/solicitudes", label: "Solicitudes", icon: "📋" },
  { href: "/admin/prestamos", label: "Préstamos", icon: "💳" },
  { href: "/admin/clientes", label: "Clientes", icon: "👤" },
  { href: "/admin/planes", label: "Planes", icon: "📐" },
  { href: "/admin/cobros", label: "Cobros", icon: "💰" },
  // { href: "/admin/bind", label: "BindX", icon: "🏦" },
  { href: "/admin/bcra", label: "BCRA", icon: "🏛️" },
  { href: "/admin/afip", label: "AFIP", icon: "🔎" },
  { href: "/admin/signatura", label: "Signatura", icon: "✍️" },
  { href: "/admin/actividad", label: "Actividad", icon: "📊" },
  { href: "/admin/ziro", label: "Ziro IA", icon: "🤖" },
  { href: "/admin/sms", label: "SMS", icon: "📱" },
  { href: "/admin/arrepentimientos", label: "Arrepentimientos", icon: "↩️" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { signOut, usuario } = useAuth();
  const [open, setOpen] = useState(false);

  const sidebarInner = (
    <>
      {/* Logo */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col items-center flex-1">
          <span className="text-[10px] font-bold tracking-widest text-blue-200">Panel Admin</span>
          <span className="font-serif text-2xl font-bold tracking-widest text-white">ZPREST</span>
          <span className="text-[12px] font-bold tracking-[0.18em] text-white/30 transition-colors hover:text-[#D4AF37] cursor-default">IS45.123</span>
        </div>
        {/* Close — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="md:hidden text-white/50 hover:text-white p-1 text-xl leading-none"
          aria-label="Cerrar menú"
        >
          ✕
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {navLinks.map((link) => {
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-white/15 text-white font-medium"
                  : "text-blue-100 hover:bg-white/10"
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <p className="mb-2 truncate px-1 text-xs text-blue-300">
          {usuario?.email}
        </p>
        <button
          onClick={signOut}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-blue-200 hover:bg-white/10"
        >
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 flex md:hidden flex-col gap-1.5 rounded-lg bg-azul-principal p-2.5 shadow-lg"
        aria-label="Abrir menú"
      >
        <span className="block h-0.5 w-5 bg-white" />
        <span className="block h-0.5 w-5 bg-white" />
        <span className="block h-0.5 w-5 bg-white" />
      </button>

      {/* Backdrop — mobile only */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-azul-principal text-white transition-transform duration-300 md:relative md:w-56 md:translate-x-0 md:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarInner}
      </aside>
    </>
  );
}
