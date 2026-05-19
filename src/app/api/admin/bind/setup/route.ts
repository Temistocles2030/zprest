/**
 * GET /api/admin/bind/setup
 * Devuelve las cuentas de Zprest en BindX.
 * Usar una sola vez para obtener el BINDX_ACCOUNT_ID.
 * Solo accesible con credenciales BindX configuradas.
 */
import { NextResponse } from "next/server";
import { bindxRequest, BANK_ID, VIEW_ID } from "@/lib/bind/client";

interface BankAccount {
  id: string;
  label: string;
  balance: { currency: string; amount: number };
  account_routing: { scheme: string; address: string };
}

export async function GET() {
  try {
    const data = await bindxRequest<BankAccount[]>(
      `/banks/${BANK_ID}/accounts/${VIEW_ID}`
    );

    const cuentas = (data ?? []).map((a) => ({
      account_id: a.id,
      label: a.label,
      cbu: a.account_routing?.address ?? "",
      saldo: a.balance?.amount ?? 0,
    }));

    return NextResponse.json({
      ok: true,
      cuentas,
      instruccion: "Copiá el account_id de la cuenta principal y cargalo como BINDX_ACCOUNT_ID en Vercel",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Error" },
      { status: 502 }
    );
  }
}
