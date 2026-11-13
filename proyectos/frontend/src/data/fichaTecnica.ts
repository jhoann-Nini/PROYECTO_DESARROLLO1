/**
 * Contrato versionado para las fichas técnicas de TecReview.
 * Mantiene separados los datos técnicos, las puntuaciones y las fuentes.
 */

export type EstadoVerificacionFicha =
  | "pendiente"
  | "parcial"
  | "verificado"
  | "requiere_revision";

export type TipoFuenteFicha =
  | "fabricante"
  | "comercio"
  | "benchmark"
  | "analisis"
  | "otro";

export interface VarianteFichaTecnica {
  modelo?: string | null;
  sku?: string | null;
  mercado?: string | null;
  ram?: string | null;
  almacenamiento?: string | null;
  conectividad?: string | null;
  identificador?: string | null;
}

export interface MetricaComparableFicha {
  clave: string;
  nombre: string;
  grupo: string;
  valor: number | string | boolean;
  unidad?: string | null;
  comparable: boolean;
  fuenteId?: string | null;
}

export interface BenchmarkFichaTecnica {
  nombre: string;
  valor: number | string;
  unidad?: string | null;
  prueba?: string | null;
  version?: string | null;
  fecha?: string | null;
  fuenteId?: string | null;
}

export interface FuenteFichaTecnica {
  id?: string;
  tipo: TipoFuenteFicha;
  nombre: string;
  url?: string | null;
  vendedor?: string | null;
  fecha_consulta?: string | null;
  variante?: string | null;
  observaciones?: string | null;
}

export interface DatosFichaTecnica {
  version_esquema: 1;
  variante: VarianteFichaTecnica | null;
  metricasComparables: MetricaComparableFicha[];
  benchmarks: BenchmarkFichaTecnica[];
  fuentes: FuenteFichaTecnica[];
  estado_verificacion: EstadoVerificacionFicha;
}

const ESTADOS_VALIDOS = new Set<EstadoVerificacionFicha>([
  "pendiente",
  "parcial",
  "verificado",
  "requiere_revision",
]);

const TIPOS_FUENTE_VALIDOS = new Set<TipoFuenteFicha>([
  "fabricante",
  "comercio",
  "benchmark",
  "analisis",
  "otro",
]);

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function textoOpcional(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function normalizarVariante(valor: unknown): VarianteFichaTecnica | null {
  if (!esRegistro(valor)) return null;
  const campos = [
    "modelo",
    "sku",
    "mercado",
    "ram",
    "almacenamiento",
    "conectividad",
    "identificador",
  ] as const;
  const variante: VarianteFichaTecnica = {};
  for (const campo of campos) {
    const texto = textoOpcional(valor[campo]);
    if (texto) variante[campo] = texto;
  }
  return Object.keys(variante).length ? variante : null;
}

function normalizarMetricas(valor: unknown): MetricaComparableFicha[] {
  if (!Array.isArray(valor)) return [];
  const resultado: MetricaComparableFicha[] = [];
  for (const item of valor) {
    if (!esRegistro(item)) continue;
    const clave = textoOpcional(item.clave);
    const nombre = textoOpcional(item.nombre);
    const grupo = textoOpcional(item.grupo);
    const dato = item.valor;
    if (!clave || !nombre || !grupo) continue;
    if (
      typeof dato !== "number" &&
      typeof dato !== "string" &&
      typeof dato !== "boolean"
    ) continue;
    if (typeof dato === "number" && !Number.isFinite(dato)) continue;
    resultado.push({
      clave,
      nombre,
      grupo,
      valor: typeof dato === "string" ? dato.trim() : dato,
      unidad: textoOpcional(item.unidad),
      comparable: item.comparable === true,
      fuenteId: textoOpcional(item.fuenteId),
    });
  }
  return resultado;
}

function normalizarBenchmarks(valor: unknown): BenchmarkFichaTecnica[] {
  if (!Array.isArray(valor)) return [];
  const resultado: BenchmarkFichaTecnica[] = [];
  for (const item of valor) {
    if (!esRegistro(item)) continue;
    const nombre = textoOpcional(item.nombre);
    const dato = item.valor;
    if (!nombre) continue;
    if (
      typeof dato !== "number" &&
      typeof dato !== "string"
    ) continue;
    if (typeof dato === "number" && !Number.isFinite(dato)) continue;
    resultado.push({
      nombre,
      valor: typeof dato === "string" ? dato.trim() : dato,
      unidad: textoOpcional(item.unidad),
      prueba: textoOpcional(item.prueba),
      version: textoOpcional(item.version),
      fecha: textoOpcional(item.fecha),
      fuenteId: textoOpcional(item.fuenteId),
    });
  }
  return resultado;
}

function normalizarFuentes(valor: unknown): FuenteFichaTecnica[] {
  if (!Array.isArray(valor)) return [];
  const resultado: FuenteFichaTecnica[] = [];
  for (const item of valor) {
    if (!esRegistro(item)) continue;
    const nombre = textoOpcional(item.nombre);
    const tipo = item.tipo;
    if (
      !nombre ||
      typeof tipo !== "string" ||
      !TIPOS_FUENTE_VALIDOS.has(tipo as TipoFuenteFicha)
    ) continue;
    resultado.push({
      id: textoOpcional(item.id) ?? undefined,
      tipo: tipo as TipoFuenteFicha,
      nombre,
      url: textoOpcional(item.url),
      vendedor: textoOpcional(item.vendedor),
      fecha_consulta: textoOpcional(item.fecha_consulta),
      variante: textoOpcional(item.variante),
      observaciones: textoOpcional(item.observaciones),
    });
  }
  return resultado;
}

/**
 * Lee el contrato nuevo sin fallar ante JSON antiguo, nulo o incompleto.
 * Los campos desconocidos se ignoran y nunca se crean valores técnicos.
 */
export function normalizarDatosFichaTecnica(
  caracteristicas?: Record<string, unknown> | null,
): DatosFichaTecnica {
  const raw = caracteristicas ?? {};
  const estado = raw.estado_verificacion;
  const estadoVerificacion =
    typeof estado === "string" &&
    ESTADOS_VALIDOS.has(estado as EstadoVerificacionFicha)
      ? (estado as EstadoVerificacionFicha)
      : "pendiente";

  return {
    version_esquema: 1,
    variante: normalizarVariante(raw.variante),
    metricasComparables: normalizarMetricas(raw.metricasComparables),
    benchmarks: normalizarBenchmarks(raw.benchmarks),
    fuentes: normalizarFuentes(raw.fuentes),
    estado_verificacion: estadoVerificacion,
  };
}
