import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TecnoReview // Plataforma de Reseñas & Especificaciones Técnicas",
  description: "Plataforma web de reseñas, consulta de hardware y especificaciones técnicas de productos tecnológicos.",
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