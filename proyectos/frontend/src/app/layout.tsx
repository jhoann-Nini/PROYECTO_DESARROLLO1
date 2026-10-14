import type { Metadata } from "next";
import { Inter, Doto } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const doto = Doto({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-doto",
  weight: ["600", "700", "800", "900"],
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
    <html lang="es" className={`${inter.variable} ${doto.variable} dark`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Doto:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#090714] text-slate-100 antialiased font-sans selection:bg-purple-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}