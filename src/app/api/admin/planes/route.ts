import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server"; // Usamos los clientes de servidor

export async function GET(req: NextRequest) {
  try {
    // 1. Verificamos la sesión actual usando cookies (el estándar de Supabase)
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Verificamos que el usuario tenga rol de admin en la base de datos
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single();

    if (usuario?.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // 3. Si todo está bien, buscamos los datos usando el cliente admin
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("planes")
      .select("*")
      .order("tipo");

    if (error) {
      console.error("[admin/planes] GET DB Error:", error);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error("[admin/planes] GET Fatal Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verificamos la sesión actual
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Verificamos el rol
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single();

    if (usuario?.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // 3. Insertamos el nuevo plan
    const body = await req.json();
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.from("planes").insert([body]).select().single();

    if (error) {
      console.error("[admin/planes] POST DB Error:", error);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    revalidatePath("/");
    revalidatePath("/simulador");
    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error("[admin/planes] POST Fatal Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
