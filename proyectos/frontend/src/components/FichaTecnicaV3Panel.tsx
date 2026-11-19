"use client";

import { useMemo, useState } from "react";
import type { DatosFichaTecnicaV3, EspecificacionFichaV3 } from "@/types/fichaTecnicaV3";
import { formatearValorFichaV3, type EstadoFichaTecnicaProducto } from "@/data/fichaTecnicaProducto";
import { CLASE_FOCO } from "@/components/ui/foco";

const CATEGORIAS: Record<DatosFichaTecnicaV3["categoria"], string> = {
  celulares: "Celulares",
  tablets: "Tablets",
  portatiles: "Portátiles",
  auriculares: "Auriculares",
};

const ESTADOS_DATO: Record<EspecificacionFichaV3["estado_dato"], string> = {
  conocido: "Conocido",
  desconocido: "Desconocido",
  no_publicado: "No publicado",
  no_aplica: "No aplica",
};

const ESTADOS_VERIFICACION: Record<EspecificacionFichaV3["verificacion"]["estado"], string> = {
  pendiente: "Pendiente de verificación",
  con_fuente: "Con fuente",
  verificado: "Verificado según ficha",
  requiere_revision: "Requiere revisión",
};

export function formatearEtiquetaVariante(
  variante: DatosFichaTecnicaV3["variantes"][number],
  todasLasVariantes: DatosFichaTecnicaV3["variantes"]
): string {
  const idfValores = variante.identificadores
    ? Object.entries(variante.identificadores)
        .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
        .map(([k, v]) => {
          const kLower = k.toLowerCase();
          if (kLower === "color") return `Color: ${v}`;
          return `${v}`;
        })
        .join(" · ")
    : "";

  const detalles = [
    idfValores || null,
    variante.sku ? `SKU: ${variante.sku}` : null,
    variante.mercado || null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (variante.modelo && detalles) {
    return `${variante.modelo} · ${detalles}`;
  }
  if (variante.modelo) {
    const compartenModelo = todasLasVariantes.filter(
      (v) => v.id !== variante.id && v.modelo === variante.modelo
    );
    if (compartenModelo.length > 0) {
      return `${variante.modelo} (${variante.id})`;
    }
    return variante.modelo;
  }
  if (detalles) {
    return detalles;
  }
  return variante.id;
}

function describirComparabilidad(dato: EspecificacionFichaV3, ficha: DatosFichaTecnicaV3): string {
  const regla = dato.comparacion;
  if (!regla.habilitada) return "Este atributo no está disponible para comparar.";
  if (dato.estado_dato !== "conocido") {
    return `No comparable: el estado del dato es ${ESTADOS_DATO[dato.estado_dato].toLowerCase()}.`;
  }
  if (dato.normalizacion.estado !== "normalizada") {
    return "No comparable: el valor original no se pudo normalizar con seguridad técnica.";
  }
  if (dato.revision_conflicto.estado === "conflicto_pendiente") {
    return "No comparable: existe un conflicto de evidencias pendiente de resolución.";
  }
  if (dato.verificacion.estado === "requiere_revision") {
    return "No comparable: el dato requiere revisión previa.";
  }

  const evidenciaCompatible = dato.evidencia_ids.every((id) => {
    const evidencia = ficha.evidencias.find((item) => item.id === id);
    const fuente = evidencia && ficha.fuentes.find((item) => item.id === evidencia.fuente_id);
    if (!evidencia || !fuente || (fuente.variante_id !== null && fuente.variante_id !== dato.variante_id)) {
      return false;
    }
    if (dato.variante_id !== null) {
      return evidencia.alcance.tipo === "variante"
        ? evidencia.alcance.variante_id === dato.variante_id
        : evidencia.alcance.variante_ids.includes(dato.variante_id);
    }
    return (
      evidencia.alcance.tipo === "todas_las_variantes" &&
      ficha.variantes.every(
        (variante) =>
          evidencia.alcance.tipo === "todas_las_variantes" &&
          evidencia.alcance.variante_ids.includes(variante.id)
      )
    );
  });

  if (!evidenciaCompatible) {
    return "No comparable: la evidencia asociada no cubre esta variante.";
  }
  if (regla.modo === "igualdad_estructural") {
    return "Comparación por igualdad estructural exacta (sin ganador global).";
  }

  const dirTexto =
    regla.direccion === "mayor_es_mejor"
      ? "mayor es mejor"
      : regla.direccion === "menor_es_mejor"
      ? "menor es mejor"
      : `objetivo ${regla.objetivo}`;

  return `Comparación numérica en ${regla.unidad} (${dirTexto})${
    regla.tolerancia ? `, tolerancia ±${regla.tolerancia.valor} ${regla.tolerancia.unidad}` : ""
  }. Sin ganador global automático.`;
}

function BadgeVerificacion({ estado }: { estado: EspecificacionFichaV3["verificacion"]["estado"] }) {
  if (estado === "con_fuente") {
    return (
      <span
        title="Información respaldada por fuente documental"
        className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-300"
      >
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
        Con fuente
      </span>
    );
  }
  if (estado === "verificado") {
    return (
      <span
        title="Dato verificado según ficha"
        className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300"
      >
        <span aria-hidden="true" className="font-bold">✓</span>
        Verificado según ficha
      </span>
    );
  }
  if (estado === "requiere_revision") {
    return (
      <span
        title="Requiere revisión técnica"
        className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300"
      >
        <span aria-hidden="true">⚠</span>
        Requiere revisión
      </span>
    );
  }
  return (
    <span
      title="Pendiente de verificación"
      className="inline-flex items-center gap-1 rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2 py-0.5 text-[11px] font-medium text-zinc-400 dark:border-zinc-500/30 dark:bg-zinc-500/10 dark:text-zinc-300"
    >
      <span aria-hidden="true">○</span>
      Pendiente de verificación
    </span>
  );
}

function BadgeEstadoDato({ estado }: { estado: EspecificacionFichaV3["estado_dato"] }) {
  if (estado === "conocido") {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-subtle)]">
        Conocido
      </span>
    );
  }
  if (estado === "desconocido") {
    return (
      <span className="inline-flex items-center rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2 py-0.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-300">
        Desconocido
      </span>
    );
  }
  if (estado === "no_publicado") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 dark:text-amber-300">
        No publicado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-400 dark:text-purple-300">
      No aplica
    </span>
  );
}

function Especificacion({ dato, ficha }: { dato: EspecificacionFichaV3; ficha: DatosFichaTecnicaV3 }) {
  const fuentePorId = useMemo(() => new Map(ficha.fuentes.map((fuente) => [fuente.id, fuente])), [ficha.fuentes]);
  const evidenciaPorId = useMemo(() => new Map(ficha.evidencias.map((evidencia) => [evidencia.id, evidencia])), [ficha.evidencias]);

  const evidenciaCompatible = (id: string) => {
    const evidencia = evidenciaPorId.get(id);
    const fuente = evidencia && fuentePorId.get(evidencia.fuente_id);
    if (!evidencia || !fuente || (fuente.variante_id !== null && fuente.variante_id !== dato.variante_id)) return false;
    if (dato.variante_id !== null) {
      return evidencia.alcance.tipo === "variante"
        ? evidencia.alcance.variante_id === dato.variante_id
        : evidencia.alcance.variante_ids.includes(dato.variante_id);
    }
    return (
      evidencia.alcance.tipo === "todas_las_variantes" &&
      ficha.variantes.every(
        (variante) =>
          evidencia.alcance.tipo === "todas_las_variantes" &&
          evidencia.alcance.variante_ids.includes(variante.id)
      )
    );
  };

  const evidenciaVisible = dato.evidencia_ids.filter(evidenciaCompatible);
  const valor =
    dato.normalizacion.estado === "normalizada"
      ? formatearValorFichaV3(dato.normalizacion.valor)
      : dato.valor_original
      ? `${dato.valor_original.texto}${dato.valor_original.unidad ? ` ${dato.valor_original.unidad}` : ""}`
      : null;

  return (
    <article className="flex flex-col justify-between rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 shadow-sm transition hover:border-[var(--color-subtle)]/40">
      <div>
        {/* Cabecera de la tarjeta: Título con prioridad visual y etiquetas secundarias */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--color-hairline)]/60 pb-2.5">
          <h4 className="text-sm font-semibold tracking-tight text-[var(--color-ink)]">
            {dato.nombre}
          </h4>
          <div className="flex flex-wrap items-center gap-1.5">
            <BadgeEstadoDato estado={dato.estado_dato} />
            <BadgeVerificacion estado={dato.verificacion.estado} />
          </div>
        </div>

        {/* Valor técnico destacado */}
        <div className="mt-2.5">
          {valor !== null ? (
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-base font-bold tracking-tight text-[var(--color-ink)] sm:text-lg">
                {valor}
              </span>
              {dato.normalizacion.estado === "no_segura" && (
                <span className="text-xs text-[var(--color-subtle)]">
                  Valor original · normalización no segura
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm italic text-[var(--color-subtle)]">
              {dato.estado_dato === "no_aplica"
                ? "Esta característica no aplica."
                : dato.estado_dato === "no_publicado"
                ? "El fabricante no ha publicado este dato."
                : "No hay un valor registrado."}
            </p>
          )}

          {dato.justificacion_estado && (
            <p className="mt-1 text-xs text-[var(--color-subtle)]">
              Justificación: {dato.justificacion_estado}
            </p>
          )}

          {dato.normalizacion.estado === "no_segura" && dato.normalizacion.motivo && (
            <p className="mt-1 text-xs text-[var(--color-subtle)]">
              No se normalizó: {dato.normalizacion.motivo}
            </p>
          )}
        </div>

        {/* Conflictos y revisiones */}
        {dato.revision_conflicto.estado !== "sin_conflicto" && (
          <div
            role="status"
            className={`mt-3 rounded-md p-2.5 text-xs ${
              dato.revision_conflicto.estado === "conflicto_pendiente"
                ? "border border-amber-500/40 bg-amber-500/10 text-amber-300 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                : "border border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-subtle)]"
            }`}
          >
            {dato.revision_conflicto.estado === "conflicto_pendiente"
              ? "Hay evidencia contradictoria pendiente de resolución."
              : `Conflicto resuelto${dato.revision_conflicto.resolucion ? `: ${dato.revision_conflicto.resolucion}` : "."}`}
          </div>
        )}

        {dato.verificacion.estado === "requiere_revision" && dato.verificacion.motivo_revision && (
          <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            Motivo de revisión: {dato.verificacion.motivo_revision}
          </p>
        )}

        {dato.verificacion.estado === "verificado" && (
          <p className="mt-2 text-xs text-[var(--color-subtle)]">
            Estado declarado en la ficha
            {dato.verificacion.verificado_en ? ` · fecha ${dato.verificacion.verificado_en}` : ""}
            {dato.verificacion.verificado_por ? ` · responsable ${dato.verificacion.verificado_por}` : ""}
            {dato.verificacion.evento_auditoria_id ? ` · evento ${dato.verificacion.evento_auditoria_id}` : ""}.
            {" "}La interfaz no comprueba autorizaciones.
          </p>
        )}

        {/* Bloque diferenciado de Comparabilidad */}
        <div className="mt-3 flex items-start gap-1.5 rounded-md border border-[var(--color-hairline)]/70 bg-[var(--color-canvas)]/50 px-2.5 py-1.5 text-xs text-[var(--color-subtle)]">
          <span className="shrink-0 font-medium text-[var(--color-ink)]">
            Comparabilidad:
          </span>
          <span className="leading-snug">{describirComparabilidad(dato, ficha)}</span>
        </div>
      </div>

      {/* Evidencias y Trazabilidad */}
      <div className="mt-3">
        {evidenciaVisible.length > 0 && (
          <div className="border-t border-[var(--color-hairline)]/80 pt-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-subtle)]">
              Fuentes y evidencias ({evidenciaVisible.length})
            </span>
            <ul className="mt-2 space-y-2 text-xs">
              {evidenciaVisible.map((id) => {
                const evidencia = evidenciaPorId.get(id)!;
                const fuente = fuentePorId.get(evidencia.fuente_id)!;
                const href = fuente.url && /^https?:\/\//i.test(fuente.url) ? fuente.url : null;
                const alcance =
                  evidencia.alcance.tipo === "variante"
                    ? `variante ${evidencia.alcance.variante_id}`
                    : `todas las variantes (${evidencia.alcance.variante_ids.join(", ")})`;

                return (
                  <li
                    key={id}
                    className="rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)]/40 p-2.5 text-[var(--color-subtle)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="font-semibold text-[var(--color-ink)]">
                        {fuente.nombre}
                      </span>
                      {fuente.consultada_en && (
                        <span className="text-[11px] text-[var(--color-subtle)]">
                          consultada {fuente.consultada_en}
                        </span>
                      )}
                    </div>

                    {evidencia.localizador && (
                      <p className="mt-1 text-xs text-[var(--color-ink)]">
                        <span className="text-[var(--color-subtle)]">Localizador:</span>{" "}
                        {evidencia.localizador}
                      </p>
                    )}

                    {evidencia.extracto && (
                      <blockquote className="mt-1.5 rounded border-l-2 border-[var(--color-brand-blue)] bg-[var(--color-paper)] p-2 italic text-[var(--color-ink)]">
                        “{evidencia.extracto}”
                      </blockquote>
                    )}

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                      <span>
                        Alcance:{" "}
                        <strong className="font-medium text-[var(--color-ink)]">
                          {alcance}
                        </strong>
                      </span>
                      <div className="flex items-center gap-2.5">
                        {evidencia.postura === "contradice" ? (
                          <span className="font-medium text-amber-400">
                            Evidencia contradice · no respalda el dato
                          </span>
                        ) : evidencia.postura === "respalda" ? (
                          <span className="font-medium text-emerald-400">
                            Evidencia respalda este dato
                          </span>
                        ) : (
                          <span className="font-medium text-[var(--color-subtle)]">
                            Evidencia contextual
                          </span>
                        )}

                        {href && (
                          <a
                            className={`inline-flex items-center gap-1 font-medium text-[var(--color-brand-blue)] underline underline-offset-2 hover:opacity-80 ${CLASE_FOCO}`}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir fuente
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {dato.evidencia_ids.length > evidenciaVisible.length && (
          <p role="status" className="mt-2 text-xs text-amber-400">
            Se omitió evidencia cuyo alcance o fuente no es compatible con esta especificación.
          </p>
        )}
      </div>
    </article>
  );
}

function FichaTecnicaV3Invalida({ errores }: { errores: string[] }) {
  return (
    <section
      role="alert"
      className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
    >
      <h3 className="font-semibold text-red-200">No se pudo interpretar la ficha técnica V3</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errores.map((error, index) => (
          <li key={`${index}-${error}`}>{error}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[var(--color-subtle)]">
        El contenido original se conservó y no se utilizó como ficha V1/V2.
      </p>
    </section>
  );
}

function FichaTecnicaV3Valida({
  estado,
}: {
  estado: Extract<EstadoFichaTecnicaProducto, { version: "v3"; estado: "valida" }>;
}) {
  const [varianteId, setVarianteId] = useState("");
  const ficha = estado.ficha;

  // Deduplicación segura de variantes por ID para evitar opciones repetidas
  const variantesUnicas = useMemo(() => {
    const vistos = new Set<string>();
    const lista: DatosFichaTecnicaV3["variantes"] = [];
    for (const v of ficha.variantes) {
      if (!vistos.has(v.id)) {
        vistos.add(v.id);
        lista.push(v);
      }
    }
    return lista;
  }, [ficha.variantes]);

  const variante =
    ficha.variantes.find((item) => item.id === varianteId) ??
    (ficha.variantes.length === 1 ? ficha.variantes[0] : null);

  const visibles = ficha.especificaciones.filter(
    (item) => item.variante_id === null || item.variante_id === variante?.id
  );

  const grupos = useMemo(() => {
    const map = new Map<string, EspecificacionFichaV3[]>();
    for (const item of visibles) {
      map.set(item.grupo, [...(map.get(item.grupo) ?? []), item]);
    }
    return map;
  }, [visibles]);

  const benchmarks = variante
    ? ficha.benchmarks.filter((item) => item.variante_id === variante.id)
    : [];

  const benchmarksEsperanVariante =
    ficha.variantes.length > 1 && !variante && ficha.benchmarks.length > 0;

  return (
    <section aria-label="Ficha técnica versión 3" className="space-y-6">
      {/* Cabecera del Panel V3 */}
      <header className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-hairline)] pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-brand-blue)]">
              Ficha técnica V3 · {CATEGORIAS[ficha.categoria]}
            </span>
            <h3 className="mt-0.5 text-base font-bold text-[var(--color-ink)]">
              Especificaciones técnicas
            </h3>
          </div>
          <span className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-subtle)]">
            Esquema V3
          </span>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-[var(--color-subtle)]">
          Los estados y responsables mostrados son datos declarados en la ficha; esta interfaz no verifica autorizaciones.
        </p>

        {/* Selector de variantes con alto contraste y opciones diferenciadas */}
        {ficha.variantes.length > 1 ? (
          <div className="mt-3.5">
            <label
              htmlFor="selector-variante-v3"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-ink)]"
            >
              Variante
            </label>
            <div className="relative mt-1">
              <select
                id="selector-variante-v3"
                aria-label="Variante"
                className={`block w-full appearance-none rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] py-2.5 pl-3 pr-9 text-sm font-medium text-[var(--color-ink)] shadow-sm transition hover:border-[var(--color-brand-blue)]/50 focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                value={variante?.id ?? ""}
                onChange={(event) => setVarianteId(event.target.value)}
              >
                <option value="" className="bg-[var(--color-paper)] text-[var(--color-ink)]">
                  Elige una variante para consultar sus especificaciones
                </option>
                {variantesUnicas.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    className="bg-[var(--color-paper)] text-[var(--color-ink)]"
                  >
                    {formatearEtiquetaVariante(item, variantesUnicas)}
                  </option>
                ))}
              </select>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-subtle)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          variante && (
            <div className="mt-3 rounded-md bg-[var(--color-canvas)]/60 p-2.5 text-xs text-[var(--color-ink)]">
              <span className="font-semibold text-[var(--color-subtle)]">Variante única:</span>{" "}
              <span className="font-medium">{formatearEtiquetaVariante(variante, [variante])}</span>
            </div>
          )
        )}
      </header>

      {/* Estado interactivo cuando no se ha seleccionado variante */}
      {ficha.variantes.length > 1 && !variante && (
        <div
          role="status"
          className="rounded-lg border border-dashed border-[var(--color-hairline)] bg-[var(--color-paper)]/50 p-3.5 text-sm text-[var(--color-subtle)]"
        >
          <span className="font-medium text-[var(--color-ink)]">
            Elige una variante para consultar sus especificaciones.
          </span>{" "}
          Los datos comunes permanecen visibles.
        </div>
      )}

      {/* Advertencia de discrepancia de categoría */}
      {estado.advertenciaCategoria && (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm text-amber-300 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
        >
          {estado.advertenciaCategoria}
        </div>
      )}

      {/* Secciones de especificaciones agrupadas */}
      {visibles.length === 0 ? (
        <div
          role="status"
          className="rounded-lg border border-dashed border-[var(--color-hairline)] bg-[var(--color-paper)] p-6 text-center text-sm text-[var(--color-subtle)]"
        >
          No hay especificaciones registradas para esta categoría y variante.
        </div>
      ) : (
        [...grupos].map(([grupo, items]) => (
          <section key={grupo} className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[var(--color-hairline)] pb-2 pt-1">
              <span className="h-2 w-2 rounded-full bg-[var(--color-brand-blue)]" aria-hidden="true" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink)]">
                {grupo}
              </h3>
              <span className="text-xs font-normal text-[var(--color-subtle)]">
                ({items.length} {items.length === 1 ? "especificación" : "especificaciones"})
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <Especificacion key={item.id} dato={item} ficha={ficha} />
              ))}
            </div>
          </section>
        ))
      )}

      {/* Benchmarks */}
      {benchmarksEsperanVariante && (
        <div
          role="status"
          className="rounded-lg border border-dashed border-[var(--color-hairline)] bg-[var(--color-paper)]/50 p-3.5 text-sm text-[var(--color-subtle)]"
        >
          <span className="font-medium text-[var(--color-ink)]">
            Elige una variante para consultar sus benchmarks.
          </span>{" "}
          El contrato V3 asocia cada benchmark a una variante concreta y no define benchmarks comunes.
        </div>
      )}

      {benchmarks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-[var(--color-hairline)] pb-2 pt-1">
            <span className="h-2 w-2 rounded-full bg-[var(--color-brand-blue)]" aria-hidden="true" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink)]">
              Benchmarks
            </h3>
            <span className="text-xs font-normal text-[var(--color-subtle)]">
              ({benchmarks.length})
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {benchmarks.map((item) => {
              const evidencia = ficha.evidencias.find((row) => row.id === item.evidencia_id);
              const fuente = ficha.fuentes.find((row) => row.id === item.fuente_id);
              const evidenciaCompatible =
                evidencia?.fuente_id === item.fuente_id &&
                evidencia.alcance.tipo === "variante" &&
                evidencia.alcance.variante_id === item.variante_id &&
                (!fuente?.variante_id || fuente.variante_id === item.variante_id);
              const conflictoPendiente = item.revision_conflicto.estado === "conflicto_pendiente";

              return (
                <article
                  key={item.id}
                  className="flex flex-col justify-between rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 shadow-sm"
                >
                  <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--color-hairline)]/60 pb-2">
                      <h4 className="text-base font-semibold text-[var(--color-ink)]">
                        {item.nombre_prueba}
                        {item.version ? ` · ${item.version}` : ""}
                      </h4>
                      <BadgeVerificacion estado={item.verificacion.estado} />
                    </div>

                    <div className="mt-2.5">
                      <p
                        className={`text-base font-bold ${
                          conflictoPendiente
                            ? "text-amber-400"
                            : "text-[var(--color-ink)]"
                        }`}
                      >
                        {conflictoPendiente
                          ? "Resultado informado, no confirmado (conflicto pendiente): "
                          : "Resultado: "}
                        {item.resultado.valor} {item.resultado.unidad}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-subtle)]">
                        {[
                          item.plataforma,
                          item.modo_ejecucion,
                          item.fecha_ejecucion,
                          ESTADOS_VERIFICACION[item.verificacion.estado],
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-ink)]">
                        <span className="text-[var(--color-subtle)]">Variante:</span>{" "}
                        {formatearEtiquetaVariante(
                          variante ?? {
                            id: item.variante_id,
                            modelo: null,
                            sku: null,
                            mercado: null,
                            identificadores: {},
                          },
                          ficha.variantes
                        )}
                      </p>
                    </div>

                    {fuente && (!fuente.variante_id || fuente.variante_id === item.variante_id) ? (
                      <p className="mt-2 text-xs text-[var(--color-ink)]">
                        Fuente: {fuente.nombre}
                        {fuente.consultada_en ? ` · consultada ${fuente.consultada_en}` : ""}
                        {fuente.url && /^https?:\/\//i.test(fuente.url) && (
                          <>
                            {" "}·{" "}
                            <a
                              className={`font-medium text-[var(--color-brand-blue)] underline ${CLASE_FOCO}`}
                              href={fuente.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir fuente
                            </a>
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-[var(--color-subtle)]">
                        Fuente no disponible para esta variante.
                      </p>
                    )}

                    {evidenciaCompatible && evidencia ? (
                      <div className="mt-2.5 rounded border-l-2 border-[var(--color-brand-blue)] bg-[var(--color-canvas)]/40 p-2 text-xs text-[var(--color-subtle)]">
                        <p>
                          {evidencia.postura === "contradice" ? (
                            <span className="font-medium text-amber-400">
                              Evidencia contradice · no respalda el resultado
                            </span>
                          ) : (
                            <span className="font-medium text-emerald-400">
                              Evidencia respalda este resultado
                            </span>
                          )}
                          {" · alcance: variante "}
                          {evidencia.alcance.tipo === "variante"
                            ? evidencia.alcance.variante_id
                            : ""}
                        </p>
                        {evidencia.localizador && (
                          <p className="mt-1 text-[var(--color-ink)]">{evidencia.localizador}</p>
                        )}
                        {evidencia.extracto && (
                          <p className="mt-1 italic text-[var(--color-ink)]">“{evidencia.extracto}”</p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-[var(--color-subtle)]">
                        No hay evidencia compatible disponible para este benchmark.
                      </p>
                    )}

                    {conflictoPendiente && (
                      <div
                        role="alert"
                        className="mt-2.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-300 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                      >
                        Conflicto pendiente: no trates este resultado como confirmado.
                      </div>
                    )}

                    {item.revision_conflicto.estado === "conflicto_resuelto" && (
                      <p className="mt-2 text-xs text-[var(--color-subtle)]">
                        Conflicto resuelto: {item.revision_conflicto.resolucion}
                      </p>
                    )}

                    {item.verificacion.estado === "verificado" && (
                      <p className="mt-2 text-xs text-[var(--color-subtle)]">
                        Estado declarado en la ficha: verificado
                        {item.verificacion.verificado_en ? ` · ${item.verificacion.verificado_en}` : ""}
                        {item.verificacion.verificado_por ? ` · ${item.verificacion.verificado_por}` : ""}
                        {item.verificacion.evento_auditoria_id
                          ? ` · evento ${item.verificacion.evento_auditoria_id}`
                          : ""}
                        . La interfaz no comprueba autorizaciones.
                      </p>
                    )}

                    {item.verificacion.estado === "requiere_revision" &&
                      item.verificacion.motivo_revision && (
                        <p className="mt-2 text-xs text-amber-400">
                          Motivo de revisión: {item.verificacion.motivo_revision}
                        </p>
                      )}
                  </div>

                  <p className="mt-3 border-t border-[var(--color-hairline)]/60 pt-2 text-xs text-[var(--color-subtle)]">
                    No se compara automáticamente: el contrato V3 no define reglas de comparabilidad para benchmarks.
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}

export default function FichaTecnicaV3Panel({
  estado,
}: {
  estado: Extract<EstadoFichaTecnicaProducto, { version: "v3" }>;
}) {
  if (estado.estado === "invalida") {
    return <FichaTecnicaV3Invalida errores={estado.errores} />;
  }
  return <FichaTecnicaV3Valida estado={estado} />;
}
