import { createAdminClient } from "@/lib/supabase/server";

export async function verificarSiEsAdmin(bearerToken: string | null): Promise<{ esAdmin: boolean; userId?: string }> {
  console.log("-----------------------------------------");
  console.log("1. [VERIFICAR ADMIN] Token recibido:", bearerToken ? "SÍ (oculto por seguridad)" : "NO (null o vacío)");
  if (!bearerToken) return { esAdmin: false };
  
  const tokenClean = bearerToken.replace("Bearer ", "");
  const supabase = createAdminClient();

  // 1. Validar que el token de sesión sea legítimo
  const { data: { user }, error: authError } = await supabase.auth.getUser(tokenClean);
  console.log("2. [VERIFICAR ADMIN] Supabase Auth Error:", authError ? authError.message : "Ninguno");
  console.log("3. [VERIFICAR ADMIN] Usuario Auth ID:", user?.id || "No encontrado");
  
  if (authError || !user) return { esAdmin: false };

  // 2. Consultar el rol del usuario en la base de datos
  const { data: usuario, error: dbError } = await supabase
    .from("usuarios")
    .select("rol, role")
    .eq("id", user.id)
    .single();

  console.log("4. [VERIFICAR ADMIN] Error en DB (Tabla usuarios):", dbError ? dbError.message : "Ninguno");
  console.log("5. [VERIFICAR ADMIN] Datos encontrados en tabla:", usuario || "Sin registro en la tabla");

  if (dbError || !usuario) return { esAdmin: false };

  // Validar rol
  const esAdmin = usuario.rol === "admin" || (usuario as any).role === "admin";
  console.log("6. [VERIFICAR ADMIN] ¿Es admin realmente?:", esAdmin);
  
  if (!esAdmin) return { esAdmin: false };

  return { esAdmin: true, userId: user.id };
}
