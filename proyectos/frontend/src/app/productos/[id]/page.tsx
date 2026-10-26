import { notFound } from "next/navigation";
import { ApiError, obtenerProductoPorId } from "@/services/api";
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

  try {
    await obtenerProductoPorId(idProducto);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    // Otros errores se dejan al cliente para que muestre su estado de error
    // con reintento, sin convertir una caída del backend en un 404 falso.
  }

  return <DetalleProductoCliente key={idProducto} idProducto={idProducto} />;
}
