import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://zprest.com.ar";

export default function sitemap(): MetadataRoute.Sitemap {
  const paginas: { ruta: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
    { ruta: "", changeFrequency: "weekly", priority: 1 },
    { ruta: "/simulador", changeFrequency: "weekly", priority: 0.9 },
    { ruta: "/arrepentimiento", changeFrequency: "yearly", priority: 0.3 },
    { ruta: "/modelo-de-contrato", changeFrequency: "yearly", priority: 0.3 },
    { ruta: "/politicas", changeFrequency: "yearly", priority: 0.3 },
    { ruta: "/terminos", changeFrequency: "yearly", priority: 0.3 },
    { ruta: "/arca", changeFrequency: "yearly", priority: 0.3 },
  ];

  return paginas.map(({ ruta, changeFrequency, priority }) => ({
    url: `${BASE_URL}${ruta}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
