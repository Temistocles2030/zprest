export const dynamic = "force-dynamic";

/**
 * GET /auth/callback
 * Maneja el redirect OAuth de Supabase (Google Sign-In).
 * Intercambia el code por una sesión y redirige al dashboard.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSSRClient, type CookieOptions } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("next") ?? "/dashboard";

  if (code) {
    // Crear el response de redirect PRIMERO para poder setear cookies en él
    const response = NextResponse.redirect(`${origin}${redirectTo}`);

    const supabase = createSSRClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response; // Los cookies de sesión van incluidos en el redirect
    }
    console.error("OAuth callback error:", error);
  }

  // Si falla, redirigir al login con error
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
