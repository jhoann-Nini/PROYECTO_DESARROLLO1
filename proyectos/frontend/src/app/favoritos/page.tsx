import type { Metadata } from "next";
import FavoritosCliente from "./FavoritosCliente";

export const metadata: Metadata = {
  title: "Favoritos | TecReview",
  description:
    "Tus productos guardados en TecReview. Los favoritos se almacenan en este navegador.",
};

export default function FavoritosPage() {
  return <FavoritosCliente />;
}
