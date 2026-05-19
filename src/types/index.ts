// Re-export de tipos Supabase (fuente canónica)
export type {
  UserRole,
  EstadoUsuario,
  TipoCliente,
  EstadoRegistro,
  TipoInteres,
  Usuario,
  Plan,
  EstadoSolicitud,
  HistorialEstado,
  Solicitud,
  Prestamo,
  EstadoCuota,
  Cuota,
  Billetera,
  TipoMovimiento,
  Movimiento,
  WebAuthnCredential,
  EmailLog,
  ActividadAdmin,
} from "@/lib/supabase/types";

// ─── Alias de compatibilidad (snake_case → camelCase) ─────────────────────────
// Usados en mock data y componentes existentes
export type TipoPlan = "personal" | "pyme" | "dependencia";
export type FrecuenciaPlan = "diario" | "quincenal" | "mensual";

// ─── BindX ────────────────────────────────────────────────────────────────────
export interface BindTransferencia {
  id: string;
  monto: number;
  cbuDestino: string;
  concepto: string;
  estado: "pendiente" | "acreditada" | "rechazada";
  createdAt: string;
}

export interface BindDebin {
  id: string;
  cbuDeudor: string;
  monto: number;
  concepto: string;
  estado: "pendiente" | "acreditado" | "rechazado" | "expirado";
  fechaVencimiento: string;
  createdAt: string;
}

// ─── Calculadora de cuotas ────────────────────────────────────────────────────
export interface CuotaCalculada {
  numero: number;
  capital: number;
  interes: number;
  cuota: number;
  saldoRestante: number;
}

export interface ResultadoCalculo {
  cuotaMensual: number;
  totalAPagar: number;
  totalIntereses: number;
  tasaMensual: number;
  cuotas: CuotaCalculada[];
}

// ─── Simulador ────────────────────────────────────────────────────────────────
export interface PlanSimulador {
  id: string;
  nombre: string;
  tipo: "personal" | "pyme" | "dependencia";
  tna: number;
  tem: number | null;   // Tasa Efectiva Mensual % — planes personal
  ted: number | null;   // Tasa Efectiva Diaria %   — planes comercial/pyme
  frecuencia: "diario" | "quincenal" | "mensual";
  monto_min: number;
  monto_max: number;
  plazo_min: number;    // plazo fijo del plan (cuotas o días)
  plazo_max: number;
  activo: boolean;
  es_preferencial?: boolean;
}

// ─── Forms ────────────────────────────────────────────────────────────────────
export interface SolicitudFormData {
  nombre: string;
  dni: string;
  telefono: string;
  tipoPlan: TipoPlan;
  planId: string;
  monto: number;
  plazo: number;
  documentos: File[];
  cbu: string;
  confirmado: boolean;
}
