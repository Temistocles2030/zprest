export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getDeudas, getWorstSituacion } from "@/lib/bcra/client";
import { getResend, FROM_EMAIL } from "@/lib/resend/client";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const { data, error } = await supabase
    .from("usuarios")
    .select("nombre, dni, cuil, telefono, telefono_verificado, email, tipo_cliente, tipo_interes, estado_registro, bcra_situacion, nombre_comercio, domicilio, avatar_url, plan_preferencial_id, created_at")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ perfil: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient();

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const body = await req.json();
  const { nombre, dni, cuil, telefono, nombre_comercio, domicilio, empleador, profesion } = body;

  // Actualización parcial: solo campos extra (desde formularios de solicitud)
  if (!nombre && !dni && !cuil && !telefono) {
    const camposExtra: Record<string, unknown> = {};
    if (nombre_comercio !== undefined) camposExtra.nombre_comercio = nombre_comercio;
    if (domicilio !== undefined) camposExtra.domicilio = domicilio;
    if (empleador !== undefined) camposExtra.empleador = empleador;
    if (profesion !== undefined) camposExtra.profesion = profesion;
    if (Object.keys(camposExtra).length === 0) return NextResponse.json({ ok: true });
    const { error } = await supabase.from("usuarios").update(camposExtra).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Actualización completa de perfil (desde /mis-datos)
  if (!nombre || !dni || !cuil || !telefono) {
    return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 });
  }
  if (!/^\d{7,8}$/.test(String(dni).replace(/\D/g, ""))) {
    return NextResponse.json({ error: "DNI inválido (7-8 dígitos)" }, { status: 400 });
  }
  if (!/^\d{11}$/.test(String(cuil).replace(/\D/g, ""))) {
    return NextResponse.json({ error: "CUIL/CUIT inválido (11 dígitos)" }, { status: 400 });
  }
  if (!/^\+?[\d\s\-()]{8,20}$/.test(telefono)) {
    return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 });
  }

  const dniLimpio = String(dni).replace(/\D/g, "");
  const { data: dniExistente } = await supabase
    .from("usuarios")
    .select("id")
    .eq("dni", dniLimpio)
    .neq("id", user.id)
    .maybeSingle();
  if (dniExistente) {
    return NextResponse.json({ error: "Ya existe una cuenta registrada con ese DNI" }, { status: 409 });
  }

  let bcra_situacion: number | null = null;
  let bcra_advertencia: string | null = null;
  try {
    const cuilLimpio = String(cuil).replace(/\D/g, "");
    const resp = await getDeudas(cuilLimpio);
    bcra_situacion = getWorstSituacion(resp);
    if (bcra_situacion >= 4) bcra_advertencia = `Situación BCRA ${bcra_situacion} al momento de actualizar perfil`;
    else if (bcra_situacion >= 2) bcra_advertencia = `Situación BCRA ${bcra_situacion} — requiere revisión`;
  } catch {
    // BCRA no disponible, continuar sin datos
  }

  const { error } = await supabase.from("usuarios").update({
    nombre,
    dni: dniLimpio,
    cuil: String(cuil).replace(/\D/g, ""),
    telefono,
    nombre_comercio: nombre_comercio || null,
    domicilio: domicilio ?? null,
    bcra_situacion,
    bcra_advertencia,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email silencioso de alerta a admin
  const { data: usuarioDB } = await supabase.from("usuarios").select("email").eq("id", user.id).single();
  void getResend().emails.send({
    from: FROM_EMAIL,
    to: "contacto@zprest.com.ar",
    subject: `[Zprest] Cambio de perfil — ${nombre}`,
    html: `
      <p>El cliente <strong>${nombre}</strong> (${usuarioDB?.email ?? user.email}) actualizó su perfil.</p>
      <table style="border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 12px;color:#555;">Nombre</td><td style="padding:4px 12px;font-weight:600;">${nombre}</td></tr>
        <tr><td style="padding:4px 12px;color:#555;">DNI</td><td style="padding:4px 12px;font-weight:600;">${dniLimpio}</td></tr>
        <tr><td style="padding:4px 12px;color:#555;">CUIL</td><td style="padding:4px 12px;font-weight:600;">${String(cuil).replace(/\D/g, "")}</td></tr>
        <tr><td style="padding:4px 12px;color:#555;">Teléfono</td><td style="padding:4px 12px;font-weight:600;">${telefono}</td></tr>
        ${nombre_comercio ? `<tr><td style="padding:4px 12px;color:#555;">Comercio</td><td style="padding:4px 12px;font-weight:600;">${nombre_comercio}</td></tr>` : ""}
        ${domicilio ? `<tr><td style="padding:4px 12px;color:#555;">Domicilio</td><td style="padding:4px 12px;font-weight:600;">${[domicilio.calle, domicilio.numero, domicilio.piso, domicilio.depto, domicilio.localidad, domicilio.provincia, domicilio.codigo_postal].filter(Boolean).join(", ")}</td></tr>` : ""}
        ${bcra_situacion !== null ? `<tr><td style="padding:4px 12px;color:#555;">BCRA</td><td style="padding:4px 12px;font-weight:600;">Situación ${bcra_situacion}</td></tr>` : ""}
      </table>
    `,
  });

  void supabase.from("actividad_admin").insert({
    admin_id: user.id,
    accion: "cliente_edito_perfil",
    entidad_tipo: "usuario",
    entidad_id: user.id,
    detalle: { nombre, dni: dniLimpio, cuil: String(cuil).replace(/\D/g, ""), telefono, domicilio, bcra_situacion },
  });

  return NextResponse.json({ ok: true, bcra_situacion });
}
