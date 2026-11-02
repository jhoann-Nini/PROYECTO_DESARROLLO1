import CategoriaPageContent from "./CategoriaPageContent";

interface CategoriaPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Página pública de una categoría del catálogo.
 *
 * En Next.js 16 los parámetros dinámicos llegan como Promise; se resuelven
 * en el servidor y se entrega el slug al componente de cliente, que consulta
 * la API real para obtener la categoría y sus productos.
 */
export default async function CategoriaPage({ params }: CategoriaPageProps) {
  const { slug } = await params;

  // `key` reinicia el estado del componente al navegar entre categorías.
  return <CategoriaPageContent key={slug} slug={slug} />;
}
