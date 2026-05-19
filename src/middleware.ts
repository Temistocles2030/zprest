import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

// Rutas que requieren autenticación
const PORTAL_PREFIX = "/(portal)";
const PROTECTED_PATHS = ["/dashboard", "/mis-prestamos", "/solicitar"];
const ADMIN_PATHS = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // En mock mode no verificamos sesión Supabase
  if (IS_MOCK) {
    return NextResponse.next();
  }

  const { supabase, response } = createMiddlewareClient(request);

  // Verificar usuario autenticado contra el servidor (no desde cookies)
  const { data: { user } } = await supabase.auth.getUser();

  const isProtectedPortal = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));

  // Redirigir a login si no hay sesión verificada
  if ((isProtectedPortal || isAdminPath) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Para rutas admin: verificar role (user.id ya está autenticado por getUser())
  if (isAdminPath && user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single();

    if (usuario?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/mis-prestamos/:path*",
    "/solicitar/:path*",
    "/admin/:path*",
  ],
};
