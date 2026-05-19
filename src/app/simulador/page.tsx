import { Metadata } from "next";
import SimuladorWidget from "@/components/landing/SimuladorWidget";
import { createAdminClient } from "@/lib/supabase/server";
import type { PlanSimulador } from "@/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Simulador de Préstamos — Zprest",
  description:
    "Calculá tu cuota en segundos. Préstamos personales, pymes y en relación de dependencia en Argentina.",
};

export default async function SimuladorPage() {
  let planes: PlanSimulador[] = [];
  const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
  if (!IS_MOCK) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("planes")
        .select("id, nombre, tipo, tna, tem, ted, frecuencia, monto_min, monto_max, plazo_min, plazo_max, activo")
        .eq("activo", true)
        .neq("tipo", "dependencia")
        .order("tipo")
        .order("plazo_min");
      if (data) planes = data as PlanSimulador[];
    } catch {
      // use empty planes, widget will use defaults
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-950 to-blue-800 px-4 py-16">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center text-white">
          <h1 className="text-3xl font-bold">Simulador de Préstamos</h1>
          <p className="mt-2 text-blue-200">
            Calculá tu cuota sin compromiso
          </p>
        </div>
        <SimuladorWidget planes={planes} />
      </div>
    </main>
  );
}
