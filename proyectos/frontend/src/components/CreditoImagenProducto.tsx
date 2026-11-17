import { obtenerCreditoImagenProducto } from "@/data/creditosImagenes";

interface CreditoImagenProductoProps {
  url: string | null | undefined;
}

export default function CreditoImagenProducto({ url }: CreditoImagenProductoProps) {
  const credito = obtenerCreditoImagenProducto(url);
  if (!credito) return null;

  return (
    <p className="mt-2 text-left text-[11px] leading-relaxed text-[var(--color-subtle)]">
      Imagen: {credito.autor}.{" "}
      <a
        href={credito.paginaFuente}
        target="_blank"
        rel="noreferrer noopener"
        className="underline underline-offset-2 hover:text-[var(--color-ink)]"
      >
        Fuente
      </a>
      {" · "}
      <a
        href={credito.urlLicencia}
        target="_blank"
        rel="noreferrer noopener"
        className="underline underline-offset-2 hover:text-[var(--color-ink)]"
      >
        {credito.licencia}
      </a>
      {" · "}
      {credito.cambios}
    </p>
  );
}
