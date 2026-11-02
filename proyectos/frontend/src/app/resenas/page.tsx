import type { Metadata } from "next";
import ResenasCliente from "./ResenasCliente";

export const metadata: Metadata = {
  title: "Reseñas de la comunidad | TecReview",
  description:
    "Opiniones reales de usuarios registrados sobre los productos del catálogo TecReview.",
};

export default function ResenasPage() {
  return <ResenasCliente />;
}
