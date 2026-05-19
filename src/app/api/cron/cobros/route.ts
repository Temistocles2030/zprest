export const dynamic = "force-dynamic";

/**
 * GET /api/cron/cobros
 *
 * Job diario que evalúa cuotas vencidas y dispara DEBINs.
 * Protegido con CRON_SECRET en header Authorization.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { crearDebin } from "@/lib/bind/debin";
import { enviarAlertaVencimiento } from "@/lib/resend/emails";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Sin BINDX_ACCOUNT_ID no podemos crear DEBINs — solo enviar alertas
  if (!process.env.BINDX_ACCOUNT_ID) {
    console.warn("BINDX_ACCOUNT_ID no configurado — cron no crea DEBINs");
  }

  const supabase = createAdminClient();
  const ahora = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const resultados = {
    procesadas: 0,
    exitosas: 0,
    errores: 0,
    detalle: [] as Array<{ cuotaId: string; resultado: string }>,
  };

  try {
    // Buscar cuotas pendientes con vencimiento <= hoy
    const { data: cuotas, error } = await supabase
      .from("cuotas")
      .select("id, prestamo_id, user_id, numero_cuota, monto")
      .eq("estado", "pendiente")
      .lte("fecha_vencimiento", ahora);

    if (error) throw error;

    resultados.procesadas = cuotas?.length ?? 0;

    for (const cuota of cuotas ?? []) {
      try {
        // Obtener CBU desde la solicitud del préstamo
        const { data: prestamo } = await supabase
          .from("prestamos")
          .select("solicitud_id, cuotas_total")
          .eq("id", cuota.prestamo_id)
          .single();

        const { data: solicitud } = prestamo
          ? await supabase
              .from("solicitudes")
              .select("cbu")
              .eq("id", prestamo.solicitud_id)
              .single()
          : { data: null };

        if (!solicitud?.cbu) {
          throw new Error("Usuario sin CBU configurado");
        }

        if (!process.env.BINDX_ACCOUNT_ID) {
          throw new Error("BINDX_ACCOUNT_ID no configurado");
        }

        const debin = await crearDebin({
          cbuDeudor: solicitud.cbu,
          monto: cuota.monto,
          concepto: `Zprest - Cuota ${cuota.numero_cuota}/${prestamo?.cuotas_total ?? "?"}`,
          referencia: cuota.id,
        });

        await supabase
          .from("cuotas")
          .update({
            bind_operacion_id: debin.id,
            bind_estado: debin.estado,
          })
          .eq("id", cuota.id);

        resultados.exitosas++;
        resultados.detalle.push({ cuotaId: cuota.id, resultado: `DEBIN ${debin.id}` });
      } catch (err) {
        resultados.errores++;
        const msg = err instanceof Error ? err.message : "Error desconocido";
        resultados.detalle.push({ cuotaId: cuota.id, resultado: `ERROR: ${msg}` });
        console.error(`Error procesando cuota ${cuota.id}:`, err);
      }
    }

    // Alertas de vencimiento a 3 días
    const en3Dias = new Date();
    en3Dias.setDate(en3Dias.getDate() + 3);
    const fecha3Dias = en3Dias.toISOString().split("T")[0];

    const { data: proximas } = await supabase
      .from("cuotas")
      .select("id, numero_cuota, monto, fecha_vencimiento, usuarios(email, nombre)")
      .eq("estado", "pendiente")
      .eq("fecha_vencimiento", fecha3Dias);

    for (const cuota of proximas ?? []) {
      const usuariosRaw = cuota.usuarios;
      const usuario = (Array.isArray(usuariosRaw) ? usuariosRaw[0] : usuariosRaw) as { email: string; nombre: string } | null;
      if (usuario?.email) {
        enviarAlertaVencimiento({
          email: usuario.email,
          nombre: usuario.nombre ?? "Cliente",
          numeroCuota: cuota.numero_cuota,
          monto: cuota.monto,
          fechaVencimiento: new Date(cuota.fecha_vencimiento),
          diasRestantes: 3,
        }).catch((e) => console.error(`Error alerta vencimiento cuota ${cuota.id}:`, e));
      }
    }

    console.log("Cron cobros completado:", resultados);
    return NextResponse.json(resultados);
  } catch (error) {
    console.error("Error fatal en cron cobros:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
