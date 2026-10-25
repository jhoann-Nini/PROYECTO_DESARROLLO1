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
    <html lang="es" className={`${inter.variable} ${doto.variable}`}>
      <body className="min-h-screen bg-[#f3f6fb] text-[#10213f] antialiased font-sans selection:bg-blue-200 selection:text-blue-950">
        {children}
      </body>
    </html>
  );
}