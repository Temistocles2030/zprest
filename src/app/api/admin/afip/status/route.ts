export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import forge from "node-forge";

async function getAdmin(request: NextRequest) {
  const supabase = createAdminClient();
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: me } = await supabase.from("usuarios").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return null;
  return true;
}

export async function GET(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const certBase64 = process.env.AFIP_CERT_BASE64;
  const keyBase64 = process.env.AFIP_KEY_BASE64;
  const afipCuit = process.env.AFIP_CUIT;

  const status: Record<string, unknown> = {
    AFIP_CUIT: afipCuit || "❌ No configurado",
    AFIP_CERT_BASE64: certBase64 ? "✅ Presente" : "❌ No configurado",
    AFIP_KEY_BASE64: keyBase64 ? "✅ Presente" : "❌ No configurado",
  };

  if (certBase64) {
    try {
      const certPem = Buffer.from(certBase64, "base64").toString("utf-8");
      const cert = forge.pki.certificateFromPem(certPem);

      const notBefore = cert.validity.notBefore;
      const notAfter = cert.validity.notAfter;
      const ahora = new Date();
      const vencido = ahora > notAfter;
      const diasRestantes = Math.floor((notAfter.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));

      const subject: Record<string, string> = {};
      cert.subject.attributes.forEach((attr) => {
        if (attr.shortName) subject[attr.shortName] = String(attr.value);
      });

      status.cert_subject = subject;
      status.cert_valid_from = notBefore.toISOString();
      status.cert_valid_until = notAfter.toISOString();
      status.cert_vencido = vencido ? `❌ VENCIDO hace ${Math.abs(diasRestantes)} días` : `✅ Válido por ${diasRestantes} días más`;
      status.cert_serial = cert.serialNumber;
    } catch (e) {
      status.cert_error = `Error leyendo certificado: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  if (keyBase64) {
    try {
      const keyPem = Buffer.from(keyBase64, "base64").toString("utf-8");
      forge.pki.privateKeyFromPem(keyPem);
      status.key_status = "✅ Clave privada válida";
    } catch (e) {
      status.key_status = `❌ Error leyendo clave: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json(status);
}
