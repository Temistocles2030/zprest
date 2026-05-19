import { NextResponse } from "next/server";
import { getDeudas } from "@/lib/bcra/client";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ identificacion: string }> }
) {
  try {
    const { identificacion } = await params;

    if (!identificacion || !/^\d{7,11}$/.test(identificacion)) {
      return NextResponse.json(
        { error: "Identificación inválida. Ingresá un CUIL/CUIT de 11 dígitos o DNI de 7-8 dígitos." },
        { status: 400 }
      );
    }

    const data = await getDeudas(identificacion);

    // Log de actividad sin bloquear (admin_id opcional — el endpoint también lo usan clientes)
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      const supabase = createAdminClient();
      supabase.auth.getUser(token).then(({ data: { user } }) => {
        if (user) {
          void supabase.from("actividad_admin").insert({
            admin_id: user.id,
            accion: "consulta_bcra_deudas",
            entidad_tipo: "bcra",
            entidad_id: identificacion,
            detalle: { denominacion: data.results?.denominacion || null },
          });
        }
      }).catch(() => {});
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("[bcra/deudas] Error:", message);
    const isTimeout = message.includes("tiempo");
    return NextResponse.json(
      { error: isTimeout ? "La API del BCRA no respondió a tiempo. Intentá de nuevo." : message },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
