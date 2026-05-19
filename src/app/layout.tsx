import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import WhatsAppButton from "@/components/WhatsAppButton";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://zprest.com.ar"
  ),
  title: {
    default: "Zprest — Créditos 100% digitales en Argentina",
    template: "%s | Zprest",
  },
  description:
    "Préstamos personales, Pymes y en relación de dependencia. Aprobación rápida, acreditación en tu cuenta.",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Zprest",
  },
  robots: { index: true, follow: true },
};

/**
 * Anti-flash: lee localStorage antes del primer paint.
 * Dark es el default — si no hay preferencia guardada se aplica dark.
 */
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');if(!t)localStorage.setItem('theme','dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://identitytoolkit.googleapis.com" />
      </head>
      <body className={`${sora.variable} antialiased`}>
        <Providers>{children}</Providers>
        <WhatsAppButton />
      </body>
    </html>
  );
}
