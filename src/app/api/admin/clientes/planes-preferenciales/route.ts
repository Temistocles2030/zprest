export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/** GET /api/admin/clientes/planes-preferenciales — lista todos los planes marcados como preferenciales */
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();

  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const { data: me } = await supabase.from("usuarios").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { data: planes } = await supabase
    .from("planes")
    .select("id, nombre, tipo, tna, tem, ted, frecuencia, monto_min, monto_max, plazo_min, plazo_max, activo, es_preferencial")
    .eq("es_preferencial", true)
    .order("tipo")
    .order("plazo_min");

  return NextResponse.json({ planes: planes ?? [] });
}
