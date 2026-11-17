import { describe, expect, expectTypeOf, it } from "vitest";
import {
  CATEGORIAS_FICHA_TECNICA,
  ESTADOS_VERIFICACION_FICHA_V2,
  SISTEMAS_UNIDADES,
  TIPOS_FUENTE_FICHA_V2,
  UNIDADES_CANONICAS,
  VERSION_ESQUEMA_FICHA_TECNICA_V2,
  esBenchmarkComparableAutomaticamente,
  esCategoriaFichaTecnica,
  esEstadoVerificacionFichaV2,
  esMetricaComparableAutomaticamente,
  esSistemaUnidades,
  esTipoFuenteFichaV2,
  esUnidadCanonica,
  type AtributoFichaV2,
  type BenchmarkFichaV2,
  type CategoriaFichaTecnica,
  type EstadoVerificacionFichaV2,
  type FichaTecnicaV2,
  type FuenteFichaV2,
  type MetricaComparableFichaV2,
  type MetricaFichaV2,
  type MetricaInformativaFichaV2,
  type SistemaUnidades,
  type TipoFuenteFichaV2,
  type VarianteFichaV2,
} from "@/types/fichaTecnica";

describe("contrato de ficha técnica v2", () => {
  it("declara la versión de esquema 2", () => {
    expect(VERSION_ESQUEMA_FICHA_TECNICA_V2).toBe(2);
    expectTypeOf<FichaTecnicaV2["version_esquema"]>().toEqualTypeOf<2>();
  });

  it("define exactamente las cuatro categorías", () => {
    expect(CATEGORIAS_FICHA_TECNICA).toEqual([
      "moviles",
      "tablets",
      "laptops",
      "auriculares",
    ]);
    expectTypeOf<CategoriaFichaTecnica>().toEqualTypeOf<
      "moviles" | "tablets" | "laptops" | "auriculares"
    >();
  });

  it("define los estados de verificación", () => {
    expect(ESTADOS_VERIFICACION_FICHA_V2).toEqual([
      "pendiente",
      "parcial",
      "verificado",
      "requiere_revision",
    ]);
    expectTypeOf<EstadoVerificacionFichaV2>().toEqualTypeOf<
      "pendiente" | "parcial" | "verificado" | "requiere_revision"
    >();
  });

  it("distingue sistemas de unidades decimales, binarios e internacionales", () => {
    expect(SISTEMAS_UNIDADES).toContain("decimal");
    expect(SISTEMAS_UNIDADES).toContain("binario");
    expect(SISTEMAS_UNIDADES).toContain("internacional");
    expect(SISTEMAS_UNIDADES).toContain("imperial");
    expectTypeOf<SistemaUnidades>().toEqualTypeOf<
      "decimal" | "binario" | "internacional" | "imperial" | "sin_sistema"
    >();
  });

  it("define los tipos canónicos de fuentes de ficha técnica", () => {
    expect(TIPOS_FUENTE_FICHA_V2).toEqual([
      "fabricante",
      "comercio",
      "benchmark",
      "analisis",
      "otro",
    ]);
    expectTypeOf<TipoFuenteFichaV2>().toEqualTypeOf<
      "fabricante" | "comercio" | "benchmark" | "analisis" | "otro"
    >();
  });

  it("incluye GB y GiB como unidades distintas entre las canónicas", () => {
    expect(UNIDADES_CANONICAS).toContain("GB");
    expect(UNIDADES_CANONICAS).toContain("GiB");
    expect(new Set(UNIDADES_CANONICAS).size).toBe(UNIDADES_CANONICAS.length);
  });

  it("acepta una ficha completa con las colecciones separadas", () => {
    const fuente: FuenteFichaV2 = {
      id: "fuente-fabricante",
      tipo: "fabricante",
      nombre: "Fabricante",
      url: "https://example.com/producto",
      fecha_consulta: "2026-11-15",
    };

    const variante: VarianteFichaV2 = {
      id: "variante-1",
      modelo: "Modelo A",
      ram: "8 GB",
    };

    const atributo: AtributoFichaV2 = {
      clave: "pantalla",
      nombre: "Pantalla",
      grupo: "display",
      valor: 6.8,
      unidad: "in",
      valorOriginal: "6.8 in",
      fuenteId: fuente.id,
    };

    const metrica: MetricaFichaV2 = {
      clave: "ram",
      nombre: "Memoria RAM",
      grupo: "memoria",
      valor: 8,
      unidad: "GB",
      unidadOriginal: "GB",
      sistema_unidades: "decimal",
      comparable: true,
      metodo: "ficha-fabricante",
      version_metodo: "1",
      plataforma: "Android",
      fuenteId: fuente.id,
    };

    const benchmark: BenchmarkFichaV2 = {
      id: "geekbench-6-cpu",
      nombre: "Geekbench 6 CPU",
      prueba: "Geekbench",
      version: "6",
      valor: 7200,
      unidad: "puntos",
      metodo: "single-core",
      plataforma: "Android",
      fecha: "2026-11-15",
      fuenteId: fuente.id,
    };

    const ficha = {
      version_esquema: 2,
      categoria: "moviles",
      estado_verificacion: "verificado",
      variantes: [variante],
      atributos: [atributo],
      metricasComparables: [metrica],
      benchmarks: [benchmark],
      fuentes: [fuente],
    } satisfies FichaTecnicaV2;

    expect(ficha.version_esquema).toBe(2);
    expect(ficha.atributos[0].unidad).toBe("in");
    expect(ficha.metricasComparables[0].sistema_unidades).toBe("decimal");
    expect(ficha.benchmarks[0].fuenteId).toBe(fuente.id);
    expect(ficha.fuentes[0].id).toBe(fuente.id);
  });

  it("permite fichas parciales sin inventar valores", () => {
    const fichaParcial: FichaTecnicaV2 = {
      version_esquema: 2,
      categoria: "tablets",
      estado_verificacion: "pendiente",
      variantes: [],
      atributos: [],
      metricasComparables: [],
      benchmarks: [],
      fuentes: [],
    };

    expect(fichaParcial.variantes).toEqual([]);
    expect(fichaParcial.atributos).toEqual([]);
    expect(fichaParcial.metricasComparables).toEqual([]);
    expect(fichaParcial.benchmarks).toEqual([]);
    expect(fichaParcial.fuentes).toEqual([]);
  });

  it("permite atributos de texto sin unidad y atributos numéricos con unidad", () => {
    const texto: AtributoFichaV2 = {
      clave: "tecnologia_pantalla",
      nombre: "Tecnología de pantalla",
      grupo: "display",
      valor: "OLED",
    };
    const numero: AtributoFichaV2 = {
      clave: "pantalla",
      nombre: "Pantalla",
      grupo: "display",
      valor: 6.8,
      unidad: "in",
    };

    expect(texto.valor).toBe("OLED");
    expect(texto.unidad).toBeUndefined();
    expect(numero.unidad).toBe("in");
  });

  it("distingue métricas informativas de métricas comparables", () => {
    const informativa: MetricaInformativaFichaV2 = {
      clave: "color",
      nombre: "Color",
      grupo: "diseño",
      valor: "negro",
      comparable: false,
    };

    const comparable: MetricaComparableFichaV2 = {
      clave: "ram",
      nombre: "Memoria RAM",
      grupo: "memoria",
      valor: 8,
      unidad: "GB",
      sistema_unidades: "decimal",
      comparable: true,
      metodo: "ficha-fabricante",
      version_metodo: "1",
      plataforma: "Android",
    };

    expect(esMetricaComparableAutomaticamente(informativa)).toBe(false);
    expect(esMetricaComparableAutomaticamente(comparable)).toBe(true);

    const sinMetodologia: MetricaComparableFichaV2 = {
      ...comparable,
      metodo: null,
      version_metodo: null,
      plataforma: null,
    };
    expect(esMetricaComparableAutomaticamente(sinMetodologia)).toBe(false);
  });

  it("exige identidad metodológica explícita en benchmarks", () => {
    const comparable: BenchmarkFichaV2 = {
      id: "geekbench-6-cpu",
      nombre: "Geekbench 6 CPU",
      prueba: "Geekbench",
      version: "6",
      valor: 7200,
      unidad: "puntos",
      metodo: "single-core",
      plataforma: "Android",
      fuenteId: "fuente-benchmark",
    };

    expect(esBenchmarkComparableAutomaticamente(comparable)).toBe(true);

    const sinMetodologia: BenchmarkFichaV2 = {
      ...comparable,
      metodo: null,
      plataforma: null,
    };
    expect(esBenchmarkComparableAutomaticamente(sinMetodologia)).toBe(false);

    const sinFuente: BenchmarkFichaV2 = {
      ...comparable,
      fuenteId: "",
    };
    expect(esBenchmarkComparableAutomaticamente(sinFuente)).toBe(false);
  });

  it("valida categorías, estados y unidades canónicas", () => {
    expect(esCategoriaFichaTecnica("laptops")).toBe(true);
    expect(esCategoriaFichaTecnica("consolas")).toBe(false);
    expect(esCategoriaFichaTecnica(null)).toBe(false);

    expect(esEstadoVerificacionFichaV2("requiere_revision")).toBe(true);
    expect(esEstadoVerificacionFichaV2("aprobado")).toBe(false);

    expect(esUnidadCanonica("GiB")).toBe(true);
    expect(esUnidadCanonica("GB/s")).toBe(false);
    expect(esUnidadCanonica(null)).toBe(false);

    expect(esSistemaUnidades("decimal")).toBe(true);
    expect(esSistemaUnidades("binario")).toBe(true);
    expect(esSistemaUnidades("internacional")).toBe(true);
    expect(esSistemaUnidades("imperial")).toBe(true);
    expect(esSistemaUnidades("sin_sistema")).toBe(true);
    expect(esSistemaUnidades("galactico")).toBe(false);
    expect(esSistemaUnidades(null)).toBe(false);

    expect(esTipoFuenteFichaV2("fabricante")).toBe(true);
    expect(esTipoFuenteFichaV2("comercio")).toBe(true);
    expect(esTipoFuenteFichaV2("benchmark")).toBe(true);
    expect(esTipoFuenteFichaV2("analisis")).toBe(true);
    expect(esTipoFuenteFichaV2("otro")).toBe(true);
    expect(esTipoFuenteFichaV2("rumor")).toBe(false);
    expect(esTipoFuenteFichaV2(null)).toBe(false);
  });

  it("refina el tipo a MetricaComparableFichaV2 dentro de un bloque if", () => {
    const metrica: MetricaFichaV2 = {
      clave: "ram",
      nombre: "Memoria RAM",
      grupo: "memoria",
      valor: 8,
      unidad: "GB",
      unidadOriginal: "GB",
      sistema_unidades: "decimal",
      comparable: true,
      metodo: "ficha-fabricante",
      version_metodo: "1",
      plataforma: "Android",
    };

    if (esMetricaComparableAutomaticamente(metrica)) {
      expectTypeOf(metrica).toEqualTypeOf<MetricaComparableFichaV2>();
      expect(metrica.metodo).toBe("ficha-fabricante");
      expect(metrica.version_metodo).toBe("1");
      expect(metrica.plataforma).toBe("Android");
      expect(metrica.unidad).toBe("GB");
    } else {
      expect.unreachable();
    }
  });

  it("permite métricas informativas booleanas, de texto y numéricas válidas", () => {
    const metricaBooleana: MetricaInformativaFichaV2 = {
      clave: "resistencia_agua",
      nombre: "Resistencia al agua",
      grupo: "proteccion",
      valor: true,
      comparable: false,
    };

    const metricaTexto: MetricaInformativaFichaV2 = {
      clave: "material",
      nombre: "Material",
      grupo: "diseno",
      valor: "aluminio",
      comparable: false,
    };

    const metricaNumero: MetricaInformativaFichaV2 = {
      clave: "altavoces",
      nombre: "Número de altavoces",
      grupo: "audio",
      valor: 2,
      unidad: null,
      comparable: false,
    };

    expect(metricaBooleana.valor).toBe(true);
    expect(metricaTexto.valor).toBe("aluminio");
    expect(metricaNumero.valor).toBe(2);
    expect(metricaNumero.unidad).toBeNull();
  });
});
