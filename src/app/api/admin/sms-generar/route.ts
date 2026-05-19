export const dynamic = "force-dynamic";

/**
 * POST /api/admin/sms-generar
 * Genera un SMS comercial con Gemini dado un prompt del admin.
 * Solo accesible por admins.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const { data: admin } = await supabase
    .from("usuarios").select("role").eq("id", user.id).single();
  if (admin?.role !== "admin")
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { prompt } = await request.json() as { prompt: string };
  if (!prompt?.trim())
    return NextResponse.json({ error: "Prompt requerido" }, { status: 400 });

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: "Gemini no configurado" }, { status: 503 });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const systemPrompt = `Sos redactor de SMS para Zprest, una financiera argentina.
Tu tarea es redactar UN SMS corto (máximo 160 caracteres) para enviar a clientes con deuda.

Reglas:
- Tono: comercial, cordial, profesional. Nunca amenazante ni agresivo.
- Podés usar la variable {nombre} para personalizar (se reemplaza por el nombre del cliente).
- Usá lenguaje argentino informal pero respetuoso (vos, tuteo).
- Máximo 160 caracteres.
- No uses emojis salvo que el prompt lo pida.
- No incluyas explicaciones ni comillas. Solo el texto del SMS.
- Siempre terminá con: Zprest o zprest.com.ar

Tema del SMS: ${prompt}`;

  try {
    const result = await model.generateContent(systemPrompt);
    const texto = result.response.text().trim();
    return NextResponse.json({ ok: true, mensaje: texto });
  } catch (e) {
    console.error("[sms-generar] Gemini error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Error al generar el mensaje" }, { status: 500 });
  }
}
