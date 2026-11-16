/**
 * Contrato canónico de ficha técnica v2 para TecReview.
 *
 * Este módulo describe la forma de los datos, no cómo se obtienen. La ficha
 * admite información parcial: los datos ausentes se representan con arreglos
 * vacíos o campos opcionales nulos, nunca con valores técnicos inventados.
 *
 * Separación de responsabilidades:
 * - `atributos`: información de presentación.
 * - `metricasComparables`: datos que pueden participar en comparaciones.
 * - `benchmarks`: resultados de pruebas identificables y reproducibles.
 * - `fuentes`: procedencia verificable de los datos.
 */

export const VERSION_ESQUEMA_FICHA_TECNICA_V2 = 2 as const;

export const CATEGORIAS_FICHA_TECNICA = [
  "moviles",
  "tablets",
  "laptops",
  "auriculares",
] as const;

export type CategoriaFichaTecnica =
  (typeof CATEGORIAS_FICHA_TECNICA)[number];

export const ESTADOS_VERIFICACION_FICHA_V2 = [
  "pendiente",
  "parcial",
  "verificado",
  "requiere_revision",
] as const;

export type EstadoVerificacionFichaV2 =
  (typeof ESTADOS_VERIFICACION_FICHA_V2)[number];

export const TIPOS_FUENTE_FICHA_V2 = [
  "fabricante",
  "comercio",
  "benchmark",
  "analisis",
  "otro",
] as const;

export type TipoFuenteFichaV2 = (typeof TIPOS_FUENTE_FICHA_V2)[number];

/**
 * Sistemas de unidades reconocidos. `sin_sistema` agrupa magnitudes
 * adimensionales (puntos, porcentajes, conteos).
 */
export const SISTEMAS_UNIDADES = [
  "decimal",
  "binario",
  "internacional",
  "imperial",
  "sin_sistema",
] as const;

export type SistemaUnidades = (typeof SISTEMAS_UNIDADES)[number];

/**
 * Unidades canónicas que el contrato v2 puede almacenar.
 *
 * La distinción decimal/binario es deliberada: `GB` y `GiB` son unidades
 * distintas y nunca se asumen equivalentes.
 */
export const UNIDADES_CANONICAS = [
  // Almacenamiento decimal (base 1000)
  "B",
  "kB",
  "MB",
  "GB",
  "TB",
  // Almacenamiento binario (base 1024)
  "KiB",
  "MiB",
  "GiB",
  "TiB",
  // Longitud
  "mm",
  "cm",
  "in",
  // Frecuencia
  "Hz",
  "kHz",
  "MHz",
  "GHz",
  // Carga eléctrica
  "mAh",
  "Ah",
  // Energía
  "mWh",
  "Wh",
  "kWh",
  // Masa
  "mg",
  "g",
  "kg",
  // Potencia
  "mW",
  "W",
  // Tiempo
  "ms",
  "s",
  "min",
  "h",
  // Resolución, puntuación y otras magnitudes
  "mpx",
  "puntos",
  "%",
  "nits",
] as const;

export type UnidadCanonica = (typeof UNIDADES_CANONICAS)[number];

export interface VarianteFichaV2 {
  /** Identificador estable dentro de la ficha. */
  id: string;
  modelo?: string | null;
  sku?: string | null;
  mercado?: string | null;
  ram?: string | null;
  almacenamiento?: string | null;
  conectividad?: string | null;
  identificador?: string | null;
}

/**
 * Dato de presentación. Puede llevar una unidad canónica cuando representa
 * una medida numérica; un texto o booleano no puede llevar unidad. No
 * participa automáticamente en comparaciones.
 */
export interface AtributoFichaBaseV2 {
  clave: string;
  nombre: string;
  grupo: string;
  /** Texto tal como lo publicó la fuente, sin normalizar. */
  valorOriginal?: string | null;
  fuenteId?: string | null;
}

export type AtributoFichaV2 =
  | (AtributoFichaBaseV2 & {
      valor: number;
      unidad?: UnidadCanonica | null;
    })
  | (AtributoFichaBaseV2 & {
      valor: string | boolean;
      unidad?: null;
    });

/**
 * Base común de una métrica. `comparable` decide qué rama de la unión se usa.
 */
export interface MetricaFichaBaseV2 {
  clave: string;
  nombre: string;
  grupo: string;
  /** Unidad escrita por la fuente, conservada para auditoría. */
  unidadOriginal?: string | null;
  fuenteId?: string | null;
}

/**
 * Métrica informativa con valor numérico. Puede llevar unidad y sistema.
 */
export interface MetricaInformativaNumericaV2 extends MetricaFichaBaseV2 {
  comparable: false;
  valor: number;
  unidad?: UnidadCanonica | null;
  sistema_unidades?: SistemaUnidades | null;
}

/**
 * Métrica informativa con valor textual o booleano. No puede llevar unidad
 * física ni sistema de unidades.
 */
export interface MetricaInformativaNoNumericaV2 extends MetricaFichaBaseV2 {
  comparable: false;
  valor: string | boolean;
  unidad?: null;
  sistema_unidades?: null;
}

/** Dato informativo que no debe participar en comparaciones automáticas. */
export type MetricaInformativaFichaV2 =
  | MetricaInformativaNumericaV2
  | MetricaInformativaNoNumericaV2;

/**
 * Dato apto para comparación automática. Exige valor numérico, unidad,
 * sistema y metadatos explícitos. `null` significa "desconocido"; una métrica
 * con metodología desconocida no debe compararse automáticamente.
 */
export interface MetricaComparableFichaV2 extends MetricaFichaBaseV2 {
  comparable: true;
  valor: number;
  unidad: UnidadCanonica;
  sistema_unidades: SistemaUnidades;
  metodo: string | null;
  version_metodo: string | null;
  plataforma: string | null;
}

export type MetricaFichaV2 =
  | MetricaInformativaFichaV2
  | MetricaComparableFichaV2;

/**
 * Resultado de una prueba reproducible. `metodo` y `plataforma` son claves
 * obligatorias: si se desconocen, se representan con `null` y el benchmark no
 * se considera comparable automáticamente.
 */
export interface BenchmarkFichaV2 {
  id: string;
  nombre: string;
  prueba: string;
  version: string;
  valor: number;
  unidad: UnidadCanonica;
  metodo: string | null;
  plataforma: string | null;
  fecha?: string | null;
  fuenteId: string;
  notas?: string | null;
}

export interface FuenteFichaV2 {
  /** Identificador referenciado por atributos, métricas y benchmarks. */
  id: string;
  tipo: TipoFuenteFichaV2;
  nombre: string;
  url: string | null;
  fecha_consulta: string | null;
  varianteId?: string | null;
  observaciones?: string | null;
}

/**
 * Ficha técnica v2. Todos los arreglos son obligatorios y pueden estar vacíos:
 * una ficha parcial es válida y no se rellena con datos ficticios.
 */
export interface FichaTecnicaV2 {
  version_esquema: typeof VERSION_ESQUEMA_FICHA_TECNICA_V2;
  categoria: CategoriaFichaTecnica;
  estado_verificacion: EstadoVerificacionFichaV2;
  variantes: VarianteFichaV2[];
  atributos: AtributoFichaV2[];
  metricasComparables: MetricaFichaV2[];
  benchmarks: BenchmarkFichaV2[];
  fuentes: FuenteFichaV2[];
}

function textoConocido(valor: string | null | undefined): boolean {
  return typeof valor === "string" && valor.trim() !== "";
}

/**
 * Indica si una métrica puede compararse automáticamente. Además de la forma
 * del tipo, exige que la identidad metodológica esté explícitamente conocida.
 */
export function esMetricaComparableAutomaticamente(
  metrica: MetricaFichaV2,
): metrica is MetricaComparableFichaV2 {
  if (metrica.comparable !== true) return false;
  if (typeof metrica.valor !== "number" || !Number.isFinite(metrica.valor)) {
    return false;
  }
  if (!metrica.unidad || !esUnidadCanonica(metrica.unidad)) return false;
  if (!metrica.sistema_unidades || !esSistemaUnidades(metrica.sistema_unidades)) {
    return false;
  }
  return (
    textoConocido(metrica.metodo) &&
    textoConocido(metrica.version_metodo) &&
    textoConocido(metrica.plataforma)
  );
}

/**
 * Indica si un benchmark tiene identidad metodológica completa y puede
 * compararse automáticamente. Un `metodo` o una `plataforma` nulos implican
 * que no debe compararse todavía.
 */
export function esBenchmarkComparableAutomaticamente(
  benchmark: BenchmarkFichaV2,
): boolean {
  return (
    textoConocido(benchmark.id) &&
    textoConocido(benchmark.prueba) &&
    textoConocido(benchmark.version) &&
    textoConocido(benchmark.metodo) &&
    textoConocido(benchmark.plataforma) &&
    textoConocido(benchmark.fuenteId) &&
    esUnidadCanonica(benchmark.unidad) &&
    Number.isFinite(benchmark.valor)
  );
}

export function esCategoriaFichaTecnica(
  valor: unknown,
): valor is CategoriaFichaTecnica {
  return (
    typeof valor === "string" &&
    (CATEGORIAS_FICHA_TECNICA as readonly string[]).includes(valor)
  );
}

export function esEstadoVerificacionFichaV2(
  valor: unknown,
): valor is EstadoVerificacionFichaV2 {
  return (
    typeof valor === "string" &&
    (ESTADOS_VERIFICACION_FICHA_V2 as readonly string[]).includes(valor)
  );
}

export function esSistemaUnidades(valor: unknown): valor is SistemaUnidades {
  return (
    typeof valor === "string" &&
    (SISTEMAS_UNIDADES as readonly string[]).includes(valor)
  );
}

export function esTipoFuenteFichaV2(
  valor: unknown,
): valor is TipoFuenteFichaV2 {
  return (
    typeof valor === "string" &&
    (TIPOS_FUENTE_FICHA_V2 as readonly string[]).includes(valor)
  );
}

export function esUnidadCanonica(valor: unknown): valor is UnidadCanonica {
  return (
    typeof valor === "string" &&
    (UNIDADES_CANONICAS as readonly string[]).includes(valor)
  );
}
