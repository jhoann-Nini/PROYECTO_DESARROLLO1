import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOTHING MOVIL // Hardware Benchmark & Price Engine",
  description: "Plataforma de comparación de dispositivos y precios con diseño técnico Nothing OS y estructura Kimovil.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#080808] text-[#f4f4f5] antialiased selection:bg-[#d71920] selection:text-white">
        {children}
      </body>
    </html>
  );
}