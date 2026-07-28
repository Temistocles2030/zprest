import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evitar que librerías pesadas se carguen en el cliente
  serverExternalPackages: ["firebase-admin", "pdfkit"],

  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // ── MITIGACIÓN VUL-11 Y VUL-12: CABECERAS DE SEGURIDAD ──────────────────
  async headers() {
    // Definimos una política CSP restrictiva pero compatible con los servicios del proyecto
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://google.com https://mercadopago.com;
      style-src 'self' 'unsafe-inline' https://googleapis.com;
      img-src 'self' blob: data: https://*.supabase.co https://googleusercontent.com https://mercadopago.com;
      font-src 'self' https://gstatic.com;
      connect-src 'self' https://*.supabase.co https://bcra.gob.ar https://smsmasivos.com.ar https://mercadopago.com https://signatura.co;
      frame-src 'self' https://google.com https://mercadopago.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: "/api/:path*", // Configuración explícita de CORS para los endpoints de la API (VUL-12)
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          // Reemplazar '*' por el dominio exacto en producción si no requieres API pública externa
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ],
      },
      {
        source: "/((?!api|_next/static|_next/image|favicon.ico).*)", // Headers globales de protección en las páginas
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Frame-Options",
            value: "DENY", // Previene ataques de Clickjacking
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff", // Previene el sniffing del tipo de contenido
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()", // Deshabilita acceso de hardware innecesario
          }
        ],
      },
    ];
  },
};

export default nextConfig;
