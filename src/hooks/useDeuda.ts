"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import type { Prestamo, Cuota } from "@/types";

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

interface DeudaState {
  prestamos: Prestamo[];
  cuotas: Cuota[];
  loading: boolean;
  totalDeuda: number;
  totalAbonado: number;
  saldoRemanente: number;
  proximoVencimiento: Cuota | null;
}

export function useDeuda() {
  const { user } = useAuth();
  const [state, setState] = useState<DeudaState>({
    prestamos: [],
    cuotas: [],
    loading: true,
    totalDeuda: 0,
    totalAbonado: 0,
    saldoRemanente: 0,
    proximoVencimiento: null,
  });

  useEffect(() => {
    if (!user) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    if (IS_MOCK) {
      const { MOCK_PRESTAMOS, MOCK_CUOTAS } = require("@/lib/mock/data");
      const uid = user.uid;
      const prestamos: Prestamo[] = MOCK_PRESTAMOS.filter(
        (p: Prestamo & { uid?: string; user_id?: string }) =>
          (p.user_id ?? p.uid) === uid
      );
      const cuotas: Cuota[] = MOCK_CUOTAS.filter(
        (c: Cuota & { uid?: string; user_id?: string }) =>
          (c.user_id ?? c.uid) === uid
      );
      const now = new Date();
      const proximoVencimiento =
        cuotas
          .filter((c) => {
            if (c.estado !== "pendiente") return false;
            const d = new Date(c.fecha_vencimiento ?? (c as Record<string, unknown>).fechaVencimiento as string);
            return d >= now;
          })
          .sort((a, b) => {
            const da = new Date(a.fecha_vencimiento ?? (a as Record<string, unknown>).fechaVencimiento as string).getTime();
            const db = new Date(b.fecha_vencimiento ?? (b as Record<string, unknown>).fechaVencimiento as string).getTime();
            return da - db;
          })[0] ?? null;

      setState({
        prestamos,
        cuotas,
        loading: false,
        totalDeuda: prestamos.reduce((acc, p) => acc + (p.capital_original ?? (p as Record<string, unknown>).capitalOriginal as number ?? 0), 0),
        totalAbonado: prestamos.reduce((acc, p) => acc + (p.total_abonado ?? (p as Record<string, unknown>).totalAbonado as number ?? 0), 0),
        saldoRemanente: prestamos.reduce((acc, p) => acc + (p.saldo_remanente ?? (p as Record<string, unknown>).saldoRemanente as number ?? 0), 0),
        proximoVencimiento,
      });
      return;
    }

    // PRODUCCIÓN — Supabase (sin Realtime hasta habilitarlo en el dashboard)
    const { createClient } = require("@/lib/supabase/client");
    const supabase = createClient();

    const loadData = async () => {
      const { data: prestamos } = await supabase
        .from("prestamos")
        .select("*")
        .eq("user_id", user.uid)
        .is("eliminado_at", null)
        .order("created_at", { ascending: false });

      const prestamoIds = (prestamos ?? []).map((p: Prestamo) => p.id);

      const { data: cuotas } = prestamoIds.length
        ? await supabase
            .from("cuotas")
            .select("*")
            .in("prestamo_id", prestamoIds)
            .order("fecha_vencimiento", { ascending: true })
        : { data: [] };

      const ps: Prestamo[] = prestamos ?? [];
      const cs: Cuota[] = cuotas ?? [];
      const now = new Date();

      const proximoVencimiento =
        cs
          .filter((c) => c.estado === "pendiente" && new Date(c.fecha_vencimiento) >= now)
          .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())[0] ?? null;

      setState({
        prestamos: ps,
        cuotas: cs,
        loading: false,
        totalDeuda: ps.reduce((acc, p) => acc + p.capital_original, 0),
        totalAbonado: ps.reduce((acc, p) => acc + p.total_abonado, 0),
        saldoRemanente: ps.reduce((acc, p) => acc + p.saldo_remanente, 0),
        proximoVencimiento,
      });
    };

    loadData();
  }, [user]);

  return state;
}
