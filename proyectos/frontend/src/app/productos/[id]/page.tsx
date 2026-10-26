import { notFound } from "next/navigation";
import DetalleProductoCliente from "./DetalleProductoCliente";

export const metadata = {
  title: "Detalle del producto | TecReview",
  description:
    "Consulta especificaciones, precio de referencia, disponibilidad y opiniones reales de cada producto en TecReview.",
};

interface DetalleProductoPageProps {
  params: Promise<{ id: string }>;
}

export default async function DetalleProductoPage({
  params,
}: DetalleProductoPageProps) {
  const { id } = await params;
  const idProducto = Number(id);

  if (!Number.isInteger(idProducto) || idProducto <= 0) {
    notFound();
  }

  return <DetalleProductoCliente key={idProducto} idProducto={idProducto} />;
}
