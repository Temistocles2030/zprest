import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { verificarSiEsAdmin } from "@/lib/lib/verify-admin"; // Importamos nuestro validador central

export async function GET(req: NextRequest) {
  try {
    // ── MITIGACIÓN VUL-09 ──────────────────────────────────────────────────
    // Exigimos obligatoriamente el token Bearer en los headers para verificar rol de admin
    const token = req.headers.get("Authorization");
    const auth = await verificarSiEsAdmin(token);
    if (!auth.esAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("planes")
      .select("*")
      .order("tipo");

    if (error) {
      console.error("[admin/planes] GET DB Error:", error);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    // ── MITIGACIÓN VUL-05 ──────────────────────────────────────────────────
    console.error("[admin/planes] GET Fatal Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // ── MITIGACIÓN VUL-09 ──────────────────────────────────────────────────
    // Bloqueamos la creación maliciosa de planes validando credenciales explícitas de admin
    const token = req.headers.get("Authorization");
    const auth = await verificarSiEsAdmin(token);
    if (!auth.esAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("planes").insert([body]).select().single();

    if (error) {
      console.error("[admin/planes] POST DB Error:", error);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    revalidatePath("/");
    revalidatePath("/simulador");
    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    // ── MITIGACIÓN VUL-05 ──────────────────────────────────────────────────
    console.error("[admin/planes] POST Fatal Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
