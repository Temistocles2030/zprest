export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/** GET /api/planes/preferencial — devuelve el plan preferencial asignado al usuario autenticado */
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();

  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ plan: null });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ plan: null });

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("plan_preferencial_id")
    .eq("id", user.id)
    .single();

  if (!usuario?.plan_preferencial_id) return NextResponse.json({ plan: null });

  const { data: plan } = await supabase
    .from("planes")
    .select("id, nombre, tipo, tna, tem, ted, frecuencia, monto_min, monto_max, plazo_min, plazo_max, activo, es_preferencial")
    .eq("id", usuario.plan_preferencial_id)
    .single();

  return NextResponse.json({ plan: plan ?? null });
}
