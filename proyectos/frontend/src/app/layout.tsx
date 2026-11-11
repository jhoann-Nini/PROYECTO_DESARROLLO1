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
  title: "TecReview | Encuentra tu próximo dispositivo",
  description:
    "TecReview: explora dispositivos tecnológicos, consulta especificaciones técnicas, precios de referencia en COP y opiniones de la comunidad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--color-canvas)] font-sans text-[var(--color-ink)] antialiased selection:bg-[var(--color-brand-solid)] selection:text-[var(--color-on-solid)]">
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
