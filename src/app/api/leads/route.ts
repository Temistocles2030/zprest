import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, email, telefono, monto } = body;

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
    if (IS_MOCK) {
      console.log("[MOCK] Lead capturado:", { nombre, email, telefono, monto });
      return NextResponse.json({ ok: true });
    }

    // Guardar en Supabase
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from("leads").insert([
      {
        nombre,
        email,
        telefono,
        monto_solicitado: monto,
        origen: "landing",
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[leads]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
