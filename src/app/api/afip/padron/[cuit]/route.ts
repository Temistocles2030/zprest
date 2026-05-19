import { NextResponse } from "next/server";
import { getPersona } from "@/lib/afip/padron";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cuit: string }> }
) {
  try {
    const { cuit } = await params;

    if (!cuit || !/^\d{11}$/.test(cuit)) {
      return NextResponse.json(
        { error: "CUIL/CUIT inválido. Debe tener 11 dígitos." },
        { status: 400 }
      );
    }

    const persona = await getPersona(cuit);

    // Log de actividad (fire and forget)
    const supabase = createAdminClient();
    void supabase.from("actividad_admin").insert({
      accion: "consulta_afip_padron",
      entidad_tipo: "afip",
      entidad_id: cuit,
      detalle: { denominacion: persona.denominacion || null, estadoClave: persona.estadoClave },
    });

    return NextResponse.json({ persona });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    const isTimeout = message.includes("timeout") || message.includes("abort");
    return NextResponse.json(
      { error: isTimeout ? "La API de AFIP no respondió a tiempo. Intentá de nuevo." : message },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
