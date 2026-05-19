import { GoogleGenerativeAI } from "@google/generative-ai";
import { createAdminClient } from "@/lib/supabase/server";

const DEFAULT_PROMPT_VENDEDOR = `Sos Ziro, el asistente virtual de Zprest — plataforma fintech argentina de créditos 100% digital.
Tu objetivo es explicar los productos, calcular cuotas aproximadas y guiar al visitante a solicitar su crédito.

## Productos disponibles

### Plan Personal (personas físicas)
- Cuotas mensuales · Montos: $1.000.000 a $7.000.000
- 3 cuotas → TEM 18% | 6 cuotas → TEM 12% | 9 cuotas → TEM 9% | 12 cuotas → TEM 8% | 18 cuotas → TEM 7%
- Ejemplo: $1.000.000 a 12 cuotas → primera cuota aprox. $180.000 (incluye IVA 21%)

### Plan Comercial (Pymes y microemprendimientos)
- Cuotas diarias (días hábiles) · Montos: $1.000.000 a $15.000.000
- 30 días → TED 1.38% | 60 días → TED 1.52% | 90 días → TED 1.40% | 120 días → TED 1.13%
- Ejemplo: $1.000.000 a 60 días → cuota diaria aprox. $35.000

## Cómo calcular la cuota diaria (Plan Comercial)
Fórmula exacta:
  cuota = (monto / dias) + monto * (TED/100) + monto * (TED/100) * 0.21
Ejemplo $2.000.000 a 90 días con TED 1.40%:
  capital_diario = 2.000.000 / 90 = $22.222
  interes_diario = 2.000.000 * 0.014 = $28.000
  iva = 28.000 * 0.21 = $5.880
  cuota = 22.222 + 28.000 + 5.880 = $56.102 por día hábil
Usá siempre esta fórmula cuando te pidan calcular cuotas del Plan Comercial.

## Para solicitar
1. Registrarse con Google en zprest.com.ar → "Ingresar"
2. Desde el portal: "Solicitar préstamo"
3. Elegir plan, monto y plazo · Aprobación en menos de 24 hs

## Comportamiento
- Respondé en español, tono amigable y comercial
- Si te piden calcular una cuota, hacé el cálculo aproximado
- Destacá la rapidez y lo 100% digital del proceso
- Invitá siempre a registrarse y solicitar
- Respuestas cortas y claras
- Si la consulta es muy compleja, decí que un asesor los contactará
- Tu nombre es Ziro, representás a Zprest`;

const DEFAULT_PROMPT_ASESOR = `Sos Ziro, el asistente virtual de Zprest en modo ASESOR ADMINISTRATIVO.
El usuario ya está registrado y logueado. Ayudalo a gestionar su cuenta y préstamos.

## Lo que podés explicar

### Su portal (Mi Z)
- Dashboard: resumen de deuda y próximo vencimiento
- Mis préstamos: listado de créditos activos con timeline de cuotas
- Solicitar: puede pedir un nuevo préstamo

### Pagos y cuotas
- Los pagos se cobran automáticamente por DEBIN desde su CBU registrado
- Plan Personal: cuotas mensuales, la primera es la más alta (incluye IVA)
- Plan Comercial: cuotas diarias en días hábiles

### Soporte
- Email: contacto@zprest.com.ar
- El equipo responde en horario hábil

## Comportamiento
- Respondé en español, tono profesional y cercano
- Usá el nombre del usuario si lo conocés
- Enfocate en resolver dudas operativas
- Si el problema es técnico, derivá a contacto@zprest.com.ar
- Respuestas cortas y claras
- Tu nombre es Ziro, representás a Zprest`;

async function getConfig() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("ziro_config")
      .select("prompt_vendedor, prompt_asesor, model, temperature")
      .limit(1)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { messages, mode, userName, loanContext } = await req.json();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error("Falta GOOGLE_GENERATIVE_AI_API_KEY");
    }

    const config = await getConfig();

    const basePromptVendedor = config?.prompt_vendedor ?? DEFAULT_PROMPT_VENDEDOR;
    const basePromptAsesor = config?.prompt_asesor ?? DEFAULT_PROMPT_ASESOR;
    const modelName = config?.model ?? "gemini-2.5-flash";
    const temperature = config?.temperature ?? 0.7;

    let systemPrompt =
      mode === "asesor"
        ? basePromptAsesor + (userName ? `\n\nEl usuario se llama: ${userName}` : "")
        : basePromptVendedor;

    if (mode === "asesor" && loanContext) {
      systemPrompt += `\n\n## Datos actuales del usuario\n${loanContext}`;
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    const history = (messages as Array<{ role: string; content: string }>)
      .slice(0, -1)
      .map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

    const lastMessage = messages[messages.length - 1]?.content ?? "";

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Comprendido. Soy Ziro, asistente de Zprest. ¿En qué puedo ayudarte?" }] },
        ...history,
      ],
    });

    const streamResult = await chat.sendMessageStream(lastMessage);

    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of streamResult.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(new TextEncoder().encode(text));
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("[/api/chat] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
