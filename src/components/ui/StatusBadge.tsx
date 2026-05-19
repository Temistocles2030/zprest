import { EstadoSolicitud, EstadoCuota } from "@/types";

type Status = EstadoSolicitud | EstadoCuota | string;

const VARIANTS: Record<string, string> = {
  // EstadoSolicitud
  pendiente:     "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "en_revisión": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  en_revision:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  aprobado:      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rechazado:     "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  completado:    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  activo:        "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  // EstadoCuota
  pagada:        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  vencida:       "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  fallida:       "bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-200",
};

const LABELS: Record<string, string> = {
  pendiente:     "Pendiente",
  "en_revisión": "En revisión",
  en_revision:   "En revisión",
  aprobado:      "Aprobado",
  rechazado:     "Rechazado",
  completado:    "Completado",
  activo:        "Activo",
  pagada:        "Pagada",
  vencida:       "Vencida",
  fallida:       "Fallida",
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const cls = VARIANTS[status] ?? "bg-gray-100 text-gray-600";
  const label = LABELS[status] ?? status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls} ${className}`}
    >
      {label}
    </span>
  );
}
