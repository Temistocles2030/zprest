// Tipos TypeScript para todas las tablas de Supabase

export type UserRole = "user" | "admin";

export type EstadoUsuario = "activo" | "inactivo" | "bloqueado" | "eliminado";

/** Tipo de cliente — asignado por el admin al calificar al usuario */
export type TipoCliente = "personal" | "pyme" | "pendiente";

export type EstadoRegistro = "pendiente_aprobacion" | "aprobado";

export type TipoInteres = "personal" | "pyme";

export type Usuario = {
  id: string; // UUID Supabase Auth
  email: string;
  nombre: string | null;
  dni: string | null;
  cuil: string | null;
  telefono: string | null;
  telefono_verificado: boolean | null;
  role: UserRole;
  estado: EstadoUsuario;
  estado_motivo: string | null;
  estado_hasta: string | null;      // para bloqueos temporales
  estado_cambiado_at: string | null;
  estado_cambiado_por: string | null;
  tipo_cliente: TipoCliente;        // "pendiente" hasta que admin califique
  estado_registro: EstadoRegistro;  // "pendiente_aprobacion" hasta que admin apruebe
  tipo_interes: TipoInteres | null; // declarado en el registro
  nombre_comercio: string | null;
  empleador: string | null;
  avatar_url: string | null;
  bcra_situacion: number | null;
  bcra_advertencia: string | null;
  afip_activo: boolean | null;
  afip_actividad: string | null;
  plan_preferencial_id: string | null;
  domicilio: { calle?: string; numero?: string; piso?: string; depto?: string; localidad?: string; provincia?: string; codigo_postal?: string } | null;
  // Domicilio (columnas legacy — pueden coexistir con domicilio JSONB)
  calle: string | null;
  altura: string | null;
  piso: string | null;
  depto: string | null;
  localidad: string | null;
  provincia: string | null;
  codigo_postal: string | null;
  created_at: string;
  updated_at: string;
};

export type Plan = {
  id: string;
  nombre: string;
  tipo: "personal" | "pyme" | "dependencia";
  tna: number;
  tem: number | null;   // Tasa Efectiva Mensual % — solo planes mensual/personal
  ted: number | null;   // Tasa Efectiva Diaria %   — solo planes diario/comercial
  frecuencia: "diario" | "quincenal" | "mensual";
  monto_min: number;
  monto_max: number;
  plazo_min: number;    // = plazo_max: cada plan tiene plazo fijo
  plazo_max: number;
  activo: boolean;
  es_preferencial: boolean;
  created_at: string;
};

export type EstadoSolicitud =
  | "pendiente"
  | "en_revision"
  | "pre_aprobado"
  | "pausado"
  | "aprobado"
  | "rechazado"
  | "activo"
  | "completado";

export type HistorialEstado = {
  estado: string;
  fecha: string;
  admin_id: string;
  motivo?: string;
};

export type Solicitud = {
  id: string;
  user_id: string;
  plan_id: string;
  monto: number;
  plazo: number;
  cuotas: number;
  estado: EstadoSolicitud;
  cbu: string | null;
  documentos: string[];
  notas_admin: string | null;
  motivo_rechazo: string | null;
  bind_transferencia_id: string | null;
  comprobante_transferencia: string | null;
  pausado_hasta: string | null;
  pausado_motivo: string | null;
  pre_aprobado_condiciones: string | null;
  historial_estados: HistorialEstado[] | null;
  created_at: string;
  updated_at: string;
};

export type Prestamo = {
  id: string;
  solicitud_id: string;
  user_id: string;
  plan_id: string;
  capital_original: number;
  saldo_remanente: number;
  total_abonado: number;
  cuotas_monto: number;
  cuotas_total: number;
  cuotas_pagadas: number;
  proximo_vencimiento: string | null;
  bind_debin_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EstadoCuota = "pendiente" | "pagada" | "vencida" | "fallida";

export type Cuota = {
  id: string;
  prestamo_id: string;
  user_id: string;
  numero_cuota: number;
  monto: number;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  estado: EstadoCuota;
  bind_operacion_id: string | null;
  bind_estado: string | null;
  reintentos_count: number;
  created_at: string;
};

export type Billetera = {
  id: string;
  user_id: string;
  cvu: string | null;
  saldo_disponible: number;
  saldo_retenido: number;
  bind_account_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TipoMovimiento = "credito" | "debito" | "retencion" | "liberacion";

export type Movimiento = {
  id: string;
  billetera_id: string;
  user_id: string;
  tipo: TipoMovimiento;
  monto: number;
  concepto: string;
  referencia_externa: string | null;
  estado: "pendiente" | "confirmado" | "revertido";
  metadata: Record<string, unknown>;
  created_at: string;
};

export type WebAuthnCredential = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_type: "platform" | "cross-platform";
  backed_up: boolean;
  transports: string[];
  created_at: string;
};

export type EmailLog = {
  id: string;
  tipo: string;
  destinatario: string;
  asunto: string;
  estado: "enviado" | "fallido";
  created_at: string;
};

export type ActividadAdmin = {
  id: string;
  admin_id: string;
  accion: string;
  entidad_tipo: string;
  entidad_id: string;
  detalle: string | null;
  created_at: string;
};
