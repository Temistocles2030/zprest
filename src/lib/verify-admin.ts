import { createAdminClient } from "@/lib/supabase/server";

export async function verificarSiEsAdmin(bearerToken: string | null): Promise<{ esAdmin: boolean; userId?: string }> {
  if (!bearerToken) return { esAdmin: false };
  
  const tokenClean = bearerToken.replace("Bearer ", "");
  const supabase = createAdminClient();

  // 1. Validar que el token de sesión sea legítimo
  const { data: { user }, error: authError } = await supabase.auth.getUser(tokenClean);
  if (authError || !user) return { esAdmin: false };

  // 2. Consultar el rol del usuario trayendo ambas variantes posibles de la columna (rol / role)
  const { data: usuario, error: dbError } = await supabase
    .from("usuarios")
    .select("rol, role")
    .eq("id", user.id)
    .single();

  if (dbError || !usuario) return { esAdmin: false };

  // Validamos si cualquiera de los dos campos contiene el valor estricto de 'admin'
  const esAdmin = usuario.rol === "admin" || (usuario as any).role === "admin";
  if (!esAdmin) return { esAdmin: false };

  return { esAdmin: true, userId: user.id };
}
