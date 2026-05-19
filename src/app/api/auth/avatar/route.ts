export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se recibió imagen" }, { status: 400 });

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
  }
  // Max 3 MB (el cliente ya comprimió, pero por seguridad)
  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "La imagen no puede superar 3 MB" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const path = `${user.id}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
  const baseUrl = urlData.publicUrl;

  // Guardar URL base en DB (sin cache-busting param)
  await supabase.from("usuarios").update({ avatar_url: baseUrl }).eq("id", user.id);

  // Devolver con param de versión para que el browser refresque
  return NextResponse.json({ url: `${baseUrl}?v=${Date.now()}` });
}
