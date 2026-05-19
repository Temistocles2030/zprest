import { NextResponse } from "next/server";
import { getSaldo } from "@/lib/bind/client";

export async function GET() {
  const username   = process.env.BINDX_USERNAME;
  const password   = process.env.BINDX_PASSWORD;
  const accountId  = process.env.BINDX_ACCOUNT_ID;
  const webhook    = process.env.BINDX_WEBHOOK_SECRET;

  const faltantes = [
    !username   && "BINDX_USERNAME",
    !password   && "BINDX_PASSWORD",
    !accountId  && "BINDX_ACCOUNT_ID  ← obtener con GET /api/admin/bind/setup",
    !webhook    && "BINDX_WEBHOOK_SECRET  ← obtener del equipo BindX",
  ].filter(Boolean) as string[];

  // Sin credenciales base → no configurado
  const configurado = !!(username && password && accountId);

  if (!configurado) {
    return NextResponse.json({ configurado: false, saldo: null, faltantes });
  }

  try {
    const saldo = await getSaldo();
    return NextResponse.json({ configurado: true, saldo, faltantes });
  } catch (error) {
    return NextResponse.json({
      configurado: false,
      saldo: null,
      faltantes,
      error: error instanceof Error ? error.message : "Error al consultar saldo",
    });
  }
}
