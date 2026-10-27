import type { Metadata } from "next";
import PerfilCliente from "./PerfilCliente";

export const metadata: Metadata = {
  title: "Mi perfil | TecReview",
  description:
    "Consulta tu perfil de TecReview, tus reseñas, tus favoritos y tu actividad.",
};

export default function PerfilPage() {
  return <PerfilCliente />;
}
