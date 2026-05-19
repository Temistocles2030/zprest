import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const estado = req.nextUrl.searchParams.get("estado");
  const supabase = createAdminClient();

  let query = supabase
    .from("cuotas")
    .select(
      "id, numero_cuota, monto, fecha_vencimiento, estado, bind_operacion_id, bind_estado, reintentos_count, created_at, prestamos(id, capital_original), usuarios(nombre, email)"
    )
    .not("bind_operacion_id", "is", null)
    .order("fecha_vencimiento", { ascending: false })
    .limit(100);

  if (estado) query = query.eq("estado", estado);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ debins: data ?? [] });
}
