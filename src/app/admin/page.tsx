import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Panel Admin — Zprest",
};

const accesos = [
  { href: "/admin/solicitudes", label: "Solicitudes pendientes", icon: "📋", desc: "Revisá y aprobá solicitudes" },
  { href: "/admin/prestamos", label: "Préstamos activos", icon: "💳", desc: "Gestioná créditos en curso" },
  { href: "/admin/planes", label: "Planes", icon: "📐", desc: "Creá y editá plantillas" },
  { href: "/admin/cobros", label: "Cobros", icon: "💰", desc: "Estado de DEBINs y reintentos" },
  { href: "/admin/bind", label: "BindX", icon: "🏦", desc: "Saldo y movimientos" },
];

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel Administrativo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bienvenido. Seleccioná una sección para comenzar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accesos.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl">{item.icon}</span>
            <div>
              <p className="font-semibold text-gray-800">{item.label}</p>
              <p className="mt-0.5 text-sm text-gray-500">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
