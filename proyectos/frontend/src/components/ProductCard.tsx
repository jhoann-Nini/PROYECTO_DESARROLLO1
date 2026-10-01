import { Producto } from "@/types/producto";

interface ProductCardProps {
  producto: Producto;
}

export default function ProductCard({ producto }: ProductCardProps) {
  return (
    <article>
      <h2>{producto.nombre}</h2>
      <p>{producto.descripcion}</p>
      <p>Marca: {producto.marca}</p>
      <p>Categoría: {producto.categoria}</p>
      <p>Precio: ${producto.precio}</p>
    </article>
  );
}
