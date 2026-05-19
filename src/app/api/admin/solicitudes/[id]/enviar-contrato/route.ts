export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { crearDocumento } from "@/lib/signatura/client";
import { generarContratoPersonalPDF, generarContratoComercialPDF } from "@/lib/signatura/generarContratoPDF";

async function getAdmin(request: NextRequest) {
  const supabase = createAdminClient();
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: me } = await supabase.from("usuarios").select("role, id").eq("id", user.id).single();
  if (me?.role !== "admin") return null;
  return { supabase, adminId: user.id };
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAdmin(request);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { supabase, adminId } = ctx;

  const { data: solicitud, error: fetchErr } = await supabase
    .from("solicitudes")
    .select(`
      *,
      planes(nombre, tipo, tem, ted),
      usuarios(nombre, dni, cuil, email, telefono, telefono_verificado, nombre_comercio, domicilio, profesion)
    `)
    .eq("id", id)
    .single();

  if (fetchErr || !solicitud) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (["rechazado", "completado"].includes(solicitud.estado)) {
    return NextResponse.json({ error: "No se puede enviar contrato para esta solicitud" }, { status: 400 });
  }

  const usuario = (solicitud as any).usuarios as {
    nombre: string;
    dni: string;
    cuil: string | null;
    email: string;
    telefono: string | null;
    telefono_verificado: boolean | null;
    nombre_comercio: string | null;
    domicilio: unknown;
    profesion: string | null;
  };
  const plan = (solicitud as any).planes as {
    nombre: string; tipo: string; tem: number | null; ted: number | null;
  };

  if (!usuario?.email) {
    return NextResponse.json({ error: "El cliente no tiene email registrado" }, { status: 400 });
  }

  const fechaAprobacion = new Date().toISOString();
  const numeroSolicitud = id.slice(0, 8).toUpperCase();

  const aprobacion = new Date(fechaAprobacion);
  // Personal: primer día del mes siguiente. Comercial: mañana (hoy + 1 día)
  const primerVencimientoPersonal = new Date(aprobacion.getFullYear(), aprobacion.getMonth() + 1, 1);
  const primerVencimientoComercial = new Date(aprobacion.getTime() + 24 * 60 * 60 * 1000);

  const dom = domicilioDesdeJSONB(usuario.domicilio);

  let pdfFinal: string;

  try {
    if (plan.tipo === "personal") {
      const tem = plan.tem ?? 0;
      const r = tem / 100;
      const n = solicitud.plazo;
      const cuotaBase = solicitud.monto * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
      const ivaIntereses = solicitud.monto * r * 0.21;
      const primeraCuota = Math.round(cuotaBase + ivaIntereses);

      pdfFinal = await generarContratoPersonalPDF({
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

      pdfFinal = await generarContratoComercialPDF({
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
        primera_cuota_fecha: primerVencimientoComercial.toISOString(),
        fecha_aprobacion: fechaAprobacion,
        numero_solicitud: numeroSolicitud,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error generando contrato PDF";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Enviar a Signatura
  let signaturaId: string;
  try {
    const titulo = `Contrato Zprest — ${usuario.nombre} — ${numeroSolicitud}`;
    const result = await crearDocumento(
      titulo,
      pdfFinal,
      usuario.email,
      usuario.nombre,
      usuario.dni,
      usuario.telefono_verificado ? (usuario.telefono ?? undefined) : undefined,
    );
    signaturaId = result.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error enviando a Signatura";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const historialActual = Array.isArray(solicitud.historial_estados) ? solicitud.historial_estados : [];
  const nuevoEstado = ["aprobado", "activo"].includes(solicitud.estado) ? solicitud.estado : "pre_aprobado";

  const { error: updateErr } = await supabase
    .from("solicitudes")
    .update({
      signatura_documento_id: signaturaId,
      contrato_enviado_at: fechaAprobacion,
      contrato_firmado: false,
      estado: nuevoEstado,
      historial_estados: [...historialActual, {
        estado: nuevoEstado,
        fecha: fechaAprobacion,
        admin_id: adminId,
        motivo: "Contrato enviado a Signatura para firma del cliente",
      }],
    })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await supabase.from("actividad_admin").insert({
    admin_id: adminId,
    accion: "contrato_enviado",
    entidad_tipo: "solicitud",
    entidad_id: id,
    detalle: `Contrato enviado a ${usuario.email} via Signatura. ID: ${signaturaId}`,
  });

  return NextResponse.json({ ok: true, signatura_id: signaturaId });
}
