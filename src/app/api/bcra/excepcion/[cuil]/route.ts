export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Chequeo liviano: ¿este CUIL tiene una excepción BCRA cargada por un admin?
// Requiere sesión (cualquier usuario autenticado) — no expone motivo ni quién la creó.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cuil: string }> }
) {
  const { cuil } = await params;
  const cuilLimpio = String(cuil).replace(/\D/g, "");
  if (!/^\d{11}$/.test(cuilLimpio)) {
    return NextResponse.json({ error: "CUIL/CUIT inválido" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const { data } = await supabase
    .from("bcra_excepciones")
    .select("cuil")
    .eq("cuil", cuilLimpio)
    .maybeSingle();

  return NextResponse.json({ excepcion: !!data });
}
