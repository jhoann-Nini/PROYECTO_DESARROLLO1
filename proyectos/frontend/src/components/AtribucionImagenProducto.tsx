import { obtenerAtribucionImagen } from "@/data/atribucionImagenes";

interface AtribucionImagenProductoProps {
  src: string | null | undefined;
  className?: string;
}

/** Muestra el crédito y la licencia de las imágenes que tienen procedencia verificada. */
export default function AtribucionImagenProducto({
  src,
  className = "",
}: AtribucionImagenProductoProps) {
  const atribucion = obtenerAtribucionImagen(src);
  if (!atribucion) return null;

  return (
    <p className={`text-[10px] leading-relaxed text-[var(--color-subtle)] ${className}`}>
      Foto:{" "}
      <a
        href={atribucion.paginaOrigen}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-[var(--color-ink)]"
      >
        {atribucion.autor} · Wikimedia Commons
      </a>
      {" · "}
      <a
        href={atribucion.urlLicencia}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-[var(--color-ink)]"
      >
        {atribucion.licencia}
      </a>
      {" · "}
      {atribucion.cambios}
      {atribucion.nota ? <> {atribucion.nota}</> : null}
    </p>
  );
}
