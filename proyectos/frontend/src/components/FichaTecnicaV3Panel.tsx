"use client";

import { useMemo, useState } from "react";
import type { DatosFichaTecnicaV3, EspecificacionFichaV3 } from "@/types/fichaTecnicaV3";
import { formatearValorFichaV3, type EstadoFichaTecnicaProducto } from "@/data/fichaTecnicaProducto";

const CATEGORIAS = { celulares: "Celulares", tablets: "Tablets", portatiles: "Portátiles", auriculares: "Auriculares" };
const ESTADOS_DATO = { conocido: "Conocido", desconocido: "Desconocido", no_publicado: "No publicado", no_aplica: "No aplica" };
const ESTADOS_VERIFICACION = { pendiente: "Pendiente de verificación", con_fuente: "Con fuente", verificado: "Verificado según ficha", requiere_revision: "Requiere revisión" };

function describirComparabilidad(dato: EspecificacionFichaV3, ficha: DatosFichaTecnicaV3): string {
  const regla = dato.comparacion;
  if (!regla.habilitada) return "No comparable: la ficha deshabilita la comparación de este atributo.";
  if (dato.estado_dato !== "conocido") return `No comparable: el estado del dato es ${ESTADOS_DATO[dato.estado_dato]}.`;
  if (dato.normalizacion.estado !== "normalizada") return "No comparable: el valor original no se pudo normalizar con seguridad.";
  if (dato.revision_conflicto.estado === "conflicto_pendiente") return "No comparable: hay un conflicto de evidencia pendiente.";
  if (dato.verificacion.estado === "requiere_revision") return "No comparable: el dato requiere revisión.";
  const evidenciaCompatible = dato.evidencia_ids.every((id) => {
    const evidencia = ficha.evidencias.find((item) => item.id === id);
    const fuente = evidencia && ficha.fuentes.find((item) => item.id === evidencia.fuente_id);
    if (!evidencia || !fuente || (fuente.variante_id !== null && fuente.variante_id !== dato.variante_id)) return false;
    if (dato.variante_id !== null) return evidencia.alcance.tipo === "variante"
      ? evidencia.alcance.variante_id === dato.variante_id
      : evidencia.alcance.variante_ids.includes(dato.variante_id);
    return evidencia.alcance.tipo === "todas_las_variantes" && ficha.variantes.every((variante) => evidencia.alcance.tipo === "todas_las_variantes" && evidencia.alcance.variante_ids.includes(variante.id));
  });
  if (!evidenciaCompatible) return "No comparable: una evidencia enlazada no cubre la variante de esta especificación.";
  if (regla.modo === "igualdad_estructural") return "Comparación por igualdad estructural; no asigna un ganador.";
  return `Comparación numérica en ${regla.unidad}, dirección ${regla.direccion}${regla.direccion === "objetivo" ? ` ${regla.objetivo}` : ""}${regla.tolerancia ? `, tolerancia ${regla.tolerancia.valor} ${regla.tolerancia.unidad}` : " sin tolerancia"}. No asigna un ganador global.`;
}

function Especificacion({ dato, ficha }: { dato: EspecificacionFichaV3; ficha: DatosFichaTecnicaV3 }) {
  const fuentePorId = useMemo(() => new Map(ficha.fuentes.map((fuente) => [fuente.id, fuente])), [ficha.fuentes]);
  const evidenciaPorId = useMemo(() => new Map(ficha.evidencias.map((evidencia) => [evidencia.id, evidencia])), [ficha.evidencias]);
  const evidenciaCompatible = (id: string) => {
    const evidencia = evidenciaPorId.get(id);
    const fuente = evidencia && fuentePorId.get(evidencia.fuente_id);
    if (!evidencia || !fuente || (fuente.variante_id !== null && fuente.variante_id !== dato.variante_id)) return false;
    if (dato.variante_id !== null) return evidencia.alcance.tipo === "variante"
      ? evidencia.alcance.variante_id === dato.variante_id
      : evidencia.alcance.variante_ids.includes(dato.variante_id);
    return evidencia.alcance.tipo === "todas_las_variantes" && ficha.variantes.every((variante) => evidencia.alcance.tipo === "todas_las_variantes" && evidencia.alcance.variante_ids.includes(variante.id));
  };
  const evidenciaVisible = dato.evidencia_ids.filter(evidenciaCompatible);
  const valor = dato.normalizacion.estado === "normalizada"
    ? formatearValorFichaV3(dato.normalizacion.valor)
    : dato.valor_original ? `${dato.valor_original.texto}${dato.valor_original.unidad ? ` ${dato.valor_original.unidad}` : ""}` : null;
  return <article className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="font-semibold text-[var(--color-ink)]">{dato.nombre}</h4>
      <div className="flex gap-2 text-xs"><span className="rounded-full bg-[var(--color-canvas)] px-2 py-1">{ESTADOS_DATO[dato.estado_dato]}</span><span className="rounded-full border px-2 py-1">{ESTADOS_VERIFICACION[dato.verificacion.estado]}</span></div></div>
    {valor !== null ? <p className="mt-2 text-sm text-[var(--color-ink)]">{valor}{dato.normalizacion.estado === "no_segura" && <span className="ml-2 text-xs text-[var(--color-subtle)]">Valor original · normalización no segura</span>}</p> : <p className="mt-2 text-sm text-[var(--color-subtle)]">{dato.estado_dato === "no_aplica" ? "Esta característica no aplica." : dato.estado_dato === "no_publicado" ? "El fabricante no ha publicado este dato." : "No hay un valor registrado."}</p>}
    {dato.justificacion_estado && <p className="mt-1 text-sm text-[var(--color-subtle)]">Justificación: {dato.justificacion_estado}</p>}
    {dato.normalizacion.estado === "no_segura" && <p className="mt-1 text-xs text-[var(--color-subtle)]">No se normalizó: {dato.normalizacion.motivo}</p>}
    {dato.revision_conflicto.estado !== "sin_conflicto" && <p role="status" className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">{dato.revision_conflicto.estado === "conflicto_pendiente" ? "Hay evidencia contradictoria pendiente de resolución." : `Conflicto resuelto${dato.revision_conflicto.resolucion ? `: ${dato.revision_conflicto.resolucion}` : "."}`}</p>}
    {dato.verificacion.estado === "verificado" && <p className="mt-2 text-xs text-[var(--color-subtle)]">Estado declarado en la ficha{dato.verificacion.verificado_en ? ` · fecha ${dato.verificacion.verificado_en}` : ""}{dato.verificacion.verificado_por ? ` · responsable ${dato.verificacion.verificado_por}` : ""}{dato.verificacion.evento_auditoria_id ? ` · evento ${dato.verificacion.evento_auditoria_id}` : ""}. La interfaz no comprueba autorizaciones.</p>}
    {dato.verificacion.estado === "requiere_revision" && dato.verificacion.motivo_revision && <p className="mt-2 text-xs text-amber-900">Motivo de revisión: {dato.verificacion.motivo_revision}</p>}
    <p className="mt-2 text-xs text-[var(--color-subtle)]">{describirComparabilidad(dato, ficha)}</p>
    {evidenciaVisible.length > 0 && <ul className="mt-3 space-y-2 text-xs text-[var(--color-subtle)]">{evidenciaVisible.map((id) => { const evidencia = evidenciaPorId.get(id)!; const fuente = fuentePorId.get(evidencia.fuente_id)!; const href = fuente.url && /^https?:\/\//i.test(fuente.url) ? fuente.url : null; const alcance = evidencia.alcance.tipo === "variante" ? `variante ${evidencia.alcance.variante_id}` : `variantes ${evidencia.alcance.variante_ids.join(", ")}`; return <li key={id} className="border-l-2 pl-2"><span className="font-medium">{fuente.nombre}</span>{fuente.consultada_en && ` · consultada ${fuente.consultada_en}`}{evidencia.localizador && ` · ${evidencia.localizador}`}{evidencia.extracto && <p className="mt-1">“{evidencia.extracto}”</p>}<p>Alcance: {alcance}</p>{href && <a className="underline" href={href} target="_blank" rel="noreferrer">Abrir fuente</a>}<span className="ml-2">Evidencia {evidencia.postura}{evidencia.postura === "contradice" ? " · no respalda el dato" : ""}</span></li>; })}</ul>}
    {dato.evidencia_ids.length > evidenciaVisible.length && <p role="status" className="mt-2 text-xs text-amber-900">Se omitió evidencia cuyo alcance o fuente no es compatible con esta especificación.</p>}
  </article>;
}

export default function FichaTecnicaV3Panel({ estado }: { estado: Extract<EstadoFichaTecnicaProducto, { version: "v3" }> }) {
  const [varianteId, setVarianteId] = useState("");
  if (estado.estado === "invalida") return <section role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900"><h3 className="font-semibold">No se pudo interpretar la ficha técnica V3</h3><ul className="mt-2 list-disc pl-5">{estado.errores.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul><p className="mt-2">El contenido original se conservó y no se utilizó como ficha V1/V2.</p></section>;
  const ficha = estado.ficha;
  const variante = ficha.variantes.find((item) => item.id === varianteId) ?? (ficha.variantes.length === 1 ? ficha.variantes[0] : null);
  const visibles = ficha.especificaciones.filter((item) => item.variante_id === null || item.variante_id === variante?.id);
  const grupos = new Map<string, EspecificacionFichaV3[]>();
  for (const item of visibles) grupos.set(item.grupo, [...(grupos.get(item.grupo) ?? []), item]);
  const benchmarks = variante ? ficha.benchmarks.filter((item) => item.variante_id === variante.id) : [];
  const benchmarksEsperanVariante = ficha.variantes.length > 1 && !variante && ficha.benchmarks.length > 0;
  return <section aria-label="Ficha técnica versión 3" className="space-y-5">
    <header className="rounded-lg border bg-[var(--color-paper)] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-subtle)]">Ficha técnica V3 · {CATEGORIAS[ficha.categoria]}</p>
      <p className="mt-1 text-xs text-[var(--color-subtle)]">Los estados y responsables mostrados son datos declarados en la ficha; esta interfaz no verifica autorizaciones.</p>
      {ficha.variantes.length > 1 ? <label className="mt-3 block text-sm">Variante<select className="mt-1 block w-full rounded border p-2" value={variante?.id ?? ""} onChange={(event) => setVarianteId(event.target.value)}><option value="">Selecciona una variante</option>{ficha.variantes.map((item) => <option key={item.id} value={item.id}>{[item.modelo, item.sku, item.mercado].filter(Boolean).join(" · ") || item.id}</option>)}</select></label> : variante && <p className="mt-2 text-sm">Variante: {[variante.modelo, variante.sku, variante.mercado].filter(Boolean).join(" · ") || variante.id}</p>}</header>
    {ficha.variantes.length > 1 && !variante && <p role="status" className="rounded border border-dashed p-3 text-sm">Selecciona una variante para consultar sus especificaciones. Los datos comunes permanecen visibles.</p>}
    {estado.advertenciaCategoria && <p role="alert" className="rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">{estado.advertenciaCategoria}</p>}
    {visibles.length === 0 ? <p role="status" className="rounded border border-dashed p-6 text-center text-sm">No hay especificaciones registradas para esta categoría y variante.</p> : [...grupos].map(([grupo, items]) => <section key={grupo} className="space-y-3"><h3 className="text-sm font-semibold uppercase tracking-wide">{grupo}</h3><div className="grid gap-3 md:grid-cols-2">{items.map((item) => <Especificacion key={item.id} dato={item} ficha={ficha} />)}</div></section>)}
    {benchmarksEsperanVariante && <p role="status" className="rounded border border-dashed p-3 text-sm">Selecciona una variante para consultar sus benchmarks. El contrato V3 asocia cada benchmark a una variante concreta y no define benchmarks comunes.</p>}
    {benchmarks.length > 0 && <section className="space-y-3"><h3 className="text-sm font-semibold uppercase tracking-wide">Benchmarks</h3><div className="grid gap-3 md:grid-cols-2">{benchmarks.map((item) => {
      const evidencia = ficha.evidencias.find((row) => row.id === item.evidencia_id);
      const fuente = ficha.fuentes.find((row) => row.id === item.fuente_id);
      const evidenciaCompatible = evidencia?.fuente_id === item.fuente_id && evidencia.alcance.tipo === "variante" && evidencia.alcance.variante_id === item.variante_id && (!fuente?.variante_id || fuente.variante_id === item.variante_id);
      const conflictoPendiente = item.revision_conflicto.estado === "conflicto_pendiente";
      return <article key={item.id} className="rounded-lg border p-4">
        <h4 className="font-semibold">{item.nombre_prueba}{item.version ? ` · ${item.version}` : ""}</h4>
        <p className={conflictoPendiente ? "text-amber-900" : "text-[var(--color-ink)]"}>{conflictoPendiente ? "Resultado informado, no confirmado (conflicto pendiente): " : "Resultado: "}{item.resultado.valor} {item.resultado.unidad}</p>
        <p className="text-xs text-[var(--color-subtle)]">{[item.plataforma, item.modo_ejecucion, item.fecha_ejecucion, ESTADOS_VERIFICACION[item.verificacion.estado]].filter(Boolean).join(" · ")}</p>
        <p className="mt-1 text-xs">Variante: {[variante?.modelo, variante?.sku, variante?.mercado].filter(Boolean).join(" · ") || item.variante_id}</p>
        {fuente && (!fuente.variante_id || fuente.variante_id === item.variante_id) ? <p className="mt-1 text-xs">Fuente: {fuente.nombre}{fuente.consultada_en ? ` · consultada ${fuente.consultada_en}` : ""}{fuente.url && /^https?:\/\//i.test(fuente.url) && <> · <a className="underline" href={fuente.url} target="_blank" rel="noreferrer">Abrir fuente</a></>}</p> : <p className="mt-1 text-xs text-[var(--color-subtle)]">Fuente no disponible para esta variante.</p>}
        {evidenciaCompatible && evidencia ? <div className="mt-2 border-l-2 pl-2 text-xs"><p>Evidencia {evidencia.postura}{evidencia.postura === "contradice" ? " · no respalda el resultado" : ""} · alcance: variante {evidencia.alcance.tipo === "variante" ? evidencia.alcance.variante_id : ""}</p>{evidencia.localizador && <p>{evidencia.localizador}</p>}{evidencia.extracto && <p>“{evidencia.extracto}”</p>}</div> : <p className="mt-2 text-xs text-[var(--color-subtle)]">No hay evidencia compatible disponible para este benchmark.</p>}
        {conflictoPendiente && <p role="alert" className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-950">Conflicto pendiente: no trates este resultado como confirmado.</p>}
        {item.revision_conflicto.estado === "conflicto_resuelto" && <p className="mt-2 text-xs">Conflicto resuelto: {item.revision_conflicto.resolucion}</p>}
        {item.verificacion.estado === "verificado" && <p className="mt-1 text-xs text-[var(--color-subtle)]">Estado declarado en la ficha: verificado{item.verificacion.verificado_en ? ` · ${item.verificacion.verificado_en}` : ""}{item.verificacion.verificado_por ? ` · ${item.verificacion.verificado_por}` : ""}{item.verificacion.evento_auditoria_id ? ` · evento ${item.verificacion.evento_auditoria_id}` : ""}. La interfaz no comprueba autorizaciones.</p>}
        {item.verificacion.estado === "requiere_revision" && item.verificacion.motivo_revision && <p className="mt-1 text-xs text-amber-900">Motivo de revisión: {item.verificacion.motivo_revision}</p>}
        <p className="mt-2 text-xs text-[var(--color-subtle)]">No se compara automáticamente: el contrato V3 no define reglas de comparabilidad para benchmarks.</p>
      </article>;
    })}</div></section>}
  </section>;
}
