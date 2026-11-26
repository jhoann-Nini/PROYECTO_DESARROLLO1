import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";

export default function ProductoNoEncontrado() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
      <span className="rounded-full border border-line bg-paper px-3 py-1 text-[11px] font-medium uppercase tracking-normal text-subtle">
        Error 404
      </span>
      <h1 className="mt-5 text-3xl font-medium uppercase tracking-normal text-ink sm:text-4xl">
        Producto no encontrado
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-subtle">
        El producto que buscas no existe o ya no está disponible en el catálogo
        de TecReview.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/productos"
          className={buttonClassName("primary", "text-sm")}
        >
          Volver al catálogo
        </Link>
        <Link
          href="/"
          className={buttonClassName("secondary", "text-sm")}
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
