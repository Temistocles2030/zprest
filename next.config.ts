import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evitar que firebase-admin se bundle en el cliente
  serverExternalPackages: ["firebase-admin", "pdfkit"],

  // Logging de fetch en desarrollo
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
