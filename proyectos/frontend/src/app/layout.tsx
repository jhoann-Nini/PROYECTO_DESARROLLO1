import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans selection:bg-blue-700 selection:text-white">
        {children}
      </body>
    </html>
  );
}