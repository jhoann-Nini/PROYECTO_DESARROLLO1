import CatalogoCliente from "@/components/catalogo/CatalogoCliente";
import { Suspense } from "react";

export const metadata = {
  title: "Catálogo de productos | TecReview",
  description:
    "Compara especificaciones, precios y disponibilidad de celulares, laptops, tablets y auriculares en TecReview.",
};

export default function ProductosPage() {
  return (
    <Suspense fallback={<p role="status">Cargando catálogo de productos…</p>}>
      <CatalogoCliente />
    </Suspense>
  );
}
