import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://zprest.com.ar";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/api/",
        "/dashboard",
        "/mis-prestamos",
        "/mis-datos",
        "/solicitar",
        "/completar-perfil",
        "/espera",
        "/registro",
        "/login",
        "/auth/",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
