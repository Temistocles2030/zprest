/**
 * DATOS MOCK para demo al cliente.
 * Activar con NEXT_PUBLIC_MOCK_MODE=true en .env.local
 */

import type { Usuario, Prestamo, Cuota, Solicitud, Plan, ActividadAdmin } from "@/types";

const ahora = new Date();
const hace30 = new Date(ahora.getTime() - 30 * 86400000);
const hace60 = new Date(ahora.getTime() - 60 * 86400000);
const en7dias = new Date(ahora.getTime() + 7 * 86400000);
const en37dias = new Date(ahora.getTime() + 37 * 86400000);

function iso(d: Date) {
  return d.toISOString();
}

// ─── Usuarios mock ─────────────────────────────────────────────────────────────
const ESTADO_USUARIO_DEFAULTS = {
  estado: "activo" as const,
  estado_motivo: null,
  estado_hasta: null,
  estado_cambiado_at: null,
  estado_cambiado_por: null,
  tipo_cliente: "personal" as const,
  estado_registro: "aprobado" as const,
  tipo_interes: "personal" as const,
  empleador: null,
  avatar_url: null,
  bcra_situacion: null,
  bcra_advertencia: null,
  afip_activo: null,
  afip_actividad: null,
  plan_preferencial_id: null,
  domicilio: null,
  calle: null,
  altura: null,
  piso: null,
  depto: null,
  localidad: null,
  provincia: null,
  codigo_postal: null,
};

export const MOCK_USUARIO: Usuario = {
  id: "mock-uid-001",
  email: "demo@zprest.com.ar",
  nombre: "Juan Demo",
  dni: "32000000",
  cuil: null,
  telefono: null,
  telefono_verificado: null,
  nombre_comercio: null,
  role: "user",
  ...ESTADO_USUARIO_DEFAULTS,
  created_at: iso(hace60),
  updated_at: iso(ahora),
};

export const MOCK_ADMIN: Usuario = {
  id: "mock-admin-001",
  email: "admin@zprest.com.ar",
  nombre: "Admin Zprest",
  dni: "20000000",
  cuil: null,
  telefono: null,
  telefono_verificado: null,
  nombre_comercio: null,
  role: "admin",
  ...ESTADO_USUARIO_DEFAULTS,
  created_at: iso(hace60),
  updated_at: iso(ahora),
};

// ─── Planes mock ──────────────────────────────────────────────────────────────
export const MOCK_PLANES: Plan[] = [
  {
    id: "plan-personal-01",
    nombre: "Personal 12 cuotas",
    tipo: "personal",
    tna: 96,
    tem: 8,
    ted: null,
    frecuencia: "mensual",
    monto_min: 1000000,
    monto_max: 7000000,
    plazo_min: 12,
    plazo_max: 12,
    activo: true,
    es_preferencial: false,
    created_at: iso(hace60),
  },
  {
    id: "plan-pyme-01",
    nombre: "Comercial 60 días",
    tipo: "pyme",
    tna: 553,
    tem: null,
    ted: 1.52,
    frecuencia: "diario",
    monto_min: 1000000,
    monto_max: 15000000,
    plazo_min: 60,
    plazo_max: 60,
    activo: true,
    es_preferencial: false,
    created_at: iso(hace60),
  },
  {
    id: "plan-dep-01",
    nombre: "Plan Nómina Mensual",
    tipo: "dependencia",
    tna: 48,
    tem: null,
    ted: null,
    frecuencia: "mensual",
    monto_min: 50000,
    monto_max: 1500000,
    plazo_min: 3,
    plazo_max: 12,
    activo: true,
    es_preferencial: false,
    created_at: iso(hace60),
  },
  {
    id: "plan-personal-02",
    nombre: "Personal 6 cuotas",
    tipo: "personal",
    tna: 96,
    tem: 12,
    ted: null,
    frecuencia: "mensual",
    monto_min: 1000000,
    monto_max: 7000000,
    plazo_min: 6,
    plazo_max: 6,
    activo: false,
    es_preferencial: false,
    created_at: iso(hace30),
  },
];

// ─── Préstamos mock ───────────────────────────────────────────────────────────
export const MOCK_PRESTAMOS: Prestamo[] = [
  {
    id: "prest-001",
    solicitud_id: "sol-001",
    user_id: "mock-uid-001",
    plan_id: "plan-personal-01",
    capital_original: 200000,
    saldo_remanente: 148000,
    total_abonado: 72000,
    cuotas_monto: 24000,
    cuotas_total: 12,
    cuotas_pagadas: 3,
    proximo_vencimiento: en7dias.toISOString().split("T")[0],
    bind_debin_id: null,
    created_at: iso(hace60),
    updated_at: iso(ahora),
  },
  {
    id: "prest-002",
    solicitud_id: "sol-002",
    user_id: "mock-uid-001",
    plan_id: "plan-dep-01",
    capital_original: 150000,
    saldo_remanente: 120000,
    total_abonado: 40000,
    cuotas_monto: 20000,
    cuotas_total: 8,
    cuotas_pagadas: 2,
    proximo_vencimiento: en37dias.toISOString().split("T")[0],
    bind_debin_id: null,
    created_at: iso(hace30),
    updated_at: iso(ahora),
  },
];

// ─── Cuotas mock ──────────────────────────────────────────────────────────────
export const MOCK_CUOTAS: Cuota[] = [
  {
    id: "cuota-001-1", prestamo_id: "prest-001", user_id: "mock-uid-001",
    numero_cuota: 1, monto: 24000,
    fecha_vencimiento: hace60.toISOString().split("T")[0],
    fecha_pago: iso(hace60),
    estado: "pagada", bind_operacion_id: "bind-op-001", bind_estado: "acreditado",
    reintentos_count: 0, created_at: iso(hace60),
  },
  {
    id: "cuota-001-2", prestamo_id: "prest-001", user_id: "mock-uid-001",
    numero_cuota: 2, monto: 24000,
    fecha_vencimiento: hace30.toISOString().split("T")[0],
    fecha_pago: iso(hace30),
    estado: "pagada", bind_operacion_id: "bind-op-002", bind_estado: "acreditado",
    reintentos_count: 0, created_at: iso(hace60),
  },
  {
    id: "cuota-001-3", prestamo_id: "prest-001", user_id: "mock-uid-001",
    numero_cuota: 3, monto: 24000,
    fecha_vencimiento: new Date(ahora.getTime() - 2 * 86400000).toISOString().split("T")[0],
    fecha_pago: iso(new Date(ahora.getTime() - 1 * 86400000)),
    estado: "pagada", bind_operacion_id: "bind-op-003", bind_estado: "acreditado",
    reintentos_count: 0, created_at: iso(hace60),
  },
  {
    id: "cuota-001-4", prestamo_id: "prest-001", user_id: "mock-uid-001",
    numero_cuota: 4, monto: 24000,
    fecha_vencimiento: en7dias.toISOString().split("T")[0],
    fecha_pago: null,
    estado: "pendiente", bind_operacion_id: null, bind_estado: null,
    reintentos_count: 0, created_at: iso(hace60),
  },
  {
    id: "cuota-001-5", prestamo_id: "prest-001", user_id: "mock-uid-001",
    numero_cuota: 5, monto: 24000,
    fecha_vencimiento: en37dias.toISOString().split("T")[0],
    fecha_pago: null,
    estado: "pendiente", bind_operacion_id: null, bind_estado: null,
    reintentos_count: 0, created_at: iso(hace60),
  },
  {
    id: "cuota-002-1", prestamo_id: "prest-002", user_id: "mock-uid-001",
    numero_cuota: 1, monto: 20000,
    fecha_vencimiento: hace30.toISOString().split("T")[0],
    fecha_pago: iso(hace30),
    estado: "pagada", bind_operacion_id: "bind-op-004", bind_estado: "acreditado",
    reintentos_count: 0, created_at: iso(hace30),
  },
  {
    id: "cuota-002-2", prestamo_id: "prest-002", user_id: "mock-uid-001",
    numero_cuota: 2, monto: 20000,
    fecha_vencimiento: new Date(ahora.getTime() - 1 * 86400000).toISOString().split("T")[0],
    fecha_pago: iso(new Date(ahora.getTime() - 1 * 86400000)),
    estado: "pagada", bind_operacion_id: "bind-op-005", bind_estado: "acreditado",
    reintentos_count: 0, created_at: iso(hace30),
  },
  {
    id: "cuota-002-3", prestamo_id: "prest-002", user_id: "mock-uid-001",
    numero_cuota: 3, monto: 20000,
    fecha_vencimiento: en37dias.toISOString().split("T")[0],
    fecha_pago: null,
    estado: "pendiente", bind_operacion_id: null, bind_estado: null,
    reintentos_count: 0, created_at: iso(hace30),
  },
];

const SOL_DEFAULTS = {
  comprobante_transferencia: null,
  pausado_hasta: null,
  pausado_motivo: null,
  pre_aprobado_condiciones: null,
  historial_estados: null,
};

// ─── Solicitudes mock ─────────────────────────────────────────────────────────
export const MOCK_SOLICITUDES: Solicitud[] = [
  {
    id: "sol-003", user_id: "mock-uid-002", plan_id: "plan-personal-01",
    monto: 80000, plazo: 6, cuotas: 6, estado: "pendiente",
    cbu: "0000003100098765432101", documentos: [],
    notas_admin: null, motivo_rechazo: null, bind_transferencia_id: null,
    ...SOL_DEFAULTS,
    created_at: iso(new Date(ahora.getTime() - 1 * 86400000)),
    updated_at: iso(new Date(ahora.getTime() - 1 * 86400000)),
  },
  {
    id: "sol-004", user_id: "mock-uid-003", plan_id: "plan-pyme-01",
    monto: 500000, plazo: 12, cuotas: 12, estado: "en_revision",
    cbu: "0000003100011111111101", documentos: [],
    notas_admin: "Pendiente verificación de documentación Pyme",
    motivo_rechazo: null, bind_transferencia_id: null,
    ...SOL_DEFAULTS,
    created_at: iso(new Date(ahora.getTime() - 3 * 86400000)),
    updated_at: iso(new Date(ahora.getTime() - 1 * 86400000)),
  },
  {
    id: "sol-005", user_id: "mock-uid-004", plan_id: "plan-dep-01",
    monto: 120000, plazo: 8, cuotas: 8, estado: "pendiente",
    cbu: "0000003100022222222201", documentos: [],
    notas_admin: null, motivo_rechazo: null, bind_transferencia_id: null,
    ...SOL_DEFAULTS,
    created_at: iso(new Date(ahora.getTime() - 5 * 86400000)),
    updated_at: iso(new Date(ahora.getTime() - 5 * 86400000)),
  },
  {
    id: "sol-001", user_id: "mock-uid-001", plan_id: "plan-personal-01",
    monto: 200000, plazo: 12, cuotas: 12, estado: "aprobado",
    cbu: "0000003100012345678901", documentos: [],
    notas_admin: null, motivo_rechazo: null, bind_transferencia_id: "bind-trans-001",
    ...SOL_DEFAULTS,
    created_at: iso(hace60), updated_at: iso(hace60),
  },
  {
    id: "sol-002", user_id: "mock-uid-001", plan_id: "plan-dep-01",
    monto: 150000, plazo: 8, cuotas: 8, estado: "aprobado",
    cbu: "0000003100012345678901", documentos: [],
    notas_admin: null, motivo_rechazo: null, bind_transferencia_id: "bind-trans-002",
    ...SOL_DEFAULTS,
    created_at: iso(hace30), updated_at: iso(hace30),
  },
  {
    id: "sol-006", user_id: "mock-uid-005", plan_id: "plan-personal-01",
    monto: 50000, plazo: 3, cuotas: 3, estado: "rechazado",
    cbu: "0000003100033333333301", documentos: [],
    notas_admin: null, motivo_rechazo: "Historial crediticio con deuda en BCRA",
    bind_transferencia_id: null,
    ...SOL_DEFAULTS,
    created_at: iso(new Date(ahora.getTime() - 7 * 86400000)),
    updated_at: iso(new Date(ahora.getTime() - 6 * 86400000)),
  },
];

// ─── Actividad admin mock ─────────────────────────────────────────────────────
export const MOCK_ACTIVIDAD: ActividadAdmin[] = [
  {
    id: "act-001", admin_id: "mock-admin-001",
    accion: "aprobar_solicitud", entidad_tipo: "solicitud", entidad_id: "sol-001",
    detalle: "Solicitud aprobada. Transferencia BindX: bind-trans-001",
    created_at: iso(hace60),
  },
  {
    id: "act-002", admin_id: "mock-admin-001",
    accion: "rechazar_solicitud", entidad_tipo: "solicitud", entidad_id: "sol-006",
    detalle: "Rechazada por deuda en BCRA",
    created_at: iso(new Date(ahora.getTime() - 6 * 86400000)),
  },
  {
    id: "act-003", admin_id: "mock-admin-001",
    accion: "crear_plan", entidad_tipo: "plan", entidad_id: "plan-pyme-01",
    detalle: "Creado Plan Pyme Diario con TNA 55%",
    created_at: iso(hace60),
  },
];
