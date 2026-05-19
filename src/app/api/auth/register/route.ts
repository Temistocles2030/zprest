import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getDeudas, getWorstSituacion } from "@/lib/bcra/client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombre, dni, cuil, email, telefono, password, domicilio, tipo_interes, nombre_comercio } = body;

  if (!nombre || !email || !dni || !cuil || !telefono || !password) {
    return NextResponse.json({ error: "Faltan datos obligatorios (nombre y apellido, DNI, CUIL/CUIT, teléfono, email y contraseña son requeridos)" }, { status: 400 });
  }
  if (!/^\d{11}$/.test(String(cuil).replace(/\D/g, ""))) {
    return NextResponse.json({ error: "CUIL/CUIT inválido (debe tener 11 dígitos)" }, { status: 400 });
  }
  if (!/^\+?[\d\s\-()]{8,20}$/.test(telefono)) {
    return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verificar que el DNI no esté ya registrado
  const dniLimpio = String(dni).replace(/\D/g, "");
  const { data: dniExistente } = await supabase
    .from("usuarios")
    .select("id")
    .eq("dni", dniLimpio)
    .maybeSingle();
  if (dniExistente) {
    return NextResponse.json({ error: "Ya existe una cuenta registrada con ese DNI" }, { status: 409 });
  }

  // Verificar que el DNI no esté en baneados (bloqueo temporal o permanente por DNI)
  const ahora = new Date();
  const { data: dniBaneado } = await supabase
    .from("emails_baneados")
    .select("bloqueado_hasta, tipo")
    .eq("dni", dniLimpio)
    .maybeSingle();
  if (dniBaneado) {
    const bloqueadoActivo = !dniBaneado.bloqueado_hasta || new Date(dniBaneado.bloqueado_hasta) > ahora;
    if (bloqueadoActivo) {
      if (dniBaneado.tipo === "temporal" && dniBaneado.bloqueado_hasta) {
        const hasta = new Date(dniBaneado.bloqueado_hasta).toLocaleDateString("es-AR");
        return NextResponse.json({ error: `Tu DNI no puede registrarse hasta el ${hasta}. Contactá a contacto@zprest.com.ar si tenés dudas.` }, { status: 403 });
      }
      return NextResponse.json({ error: "Este DNI no puede registrarse. Contactá a contacto@zprest.com.ar" }, { status: 403 });
    }
  }

  // Verificar que el email no esté baneado
  const { data: baneado } = await supabase
    .from("emails_baneados")
    .select("email, bloqueado_hasta")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (baneado) {
    const bloqueadoActivo = !baneado.bloqueado_hasta || new Date(baneado.bloqueado_hasta) > ahora;
    if (bloqueadoActivo) {
      return NextResponse.json({ error: "Este email no puede registrarse. Contactá a contacto@zprest.com.ar" }, { status: 403 });
    }
  }

  // Verificar que el email no exista ya
  const { data: existing } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Este email ya está registrado" }, { status: 409 });
  }

  // Consultar BCRA para guardar situación en DB (el bloqueo se hace en /api/auth/check-bcra, paso 1)
  let bcra_situacion: number | null = null;
  let bcra_advertencia: string | null = null;
  if (cuil) {
    const cuilLimpio = String(cuil).replace(/\D/g, "");
    try {
      const resp = await getDeudas(cuilLimpio);
      bcra_situacion = getWorstSituacion(resp);
      if (bcra_situacion >= 2) bcra_advertencia = `Situación BCRA ${bcra_situacion} — requiere revisión`;
    } catch {
      // BCRA no disponible, continuar sin datos
    }
  }

  // Consultar ARCA (ex-AFIP) ANTES de crear el usuario — bloquea pyme sin actividad activa
  let afip_activo: boolean | null = null;
  let afip_actividad: string | null = null;
  if (cuil && process.env.AFIP_CERT_BASE64 && process.env.AFIP_KEY_BASE64 && process.env.AFIP_CUIT) {
    try {
      const { getPersona } = await import("@/lib/afip/padron");
      const cuilLimpio = String(cuil).replace(/\D/g, "");
      const persona = await getPersona(cuilLimpio);
      afip_activo = persona?.estadoClave?.toUpperCase() === "ACTIVO";
      afip_actividad = persona?.denominacion ?? persona?.razonSocial ?? null;

      if (tipo_interes === "pyme" && afip_activo === false) {
        return NextResponse.json({
          error: "Tu CUIL/CUIT no figura como activo en ARCA (ex-AFIP). Para solicitar un Crédito Comercial necesitás tener actividad registrada. Verificá tu situación en arca.gob.ar o contactá a contacto@zprest.com.ar.",
          arca_bloqueado: true,
        }, { status: 403 });
      }
    } catch {
      // ARCA no disponible, continuar sin datos
    }
  }

  // Crear usuario en Supabase Auth con contraseña
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, dni },
  });

  if (authError) {
    const yaExiste = authError.message.toLowerCase().includes("already been registered") ||
                     authError.message.toLowerCase().includes("already registered");
    return NextResponse.json(
      { error: yaExiste ? "Este email ya está registrado" : authError.message },
      { status: yaExiste ? 409 : 500 }
    );
  }

  // Upsert: funciona aunque el trigger aún no haya creado la fila
  await supabase.from("usuarios").upsert({
    id: authUser.user.id,
    email,
    nombre,
    dni: String(dni).replace(/\D/g, ""),
    cuil: cuil ?? null,
    telefono: telefono ?? null,
    domicilio: domicilio ?? null,
    tipo_interes: tipo_interes ?? null,
    nombre_comercio: nombre_comercio ?? null,
    estado_registro: "pendiente_aprobacion",
    role: "user",
    bcra_situacion,
    bcra_advertencia,
    afip_activo,
    afip_actividad,
  }, { onConflict: "id" });

  return NextResponse.json({ ok: true });
}
