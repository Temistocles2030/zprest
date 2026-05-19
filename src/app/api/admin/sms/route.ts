export const dynamic = "force-dynamic";

/**
 * POST /api/admin/sms
 * Envía SMS individuales o masivos vía SMSMasivos.
 * Solo accesible por admins.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

interface Destinatario {
  nombre: string;
  telefono: string;
}

interface SMSRequest {
  destinatarios: Destinatario[];
  mensaje: string;          // puede incluir {nombre} como variable
  repeticiones: number;     // 1, 2 o 3
}

// Normaliza teléfono argentino al formato local que acepta SMSMasivos (10 dígitos)
function toSMSMasivosPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const sin54 = digits.startsWith("54") ? digits.slice(2) : digits;
  const sin9 = sin54.startsWith("9") ? sin54.slice(1) : sin54;
  return sin9.startsWith("0") ? sin9.slice(1) : sin9;
}

async function enviarSMS(telefono: string, texto: string): Promise<{ ok: boolean; respuesta: string }> {
  const apiKey = process.env.SMSMASIVOS_API_KEY;
  if (!apiKey) throw new Error("SMSMASIVOS_API_KEY no configurado");

  const localPhone = toSMSMasivosPhone(telefono);
  const url = new URL("http://servicio.smsmasivos.com.ar/enviar_sms.asp");
  url.searchParams.set("api", "1");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("tos", localPhone);
  url.searchParams.set("texto", texto);

  const res = await fetch(url.toString());
  const text = (await res.text()).trim();
  const ok = res.ok && !text.toUpperCase().startsWith("ERROR");
  return { ok, respuesta: text };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  // Verificar admin
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const { data: admin } = await supabase
    .from("usuarios").select("role, id, nombre").eq("id", user.id).single();
  if (admin?.role !== "admin")
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const body = await request.json() as SMSRequest;
  const { destinatarios, mensaje, repeticiones } = body;

  if (!destinatarios?.length)
    return NextResponse.json({ error: "Sin destinatarios" }, { status: 400 });
  if (!mensaje?.trim())
    return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });

  const reps = Math.min(Math.max(Number(repeticiones) || 1, 1), 3);

  const resultados: { nombre: string; telefono: string; ok: boolean; respuesta: string }[] = [];

  for (const dest of destinatarios) {
    const textoFinal = mensaje.replace(/\{nombre\}/gi, dest.nombre || "");

    let lastRespuesta = "";
    let lastOk = false;

    for (let i = 0; i < reps; i++) {
      if (i > 0) await delay(1000); // 1 segundo entre repeticiones
      try {
        const r = await enviarSMS(dest.telefono, textoFinal);
        lastOk = r.ok;
        lastRespuesta = r.respuesta;
      } catch (e) {
        lastOk = false;
        lastRespuesta = e instanceof Error ? e.message : "Error";
      }
    }

    resultados.push({ nombre: dest.nombre, telefono: dest.telefono, ok: lastOk, respuesta: lastRespuesta });
  }

  // Log actividad
  const exitosos = resultados.filter((r) => r.ok).length;
  await supabase.from("actividad_admin").insert({
    admin_id: admin.id,
    accion: "enviar_sms",
    entidad_tipo: "sms",
    entidad_id: null,
    detalle: `SMS enviados: ${exitosos}/${resultados.length} exitosos. Repeticiones: ${reps}.`,
  });

  return NextResponse.json({ ok: true, resultados, exitosos, total: resultados.length });
}
