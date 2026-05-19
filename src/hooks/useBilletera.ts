"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import type { Billetera, Movimiento } from "@/types";

interface BilleteraState {
  billetera: Billetera | null;
  movimientos: Movimiento[];
  loading: boolean;
}

export function useBilletera() {
  const { user } = useAuth();
  const [state, setState] = useState<BilleteraState>({
    billetera: null,
    movimientos: [],
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({ billetera: null, movimientos: [], loading: false });
      return;
    }

    if (process.env.NEXT_PUBLIC_MOCK_MODE === "true") {
      // Mock: billetera vacía
      setState({
        billetera: {
          id: "mock-billetera",
          user_id: user.uid,
          cvu: null,
          saldo_disponible: 0,
          saldo_retenido: 0,
          bind_account_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        movimientos: [],
        loading: false,
      });
      return;
    }

    // PRODUCCIÓN — Supabase Realtime
    const { createClient } = require("@/lib/supabase/client");
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const loadData = async () => {
      const { data: billetera } = await supabase
        .from("billeteras")
        .select("*")
        .eq("user_id", user.uid)
        .single();

      const { data: movimientos } = billetera
        ? await supabase
            .from("movimientos")
            .select("*")
            .eq("billetera_id", billetera.id)
            .order("created_at", { ascending: false })
            .limit(50)
        : { data: [] };

      setState({
        billetera: billetera ?? null,
        movimientos: movimientos ?? [],
        loading: false,
      });
    };

    loadData();

    channel = supabase
      .channel(`billetera:${user.uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billeteras", filter: `user_id=eq.${user.uid}` },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "movimientos", filter: `user_id=eq.${user.uid}` },
        () => loadData()
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  return state;
}
