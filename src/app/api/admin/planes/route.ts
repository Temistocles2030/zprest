import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient(); 
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single();

    if (usuario?.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

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
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single();

    if (usuario?.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

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
