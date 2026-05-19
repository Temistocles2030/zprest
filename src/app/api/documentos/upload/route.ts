export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabase = createAdminClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const label = (formData.get("label") as string | null) ?? "documento";

  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return NextResponse.json(
      { error: `Tipo no permitido: ${file.type}. Usá PDF, Word, JPG o PNG.` },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 10 MB" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const timestamp = Date.now();
  const sanitizedLabel = label.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  const path = `${user.id}/${timestamp}_${sanitizedLabel}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[upload] Supabase Storage error:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // URL firmada válida por 1 año (solo accesible por admins vía service role)
  const { data: signed } = await supabase.storage
    .from("documentos")
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  return NextResponse.json({
    path,
    url: signed?.signedUrl ?? null,
    nombre: file.name,
    tipo: file.type,
    tamano: file.size,
  });
}
