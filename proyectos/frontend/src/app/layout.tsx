import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { SCRIPT_TEMA } from "@/lib/tema";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TecReview | Plataforma de Reseñas y Especificaciones Técnicas",
  description:
    "TecReview es la plataforma de reseñas imparciales, análisis de hardware y comparativas de dispositivos tecnológicos con lenguaje claro y accesible.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--color-canvas)] font-sans text-[var(--color-ink)] antialiased selection:bg-[var(--color-brand-solid)] selection:text-white">
        <Script
          id="tema-inicial"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }}
        />
        {children}
      </body>
    </html>
  );
}
