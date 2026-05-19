export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { obtenerDocumento, obtenerBiometria } from "@/lib/signatura/client";

async function getAdmin(request: NextRequest) {
  const supabase = createAdminClient();
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: me } = await supabase.from("usuarios").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return null;
  return true;
}

// GET /api/admin/signatura/documento/[id] — Detalle documento + biometría desde Signatura API
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await getAdmin(request);
  if (!ok) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const doc = await obtenerDocumento(id);

    // Intentar obtener biometría de cada firma
    const firmasConBio = await Promise.all(
      (doc.signatures ?? []).map(async (sig) => {
        if (!sig.id) return { ...sig, biometria: null };
        try {
          const bio = await obtenerBiometria(sig.id);
          return { ...sig, biometria: bio };
        } catch {
          return { ...sig, biometria: null };
        }
      })
    );

    return NextResponse.json({ documento: { ...doc, signatures: firmasConBio } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error consultando Signatura";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
