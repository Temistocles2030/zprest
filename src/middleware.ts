import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

// Rutas que requieren autenticación
const PORTAL_PREFIX = "/(portal)";
const PROTECTED_PATHS = ["/dashboard", "/mis-prestamos", "/solicitar", "/planes"];
// 👇 Agregamos "/api/admin" a los paths de administrador
const ADMIN_PATHS = ["/admin", "/api/admin"]; 

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (IS_MOCK) {
    return NextResponse.next();
  }

  const { supabase, response } = createMiddlewareClient(request);

  const { data: { user } } = await supabase.auth.getUser();

  const isProtectedPortal = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));

  if ((isProtectedPortal || isAdminPath) && !user) {
    // Si la ruta es de API, devolvemos error en vez de redirigir
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPath && user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single();

    if (usuario?.role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Prohibido" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

// 👇 Agregamos "/api/admin/:path*" para que el sistema intercepte esas llamadas
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/mis-prestamos/:path*",
    "/solicitar/:path*",
    "/planes/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
