/**
 * Cuota mensual — Plan Personal (sistema francés)
 * Muestra la PRIMERA cuota (la más alta, decrece por IVA sobre intereses decrecientes)
 */
export function calcularCuotaPersonal(
  monto: number,
  tem: number,    // Tasa Efectiva Mensual en % (ej: 18)
  cuotas: number
): number {
  const r = tem / 100
  const cuotaSinIva = monto * (r * Math.pow(1 + r, cuotas)) / (Math.pow(1 + r, cuotas) - 1)
  const ivaMes1 = monto * r * 0.21
  return Math.round(cuotaSinIva + ivaMes1)
}

/**
 * Cuota diaria — Plan Comercial
 * cuota = capital/día + interés diario + IVA 21% sobre intereses
 */
export function calcularCuotaDiariaComercial(
  monto: number,
  ted: number,    // Tasa Efectiva Diaria en % (ej: 1.38)
  dias: number
): number {
  const capitalDiario = monto / dias
  const interesDiario = monto * (ted / 100)
  const ivaDiario = interesDiario * 0.21
  return Math.round(capitalDiario + interesDiario + ivaDiario)
}

/**
 * Tabla de amortización completa — Sistema francés
 * Usada por el endpoint de aprobación para crear las cuotas individuales en DB.
 */
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

export function calcularCuotasFrances(
  monto: number,
  tna: number,
  numeroCuotas: number,
  _frecuencia = "mensual"
): ResultadoCalculo {
  const r = tna / 100 / 12;
  const n = numeroCuotas;
  const cuotaMensual = Math.round(monto * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));

  const cuotas: CuotaCalculada[] = [];
  let saldo = monto;
  for (let i = 1; i <= n; i++) {
    const interes = Math.round(saldo * r);
    const capital = cuotaMensual - interes;
    saldo = Math.max(0, saldo - capital);
    cuotas.push({ numero: i, capital, interes, cuota: cuotaMensual, saldoRestante: saldo });
  }

  const totalAPagar = cuotaMensual * n;
  return { cuotaMensual, totalAPagar, totalIntereses: totalAPagar - monto, tasaMensual: r, cuotas };
}

export function formatearPesos(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor)
}
