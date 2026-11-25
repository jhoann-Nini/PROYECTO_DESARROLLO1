import Link from "next/link";
import type { PublicacionResumen } from "@/types/comunidad";
import { CLASE_FOCO } from "@/components/ui/foco";
import { formatearFecha } from "./errores";

/** Publicación en una lista: el título lleva al detalle. */
export default function TarjetaPublicacion({ publicacion }: { publicacion: PublicacionResumen }) {
  return (
    <article className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
      <h3 className="text-base font-semibold text-[var(--color-ink)]">
        <Link href={`/comunidad/publicacion/${publicacion.idPublicacion}`} className={`hover:text-[var(--color-brand-blue)] ${CLASE_FOCO}`}>
          {publicacion.titulo}
        </Link>
      </h3>
      <p className="mt-1 text-xs text-[var(--color-subtle)]">
        {`${publicacion.autor} · ${formatearFecha(publicacion.fechaCreacion)}`}
        {publicacion.nombreProducto && ` · ${publicacion.nombreProducto}`}
        {publicacion.cerrada && " · Cerrada"}
      </p>
      <p className="mt-2 line-clamp-3 whitespace-pre-line break-words text-sm text-[var(--color-ink)]">{publicacion.extracto}</p>
      <p className="mt-2 text-xs text-[var(--color-subtle)]">
        {`${publicacion.respuestas} ${publicacion.respuestas === 1 ? "respuesta" : "respuestas"} · ${publicacion.meGusta} Me gusta`}
      </p>
    </article>
  );
}
