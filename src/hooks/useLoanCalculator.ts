"use client";

import { useState, useMemo } from "react";
import { calcularCuotasFrances } from "@/lib/loan-calculator";
import type { ResultadoCalculo, FrecuenciaPlan } from "@/types";

interface CalculatorInput {
  capital: number;
  tna: number;
  cuotas: number;
  frecuencia: FrecuenciaPlan;
}

export function useLoanCalculator(initial?: Partial<CalculatorInput>) {
  const [input, setInput] = useState<CalculatorInput>({
    capital: initial?.capital ?? 100000,
    tna: initial?.tna ?? 65,
    cuotas: initial?.cuotas ?? 12,
    frecuencia: initial?.frecuencia ?? "mensual",
  });

  const resultado = useMemo<ResultadoCalculo>(() => {
    if (input.capital <= 0 || input.cuotas <= 0) {
      return {
        cuotaMensual: 0,
        totalAPagar: 0,
        totalIntereses: 0,
        tasaMensual: 0,
        cuotas: [],
      };
    }
    return calcularCuotasFrances(
      input.capital,
      input.tna,
      input.cuotas,
      input.frecuencia
    );
  }, [input]);

  const setCapital = (capital: number) =>
    setInput((prev) => ({ ...prev, capital }));
  const setTna = (tna: number) => setInput((prev) => ({ ...prev, tna }));
  const setCuotas = (cuotas: number) =>
    setInput((prev) => ({ ...prev, cuotas }));
  const setFrecuencia = (frecuencia: FrecuenciaPlan) =>
    setInput((prev) => ({ ...prev, frecuencia }));

  return { input, resultado, setCapital, setTna, setCuotas, setFrecuencia };
}
