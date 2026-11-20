// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import FichaTecnicaV3Panel from "./FichaTecnicaV3Panel";
import type { DatosFichaTecnicaV3 } from "@/types/fichaTecnicaV3";
import type { EstadoFichaTecnicaProducto } from "@/data/fichaTecnicaProducto";

const vectors = JSON.parse(readFileSync(resolve(process.cwd(), "../fixtures/ficha-tecnica-v3/conformance-cases.json"), "utf8")) as Array<{ id: string; input: DatosFichaTecnicaV3 }>;
const fixture = vectors.find((item) => item.id === "v3_valid")!.input;
const estado: Extract<EstadoFichaTecnicaProducto, { version: "v3" }> = { version: "v3", estado: "valida", original: fixture as unknown as Record<string, unknown>, ficha: fixture };

describe("FichaTecnicaV3Panel", () => {
  afterEach(() => cleanup());
  it("muestra categoría, valores tipados, estado de verificación y fuente/evidencia", () => {
    render(<FichaTecnicaV3Panel estado={estado} />);
    expect(screen.getByText(/Celulares/)).toBeTruthy();
    expect(screen.getByText("Diagonal")).toBeTruthy();
    expect(screen.getByText("0 in")).toBeTruthy();
    expect(screen.getByText("Con fuente")).toBeTruthy();
    expect(screen.getByText("Fixture source")).toBeTruthy();
  });
  it("muestra estado controlado y errores para V3 inválido", () => {
    render(<FichaTecnicaV3Panel estado={{ version: "v3", estado: "invalida", original: {}, errores: ["categoria: no soportada"] }} />);
    expect(screen.getByRole("alert").textContent).toContain("categoria: no soportada");
    expect(screen.getByText(/no se utilizó como ficha V1\/V2/)).toBeTruthy();
  });

  it("muestra benchmarks de la única variante e incluye fuente, evidencia y trazabilidad", () => {
    const ficha = structuredClone(fixture);
    ficha.benchmarks = [benchmark("bench-one", "var-1", "ev-1", "src-1")];
    const state: typeof estado = { ...estado, original: ficha as unknown as Record<string, unknown>, ficha };
    render(<FichaTecnicaV3Panel estado={state} />);
    expect(screen.getByRole("heading", { name: /Benchmark ilustrativo/ })).toBeTruthy();
    expect(screen.getByText(/Fuente: Fixture source/)).toBeTruthy();
    expect(screen.getAllByText(/Evidencia respalda/).length).toBeGreaterThan(0);
    expect(screen.getByText(/No se compara automáticamente/)).toBeTruthy();
  });

  it("oculta benchmarks de varias variantes hasta elegir una y filtra por la seleccionada", () => {
    const ficha = structuredClone(fixture);
    ficha.variantes.push({ id: "var-2", modelo: "Modelo ilustrativo B", sku: null, mercado: null, identificadores: {} });
    ficha.fuentes.push({ ...ficha.fuentes[0], id: "src-2", nombre: "Second fixture source", variante_id: "var-2" });
    ficha.evidencias.push({ ...ficha.evidencias[0], id: "ev-2", fuente_id: "src-2", alcance: { tipo: "variante", variante_id: "var-2" }, extracto: "second illustrative evidence" });
    ficha.benchmarks = [benchmark("bench-one", "var-1", "ev-1", "src-1"), benchmark("bench-two", "var-2", "ev-2", "src-2")];
    const state: typeof estado = { ...estado, original: ficha as unknown as Record<string, unknown>, ficha };
    render(<FichaTecnicaV3Panel estado={state} />);
    expect(screen.getByText(/no define benchmarks comunes/)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Benchmark ilustrativo/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Variante"), { target: { value: "var-2" } });
    expect(screen.getByRole("heading", { name: /Benchmark ilustrativo B/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Benchmark ilustrativo A/ })).toBeNull();
    expect(screen.getByText(/second illustrative evidence/)).toBeTruthy();
  });

  it("no presenta un benchmark con conflicto pendiente como confirmado", () => {
    const ficha = structuredClone(fixture);
    ficha.benchmarks = [benchmark("bench-pending", "var-1", "ev-1", "src-1", true)];
    const state: typeof estado = { ...estado, original: ficha as unknown as Record<string, unknown>, ficha };
    render(<FichaTecnicaV3Panel estado={state} />);
    expect(screen.getByText(/Resultado informado, no confirmado/)).toBeTruthy();
    expect(screen.getAllByRole("alert").some((element) => element.textContent?.includes("Conflicto pendiente"))).toBe(true);
  });

  it("presenta evidencia contradictoria como contradicción y muestra metadatos de verificación declarados", () => {
    const ficha = structuredClone(fixture);
    ficha.evidencias[0].postura = "contradice";
    ficha.especificaciones[0].revision_conflicto = { estado: "conflicto_resuelto", resuelto_en: "2026-11-19", resuelto_por: "reviewer-fixture", resolucion: "Se conserva el valor documentado por el fabricante." };
    ficha.especificaciones[0].verificacion = { estado: "verificado", verificado_en: "2026-11-19", verificado_por: "reviewer-fixture", evento_auditoria_id: "audit-fixture-1", motivo_revision: null };
    const state: typeof estado = { ...estado, original: ficha as unknown as Record<string, unknown>, ficha };
    render(<FichaTecnicaV3Panel estado={state} />);
    expect(screen.getByText(/Evidencia contradice · no respalda el dato/)).toBeTruthy();
    expect(screen.getByText(/responsable reviewer-fixture/)).toBeTruthy();
    expect(screen.getByText(/evento audit-fixture-1/)).toBeTruthy();
    expect(screen.getByText(/La interfaz no comprueba autorizaciones/)).toBeTruthy();
  });

  it("muestra distintos los estados no publicado y no aplica con justificación", () => {
    const ficha = structuredClone(fixture);
    ficha.especificaciones = [
      { ...ficha.especificaciones[0], id: "unpublished", clave: "unpublished", nombre: "Dato no publicado", estado_dato: "no_publicado", valor_original: null, normalizacion: { estado: "no_procesada", valor: null, regla_conversion_id: null, precision: null }, evidencia_ids: [], comparacion: { habilitada: false }, verificacion: { estado: "pendiente", verificado_en: null, verificado_por: null, evento_auditoria_id: null, motivo_revision: null } },
      { ...ficha.especificaciones[0], id: "not-applicable", clave: "not-applicable", nombre: "Dato no aplicable", estado_dato: "no_aplica", justificacion_estado: "No corresponde a esta categoría", valor_original: null, normalizacion: { estado: "no_procesada", valor: null, regla_conversion_id: null, precision: null }, evidencia_ids: [], comparacion: { habilitada: false }, verificacion: { estado: "pendiente", verificado_en: null, verificado_por: null, evento_auditoria_id: null, motivo_revision: null } },
    ];
    const state: typeof estado = { ...estado, original: ficha as unknown as Record<string, unknown>, ficha };
    render(<FichaTecnicaV3Panel estado={state} />);
    expect(screen.getByText("El fabricante no ha publicado este dato.")).toBeTruthy();
    expect(screen.getByText("Esta característica no aplica.")).toBeTruthy();
    expect(screen.getByText("Justificación: No corresponde a esta categoría")).toBeTruthy();
  });

  it("muestra una advertencia de categoría sin reinterpretar la ficha", () => {
    render(<FichaTecnicaV3Panel estado={{ ...estado, advertenciaCategoria: "La categoría V3 no coincide." }} />);
    expect(screen.getByLabelText("Ficha técnica versión 3")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("no coincide");
    expect(screen.getByText(/Celulares/)).toBeTruthy();
  });

  it("diferencia variantes con el mismo modelo utilizando sus identificadores sin duplicar etiquetas", () => {
    const ficha = structuredClone(fixture);
    ficha.variantes = [
      { id: "var-256", modelo: "Galaxy S24 Ultra", sku: null, mercado: null, identificadores: { ram: "12 GB", almacenamiento: "256 GB" } },
      { id: "var-512", modelo: "Galaxy S24 Ultra", sku: null, mercado: null, identificadores: { ram: "12 GB", almacenamiento: "512 GB" } },
      { id: "var-1tb", modelo: "Galaxy S24 Ultra", sku: null, mercado: null, identificadores: { ram: "12 GB", almacenamiento: "1 TB" } },
    ];
    const state: typeof estado = { ...estado, original: ficha as unknown as Record<string, unknown>, ficha };
    render(<FichaTecnicaV3Panel estado={state} />);

    const select = screen.getByLabelText("Variante") as HTMLSelectElement;
    expect(select).toBeTruthy();
    const options = Array.from(select.options).map((opt) => opt.textContent);
    expect(options).toContain("Elige una variante para consultar sus especificaciones");
    expect(options).toContain("Galaxy S24 Ultra · 12 GB · 256 GB");
    expect(options).toContain("Galaxy S24 Ultra · 12 GB · 512 GB");
    expect(options).toContain("Galaxy S24 Ultra · 12 GB · 1 TB");

    // Confirma que todas las opciones de variantes son únicas (sin duplicados visuales)
    const opcionesVariantes = options.filter((t) => t && !t.includes("Elige una variante"));
    const opcionesUnicas = new Set(opcionesVariantes);
    expect(opcionesUnicas.size).toBe(opcionesVariantes.length);
  });

  it("muestra microcopy natural y badges accesibles para comparabilidad y revisiones", () => {
    const ficha = structuredClone(fixture);
    ficha.especificaciones[0].comparacion = { habilitada: false };
    ficha.especificaciones[0].verificacion = { estado: "requiere_revision", verificado_en: null, verificado_por: null, evento_auditoria_id: null, motivo_revision: "Discrepancia de hz" };
    const state: typeof estado = { ...estado, original: ficha as unknown as Record<string, unknown>, ficha };
    render(<FichaTecnicaV3Panel estado={state} />);

    expect(screen.getByText("Este atributo no está disponible para comparar.")).toBeTruthy();
    expect(screen.getByText("Requiere revisión")).toBeTruthy();
    expect(screen.getByText("Motivo de revisión: Discrepancia de hz")).toBeTruthy();
  });
});

function benchmark(id: string, variantId: string, evidenceId: string, sourceId: string, pending = false): DatosFichaTecnicaV3["benchmarks"][number] {
  return {
    id, nombre_prueba: `Benchmark ilustrativo${id === "bench-one" ? "" : ` ${id === "bench-two" ? "B" : "A"}`}`,
    version: "1", plataforma: "plataforma de prueba", modo_ejecucion: "modo controlado",
    resultado_original: { texto: "100 puntos", unidad: "puntos" }, resultado: { valor: 100, unidad: "puntos" },
    regla_conversion_id: null, fecha_ejecucion: "2026-11-19", fuente_id: sourceId, evidencia_id: evidenceId, variante_id: variantId,
    verificacion: { estado: "con_fuente", verificado_en: null, verificado_por: null, evento_auditoria_id: null, motivo_revision: null },
    revision_conflicto: pending
      ? { estado: "conflicto_pendiente", resuelto_en: null, resuelto_por: null, resolucion: null }
      : { estado: "sin_conflicto", resuelto_en: null, resuelto_por: null, resolucion: null },
  };
}
