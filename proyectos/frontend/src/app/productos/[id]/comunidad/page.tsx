import Link from "next/link";
import { notFound } from "next/navigation";
import ListaPublicaciones from "@/components/comunidad/ListaPublicaciones";
import { CLASE_FOCO } from "@/components/ui/foco";
import { ApiError, obtenerProductoPorId } from "@/services/api";

export const metadata = {
  title: "Comunidad del producto | TecReview",
  description: "Preguntas y conversaciones sobre un producto del catálogo de TecReview.",
};

interface ComunidadProductoPageProps {
  params: Promise<{ id: string }>;
}

export default async function ComunidadProductoPage({ params }: ComunidadProductoPageProps) {
  const { id } = await params;
  const idProducto = Number(id);
  if (!Number.isInteger(idProducto) || idProducto <= 0) {
    notFound();
  }

  let nombre: string | null = null;
  try {
    const producto = await obtenerProductoPorId(idProducto);
    nombre = (producto as { nombre?: string }).nombre ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    // Otros errores: la lista del cliente mostrará su propio estado de error.
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <Link href={`/productos/${idProducto}`} className={`text-xs font-semibold text-[var(--color-brand-blue)] ${CLASE_FOCO}`}>
        ← Volver al producto
      </Link>
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-subtle)]">Comunidad del producto</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-ink)]">{nombre ?? "Producto"}</h1>
      </header>
      <ListaPublicaciones key={idProducto} idProducto={idProducto} />
    </main>
  );
}
