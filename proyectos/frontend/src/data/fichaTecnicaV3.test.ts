import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CATEGORIAS_FICHA_V3, despacharFichaTecnica, esDatosFichaTecnicaV3, validarDatosFichaTecnicaV3, type CompuestoV3, type DatosFichaTecnicaV3 } from "@/types/fichaTecnicaV3";
import { normalizarDatosFichaTecnica } from "./fichaTecnica";
import { normalizarFichaTecnicaV2 } from "./normalizadorFicha";

const fuente = {
  id: "src-1", tipo: "fabricante", nombre: "Fuente de prueba", url: "https://example.test/specs",
  localizador: "sección técnica", consultada_en: "2026-11-19", variante_id: "var-1", mercado: "ilustrativo",
} as const;
const evidencia = {
  id: "ev-1", fuente_id: "src-1", alcance: { tipo: "variante", variante_id: "var-1" },
  localizador: "sección técnica", extracto: "Ejemplo de prueba", postura: "respalda",
  registrada_en: "2026-11-19", registrada_por: "tester",
} as const;
const spec = (overrides: Record<string, unknown> = {}) => ({
  id: "display.diagonal.var-1", clave: "display.diagonal", nombre: "Diagonal", grupo: "pantalla",
  variante_id: "var-1", estado_dato: "conocido", justificacion_estado: null,
  valor_original: { texto: "0 in", unidad: "in" },
  normalizacion: { estado: "normalizada", valor: { tipo: "magnitud", valor: 0, unidad: "in" }, regla_conversion_id: null, precision: { decimales: 1 } },
  evidencia_ids: ["ev-1"], revision_conflicto: { estado: "sin_conflicto", resuelto_en: null, resuelto_por: null, resolucion: null },
  verificacion: { estado: "con_fuente", verificado_en: null, verificado_por: null, evento_auditoria_id: null, motivo_revision: null },
  comparacion: { habilitada: true, id: "rule-diagonal", modo: "orden_numerico", unidad: "in", direccion: "mayor_es_mejor", objetivo: null, tolerancia: { valor: 0.1, unidad: "in" } },
  ...overrides,
});
const base = (overrides: Record<string, unknown> = {}): DatosFichaTecnicaV3 => ({
  version_esquema: 3, categoria: "celulares",
  variantes: [{ id: "var-1", modelo: "Equipo ilustrativo", sku: null, mercado: null, identificadores: {} }],
  especificaciones: [spec() as DatosFichaTecnicaV3["especificaciones"][number]],
  fuentes: [fuente as DatosFichaTecnicaV3["fuentes"][number]],
  evidencias: [evidencia as DatosFichaTecnicaV3["evidencias"][number]], benchmarks: [],
  ...overrides,
});
const valido = (f: unknown) => validarDatosFichaTecnicaV3(f).valido;

describe("contrato DatosFichaTecnicaV3", () => {
  it("acepta las cuatro categorías principales", () => {
    for (const categoria of CATEGORIAS_FICHA_V3) expect(valido(base({ categoria }))).toBe(true);
  });
  it("acepta valor cero, unidad, fuentes y evidencia enlazada", () => expect(esDatosFichaTecnicaV3(base())).toBe(true));
  it("conserva un dato original conocido no normalizable con seguridad", () => {
    const s = spec({ normalizacion: { estado: "no_segura", valor: null, regla_conversion_id: null, precision: null, motivo: "Formato ambiguo" }, comparacion: { habilitada: false } });
    expect(valido(base({ especificaciones: [s] }))).toBe(true);
  });
  it("acepta desconocido sin valor original ni valor normalizado", () => {
    const s = spec({ estado_dato: "desconocido", valor_original: null, normalizacion: { estado: "no_procesada", valor: null, regla_conversion_id: null, precision: null }, evidencia_ids: [], verificacion: { estado: "pendiente", verificado_en: null, verificado_por: null, evento_auditoria_id: null, motivo_revision: null }, comparacion: { habilitada: false } });
    expect(valido(base({ especificaciones: [s] }))).toBe(true);
  });
  it("rechaza dato no_aplica sin justificación", () => {
    const s = spec({ estado_dato: "no_aplica", justificacion_estado: null, valor_original: null, normalizacion: { estado: "no_procesada", valor: null, regla_conversion_id: null, precision: null }, evidencia_ids: [], comparacion: { habilitada: false } });
    expect(valido(base({ especificaciones: [s] }))).toBe(false);
  });
  it("acepta no_aplica justificado y exige motivo para requiere_revision", () => {
    const na = spec({ estado_dato: "no_aplica", justificacion_estado: "El perfil de categoría confirma que no corresponde", valor_original: null, normalizacion: { estado: "no_procesada", valor: null, regla_conversion_id: null, precision: null }, evidencia_ids: [], verificacion: { estado: "pendiente", verificado_en: null, verificado_por: null, evento_auditoria_id: null, motivo_revision: null }, comparacion: { habilitada: false } });
    expect(valido(base({ especificaciones: [na] }))).toBe(true);
    const review = spec({ verificacion: { estado: "requiere_revision", verificado_en: null, verificado_por: null, evento_auditoria_id: null, motivo_revision: null } });
    expect(valido(base({ especificaciones: [review] }))).toBe(false);
  });
  it("rechaza valor no finito y texto vacío", () => {
    expect(valido(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: { tipo: "numero", valor: Number.NaN }, regla_conversion_id: null, precision: null }, comparacion: { habilitada: false } })] }))).toBe(false);
    expect(valido(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: { tipo: "texto", valor: " " }, regla_conversion_id: null, precision: null }, comparacion: { habilitada: false } })] }))).toBe(false);
  });
  it("valida listas homogéneas y rechaza duplicados en conjunto", () => {
    const list = { tipo: "lista", semantica: "conjunto", tipo_elemento: "texto", elementos: [{ tipo: "texto", valor: "USB-C" }, { tipo: "texto", valor: "USB-C" }] };
    const s = spec({ normalizacion: { estado: "normalizada", valor: list, regla_conversion_id: null, precision: null }, comparacion: { habilitada: false } });
    expect(validarDatosFichaTecnicaV3(base({ especificaciones: [s] })).errores.join(" ")).toContain("duplicados");
    const mixed = { ...list, elementos: [{ tipo: "texto", valor: "USB-C" }, { tipo: "numero", valor: 2 }] };
    expect(valido(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: mixed, regla_conversion_id: null, precision: null }, comparacion: { habilitada: false } })] }))).toBe(false);
  });
  it("valida dimensiones, resoluciones y rangos", () => {
    const dimensions = { tipo: "dimensiones", ejes: [{ eje: "alto", magnitud: { valor: 10, unidad: "mm" } }, { eje: "ancho", magnitud: { valor: 20, unidad: "mm" } }] };
    const resolution = { tipo: "resolucion", ancho: 1920, alto: 1080, unidad: "px" };
    const range = { tipo: "rango", minimo: { valor: 10, unidad: "Hz" }, maximo: { valor: 20, unidad: "Hz" } };
    for (const value of [dimensions, resolution, range]) expect(valido(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: value, regla_conversion_id: null, precision: null }, comparacion: { habilitada: false } })] }))).toBe(true);
    expect(valido(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: { ...range, minimo: { valor: 21, unidad: "Hz" } }, regla_conversion_id: null, precision: null }, comparacion: { habilitada: false } })] }))).toBe(false);
    expect(valido(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: { ...resolution, ancho: 1920.5 }, regla_conversion_id: null, precision: null }, comparacion: { habilitada: false } })] }))).toBe(false);
    expect(valido(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: { ...dimensions, ejes: dimensions.ejes.map((axis) => ({ ...axis, magnitud: { ...axis.magnitud, unidad: "Hz" } })) }, regla_conversion_id: null, precision: null }, comparacion: { habilitada: false } })] }))).toBe(false);
    expect(valido(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: { ...dimensions, ejes: [...dimensions.ejes, { eje: "ancho", magnitud: { valor: 30, unidad: "mm" } }] }, regla_conversion_id: null, precision: null }, comparacion: { habilitada: false } })] }))).toBe(false);
  });
  it("valida claves de componentes y limita la profundidad a tres niveles de compuesto", () => {
    const duplicate = { tipo: "compuesto", componentes: [{ clave: "a", nombre: "A", valor: { tipo: "texto", valor: "x" } }, { clave: "a", nombre: "A2", valor: { tipo: "texto", valor: "y" } }] };
    expect(valido(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: duplicate, regla_conversion_id: null, precision: null }, comparacion: { habilitada: false } })] }))).toBe(false);
    const levelThree = { tipo: "compuesto", componentes: [{ clave: "c", nombre: "C", valor: { tipo: "texto", valor: "x" } }] };
    const levelTwo = { tipo: "compuesto", componentes: [{ clave: "b", nombre: "B", valor: levelThree }] };
    const deep = { tipo: "compuesto", componentes: [{ clave: "a", nombre: "A", valor: levelTwo }] };
    expect(valido(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: deep, regla_conversion_id: null, precision: null }, comparacion: { habilitada: false } })] }))).toBe(true);
    const levelFour = { tipo: "compuesto", componentes: [{ clave: "d", nombre: "D", valor: deep }] };
    expect(validarDatosFichaTecnicaV3(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: levelFour, regla_conversion_id: null, precision: null }, comparacion: { habilitada: false } })] })).errores.join(" ")).toContain("profundidad");
  });
  it("rechaza tolerancia expresada en unidad incompatible", () => {
    const s = spec({ comparacion: { habilitada: true, id: "rule", modo: "orden_numerico", unidad: "in", direccion: "mayor_es_mejor", objetivo: null, tolerancia: { valor: 1, unidad: "mm" } } });
    expect(valido(base({ especificaciones: [s] }))).toBe(false);
  });
  it("rechaza orden numérico para listas y textos", () => {
    const rule = { habilitada: true, id: "r", modo: "orden_numerico", unidad: "in", direccion: "mayor_es_mejor", objetivo: null, tolerancia: null };
    for (const value of [{ tipo: "texto", valor: "seis pulgadas" }, { tipo: "lista", semantica: "secuencia", tipo_elemento: "numero", elementos: [{ tipo: "numero", valor: 1 }] }]) {
      expect(valido(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: value, regla_conversion_id: null, precision: null }, comparacion: rule })] }))).toBe(false);
    }
  });
  it("solo ordena magnitudes escalares y admite igualdad estructural sin ganador", () => {
    const rule = { habilitada: true, id: "r", modo: "orden_numerico", unidad: "mm", direccion: "mayor_es_mejor", objetivo: null, tolerancia: null };
    const range = { tipo: "rango", minimo: { valor: 1, unidad: "mm" }, maximo: { valor: 3, unidad: "mm" } };
    expect(valido(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: range, regla_conversion_id: null, precision: null }, comparacion: rule })] }))).toBe(false);
    const equal = { habilitada: true, id: "equality", modo: "igualdad_estructural", unidad: null, direccion: "igualdad", objetivo: null, tolerancia: null };
    expect(valido(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: { tipo: "texto", valor: "OLED" }, regla_conversion_id: null, precision: null }, comparacion: equal })] }))).toBe(true);
  });
  it("rechaza identificadores y claves duplicados", () => {
    const s = spec();
    expect(valido(base({ especificaciones: [s, { ...s, variante_id: "var-1" }] }))).toBe(false);
  });
  it("rechaza referencias a fuente y evidencia inexistentes", () => {
    const s = spec({ evidencia_ids: ["missing"] });
    expect(valido(base({ especificaciones: [s] }))).toBe(false);
    expect(valido(base({ fuentes: [] }))).toBe(false);
  });
  it("valida benchmarks y exige fuente y evidencia de su variante", () => {
    const benchmark = {
      id: "bench-1", nombre_prueba: "Prueba ilustrativa", version: "1", plataforma: "plataforma-ejemplo",
      modo_ejecucion: "modo-ejemplo", resultado_original: { texto: "10 puntos", unidad: "puntos" },
      resultado: { valor: 10, unidad: "puntos" }, regla_conversion_id: null, fecha_ejecucion: "2026-11-19",
      fuente_id: "src-1", evidencia_id: "ev-1", variante_id: "var-1",
      verificacion: { estado: "con_fuente", verificado_en: null, verificado_por: null, evento_auditoria_id: null, motivo_revision: null },
      revision_conflicto: { estado: "sin_conflicto", resuelto_en: null, resuelto_por: null, resolucion: null },
    };
    expect(valido(base({ benchmarks: [benchmark] }))).toBe(true);
    expect(valido(base({ benchmarks: [{ ...benchmark, variante_id: null }] }))).toBe(false);
    expect(valido(base({ benchmarks: [{ ...benchmark, variante_id: "variante-inexistente" }] }))).toBe(false);
    expect(valido(base({ benchmarks: [{ ...benchmark, evidencia_id: "inexistente" }] }))).toBe(false);
    const fuenteBenchmarkGen = { ...fuente, id: "src-bench-gen", variante_id: null };
    const otherVariantEvidence = { ...evidencia, id: "ev-other", fuente_id: "src-bench-gen", alcance: { tipo: "variante" as const, variante_id: "var-2" } };
    expect(valido(base({
      variantes: [
        { id: "var-1", modelo: "M1", sku: null, mercado: null, identificadores: {} },
        { id: "var-2", modelo: "M2", sku: null, mercado: null, identificadores: {} },
      ],
      fuentes: [fuenteBenchmarkGen],
      evidencias: [otherVariantEvidence],
      benchmarks: [{ ...benchmark, fuente_id: "src-bench-gen", evidencia_id: "ev-other" }],
    }))).toBe(false);
    expect(valido(base({ benchmarks: [{ ...benchmark, regla_conversion_id: undefined }] }))).toBe(false);
    expect(valido(base({ benchmarks: [{ ...benchmark, regla_conversion_id: " " }] }))).toBe(false);
  });
  it("aísla el rechazo de evidencia de otra variante usando fuente general y variantes válidas", () => {
    const fuenteGeneral = { ...fuente, id: "src-gen", variante_id: null };
    const evVar2 = {
      ...evidencia,
      id: "ev-var2",
      fuente_id: "src-gen",
      alcance: { tipo: "variante" as const, variante_id: "var-2" },
    };
    const dosVariantes = [
      { id: "var-1", modelo: "V1", sku: null, mercado: null, identificadores: {} },
      { id: "var-2", modelo: "V2", sku: null, mercado: null, identificadores: {} },
    ];
    const sVar1 = spec({
      variante_id: "var-1",
      evidencia_ids: ["ev-var2"],
      verificacion: { estado: "con_fuente", verificado_en: null, verificado_por: null, evento_auditoria_id: null, motivo_revision: null },
    });
    const fichaConFuente = base({
      variantes: dosVariantes,
      fuentes: [fuenteGeneral],
      evidencias: [evVar2],
      especificaciones: [sVar1],
    });

    const resConFuente = validarDatosFichaTecnicaV3(fichaConFuente);
    expect(resConFuente.valido).toBe(false);
    expect(resConFuente.errores).toEqual([
      "especificaciones[0].evidencia_ids: la evidencia no cubre la variante de la especificación",
    ]);

    const sPendiente = { ...sVar1, verificacion: { estado: "pendiente" as const, verificado_en: null, verificado_por: null, evento_auditoria_id: null, motivo_revision: null } };
    const resPendiente = validarDatosFichaTecnicaV3(base({
      variantes: dosVariantes,
      fuentes: [fuenteGeneral],
      evidencias: [evVar2],
      especificaciones: [sPendiente],
    }));
    expect(resPendiente.errores).toEqual([
      "especificaciones[0].evidencia_ids: la evidencia no cubre la variante de la especificación",
    ]);

    const sVerificado = {
      ...sVar1,
      verificacion: { estado: "verificado" as const, verificado_en: "2026-11-19", verificado_por: "reviewer", evento_auditoria_id: "audit-1", motivo_revision: null },
    };
    const resVerificado = validarDatosFichaTecnicaV3(base({
      variantes: dosVariantes,
      fuentes: [fuenteGeneral],
      evidencias: [evVar2],
      especificaciones: [sVerificado],
    }));
    expect(resVerificado.errores).toContain(
      "especificaciones[0].evidencia_ids: la evidencia no cubre la variante de la especificación",
    );
  });
  it("acepta evidencia de alcance general todas_las_variantes para una especificación de variante", () => {
    const fuenteGeneral = { ...fuente, id: "src-gen", variante_id: null };
    const evGeneral = {
      ...evidencia,
      id: "ev-gen",
      fuente_id: "src-gen",
      alcance: { tipo: "todas_las_variantes" as const, variante_ids: ["var-1", "var-2"] },
    };
    const dosVariantes = [
      { id: "var-1", modelo: "V1", sku: null, mercado: null, identificadores: {} },
      { id: "var-2", modelo: "V2", sku: null, mercado: null, identificadores: {} },
    ];
    const sVar1 = spec({
      variante_id: "var-1",
      evidencia_ids: ["ev-gen"],
      verificacion: { estado: "con_fuente", verificado_en: null, verificado_por: null, evento_auditoria_id: null, motivo_revision: null },
    });
    const ficha = base({
      variantes: dosVariantes,
      fuentes: [fuenteGeneral],
      evidencias: [evGeneral],
      especificaciones: [sVar1],
    });
    expect(validarDatosFichaTecnicaV3(ficha).errores).toEqual([]);
    expect(valido(ficha)).toBe(true);
  });
  it("rechaza evidencia general todas_las_variantes si no incluye la variante de la especificación", () => {
    const fuenteGeneral = { ...fuente, id: "src-gen", variante_id: null };
    const evSinVar1 = {
      ...evidencia,
      id: "ev-gen-parcial",
      fuente_id: "src-gen",
      alcance: { tipo: "todas_las_variantes" as const, variante_ids: ["var-2"] },
    };
    const dosVariantes = [
      { id: "var-1", modelo: "V1", sku: null, mercado: null, identificadores: {} },
      { id: "var-2", modelo: "V2", sku: null, mercado: null, identificadores: {} },
    ];
    const sVar1 = spec({
      variante_id: "var-1",
      evidencia_ids: ["ev-gen-parcial"],
      verificacion: { estado: "con_fuente", verificado_en: null, verificado_por: null, evento_auditoria_id: null, motivo_revision: null },
    });
    const ficha = base({
      variantes: dosVariantes,
      fuentes: [fuenteGeneral],
      evidencias: [evSinVar1],
      especificaciones: [sVar1],
    });
    expect(validarDatosFichaTecnicaV3(ficha).errores).toEqual([
      "especificaciones[0].evidencia_ids: la evidencia no cubre la variante de la especificación",
    ]);
  });
  it("permite tipar compuestos recursivos hasta tres niveles en TypeScript", () => {
    const levelThree: CompuestoV3 = { tipo: "compuesto", componentes: [{ clave: "c", nombre: "C", valor: { tipo: "texto", valor: "x" } }] };
    const levelTwo: CompuestoV3 = { tipo: "compuesto", componentes: [{ clave: "b", nombre: "B", valor: levelThree }] };
    const deep: CompuestoV3 = { tipo: "compuesto", componentes: [{ clave: "a", nombre: "A", valor: levelTwo }] };
    expect(valido(base({ especificaciones: [spec({ normalizacion: { estado: "normalizada", valor: deep, regla_conversion_id: null, precision: null }, comparacion: { habilitada: false } })] }))).toBe(true);
  });
  it("rechaza verificación con conflicto pendiente", () => {
    const s = spec({ revision_conflicto: { estado: "conflicto_pendiente", resuelto_en: null, resuelto_por: null, resolucion: null }, verificacion: { estado: "verificado", verificado_en: "2026-11-19", verificado_por: "reviewer", evento_auditoria_id: "audit-1", motivo_revision: null } });
    expect(validarDatosFichaTecnicaV3(base({ especificaciones: [s] })).errores.join(" ")).toContain("conflicto pendiente");
  });
  it("no permite resolver conflicto solo porque la evidencia contradictoria esté registrada", () => {
    const contradiction = { ...evidencia, id: "ev-contradice", postura: "contradice" };
    const s = spec({ evidencia_ids: ["ev-1", "ev-contradice"] });
    expect(validarDatosFichaTecnicaV3(base({ evidencias: [evidencia, contradiction], especificaciones: [s] })).errores.join(" ")).toContain("requiere resolución");
  });
  it("acepta conflicto resuelto solo con trazabilidad completa", () => {
    const s = spec({ revision_conflicto: { estado: "conflicto_resuelto", resuelto_en: "2026-11-19", resuelto_por: "reviewer", resolucion: "Se confirmó la variante exacta" }, verificacion: { estado: "verificado", verificado_en: "2026-11-19", verificado_por: "reviewer", evento_auditoria_id: "audit-1", motivo_revision: null } });
    expect(valido(base({ especificaciones: [s] }))).toBe(true);
  });
  it("mantiene los adaptadores V1/V2 separados y no acepta V3 como V2", () => {
    expect(normalizarDatosFichaTecnica({ estado_verificacion: "pendiente" }).version_esquema).toBe(1);
    expect(() => normalizarFichaTecnicaV2({ version_esquema: 3 })).toThrow(/no soportada/i);
  });
});


type CasoConformidad = { id: string; description: string; input: unknown; expected: "valid" | "invalid"; rule: string };
const casosConformidad = JSON.parse(readFileSync(resolve(process.cwd(), "../fixtures/ficha-tecnica-v3/conformance-cases.json"), "utf8")) as CasoConformidad[];
describe("vectores JSON compartidos TypeScript ↔ Java", () => {
  it.each(casosConformidad)("$id — $rule", ({ input, expected, id }) => {
    const result = despacharFichaTecnica(input);
    expect(result.ruta === "error" ? "invalid" : "valid", id).toBe(expected);
  });
});
