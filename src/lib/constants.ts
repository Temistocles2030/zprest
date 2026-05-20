import type { EstadoSolicitud, EstadoCuota, TipoPlan, FrecuenciaPlan } from "@/types";

// ─── Estados ──────────────────────────────────────────────────────────────────
export const ESTADOS_SOLICITUD: Record<EstadoSolicitud, string> = {
  pendiente:    "Pendiente",
  en_revision:  "En revisión",
  pre_aprobado: "Pre-aprobado",
  pausado:      "Pausado",
  aprobado:     "Aprobado",
  rechazado:    "Rechazado",
  activo:       "Activo",
  completado:   "Completado",
};

export const ESTADOS_CUOTA: Record<EstadoCuota, string> = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  vencida: "Vencida",
  fallida: "Fallida",
};

// ─── Tipos de plan ────────────────────────────────────────────────────────────
export const TIPOS_PLAN: Record<TipoPlan, string> = {
  personal: "Personal",
  pyme: "Pyme",
  dependencia: "Dependencia",
};

export const FRECUENCIAS_PLAN: Record<FrecuenciaPlan, string> = {
  diario: "Diario",
  quincenal: "Quincenal",
  mensual: "Mensual",
};

// ─── Colecciones Firestore ────────────────────────────────────────────────────
export const COLLECTIONS = {
  USUARIOS: "usuarios",
  PLANES: "planes",
  SOLICITUDES: "solicitudes",
  PRESTAMOS: "prestamos",
  CUOTAS: "cuotas",
  EMAIL_LOGS: "emailLogs",
  ACTIVIDAD_ADMIN: "actividadAdmin",
} as const;

// ─── Configuración de la app ──────────────────────────────────────────────────
export const APP_CONFIG = {
  nombre: "Zprest",
  dominio: "zprest.com.ar",
  email_soporte: "contacto@zprest.com.ar",
  moneda: "ARS",
  pais: "AR",
} as const;

// ─── Colores de estado ────────────────────────────────────────────────────────
export const COLORES_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  pendiente:    "bg-yellow-100 text-yellow-800",
  en_revision:  "bg-blue-100 text-blue-800",
  pre_aprobado: "bg-cyan-100 text-cyan-800",
  pausado:      "bg-orange-100 text-orange-800",
  aprobado:     "bg-green-100 text-green-800",
  rechazado:    "bg-red-100 text-red-800",
  activo:       "bg-emerald-100 text-emerald-800",
  completado:   "bg-gray-100 text-gray-800",
};

export const COLORES_ESTADO_CUOTA: Record<EstadoCuota, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  pagada: "bg-green-100 text-green-800",
  vencida: "bg-orange-100 text-orange-800",
  fallida: "bg-red-100 text-red-800",
};

// ─── BCRA ─────────────────────────────────────────────────────────────────────
export const BCRA_SITUACIONES = {
  1: { label: "Normal",       color: "text-green-400",  description: "Sin problemas" },
  2: { label: "Riesgo Bajo",  color: "text-yellow-400", description: "Con seguimiento especial" },
  3: { label: "Riesgo Medio", color: "text-orange-400", description: "Con problemas" },
  4: { label: "Riesgo Alto",  color: "text-red-400",    description: "Alto riesgo de insolvencia" },
  5: { label: "Irrecuperable",color: "text-red-600",    description: "Irrecuperable" },
  6: { label: "Irrecuperable (disp. técnica)", color: "text-red-600", description: "Irrecuperable por disposición técnica" },
} as const;

// ─── Localidades (Neuquén + Río Negro adyacente) ──────────────────────────────
export const LOCALIDADES: { nombre: string; provincia: string }[] = [
  // Neuquén — principales
  { nombre: "Neuquén", provincia: "Neuquén" },
  { nombre: "Plottier", provincia: "Neuquén" },
  { nombre: "Centenario", provincia: "Neuquén" },
  { nombre: "Cutral Có", provincia: "Neuquén" },
  { nombre: "Plaza Huincul", provincia: "Neuquén" },
  { nombre: "Zapala", provincia: "Neuquén" },
  { nombre: "San Martín de los Andes", provincia: "Neuquén" },
  { nombre: "Villa La Angostura", provincia: "Neuquén" },
  { nombre: "Junín de los Andes", provincia: "Neuquén" },
  { nombre: "Aluminé", provincia: "Neuquén" },
  { nombre: "Chos Malal", provincia: "Neuquén" },
  { nombre: "Rincón de los Sauces", provincia: "Neuquén" },
  { nombre: "Añelo", provincia: "Neuquén" },
  { nombre: "San Patricio del Chañar", provincia: "Neuquén" },
  { nombre: "Vista Alegre Norte", provincia: "Neuquén" },
  { nombre: "Piedra del Águila", provincia: "Neuquén" },
  { nombre: "Picún Leufú", provincia: "Neuquén" },
  { nombre: "Las Lajas", provincia: "Neuquén" },
  { nombre: "Loncopué", provincia: "Neuquén" },
  { nombre: "El Huecú", provincia: "Neuquén" },
  { nombre: "Andacollo", provincia: "Neuquén" },
  { nombre: "Huinganco", provincia: "Neuquén" },
  { nombre: "Caviahue-Copahue", provincia: "Neuquén" },
  { nombre: "Villa Pehuenia", provincia: "Neuquén" },
  { nombre: "Moquehue", provincia: "Neuquén" },
  { nombre: "Buta Ranquil", provincia: "Neuquén" },
  { nombre: "Las Coloradas", provincia: "Neuquén" },
  { nombre: "Chorriaca", provincia: "Neuquén" },
  { nombre: "Mariano Moreno", provincia: "Neuquén" },
  { nombre: "Tricao Malal", provincia: "Neuquén" },
  { nombre: "Villa El Chocón", provincia: "Neuquén" },
  { nombre: "Octavio Pico", provincia: "Neuquén" },
  { nombre: "Barrancas", provincia: "Neuquén" },
  { nombre: "Senillosa", provincia: "Neuquén" },
  { nombre: "San Cabao", provincia: "Neuquén" },
  // Río Negro — zona de influencia
  { nombre: "Cipolletti", provincia: "Río Negro" },
  { nombre: "Allen", provincia: "Río Negro" },
  { nombre: "General Roca", provincia: "Río Negro" },
  { nombre: "Fernández Oro", provincia: "Río Negro" },
  { nombre: "Cinco Saltos", provincia: "Río Negro" },
];

// ─── Formateo ─────────────────────────────────────────────────────────────────
export function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
