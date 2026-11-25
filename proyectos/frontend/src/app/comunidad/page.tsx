import type { Metadata } from "next";
import ListaPublicaciones from "@/components/comunidad/ListaPublicaciones";

export const metadata: Metadata = {
  title: "Comunidad | TecReview",
  description: "Preguntas y conversaciones de la comunidad de TecReview sobre tecnología.",
};

export default function ComunidadPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-subtle)]">Foro general</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">Comunidad</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-subtle)]">
          Pregunta, comparte experiencias y ayuda a otras personas. Las publicaciones no cambian las calificaciones de los productos.
        </p>
      </header>
      <ListaPublicaciones />
    </main>
  );
}
