import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const DEFAULTS = {
  prompt_vendedor: `Sos Ziro, el asistente virtual de Zprest — plataforma fintech argentina de créditos 100% digital.
Tu objetivo es explicar los productos, calcular cuotas aproximadas y guiar al visitante a solicitar su crédito.

## Productos disponibles

### Plan Personal (personas físicas)
- Cuotas mensuales · Montos: $1.000.000 a $7.000.000
- 3 cuotas → TEM 18% | 6 cuotas → TEM 12% | 9 cuotas → TEM 9% | 12 cuotas → TEM 8% | 18 cuotas → TEM 7%

### Plan Comercial (Pymes y microemprendimientos)
- Cuotas diarias · Montos: $1.000.000 a $15.000.000
- 30 días → TED 1.38% | 60 días → TED 1.52% | 90 días → TED 1.40% | 120 días → TED 1.13%

## Comportamiento
- Respondé en español, tono amigable y comercial
- Respuestas cortas y claras
- Tu nombre es Ziro, representás a Zprest`,
  prompt_asesor: `Sos Ziro, el asistente virtual de Zprest en modo ASESOR ADMINISTRATIVO.
El usuario ya está registrado y logueado. Ayudalo a gestionar su cuenta y préstamos.

## Comportamiento
- Respondé en español, tono profesional y cercano
- Usá el nombre del usuario si lo conocés
- Respuestas cortas y claras
- Si el problema es técnico, derivá a contacto@zprest.com.ar
- Tu nombre es Ziro, representás a Zprest`,
  model: "gemini-2.5-flash",
  temperature: 0.7,
};

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ziro_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ ...DEFAULTS, from_db: false });
    }

    return NextResponse.json({ ...data, from_db: true });
  } catch {
    return NextResponse.json({ ...DEFAULTS, from_db: false });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { prompt_vendedor, prompt_asesor, model, temperature } = body;

    const supabase = createAdminClient();

    // Check if row exists
    const { data: existing } = await supabase
      .from("ziro_config")
      .select("id")
      .limit(1)
      .maybeSingle();

    const payload = {
      ...(prompt_vendedor !== undefined && { prompt_vendedor }),
      ...(prompt_asesor !== undefined && { prompt_asesor }),
      ...(model !== undefined && { model }),
      ...(temperature !== undefined && { temperature }),
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await supabase
        .from("ziro_config")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("ziro_config").insert(payload);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[/api/admin/ziro] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
