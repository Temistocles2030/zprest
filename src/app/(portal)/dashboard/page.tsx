import { Metadata } from "next";
import DeudaResumen from "@/components/portal/DeudaResumen";
import ProximoVencimiento from "@/components/portal/ProximoVencimiento";

export const metadata: Metadata = {
  title: "Mi Resumen — Zprest",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mi Resumen</h1>
        <p className="mt-1 text-sm text-gray-400">
          Estado actual de tus préstamos en tiempo real.
        </p>
      </div>

      <ProximoVencimiento />
      <DeudaResumen />
    </div>
  );
}
