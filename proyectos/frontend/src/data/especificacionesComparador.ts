import type { Producto } from "@/types/producto";
import { obtenerSlugDeCategoria, type CategoriaSlug } from "@/lib/categorias";
import { normalizarDatosFichaTecnica } from "./fichaTecnica";

export interface EspecificacionComparador {
  clave: string;
  etiqueta: string;
  valor: string;
}

interface CampoTecnico {
  clave: string;
  etiqueta: string;
  aliases?: readonly string[];
  categorias?: readonly CategoriaSlug[];
}

const CON_PANTALLA: readonly CategoriaSlug[] = ["celulares", "tablets", "portatiles"];
const MOVILES: readonly CategoriaSlug[] = ["celulares", "tablets"];
const AUDIO: readonly CategoriaSlug[] = ["auriculares"];
const PORTATILES: readonly CategoriaSlug[] = ["portatiles"];

// Orden y equivalencias de campos que ya admite el catálogo. Las etiquetas
// describen campos, nunca aportan valores ni unidades por defecto.
const CAMPOS: readonly CampoTecnico[] = [
  { clave: "pantalla", etiqueta: "Pantalla", aliases: ["display", "pantalla_panel", "pantalla_rendimiento_visual", "pantalla_experiencia_visual"], categorias: CON_PANTALLA },
  { clave: "procesador", etiqueta: "Procesador", aliases: ["cpu", "chipset", "chipset_arquitectura", "procesador_cpu", "procesador_chipset", "procesador_rendimiento"], categorias: CON_PANTALLA },
  { clave: "grafica", etiqueta: "Tarjeta gráfica (GPU)", aliases: ["gpu", "tarjeta_grafica_gpu", "graficos_dedicados_gpu"], categorias: PORTATILES },
  { clave: "ram", etiqueta: "Memoria RAM", aliases: ["memoria", "memoria_ram"], categorias: CON_PANTALLA },
  { clave: "almacenamiento", etiqueta: "Almacenamiento", aliases: ["disco", "storage", "almacenamiento_nvme", "almacenamiento_nvme_flash", "unidad_de_almacenamiento"], categorias: CON_PANTALLA },
  { clave: "ram_almacenamiento", etiqueta: "Memoria RAM y almacenamiento", aliases: ["memoria_y_almacenamiento", "memoria_ram_y_almacenamiento", "memoria_ram_almacenamiento"], categorias: CON_PANTALLA },
  { clave: "camaras", etiqueta: "Cámaras", aliases: ["camara", "sistema_de_camaras", "camaras_trasera_frontal", "camaras_multimedia"], categorias: MOVILES },
  { clave: "camara_trasera", etiqueta: "Cámara trasera", aliases: ["camara_principal_trasera"], categorias: MOVILES },
  { clave: "camara_frontal", etiqueta: "Cámara frontal", aliases: ["camara_frontal_selfie"], categorias: MOVILES },
  { clave: "webcam", etiqueta: "Webcam", aliases: ["webcam_multimedia"], categorias: PORTATILES },
  { clave: "transductores", etiqueta: "Transductores / drivers", aliases: ["drivers", "transductores_drivers", "acustica_transductores"], categorias: AUDIO },
  { clave: "cancelacion_ruido", etiqueta: "Cancelación de ruido (ANC)", aliases: ["anc", "cancelacion_de_ruido_anc", "cancelacion_ruido_anc", "cancelacion_activa_de_ruido"], categorias: AUDIO },
  { clave: "microfonos", etiqueta: "Micrófonos / llamadas", aliases: ["microfonos_llamadas"], categorias: AUDIO },
  { clave: "bateria", etiqueta: "Batería", aliases: ["bateria_carga", "bateria_y_carga", "bateria_autonomia", "bateria_y_autonomia", "autonomia_bateria", "bateria_y_carga_rapida"] },
  { clave: "autonomia", etiqueta: "Autonomía", aliases: ["autonomia_de_bateria"] },
  { clave: "codecs", etiqueta: "Códecs / conectividad", aliases: ["codecs_bluetooth", "conectividad_codecs", "codecs_conectividad"], categorias: AUDIO },
  { clave: "bluetooth", etiqueta: "Bluetooth", aliases: ["conectividad_bluetooth"] },
  { clave: "conectividad", etiqueta: "Conectividad", aliases: ["conectividad_redes", "conectividad_sistema"] },
  { clave: "puertos", etiqueta: "Puertos", aliases: ["puertos_conectividad"] },
  { clave: "software", etiqueta: "Software / ecualización", aliases: ["software_ecualizacion"], categorias: AUDIO },
  { clave: "productividad", etiqueta: "Productividad / stylus", aliases: ["productividad_stylus", "productividad_conectividad"], categorias: ["tablets"] },
  { clave: "sistema_operativo", etiqueta: "Sistema operativo", aliases: ["so", "sistema_operativo_software"], categorias: CON_PANTALLA },
  { clave: "carga", etiqueta: "Carga", aliases: ["carga_rapida", "tecnologia_de_carga"] },
  { clave: "peso", etiqueta: "Peso", aliases: ["peso_y_portabilidad"] },
  { clave: "dimensiones", etiqueta: "Dimensiones", aliases: ["dimensiones_peso"] },
  { clave: "resolucion", etiqueta: "Resolución", aliases: ["resolucion_densidad"], categorias: CON_PANTALLA },
  { clave: "tasa_refresco", etiqueta: "Tasa de refresco", aliases: ["frecuencia_de_actualizacion"], categorias: CON_PANTALLA },
  { clave: "panel", etiqueta: "Tecnología de panel", aliases: ["tecnologia_de_panel"], categorias: CON_PANTALLA },
  { clave: "brillo", etiqueta: "Brillo / contraste", aliases: ["brillo_contraste"], categorias: CON_PANTALLA },
];

function normalizarClave(clave: string): string {
  return clave
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const POR_ALIAS = new Map(
  CAMPOS.flatMap((campo) =>
    [campo.clave, ...(campo.aliases ?? [])].map((alias) => [alias, campo] as const),
  ),
);
const ORDEN = new Map(CAMPOS.map((campo, indice) => [campo.clave, indice]));
const METADATOS = new Set([
  "secciones", "version_esquema", "variante", "metricasComparables",
  "benchmarks", "fuentes", "estado_verificacion", "metricas", "benchmark",
  "benchmark_etiqueta", "benchmark_valor", "benchmarkEtiqueta", "benchmarkValor",
  "puntuacion", "puntuacionGlobal", "tiendas", "categoria", "idCategoria",
].map(normalizarClave));

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function valorATexto(valor: unknown): string | null {
  if (typeof valor === "string") return valor.trim() || null;
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (Array.isArray(valor)) {
    const partes = valor
      .filter((item) => !Array.isArray(item))
      .map(valorATexto)
      .filter((item): item is string => item !== null);
    return partes.length ? partes.join(", ") : null;
  }
  return null;
}

function compararCampos(a: { clave: string }, b: { clave: string }): number {
  return (ORDEN.get(a.clave) ?? CAMPOS.length) - (ORDEN.get(b.clave) ?? CAMPOS.length) ||
    a.clave.localeCompare(b.clave, "es");
}

/**
 * Lee solo datos registrados del producto. No usa la detección visual del
 * view model, IDs fijos, descripciones comerciales ni plantillas simuladas.
 */
export function obtenerEspecificacionesComparador(
  producto: Producto,
): EspecificacionComparador[] {
  const raw = producto.caracteristicas;
  if (!esRegistro(raw)) return [];

  const categoria = obtenerSlugDeCategoria(producto.nombreCategoria ?? "");
  const especificaciones = new Map<string, EspecificacionComparador>();

  function registrar(claveOriginal: string, dato: unknown, etiquetaOriginal?: string) {
    const normalizada = normalizarClave(claveOriginal);
    if (!normalizada || METADATOS.has(normalizada)) return;
    const campo = POR_ALIAS.get(normalizada);
    if (categoria && campo?.categorias && !campo.categorias.includes(categoria)) return;
    const valor = valorATexto(dato);
    if (valor === null) return;

    const clave = campo?.clave ?? normalizada;
    const legible = normalizada.replace(/_/g, " ");
    const etiqueta = campo?.etiqueta || etiquetaOriginal?.trim() ||
      legible.charAt(0).toUpperCase() + legible.slice(1);
    especificaciones.set(clave, { clave, etiqueta, valor });
  }

  for (const [clave, valor] of Object.entries(raw)) {
    registrar(clave, valor);
  }

  if (Array.isArray(raw.secciones)) {
    for (const seccion of raw.secciones) {
      if (!esRegistro(seccion) || typeof seccion.titulo !== "string") continue;
      const descripcion = valorATexto(seccion.descripcion);
      if (descripcion === null) continue;
      const detalle = valorATexto(seccion.detalleExtra);
      registrar(
        seccion.titulo,
        detalle ? `${descripcion} · ${detalle}` : descripcion,
        seccion.titulo,
      );
    }
  }

  for (const metrica of normalizarDatosFichaTecnica(raw).metricasComparables) {
    if (!metrica.comparable) continue;
    const valor = valorATexto(metrica.valor);
    if (valor === null) continue;
    registrar(
      metrica.clave,
      metrica.unidad ? `${valor} ${metrica.unidad}` : valor,
      metrica.nombre,
    );
  }

  return [...especificaciones.values()].sort(compararCampos);
}

export function obtenerFilasTecnicasComparador(
  productos: readonly (Producto | undefined)[],
): Array<{ clave: string; etiqueta: string; valores: Array<string | null> }> {
  const camposPorProducto = productos.map((producto) => new Map(
    (producto ? obtenerEspecificacionesComparador(producto) : [])
      .map((campo) => [campo.clave, campo]),
  ));
  const campos = new Map<string, EspecificacionComparador>();
  for (const producto of camposPorProducto) {
    for (const campo of producto.values()) {
      if (!campos.has(campo.clave)) campos.set(campo.clave, campo);
    }
  }
  return [...campos.values()].sort(compararCampos).map(({ clave, etiqueta }) => ({
    clave,
    etiqueta,
    valores: camposPorProducto.map((producto) => producto.get(clave)?.valor ?? null),
  }));
}
