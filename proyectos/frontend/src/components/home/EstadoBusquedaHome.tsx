"use client";

import {
  MENSAJE_BUSQUEDA_GENERICA,
  analizarBusqueda,
  ayudaBusquedaGenerica,
  mensajeNoEnCatalogo,
  textoProductosEncontrados,
} from "@/data/catalogo";

export interface EstadoBusquedaHomeProps {
  busqueda: string;
  totalResultados: number;
  /** Hay productos registrados similares para mostrar en «Destacados». */
  hayAlternativas: boolean;
}

/** Baja a la sección de resultados («Destacados»). */
function irAResultados() {
  document
    .getElementById("seccion-destacados")
    ?.scrollIntoView?.({ behavior: "smooth", block: "start" });
}

const CLASE_BOTON =
  "cursor-pointer font-medium text-brand-blue underline underline-offset-4";

/**
 * Resultado de la búsqueda de la portada mostrado junto a la barra. Los
 * resultados están más abajo, en «Destacados»; sin este aviso, una búsqueda
 * sin coincidencias parecía no hacer nada.
 */
export default function EstadoBusquedaHome({
  busqueda,
  totalResultados,
  hayAlternativas,
}: EstadoBusquedaHomeProps) {
  const termino = busqueda.trim();
  if (!termino) return null;

  const generica = analizarBusqueda(termino).generica;
  const sinResultados = totalResultados === 0;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Resultado de la búsqueda"
      className={`mt-2 rounded-card border px-3 py-2 text-xs leading-relaxed ${
        generica || sinResultados
          ? "border-status-error bg-paper text-status-error"
          : "border-hairline bg-paper text-ink"
      }`}
    >
      {generica ? (
        <p>
          {MENSAJE_BUSQUEDA_GENERICA} {ayudaBusquedaGenerica(termino)}
        </p>
      ) : sinResultados ? (
        <p>
          {mensajeNoEnCatalogo(termino)}{" "}
          {hayAlternativas ? (
            <button type="button" onClick={irAResultados} className={CLASE_BOTON}>
              Ver productos parecidos
            </button>
          ) : (
            "Revisa la escritura o busca por marca o modelo."
          )}
        </p>
      ) : (
        <p>
          {textoProductosEncontrados(totalResultados)}{" "}
          <button type="button" onClick={irAResultados} className={CLASE_BOTON}>
            Ver resultados
          </button>
        </p>
      )}
    </div>
  );
}
