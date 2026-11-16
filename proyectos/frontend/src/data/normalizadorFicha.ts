/**
 * Normalizador de fichas técnicas v1 / legacy al contrato canónico v2.
 *
 * Responsabilidad:
 * - Recibir datos técnicos en cualquier formato soportado por TecReview
 *   (Producto de backend, DispositivoKimovil de mocks/rankings, DatosFichaTecnica v1,
 *   o mapas planos de características) y transformarlos de forma determinista
 *   al contrato canónico FichaTecnicaV2.
 *
 * Principios:
 * - Determinista: la misma entrada genera idéntica salida en cada invocación.
 * - Sin valores inventados: datos ausentes se representan con arreglos vacíos o
 *   campos omitidos, nunca con fallbacks sintéticos.
 * - Integridad de unidades: GB y GiB se tratan en sus respectivos sistemas (decimal/binario);
 *   mAh nunca se convierte a Wh sin voltaje explícito.
 * - Unidades no canónicas: se conservan en unidadOriginal sin forzar conversiones inseguras.
 * - Benchmarks legacy: se conservan con metodo: null y plataforma: null para evitar
 *   comparaciones automáticas no controladas.
 */

import type {
  AtributoFichaV2,
  BenchmarkFichaV2,
  CategoriaFichaTecnica,
  EstadoVerificacionFichaV2,
  FichaTecnicaV2,
  FuenteFichaV2,
  MetricaComparableFichaV2,
  MetricaFichaV2,
  MetricaInformativaFichaV2,
  UnidadCanonica,
  VarianteFichaV2,
} from "@/types/fichaTecnica";
import {
  esCategoriaFichaTecnica,
  esEstadoVerificacionFichaV2,
  esSistemaUnidades,
  esTipoFuenteFichaV2,
  esUnidadCanonica,
} from "@/types/fichaTecnica";
import type { DispositivoKimovil, Producto } from "@/types/producto";
import { normalizarUnidad, parsearDatoConUnidad } from "./unidades";
import {
  idGlobalApi,
  idGlobalMock,
  type IdProductoGlobal,
} from "./identificadores";
import { detectarCategoria } from "./specsHelper";
import type { DatosFichaTecnica, MetricaComparableFicha } from "./fichaTecnica";

export {
  esMetricaComparableAutomaticamente,
  esBenchmarkComparableAutomaticamente,
} from "@/types/fichaTecnica";

export interface ContextoNormalizacion {
  idGlobal?: IdProductoGlobal;
  categoriaPorDefecto?: CategoriaFichaTecnica;
  nombreProducto?: string;
  marca?: string;
}

const DICCIONARIO_NOMBRES_GRUPOS: Record<
  string,
  { nombre: string; grupo: string }
> = {
  pantalla: { nombre: "Pantalla", grupo: "pantalla" },
  display: { nombre: "Pantalla", grupo: "pantalla" },
  tamano_pantalla: { nombre: "Diagonal de pantalla", grupo: "pantalla" },
  diagonal: { nombre: "Diagonal de pantalla", grupo: "pantalla" },
  resolucion: { nombre: "Resolución", grupo: "pantalla" },
  tasa_refresco: { nombre: "Tasa de refresco", grupo: "pantalla" },
  procesador: { nombre: "Procesador", grupo: "rendimiento" },
  cpu: { nombre: "Procesador", grupo: "rendimiento" },
  chipset: { nombre: "Chipset", grupo: "rendimiento" },
  gpu: { nombre: "Procesador gráfico (GPU)", grupo: "rendimiento" },
  ram: { nombre: "Memoria RAM", grupo: "memoria" },
  memoria_ram: { nombre: "Memoria RAM", grupo: "memoria" },
  memoria: { nombre: "Memoria RAM", grupo: "memoria" },
  almacenamiento: { nombre: "Almacenamiento", grupo: "almacenamiento" },
  disco: { nombre: "Almacenamiento", grupo: "almacenamiento" },
  storage: { nombre: "Almacenamiento", grupo: "almacenamiento" },
  bateria: { nombre: "Batería", grupo: "bateria" },
  capacidad_bateria: { nombre: "Capacidad de batería", grupo: "bateria" },
  energia_bateria: { nombre: "Energía de batería", grupo: "bateria" },
  autonomia: { nombre: "Autonomía de batería", grupo: "bateria" },
  carga_rapida: { nombre: "Potencia de carga rápida", grupo: "bateria" },
  camara: { nombre: "Cámara", grupo: "camaras" },
  camaras: { nombre: "Cámaras", grupo: "camaras" },
  camara_trasera: { nombre: "Cámara principal", grupo: "camaras" },
  camara_frontal: { nombre: "Cámara frontal", grupo: "camaras" },
  conectividad: { nombre: "Conectividad", grupo: "conectividad" },
  puertos: { nombre: "Puertos e interfaces", grupo: "conectividad" },
  software: { nombre: "Sistema operativo y software", grupo: "software" },
  sistema_operativo: { nombre: "Sistema operativo", grupo: "software" },
  transductores: { nombre: "Transductores acústicos", grupo: "audio" },
  drivers: { nombre: "Drivers acústicos", grupo: "audio" },
  cancelacion_ruido: { nombre: "Cancelación de ruido (ANC)", grupo: "audio" },
  anc: { nombre: "Cancelación activa de ruido", grupo: "audio" },
  microfonos: { nombre: "Micrófonos", grupo: "audio" },
  codecs: { nombre: "Códecs de audio", grupo: "audio" },
  audio: { nombre: "Sonido y audio", grupo: "audio" },
  peso: { nombre: "Peso", grupo: "dimensiones" },
  dimensiones: { nombre: "Dimensiones físicas", grupo: "dimensiones" },
};

function textoLimpio(valor: unknown): string | null {
  if (typeof valor === "string") {
    const s = valor.trim();
    return s.length > 0 ? s : null;
  }
  return null;
}

function normalizarSlugClave(clave: string): string {
  return clave
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolverMetaClave(clave: string): { nombre: string; grupo: string } {
  const normalizada = normalizarSlugClave(clave);
  const encontrada = DICCIONARIO_NOMBRES_GRUPOS[normalizada];
  if (encontrada) return encontrada;

  const legible = clave
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { nombre: legible || "Especificación", grupo: "general" };
}

export function crearFichaVacia(
  categoria: CategoriaFichaTecnica = "moviles"
): FichaTecnicaV2 {
  return {
    version_esquema: 2,
    categoria,
    estado_verificacion: "pendiente",
    variantes: [],
    atributos: [],
    metricasComparables: [],
    benchmarks: [],
    fuentes: [],
  };
}

/**
 * Error lanzado cuando una ficha técnica declara explícitamente `version_esquema: 2`
 * (o una versión de esquema no soportada) pero viola el contrato canónico FichaTecnicaV2.
 * Evita que datos corruptos se enmascaren como fichas incompletas válidas o caigan
 * silenciosamente a mapas genéricos de características.
 */
export class ErrorFichaTecnicaInvalida extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorFichaTecnicaInvalida";
  }
}

function esObjeto(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function esCadenaOpcionalONula(val: unknown): boolean {
  return val === undefined || val === null || typeof val === "string";
}

export function esVarianteFichaV2Valida(v: unknown): v is VarianteFichaV2 {
  if (!esObjeto(v)) return false;
  if (typeof v.id !== "string" || v.id.trim() === "") return false;
  return (
    esCadenaOpcionalONula(v.modelo) &&
    esCadenaOpcionalONula(v.sku) &&
    esCadenaOpcionalONula(v.mercado) &&
    esCadenaOpcionalONula(v.ram) &&
    esCadenaOpcionalONula(v.almacenamiento) &&
    esCadenaOpcionalONula(v.conectividad) &&
    esCadenaOpcionalONula(v.identificador)
  );
}

export function esAtributoFichaV2Valido(a: unknown): a is AtributoFichaV2 {
  if (!esObjeto(a)) return false;
  if (typeof a.clave !== "string") return false;
  const nombreValido = typeof a.nombre === "string" || typeof a.etiqueta === "string";
  const grupoValido = typeof a.grupo === "string" || typeof a.seccion === "string";
  if (!nombreValido || !grupoValido) {
    return false;
  }
  if (!esCadenaOpcionalONula(a.valorOriginal) || !esCadenaOpcionalONula(a.fuenteId)) {
    return false;
  }
  if (typeof a.valor === "number") {
    if (!Number.isFinite(a.valor)) return false;
    return a.unidad === undefined || a.unidad === null || esUnidadCanonica(a.unidad);
  }
  if (typeof a.valor === "string" || typeof a.valor === "boolean") {
    return a.unidad === undefined || a.unidad === null;
  }
  return false;
}

export function esMetricaFichaV2Valida(m: unknown): m is MetricaFichaV2 {
  if (!esObjeto(m)) return false;
  if (typeof m.clave !== "string") return false;
  const nombreValido = typeof m.nombre === "string" || typeof m.etiqueta === "string";
  const grupoValido = typeof m.grupo === "string" || typeof m.seccion === "string";
  if (!nombreValido || !grupoValido) {
    return false;
  }
  if (!esCadenaOpcionalONula(m.unidadOriginal) || !esCadenaOpcionalONula(m.fuenteId)) {
    return false;
  }
  if (m.comparable === true) {
    if (typeof m.valor !== "number" || !Number.isFinite(m.valor)) return false;
    if (!esUnidadCanonica(m.unidad)) return false;
    if (!esSistemaUnidades(m.sistema_unidades)) return false;
    return (
      (m.metodo === null || typeof m.metodo === "string") &&
      (m.version_metodo === null || typeof m.version_metodo === "string") &&
      (m.plataforma === null || typeof m.plataforma === "string")
    );
  }
  if (m.comparable === false) {
    if (typeof m.valor === "number") {
      if (!Number.isFinite(m.valor)) return false;
      const unidadValida = m.unidad === undefined || m.unidad === null || esUnidadCanonica(m.unidad);
      const sistemaValido = m.sistema_unidades === undefined || m.sistema_unidades === null || esSistemaUnidades(m.sistema_unidades);
      return unidadValida && sistemaValido;
    }
    if (typeof m.valor === "string" || typeof m.valor === "boolean") {
      return (
        (m.unidad === undefined || m.unidad === null) &&
        (m.sistema_unidades === undefined || m.sistema_unidades === null)
      );
    }
    return false;
  }
  return false;
}

export function esBenchmarkFichaV2Valido(b: unknown): b is BenchmarkFichaV2 {
  if (!esObjeto(b)) return false;
  if (
    typeof b.id !== "string" ||
    typeof b.nombre !== "string" ||
    typeof b.prueba !== "string" ||
    typeof b.version !== "string" ||
    typeof b.fuenteId !== "string"
  ) {
    return false;
  }
  if (typeof b.valor !== "number" || !Number.isFinite(b.valor)) return false;
  if (!esUnidadCanonica(b.unidad)) return false;
  if (b.metodo !== null && typeof b.metodo !== "string") return false;
  if (b.plataforma !== null && typeof b.plataforma !== "string") return false;
  if (!esCadenaOpcionalONula(b.fecha) || !esCadenaOpcionalONula(b.notas)) return false;
  return true;
}

export function esFuenteFichaV2Valida(f: unknown): f is FuenteFichaV2 {
  if (!esObjeto(f)) return false;
  if (typeof f.id !== "string" || typeof f.nombre !== "string") return false;
  if (!esTipoFuenteFichaV2(f.tipo)) return false;
  if (f.url !== null && typeof f.url !== "string") return false;
  if (f.fecha_consulta !== null && typeof f.fecha_consulta !== "string") return false;
  if (!esCadenaOpcionalONula(f.varianteId) || !esCadenaOpcionalONula(f.observaciones)) return false;
  return true;
}

/**
 * Determina si un objeto tiene la estructura FichaTecnicaV2 válida conforme
 * al contrato canónico estricto, incluyendo la validación profunda de cada
 * colección de elementos.
 */
export function esFichaTecnicaV2Valida(obj: unknown): obj is FichaTecnicaV2 {
  if (!esObjeto(obj)) return false;
  return (
    obj.version_esquema === 2 &&
    esCategoriaFichaTecnica(obj.categoria) &&
    esEstadoVerificacionFichaV2(obj.estado_verificacion) &&
    Array.isArray(obj.variantes) &&
    obj.variantes.every(esVarianteFichaV2Valida) &&
    Array.isArray(obj.atributos) &&
    obj.atributos.every(esAtributoFichaV2Valido) &&
    Array.isArray(obj.metricasComparables) &&
    obj.metricasComparables.every(esMetricaFichaV2Valida) &&
    Array.isArray(obj.benchmarks) &&
    obj.benchmarks.every(esBenchmarkFichaV2Valido) &&
    Array.isArray(obj.fuentes) &&
    obj.fuentes.every(esFuenteFichaV2Valida)
  );
}

/**
 * Normaliza un objeto DatosFichaTecnica v1 a FichaTecnicaV2 canónica.
 */
export function normalizarDesdeLegacyV1(
  datos: DatosFichaTecnica,
  contexto?: ContextoNormalizacion
): FichaTecnicaV2 {
  if (!datos || typeof datos !== "object") {
    return crearFichaVacia(contexto?.categoriaPorDefecto);
  }

  const rawObj = datos as unknown as Record<string, unknown>;

  const categoria = (
    esCategoriaFichaTecnica(rawObj.categoria)
      ? rawObj.categoria
      : contexto?.categoriaPorDefecto || "moviles"
  ) as CategoriaFichaTecnica;

  const estado_verificacion: EstadoVerificacionFichaV2 =
    esEstadoVerificacionFichaV2(datos.estado_verificacion)
      ? datos.estado_verificacion
      : "pendiente";

  const variantes: VarianteFichaV2[] = [];
  if (datos.variante && typeof datos.variante === "object") {
    const v = datos.variante;
    const modelo = textoLimpio(v.modelo);
    const sku = textoLimpio(v.sku);
    const mercado = textoLimpio(v.mercado);
    const ram = textoLimpio(v.ram);
    const almacenamiento = textoLimpio(v.almacenamiento);
    const conectividad = textoLimpio(v.conectividad);
    const identificador = textoLimpio(v.identificador);

    if (
      modelo ||
      sku ||
      mercado ||
      ram ||
      almacenamiento ||
      conectividad ||
      identificador
    ) {
      variantes.push({
        id: identificador || sku || "var-1",
        modelo,
        sku,
        mercado,
        ram,
        almacenamiento,
        conectividad,
        identificador,
      });
    }
  }

  const fuentes: FuenteFichaV2[] = [];
  if (Array.isArray(datos.fuentes)) {
    for (let i = 0; i < datos.fuentes.length; i++) {
      const f = datos.fuentes[i];
      if (!f || typeof f !== "object") continue;
      const nombre = textoLimpio(f.nombre);
      if (!nombre) continue;
      fuentes.push({
        id: textoLimpio(f.id) || `fuente-${i + 1}`,
        tipo: f.tipo || "otro",
        nombre,
        url: textoLimpio(f.url),
        fecha_consulta: textoLimpio(f.fecha_consulta),
        observaciones:
          textoLimpio(f.observaciones) ||
          textoLimpio((f as unknown as Record<string, unknown>).vendedor),
      });
    }
  }

  const atributos: AtributoFichaV2[] = [];
  const metricasComparables: MetricaFichaV2[] = [];

  // Soporte para secciones v0 / componentes legacy
  if (Array.isArray(rawObj.secciones)) {
    for (const sec of rawObj.secciones) {
      if (!sec || typeof sec !== "object") continue;
      const s = sec as Record<string, unknown>;
      const grupo = normalizarSlugClave(
        String(s.nombre || s.titulo || "general")
      );
      if (Array.isArray(s.items)) {
        for (const it of s.items) {
          if (!it || typeof it !== "object") continue;
          const item = it as Record<string, unknown>;
          const clave = normalizarSlugClave(
            String(item.clave || item.etiqueta || "")
          );
          if (!clave) continue;
          const valorRaw = item.valor;
          const unidad = textoLimpio(item.unidad);
          const meta = resolverMetaClave(clave);

          if (typeof valorRaw === "number" && Number.isFinite(valorRaw)) {
            const normUnidad = unidad ? normalizarUnidad(unidad) : null;
            atributos.push({
              clave,
              nombre: textoLimpio(item.etiqueta) || meta.nombre,
              grupo: grupo || meta.grupo,
              valor: valorRaw,
              unidad:
                normUnidad?.estado === "reconocida"
                  ? normUnidad.definicion.unidad
                  : null,
              valorOriginal: unidad
                ? `${valorRaw} ${unidad}`
                : String(valorRaw),
            });
          } else if (typeof valorRaw === "string" && valorRaw.trim()) {
            atributos.push({
              clave,
              nombre: textoLimpio(item.etiqueta) || meta.nombre,
              grupo: grupo || meta.grupo,
              valor: valorRaw.trim(),
              unidad: null,
              valorOriginal: valorRaw.trim(),
            });
          }
        }
      }
    }
  }

  const metricasArray = Array.isArray(datos.metricasComparables)
    ? datos.metricasComparables
    : Array.isArray(rawObj.metricas)
      ? (rawObj.metricas as unknown as MetricaComparableFicha[])
      : [];

  for (const m of metricasArray) {
    if (!m || typeof m !== "object") continue;
    const clave = normalizarSlugClave(m.clave || "");
    if (!clave) continue;
    const meta = resolverMetaClave(m.clave);
    const nombre = textoLimpio(m.nombre) || meta.nombre;
    const grupo = textoLimpio(m.grupo) || meta.grupo;
    const fuenteId = textoLimpio(m.fuenteId);

    const esComparable =
      m.comparable === true ||
      Boolean((m as unknown as Record<string, unknown>).mejorDireccion);

    if (typeof m.valor === "number" && Number.isFinite(m.valor)) {
      const unidadTexto = textoLimpio(m.unidad);
      const normUnidad = unidadTexto ? normalizarUnidad(unidadTexto) : null;

      if (normUnidad && normUnidad.estado === "reconocida") {
        const unidadCanonica = normUnidad.definicion.unidad;
        const sistema = normUnidad.definicion.sistema;

        atributos.push({
          clave,
          nombre,
          grupo,
          valor: m.valor,
          unidad: unidadCanonica,
          valorOriginal: unidadTexto
            ? `${m.valor} ${unidadTexto}`
            : String(m.valor),
          fuenteId,
        });

        if (esComparable) {
          // Metodología en legacy v1 no está registrada; metodo: null
          metricasComparables.push({
            clave,
            nombre,
            grupo,
            valor: m.valor,
            unidad: unidadCanonica,
            unidadOriginal: unidadTexto,
            sistema_unidades: sistema,
            comparable: true,
            metodo: null,
            version_metodo: null,
            plataforma: null,
            fuenteId,
          } satisfies MetricaComparableFichaV2);
        } else {
          metricasComparables.push({
            clave,
            nombre,
            grupo,
            valor: m.valor,
            unidad: unidadCanonica,
            unidadOriginal: unidadTexto,
            sistema_unidades: sistema,
            comparable: false,
            fuenteId,
          } satisfies MetricaInformativaFichaV2);
        }
      } else {
        // Unidad desconocida, ambigua o no canónica: se preserva como informativa
        atributos.push({
          clave,
          nombre,
          grupo,
          valor: m.valor,
          unidad: null,
          valorOriginal: unidadTexto
            ? `${m.valor} ${unidadTexto}`
            : String(m.valor),
          fuenteId,
        });

        metricasComparables.push({
          clave,
          nombre,
          grupo,
          valor: m.valor,
          unidad: null,
          unidadOriginal: unidadTexto,
          sistema_unidades: null,
          comparable: false,
          fuenteId,
        } satisfies MetricaInformativaFichaV2);
      }
    } else if (typeof m.valor === "boolean") {
      atributos.push({
        clave,
        nombre,
        grupo,
        valor: m.valor,
        unidad: null,
        valorOriginal: String(m.valor),
        fuenteId,
      });

      metricasComparables.push({
        clave,
        nombre,
        grupo,
        valor: m.valor,
        unidad: null,
        unidadOriginal: textoLimpio(m.unidad),
        sistema_unidades: null,
        comparable: false,
        fuenteId,
      } satisfies MetricaInformativaFichaV2);
    } else if (typeof m.valor === "string") {
      const textoVal = m.valor.trim();
      if (textoVal.length > 0) {
        atributos.push({
          clave,
          nombre,
          grupo,
          valor: textoVal,
          unidad: null,
          valorOriginal: textoVal,
          fuenteId,
        });

        metricasComparables.push({
          clave,
          nombre,
          grupo,
          valor: textoVal,
          unidad: null,
          unidadOriginal: textoLimpio(m.unidad),
          sistema_unidades: null,
          comparable: false,
          fuenteId,
        } satisfies MetricaInformativaFichaV2);
      }
    }
  }

  const benchmarks: BenchmarkFichaV2[] = [];
  if (Array.isArray(datos.benchmarks)) {
    for (let i = 0; i < datos.benchmarks.length; i++) {
      const b = datos.benchmarks[i];
      if (!b || typeof b !== "object") continue;
      const nombre = textoLimpio(b.nombre);
      if (!nombre) continue;

      let valorNum: number | null = null;
      if (typeof b.valor === "number" && Number.isFinite(b.valor)) {
        valorNum = b.valor;
      } else if (typeof b.valor === "string") {
        const limpio = b.valor.replace(/,/g, "").trim();
        const parseado = Number.parseFloat(limpio);
        if (Number.isFinite(parseado)) valorNum = parseado;
      }
      if (valorNum === null) continue;

      const normUnidad = normalizarUnidad(b.unidad || "puntos");
      const unidad: UnidadCanonica =
        normUnidad.estado === "reconocida"
          ? normUnidad.definicion.unidad
          : "puntos";

      benchmarks.push({
        id: `bm-${i + 1}-${normalizarSlugClave(nombre)}`,
        nombre,
        prueba: textoLimpio(b.prueba) || nombre,
        version: textoLimpio(b.version) || "1",
        valor: valorNum,
        unidad,
        metodo: null,
        plataforma: null,
        fecha: textoLimpio(b.fecha),
        fuenteId: textoLimpio(b.fuenteId) || fuentes[0]?.id || "fuente-legacy",
      });
    }
  }

  return {
    version_esquema: 2,
    categoria,
    estado_verificacion,
    variantes,
    atributos,
    metricasComparables,
    benchmarks,
    fuentes,
  };
}

/**
 * Normaliza un mapa plano de especificaciones y características a FichaTecnicaV2.
 */
function extraerMetricasDeTexto(
  claveBase: string,
  texto: string
): MetricaFichaV2[] {
  const resultado: MetricaFichaV2[] = [];

  // 1. Memoria RAM (e.g. "12GB RAM" o "16 GiB RAM")
  const coincidenciaRam = texto.match(
    /\b(\d+(?:[.,]\d+)?)\s*(GB|GiB|MB|MiB)\s*(?:RAM|Memoria)?\b/i
  );
  if (
    coincidenciaRam &&
    (/\bRAM\b/i.test(texto) ||
      claveBase.includes("ram") ||
      claveBase.includes("memoria"))
  ) {
    const parseado = parsearDatoConUnidad(
      `${coincidenciaRam[1]} ${coincidenciaRam[2]}`
    );
    if (parseado.ok && esUnidadCanonica(parseado.dato.unidad)) {
      resultado.push({
        clave: "ram",
        nombre: "Memoria RAM",
        grupo: "memoria",
        valor: parseado.dato.valor,
        unidad: parseado.dato.unidad,
        unidadOriginal: coincidenciaRam[2],
        sistema_unidades: parseado.dato.sistema,
        comparable: true,
        metodo: null,
        version_metodo: null,
        plataforma: null,
      });
    }
  }

  // 2. Almacenamiento (e.g. "256GB Almacenamiento" o "512 GB SSD")
  const coincidenciaAlm = texto.match(
    /\b(\d+(?:[.,]\d+)?)\s*(GB|GiB|TB|TiB)\s*(?:Almacenamiento|SSD|UFS|ROM|NVMe|Disco)?\b/i
  );
  if (
    coincidenciaAlm &&
    (claveBase.includes("almacenamiento") ||
      claveBase.includes("storage") ||
      claveBase.includes("disco") ||
      /almacenamiento|ssd|ufs|rom/i.test(texto))
  ) {
    const parseado = parsearDatoConUnidad(
      `${coincidenciaAlm[1]} ${coincidenciaAlm[2]}`
    );
    if (parseado.ok && esUnidadCanonica(parseado.dato.unidad)) {
      resultado.push({
        clave: "almacenamiento",
        nombre: "Almacenamiento",
        grupo: "almacenamiento",
        valor: parseado.dato.valor,
        unidad: parseado.dato.unidad,
        unidadOriginal: coincidenciaAlm[2],
        sistema_unidades: parseado.dato.sistema,
        comparable: true,
        metodo: null,
        version_metodo: null,
        plataforma: null,
      });
    }
  }

  // 3. Batería en mAh (carga eléctrica, e.g. "5000 mAh")
  const coincidenciaMah = texto.match(/\b(\d{3,6})\s*mAh\b/i);
  if (coincidenciaMah) {
    const parseado = parsearDatoConUnidad(`${coincidenciaMah[1]} mAh`);
    if (parseado.ok && esUnidadCanonica(parseado.dato.unidad)) {
      resultado.push({
        clave: "capacidad_bateria",
        nombre: "Capacidad de batería",
        grupo: "bateria",
        valor: parseado.dato.valor,
        unidad: "mAh",
        unidadOriginal: "mAh",
        sistema_unidades: "internacional",
        comparable: true,
        metodo: null,
        version_metodo: null,
        plataforma: null,
      });
    }
  }

  // 4. Batería en Wh (energía, e.g. "57Wh")
  const coincidenciaWh = texto.match(/\b(\d+(?:[.,]\d+)?)\s*Wh\b/i);
  if (coincidenciaWh) {
    const parseado = parsearDatoConUnidad(`${coincidenciaWh[1]} Wh`);
    if (parseado.ok && esUnidadCanonica(parseado.dato.unidad)) {
      resultado.push({
        clave: "energia_bateria",
        nombre: "Energía de batería",
        grupo: "bateria",
        valor: parseado.dato.valor,
        unidad: "Wh",
        unidadOriginal: "Wh",
        sistema_unidades: "internacional",
        comparable: true,
        metodo: null,
        version_metodo: null,
        plataforma: null,
      });
    }
  }

  // 5. Pantalla (diagonal en pulgadas, e.g. "6.67''" o "6.8 in")
  const coincidenciaPulgadas = texto.match(
    /\b(\d+(?:[.,]\d+)?)\s*(?:''|"|in|pulgadas?)\b/i
  );
  if (
    coincidenciaPulgadas &&
    (claveBase.includes("pantalla") ||
      claveBase.includes("display") ||
      /pantalla|amoled|oled|ips|lcd/i.test(texto))
  ) {
    const parseado = parsearDatoConUnidad(`${coincidenciaPulgadas[1]} in`);
    if (parseado.ok && esUnidadCanonica(parseado.dato.unidad)) {
      resultado.push({
        clave: "tamano_pantalla",
        nombre: "Tamaño de pantalla",
        grupo: "pantalla",
        valor: parseado.dato.valor,
        unidad: "in",
        unidadOriginal: "in",
        sistema_unidades: "imperial",
        comparable: true,
        metodo: null,
        version_metodo: null,
        plataforma: null,
      });
    }
  }

  // 6. Tasa de refresco (e.g. "120Hz" o "144 Hz")
  const coincidenciaHz = texto.match(/\b(\d{2,3})\s*Hz\b/i);
  if (
    coincidenciaHz &&
    (claveBase.includes("pantalla") ||
      claveBase.includes("refresco") ||
      /refresco|amoled|ips|hz/i.test(texto))
  ) {
    const parseado = parsearDatoConUnidad(`${coincidenciaHz[1]} Hz`);
    if (parseado.ok && esUnidadCanonica(parseado.dato.unidad)) {
      resultado.push({
        clave: "tasa_refresco",
        nombre: "Tasa de refresco",
        grupo: "pantalla",
        valor: parseado.dato.valor,
        unidad: "Hz",
        unidadOriginal: "Hz",
        sistema_unidades: "internacional",
        comparable: true,
        metodo: null,
        version_metodo: null,
        plataforma: null,
      });
    }
  }

  // 7. Cámara (resolución máxima en MP/mpx, e.g. "200MP")
  const coincidenciaMp = texto.match(/\b(\d{1,3})\s*(?:MP|mpx)\b/i);
  if (
    coincidenciaMp &&
    (claveBase.includes("camara") || /camara|cámara|sensor/i.test(texto))
  ) {
    const parseado = parsearDatoConUnidad(`${coincidenciaMp[1]} mpx`);
    if (parseado.ok && esUnidadCanonica(parseado.dato.unidad)) {
      resultado.push({
        clave: "resolucion_camara_principal",
        nombre: "Resolución cámara principal",
        grupo: "camaras",
        valor: parseado.dato.valor,
        unidad: "mpx",
        unidadOriginal: "mpx",
        sistema_unidades: "sin_sistema",
        comparable: true,
        metodo: null,
        version_metodo: null,
        plataforma: null,
      });
    }
  }

  return resultado;
}

/**
 * Normaliza un mapa de características libre o plano (como el campo JSON 'caracteristicas'
 * de la entidad Producto de la base de datos) a FichaTecnicaV2.
 */
export function normalizarDesdeMapaCaracteristicas(
  caracteristicas: Record<string, unknown>,
  contexto?: ContextoNormalizacion
): FichaTecnicaV2 {
  if (!caracteristicas || typeof caracteristicas !== "object") {
    return crearFichaVacia(contexto?.categoriaPorDefecto);
  }

  const categoria = (contexto?.categoriaPorDefecto ||
    "moviles") as CategoriaFichaTecnica;

  const estado_verificacion: EstadoVerificacionFichaV2 =
    esEstadoVerificacionFichaV2(caracteristicas.estado_verificacion)
      ? (caracteristicas.estado_verificacion as EstadoVerificacionFichaV2)
      : "pendiente";

  const atributos: AtributoFichaV2[] = [];
  const metricasComparables: MetricaFichaV2[] = [];
  const clavesVistas = new Set<string>();

  for (const [claveCruda, valorRaw] of Object.entries(caracteristicas)) {
    if (valorRaw === null || valorRaw === undefined) continue;
    const clave = normalizarSlugClave(claveCruda);
    if (
      !clave ||
      clave === "estado_verificacion" ||
      clave === "version_esquema"
    )
      continue;
    const meta = resolverMetaClave(claveCruda);

    if (typeof valorRaw === "boolean") {
      atributos.push({
        clave,
        nombre: meta.nombre,
        grupo: meta.grupo,
        valor: valorRaw,
        unidad: null,
        valorOriginal: String(valorRaw),
      });

      metricasComparables.push({
        clave,
        nombre: meta.nombre,
        grupo: meta.grupo,
        valor: valorRaw,
        unidad: null,
        unidadOriginal: null,
        sistema_unidades: null,
        comparable: false,
      } satisfies MetricaInformativaFichaV2);
    } else if (typeof valorRaw === "number" && Number.isFinite(valorRaw)) {
      atributos.push({
        clave,
        nombre: meta.nombre,
        grupo: meta.grupo,
        valor: valorRaw,
        unidad: null,
        valorOriginal: String(valorRaw),
      });

      metricasComparables.push({
        clave,
        nombre: meta.nombre,
        grupo: meta.grupo,
        valor: valorRaw,
        unidad: null,
        unidadOriginal: null,
        sistema_unidades: null,
        comparable: false,
      } satisfies MetricaInformativaFichaV2);
    } else if (typeof valorRaw === "string") {
      const texto = valorRaw.trim();
      if (!texto) continue;

      atributos.push({
        clave,
        nombre: meta.nombre,
        grupo: meta.grupo,
        valor: texto,
        unidad: null,
        valorOriginal: texto,
      });

      // Extraer métricas de hardware cuantitativas
      const extraidas = extraerMetricasDeTexto(clave, texto);
      for (const m of extraidas) {
        if (!clavesVistas.has(m.clave)) {
          clavesVistas.add(m.clave);
          metricasComparables.push(m);
        }
      }
    }
  }

  // Conversión de mAh a Wh únicamente si existe voltaje explícito y no se disponía ya de Wh
  const metricaMah = metricasComparables.find(
    (m) => m.clave === "capacidad_bateria" && m.unidad === "mAh"
  );
  if (metricaMah && typeof metricaMah.valor === "number") {
    let voltaje: number | null = null;
    for (const [k, v] of Object.entries(caracteristicas)) {
      if (/voltaje|tension/i.test(k)) {
        if (typeof v === "string") {
          const m = v.match(/(\d+(?:[.,]\d+)?)\s*V\b/i);
          if (m) {
            const num = Number.parseFloat(m[1].replace(",", "."));
            if (Number.isFinite(num) && num > 0) voltaje = num;
          }
        } else if (typeof v === "number" && Number.isFinite(v) && v > 0) {
          voltaje = v;
        }
      }
    }

    if (
      voltaje !== null &&
      !metricasComparables.some((m) => m.clave === "energia_bateria")
    ) {
      const wh = Number(((metricaMah.valor * voltaje) / 1000).toFixed(2));
      metricasComparables.push({
        clave: "energia_bateria",
        nombre: "Energía de batería (calculada)",
        grupo: "bateria",
        valor: wh,
        unidad: "Wh",
        unidadOriginal: "Wh",
        sistema_unidades: "internacional",
        comparable: true,
        metodo: null,
        version_metodo: null,
        plataforma: null,
      });
    }
  }

  return {
    version_esquema: 2,
    categoria,
    estado_verificacion,
    variantes: [],
    atributos,
    metricasComparables,
    benchmarks: [],
    fuentes: [],
  };
}

/**
 * Normaliza una entidad Producto proveniente del backend o catálogo API.
 */
export function normalizarDesdeProducto(
  producto: Producto,
  contexto?: ContextoNormalizacion
): FichaTecnicaV2 {
  if (!producto || typeof producto !== "object") {
    return crearFichaVacia(contexto?.categoriaPorDefecto);
  }

  const categoria = detectarCategoria(producto) as CategoriaFichaTecnica;
  const ctx: ContextoNormalizacion = {
    ...contexto,
    idGlobal: contexto?.idGlobal ?? (idGlobalApi(producto.idProducto) ?? undefined),
    categoriaPorDefecto: categoria,
    nombreProducto: producto.nombre,
    marca: producto.nombreMarca ?? undefined,
  };

  const rawCaract = producto.caracteristicas;
  if (rawCaract && typeof rawCaract === "object" && !Array.isArray(rawCaract)) {
    const rawObj = rawCaract as Record<string, unknown>;
    if ("version_esquema" in rawObj && rawObj.version_esquema !== undefined) {
      if (rawObj.version_esquema === 2) {
        if (esFichaTecnicaV2Valida(rawObj)) {
          return { ...rawObj, categoria };
        }
        throw new ErrorFichaTecnicaInvalida(
          "Las características del producto declaran version_esquema: 2 pero no cumplen con el contrato canónico FichaTecnicaV2."
        );
      }
      if (rawObj.version_esquema === 1) {
        return normalizarDesdeLegacyV1(
          rawObj as unknown as DatosFichaTecnica,
          ctx
        );
      }
      throw new ErrorFichaTecnicaInvalida(
        `Versión de esquema no soportada en características del producto: ${String(rawObj.version_esquema)}`
      );
    }
    return normalizarDesdeMapaCaracteristicas(
      rawObj,
      ctx
    );
  }

  return crearFichaVacia(categoria);
}

/**
 * Normaliza un DispositivoKimovil proveniente de rankings o colecciones mock.
 */
export function normalizarDesdeKimovil(
  dispositivo: DispositivoKimovil,
  contexto?: ContextoNormalizacion
): FichaTecnicaV2 {
  if (!dispositivo || typeof dispositivo !== "object") {
    return crearFichaVacia(contexto?.categoriaPorDefecto);
  }

  const categoria = detectarCategoria(dispositivo) as CategoriaFichaTecnica;
  const idClave = String(dispositivo.id);
  const idGlobal = contexto?.idGlobal ?? (idGlobalMock(idClave) ?? undefined);
  const claveFuente = idGlobal ? idGlobal.replace(/^mock:/, "") : idClave;

  const atributos: AtributoFichaV2[] = [];
  const metricasComparables: MetricaFichaV2[] = [];
  const clavesMetricasVistas = new Set<string>();

  const fuenteMock: FuenteFichaV2 = {
    id: `fuente-mock-${claveFuente}`,
    tipo: "otro",
    nombre: "Catálogo Kimovil (Mock)",
    url: null,
    fecha_consulta: null,
    observaciones: dispositivo.tipo
      ? `Registro mock de tipo ${dispositivo.tipo}`
      : null,
  };

  // 1. Atributo resumen de especificaciones
  const resumenSpecs = textoLimpio(dispositivo.especificaciones);
  if (resumenSpecs) {
    atributos.push({
      clave: "resumen_especificaciones",
      nombre: "Resumen técnico",
      grupo: "general",
      valor: resumenSpecs,
      unidad: null,
      valorOriginal: resumenSpecs,
      fuenteId: fuenteMock.id,
    });

    const extraidas = extraerMetricasDeTexto("especificaciones", resumenSpecs);
    for (const m of extraidas) {
      if (!clavesMetricasVistas.has(m.clave)) {
        clavesMetricasVistas.add(m.clave);
        metricasComparables.push({ ...m, fuenteId: fuenteMock.id });
      }
    }
  }

  // 2. Chip / procesador si viene explícito
  const chip = textoLimpio(dispositivo.chipInfo);
  if (chip) {
    atributos.push({
      clave: "procesador",
      nombre: "Procesador",
      grupo: "rendimiento",
      valor: chip,
      unidad: null,
      valorOriginal: chip,
      fuenteId: fuenteMock.id,
    });
  }

  // 3. Secciones detalladas si existen
  const detalle = dispositivo.detalleSpecs;
  if (detalle && Array.isArray(detalle.secciones)) {
    for (const sec of detalle.secciones) {
      if (!sec || typeof sec !== "object") continue;
      const titulo = textoLimpio(sec.titulo);
      const desc = textoLimpio(sec.descripcion);
      if (!titulo || !desc) continue;

      const clave = normalizarSlugClave(titulo);
      const meta = resolverMetaClave(titulo);

      atributos.push({
        clave: clave || "seccion",
        nombre: titulo,
        grupo: meta.grupo,
        valor: desc,
        unidad: null,
        valorOriginal: desc,
        fuenteId: fuenteMock.id,
      });

      const extraidas = extraerMetricasDeTexto(clave, desc);
      for (const m of extraidas) {
        if (!clavesMetricasVistas.has(m.clave)) {
          clavesMetricasVistas.add(m.clave);
          metricasComparables.push({ ...m, fuenteId: fuenteMock.id });
        }
      }
    }
  }

  // 4. Benchmarks declarados en detalleSpecs
  const benchmarks: BenchmarkFichaV2[] = [];
  if (detalle && detalle.benchmarkEtiqueta && detalle.benchmarkValor) {
    const etiqueta = textoLimpio(detalle.benchmarkEtiqueta);
    const valorTexto = textoLimpio(detalle.benchmarkValor);

    if (etiqueta && valorTexto) {
      const limpioNum = valorTexto.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
      if (limpioNum) {
        const valorNum = Number.parseFloat(limpioNum[0]);
        if (Number.isFinite(valorNum)) {
          benchmarks.push({
            id: `bm-${idClave}-1`,
            nombre: etiqueta,
            prueba: etiqueta.replace(/\bv\d+\b/i, "").trim() || etiqueta,
            version: etiqueta.match(/\bv\d+\b/i)?.[0] || "desconocida",
            valor: valorNum,
            unidad: "puntos",
            metodo: null, // Sin protocolo controlado en mock -> comparable automático: false
            plataforma: null,
            fuenteId: fuenteMock.id,
          });
        }
      }
    }
  }

  return {
    version_esquema: 2,
    categoria,
    estado_verificacion: "pendiente",
    variantes: [],
    atributos,
    metricasComparables,
    benchmarks,
    fuentes: [fuenteMock],
  };
}

/**
 * Función polimórfica principal de normalización.
 * Recibe cualquier entrada desconocida y devuelve de forma determinista
 * una FichaTecnicaV2 válida.
 */
export function normalizarFichaTecnicaV2(
  origen: unknown,
  contexto?: ContextoNormalizacion
): FichaTecnicaV2 {
  if (!origen || typeof origen !== "object" || Array.isArray(origen)) {
    return crearFichaVacia(contexto?.categoriaPorDefecto);
  }

  const obj = origen as Record<string, unknown>;

  // Caso 1: Declara version_esquema explícita
  if ("version_esquema" in obj && obj.version_esquema !== undefined) {
    if (obj.version_esquema === 2) {
      if (esFichaTecnicaV2Valida(obj)) {
        return obj;
      }
      throw new ErrorFichaTecnicaInvalida(
        "El objeto declara version_esquema: 2 pero no cumple con el contrato canónico FichaTecnicaV2."
      );
    }
    if (obj.version_esquema === 1) {
      return normalizarDesdeLegacyV1(obj as unknown as DatosFichaTecnica, contexto);
    }
    throw new ErrorFichaTecnicaInvalida(
      `Versión de esquema no soportada: ${String(obj.version_esquema)}`
    );
  }

  // Caso 2: Es un contenedor con propiedad caracteristicas estructuradas
  if (
    "caracteristicas" in obj &&
    typeof obj.caracteristicas === "object" &&
    obj.caracteristicas !== null &&
    !Array.isArray(obj.caracteristicas)
  ) {
    const rawCaract = obj.caracteristicas as Record<string, unknown>;
    if ("version_esquema" in rawCaract && rawCaract.version_esquema !== undefined) {
      if (rawCaract.version_esquema === 2) {
        if (esFichaTecnicaV2Valida(rawCaract)) {
          return rawCaract;
        }
        throw new ErrorFichaTecnicaInvalida(
          "Las características del contenedor declaran version_esquema: 2 pero no cumplen con el contrato canónico FichaTecnicaV2."
        );
      }
      if (rawCaract.version_esquema === 1) {
        return normalizarDesdeLegacyV1(rawCaract as unknown as DatosFichaTecnica, contexto);
      }
      throw new ErrorFichaTecnicaInvalida(
        `Versión de esquema no soportada en características: ${String(rawCaract.version_esquema)}`
      );
    }

    // Si es un Producto de backend con caracteristicas de mapa genérico
    if ("idProducto" in obj && typeof obj.idProducto === "number") {
      return normalizarDesdeProducto(obj as unknown as Producto, contexto);
    }

    return normalizarDesdeMapaCaracteristicas(rawCaract, contexto);
  }

  // Caso 3: Es Producto de backend sin caracteristicas estructuradas
  if ("idProducto" in obj && typeof obj.idProducto === "number") {
    return normalizarDesdeProducto(obj as unknown as Producto, contexto);
  }

  // Caso 4: Es DatosFichaTecnica v1 sin version_esquema explícito (por heurística de secciones o metricasComparables)
  if ("metricasComparables" in obj || "secciones" in obj) {
    return normalizarDesdeLegacyV1(obj as unknown as DatosFichaTecnica, contexto);
  }

  // Caso 5: Es DispositivoKimovil
  if (
    "ranking" in obj ||
    "detalleSpecs" in obj ||
    ("tipo" in obj && typeof obj.tipo === "string")
  ) {
    return normalizarDesdeKimovil(
      obj as unknown as DispositivoKimovil,
      contexto
    );
  }

  // Caso 6: Mapa plano genérico
  return normalizarDesdeMapaCaracteristicas(obj, contexto);
}
