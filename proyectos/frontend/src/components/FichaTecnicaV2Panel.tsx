"use client";

import type { FichaTecnicaV2 } from "@/types/fichaTecnica";
import Tag from "@/components/ui/Tag";
import { esMetricaComparableAutomaticamente } from "@/types/fichaTecnica";

export default function FichaTecnicaV2Panel({ ficha }: { ficha: FichaTecnicaV2 }) {
  const fuentes = new Map(ficha.fuentes.map((fuente) => [fuente.id, fuente] as const));
  const estado = {
    pendiente: "Pendiente de verificación",
    parcial: "Verificación parcial",
    verificado: "Verificado",
    requiere_revision: "Requiere revisión",
  }[ficha.estado_verificacion];

  const valor = (dato: string | number | boolean, unidad?: string | null) =>
    (typeof dato === "boolean" ? (dato ? "Sí" : "No") : String(dato)) +
    (unidad ? " " + unidad : "");

  return (
    <section aria-label="Ficha técnica canónica V2" className="mt-4 space-y-4 rounded-card border border-line bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dotted border-line pb-3">
        <div>
          <h3 className="text-sm font-medium text-ink">Ficha técnica detallada</h3>
          <p className="mt-0.5 text-[11px] text-subtle">Datos normalizados · Esquema V2</p>
        </div>
        <Tag variant={ficha.estado_verificacion === "verificado" ? "verified" : "pending"}>{estado}</Tag>
      </div>

      {ficha.variantes.length > 0 && (
        <div>
          <h4 className="mb-2 text-[11px] font-medium uppercase text-subtle">Variantes / configuraciones</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ficha.variantes.map((v) => (
              <article key={v.id} className="rounded-card border border-line bg-paper p-3 text-xs">
                <p className="font-medium text-ink">{v.modelo || v.id}</p>
                {[["SKU", v.sku], ["Mercado", v.mercado], ["RAM", v.ram], ["Almacenamiento", v.almacenamiento], ["Conectividad", v.conectividad], ["Identificador", v.identificador]]
                  .filter(([, dato]) => Boolean(dato))
                  .map(([label, dato]) => <p key={String(label)} className="mt-1 text-subtle">{label}: <span className="font-medium text-ink">{dato}</span></p>)}
              </article>
            ))}
          </div>
        </div>
      )}

      {ficha.atributos.length > 0 && (
        <div>
          <h4 className="mb-2 text-[11px] font-medium uppercase text-subtle">Atributos técnicos</h4>
          <div className="overflow-hidden rounded-card border border-line">
            {ficha.atributos.map((a, i) => (
              <div key={a.clave + "-" + i} className="flex flex-wrap items-center justify-between gap-2 border-b border-dotted border-line bg-paper px-3 py-2.5 text-xs last:border-b-0">
                <div><p className="font-medium text-ink">{a.nombre}</p><p className="text-[10px] text-subtle">{a.grupo}</p></div>
                <span className="font-medium text-ink">{valor(a.valor, a.unidad)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ficha.metricasComparables.length > 0 && (
        <div>
          <h4 className="mb-2 text-[11px] font-medium uppercase text-subtle">Métricas y comparabilidad</h4>
          <div className="overflow-hidden rounded-card border border-line">
            {ficha.metricasComparables.map((m, i) => (
              <div key={m.clave + "-" + i} className="flex flex-wrap items-center justify-between gap-2 border-b border-dotted border-line bg-paper px-3 py-2.5 text-xs last:border-b-0">
                <div>
                  <p className="font-medium text-ink">{m.nombre}</p>
                  <p className="text-[10px] text-subtle">
                    <span>{m.grupo}</span>
                    {" · "}
                    <span>
                      {esMetricaComparableAutomaticamente(m)
                        ? "Comparable automáticamente"
                        : m.comparable
                          ? "Pendiente de metodología"
                          : "Solo informativa"}
                    </span>
                  </p>
                </div>
                <span className="font-medium text-ink">{valor(m.valor, m.unidad)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ficha.benchmarks.length > 0 && (
        <div>
          <h4 className="mb-2 text-[11px] font-medium uppercase text-subtle">Resultados de benchmarks</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ficha.benchmarks.map((b) => {
              const fuente = fuentes.get(b.fuenteId);
              return <article key={b.id} className="rounded-card border border-line bg-paper p-3">
                <p className="text-xs font-medium text-ink">{b.nombre}</p>
                <p className="mt-1 text-lg font-medium text-brand-blue">{valor(b.valor, b.unidad)}</p>
                <p className="mt-1 text-[10px] text-subtle">{[b.prueba, b.version ? "Versión " + b.version : null, b.fecha].filter(Boolean).join(" · ")}</p>
                <p className="mt-1 text-[10px] text-subtle">Método: {b.metodo || "No registrado"} · Plataforma: {b.plataforma || "No registrada"}</p>
                {fuente?.url && <a href={fuente.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-medium text-brand-blue underline">Consultar fuente</a>}
              </article>;
            })}
          </div>
        </div>
      )}

      {ficha.fuentes.length > 0 && (
        <div>
          <h4 className="mb-2 text-[11px] font-medium uppercase text-subtle">Fuentes y procedencia</h4>
          <ul className="space-y-2">
            {ficha.fuentes.map((f) => <li key={f.id} className="rounded-card border border-line bg-paper p-3 text-xs">
              <div className="flex flex-wrap justify-between gap-2"><span className="font-medium text-ink">{f.nombre}</span><span className="capitalize text-subtle">{f.tipo}</span></div>
              {f.fecha_consulta && <p className="mt-1 text-[10px] text-subtle">Consulta: {f.fecha_consulta}</p>}
              {f.varianteId && <p className="mt-1 text-[10px] text-subtle">Variante: {f.varianteId}</p>}
              {f.observaciones && <p className="mt-1 text-[11px] text-subtle">{f.observaciones}</p>}
              {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-medium text-brand-blue underline">Consultar fuente</a>}
            </li>)}
          </ul>
        </div>
      )}

      {ficha.variantes.length + ficha.atributos.length + ficha.metricasComparables.length + ficha.benchmarks.length + ficha.fuentes.length === 0 && (
        <p className="text-xs text-subtle">Aún no se han registrado variantes, atributos, métricas, benchmarks ni fuentes.</p>
      )}
    </section>
  );
}
