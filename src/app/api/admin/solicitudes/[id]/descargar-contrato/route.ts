export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generarContratoPersonalPDF, generarContratoComercialPDF } from "@/lib/signatura/generarContratoPDF";

async function getAdmin(request: NextRequest) {
  const supabase = createAdminClient();
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: me } = await supabase.from("usuarios").select("role, id").eq("id", user.id).single();
  if (me?.role !== "admin") return null;
  return { supabase };
}

function domicilioDesdeJSONB(raw: unknown): { calle: string; ciudad: string; cp: string; provincia: string } {
  if (!raw) return { calle: "", ciudad: "", cp: "", provincia: "" };
  if (typeof raw === "string") return { calle: raw, ciudad: "", cp: "", provincia: "" };
  const d = raw as Record<string, string>;
  const calle = [d.calle, d.altura, d.piso ? `P${d.piso}` : "", d.depto].filter(Boolean).join(" ");
  return {
    calle,
    ciudad: d.localidad ?? d.ciudad ?? "",
    cp: d.cp ?? "",
    provincia: d.provincia ?? "",
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAdmin(request);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { supabase } = ctx;

  // Solicitud con datos del plan y cliente
  const { data: solicitud, error: fetchErr } = await supabase
    .from("solicitudes")
    .select(`
      *,
      planes(nombre, tipo, tem, ted),
      usuarios(nombre, dni, cuil, email, telefono, nombre_comercio, domicilio, profesion)
    `)
    .eq("id", id)
    .single();

  if (fetchErr || !solicitud) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  // Préstamo asociado para obtener fecha real de aprobación y primera cuota
  const { data: prestamo } = await supabase
    .from("prestamos")
    .select("id, created_at")
    .eq("solicitud_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Primera cuota para usar su fecha real en el contrato
  let primeraCuotaFecha: string | null = null;
  if (prestamo) {
    const { data: cuota1 } = await supabase
      .from("cuotas")
      .select("fecha_vencimiento")
      .eq("prestamo_id", prestamo.id)
      .eq("numero_cuota", 1)
      .single();
    primeraCuotaFecha = cuota1?.fecha_vencimiento ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usuario = (solicitud as any).usuarios as {
    nombre: string; dni: string; cuil: string | null; email: string;
    telefono: string | null; nombre_comercio: string | null;
    domicilio: unknown; profesion: string | null;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = (solicitud as any).planes as {
    nombre: string; tipo: string; tem: number | null; ted: number | null;
  };

  // Fecha de aprobación: usar la del préstamo si existe, sino today
  const fechaAprobacion = prestamo?.created_at ?? new Date().toISOString();
  const numeroSolicitud = id.slice(0, 8).toUpperCase();
  const dom = domicilioDesdeJSONB(usuario.domicilio);

  let pdfBase64: string;

  try {
    if (plan.tipo === "personal") {
      const tem = plan.tem ?? 0;
      const r = tem / 100;
      const n = solicitud.plazo;
      const cuotaBase = solicitud.monto * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
      const ivaIntereses = solicitud.monto * r * 0.21;
      const primeraCuota = Math.round(cuotaBase + ivaIntereses);

      pdfBase64 = await generarContratoPersonalPDF({
        nombre: usuario.nombre,
        dni: usuario.dni,
        cuil: usuario.cuil ?? "",
        email: usuario.email,
        domicilio: dom.calle,
        ciudad: dom.ciudad,
        provincia: dom.provincia,
        profesion: usuario.profesion ?? "",
        monto: solicitud.monto,
        cuotas: solicitud.plazo,
        tem,
        primera_cuota: primeraCuota,
        cbu: solicitud.cbu ?? "",
        banco: (solicitud as any).banco ?? "",
        fecha_aprobacion: fechaAprobacion,
        numero_solicitud: numeroSolicitud,
      });
    } else {
      const ted = plan.ted ?? 0;
      const cuotaDiaria = Math.round(
        solicitud.monto / solicitud.plazo +
        solicitud.monto * (ted / 100) +
        solicitud.monto * (ted / 100) * 0.21
      );

      // Usar la fecha real de la primera cuota en DB
      const primeraFechaReal = primeraCuotaFecha
        ? primeraCuotaFecha + "T12:00:00"
        : new Date(new Date(fechaAprobacion).getTime() + 24 * 60 * 60 * 1000).toISOString();

      pdfBase64 = await generarContratoComercialPDF({
        nombre: usuario.nombre,
        dni: usuario.dni,
        cuil: usuario.cuil ?? "",
        email: usuario.email,
        domicilio: dom.calle,
        ciudad: dom.ciudad,
        cp: dom.cp,
        provincia: dom.provincia,
        profesion: usuario.profesion ?? "",
        domicilio_comercial: dom.calle,
        ciudad_comercial: dom.ciudad,
        cp_comercial: dom.cp,
        nombre_comercio: usuario.nombre_comercio ?? "",
        monto: solicitud.monto,
        plazo_dias: solicitud.plazo,
        ted,
        cuota_diaria: cuotaDiaria,
        cbu: solicitud.cbu ?? "",
        banco: (solicitud as any).banco ?? "",
        primera_cuota_fecha: primeraFechaReal,
        fecha_aprobacion: fechaAprobacion,
        numero_solicitud: numeroSolicitud,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error generando contrato";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const pdfBytes = Buffer.from(pdfBase64, "base64");
  const nombreArchivo = `Contrato_${usuario.nombre.replace(/\s+/g, "_")}_${numeroSolicitud}.pdf`;

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Content-Length": String(pdfBytes.length),
    },
  });
}
