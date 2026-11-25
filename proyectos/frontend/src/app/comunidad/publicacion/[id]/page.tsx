import { notFound } from "next/navigation";
import DetallePublicacionCliente from "./DetallePublicacionCliente";

export const metadata = {
  title: "Publicación de la comunidad | TecReview",
  description: "Conversación de la comunidad de TecReview.",
};

interface PublicacionPageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicacionPage({ params }: PublicacionPageProps) {
  const { id } = await params;
  const idPublicacion = Number(id);
  if (!Number.isInteger(idPublicacion) || idPublicacion <= 0) {
    notFound();
  }
  return <DetallePublicacionCliente key={idPublicacion} idPublicacion={idPublicacion} />;
}
