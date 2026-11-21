import type { ProductoViewModel } from "@/data/productoViewModel";
import type { Producto } from "@/types/producto";
import { obtenerFilasTecnicasComparador } from "./especificacionesComparador";
import { formatearValorFichaV3 } from "./fichaTecnicaProducto";
import { formatearCOP } from "./specsHelper";
import { esAlcanceCompatibleConVariante, valoresEstructuralmenteIgualesV3, type DatosFichaTecnicaV3, type EspecificacionFichaV3 } from "@/types/fichaTecnicaV3";

export const CLAVE_COMPARADOR = "tecreview:comparador";
export const MAX_COMPARADOR = 4;

export interface ProductoComparable {
  idProducto: number;
  idCategoria: number;
}

export type ClaveFilaComparacion =
  | "precio"
  | "precio-tiendas"
  | "disponibilidad"
  | "marca"
  | "categoria"
  | `tecnica:${string}`
  | `benchmark:${string}`;

export interface FilaComparacion {
  clave: ClaveFilaComparacion;
  etiqueta: string;
  valores: Array<string | null>;
  difiere: boolean;
  comparabilidad?: string;
  /** Fase 4 (H-11): a algún producto le falta el dato; no se marca como diferencia. */
  incompleta?: boolean;
  /**
   * Fase 4 (H-10): índices de los productos que destacan en una fila V3
   * comparable con orden numérico (fuera de la tolerancia del mejor valor).
   */
  destacados?: number[];
  /** Dirección de la regla V3 de la que salen los destacados. */
  direccionRegla?: "mayor_es_mejor" | "menor_es_mejor" | "objetivo";
}

/** Un criterio en el que destacan uno o varios productos, con su dato y su fuente. */
export interface InsigniaComparacion {
  criterio: string;
  idsProductos: number[];
  nombres: string[];
  dato: string;
  fuente: string;
}

/** Fase 4 (H-10): reemplaza al «ganador»; nunca hay un ganador global. */
export interface ResultadoInsignias {
  insignias: InsigniaComparacion[];
  notas: string[];
  mensaje: string;
}

export interface ResultadoAgregarComparador {
  ids: number[];
  agregado: boolean;
  motivo:
    | "agregado"
    | "duplicado"
    | "lleno"
    | "invalido"
    | "categoria-incompatible"
    | "sin-validar";
}

/**
 * Normaliza una selección persistida: solo enteros positivos, sin duplicados
 * y con el máximo de productos permitido.
 */
export function normalizarIdsComparador(valor: unknown): number[] {
  if (!Array.isArray(valor)) return [];

  const vistos = new Set<number>();
  const ids: number[] = [];

  for (const item of valor) {
    const id =
      typeof item === "number"
        ? item
        : typeof item === "string" && item.trim().length > 0
          ? Number(item)
          : Number.NaN;

    if (!Number.isInteger(id) || id <= 0 || vistos.has(id)) continue;

    vistos.add(id);
    ids.push(id);

    if (ids.length === MAX_COMPARADOR) break;
  }

  return ids;
}

export function leerIdsComparador(
  storage: Pick<Storage, "getItem"> | null,
): number[] {
  if (!storage) return [];

  try {
    const crudo = storage.getItem(CLAVE_COMPARADOR);
    if (!crudo) return [];
    return normalizarIdsComparador(JSON.parse(crudo));
  } catch {
    return [];
  }
}

export function guardarIdsComparador(
  storage: Pick<Storage, "setItem"> | null,
  ids: number[],
): void {
  if (!storage) return;

  try {
    storage.setItem(
      CLAVE_COMPARADOR,
      JSON.stringify(normalizarIdsComparador(ids)),
    );
  } catch {
    // Si el almacenamiento no está disponible, la selección sigue en memoria.
  }
}

/**
 * Conserva la categoría real del primer producto válido, no la categoría
 * visual inferida de sus especificaciones. También depura selecciones antiguas.
 */
export function validarSeleccionComparador(
  ids: number[],
  catalogo: readonly ProductoComparable[],
): number[] {
  const porId = new Map(catalogo.map((producto) => [producto.idProducto, producto]));
  let idCategoria: number | null = null;

  return normalizarIdsComparador(ids).filter((id) => {
    const producto = porId.get(id);
    if (!producto || !Number.isInteger(producto.idCategoria) || producto.idCategoria <= 0) {
      return false;
    }
    idCategoria ??= producto.idCategoria;
    return producto.idCategoria === idCategoria;
  });
}

export function agregarIdComparador(
  ids: number[],
  id: number,
  catalogo: readonly ProductoComparable[],
): ResultadoAgregarComparador {
  const actuales = validarSeleccionComparador(ids, catalogo);

  if (validarSeleccionComparador([id], catalogo).length === 0) {
    return { ids: actuales, agregado: false, motivo: "invalido" };
  }

  if (actuales.includes(id)) {
    return { ids: actuales, agregado: false, motivo: "duplicado" };
  }

  const primero = catalogo.find((producto) => producto.idProducto === actuales[0]);
  const candidato = catalogo.find((producto) => producto.idProducto === id);
  if (primero && candidato?.idCategoria !== primero.idCategoria) {
    return { ids: actuales, agregado: false, motivo: "categoria-incompatible" };
  }

  if (actuales.length >= MAX_COMPARADOR) {
    return { ids: actuales, agregado: false, motivo: "lleno" };
  }

  return {
    ids: [...actuales, id],
    agregado: true,
    motivo: "agregado",
  };
}

export function quitarIdComparador(ids: number[], id: number): number[] {
  return normalizarIdsComparador(ids).filter((actual) => actual !== id);
}

/** Compara textos sin distinguir mayúsculas ni espacios: «8 GB» = «8gb». No convierte unidades. */
function normalizarValorComparado(valor: string): string {
  return valor.toLowerCase().replace(/\s+/g, "");
}

/**
 * Fase 4 (H-11): solo hay diferencia si todos los productos tienen dato y
 * los datos no coinciden. Un dato faltante marca la fila como incompleta.
 */
function analizarDiferencia(valores: Array<string | null>): { difiere: boolean; incompleta: boolean } {
  const presentes = valores.filter((valor): valor is string => valor !== null);
  const incompleta = presentes.length > 0 && presentes.length < valores.length;
  const difiere = !incompleta && new Set(presentes.map(normalizarValorComparado)).size > 1;
  return { difiere, incompleta };
}

function fila(
  clave: ClaveFilaComparacion,
  etiqueta: string,
  valores: Array<string | null>,
): FilaComparacion {
  const { difiere, incompleta } = analizarDiferencia(valores);
  return incompleta ? { clave, etiqueta, valores, difiere, incompleta } : { clave, etiqueta, valores, difiere };
}

function textoTiendas(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? "tienda" : "tiendas"}`;
}

/** Fase 4 (H-04): disponibilidad según las ofertas del backend, no según el estado del producto. */
function textoDisponibilidad(producto: ProductoViewModel): string {
  if (!producto.disponibilidadConsultada) return "Disponibilidad sin confirmar";
  const tiendas = producto.numeroTiendas ?? 0;
  return tiendas > 0 ? `Disponible en ${textoTiendas(tiendas)}` : "Sin tiendas registradas";
}

function tieneOfertas(producto: ProductoViewModel): boolean {
  return Boolean(producto.disponibilidadConsultada) && (producto.numeroTiendas ?? 0) > 0
    && typeof producto.precioDesdeCOP === "number" && producto.precioDesdeCOP > 0;
}

function claveFilaTecnica(origen: "legacy" | "v3", clave: string): ClaveFilaComparacion {
  const estable = encodeURIComponent(clave);
  return origen === "v3" ? `tecnica:v3:${estable}` : `tecnica:${estable}`;
}

export function construirFilasComparacion(
  productos: ProductoViewModel[],
  catalogo: readonly Producto[] = [],
  variantesSeleccionadas: Record<number, string> = {},
): FilaComparacion[] {
  if (productos.length === 0) return [];
  const porId = new Map(catalogo.map((producto) => [producto.idProducto, producto]));
  const seleccion = productos.map((producto) => porId.get(producto.idProducto));
  const especificaciones = obtenerFilasTecnicasComparador(seleccion);
  const filasV3 = construirFilasV3(productos, variantesSeleccionadas);

  return [
    fila(
      "precio",
      "Precio de referencia",
      productos.map((producto) =>
        producto.precioCOP > 0 ? producto.precioFormateado : null,
      ),
    ),
    ...(productos.some(tieneOfertas)
      ? [fila(
          "precio-tiendas",
          "Menor precio en tiendas",
          productos.map((producto) => tieneOfertas(producto) ? formatearCOP(producto.precioDesdeCOP!) : null),
        )]
      : []),
    fila(
      "disponibilidad",
      "Disponibilidad",
      productos.map(textoDisponibilidad),
    ),
    fila(
      "marca",
      "Marca",
      productos.map((producto) => producto.marca || null),
    ),
    fila(
      "categoria",
      "Categoría",
      seleccion.map((producto) => producto
        ? producto.nombreCategoria?.trim() || `Categoría #${producto.idCategoria}`
        : null),
    ),
    ...especificaciones.map(({ clave, etiqueta, valores }) =>
      fila(claveFilaTecnica("legacy", clave), etiqueta, valores),
    ),
    ...filasV3,
    ...construirFilasMetricasTecnicas(productos),
    ...construirFilasBenchmarks(productos),
  ];
}

function construirFilasV3(productos: ProductoViewModel[], variantes: Record<number, string>): FilaComparacion[] {
  if (productos.length < 2) return [];
  const fichas = productos.map((p) => p.fichaTecnica?.version === "v3" && p.fichaTecnica.estado === "valida" ? p.fichaTecnica.ficha : null);
  const categorias = new Set(fichas.filter((f): f is NonNullable<typeof f> => f !== null).map((f) => f.categoria));
  if (categorias.size === 0 || categorias.size !== 1) return [];
  if (productos.some((producto, indice) => fichas[indice] && (
    producto.fichaTecnica?.version !== "v3" || producto.fichaTecnica.estado !== "valida" || producto.fichaTecnica.advertenciaCategoria
  ))) return [];
  const mapas = fichas.map((f, i) => {
    if (!f) return new Map<string, EspecificacionFichaV3>();
    const variante = variantes[productos[i].idProducto] ?? (f.variantes.length === 1 ? f.variantes[0].id : null);
    return new Map(f.especificaciones.filter((s) => s.variante_id === null || s.variante_id === variante).map((s) => [s.clave, s] as const));
  });
  const keys = [...new Set(mapas.flatMap((mapa) => [...mapa.keys()]))];
  return keys.map((clave) => {
    const specs = mapas.map((mapa) => mapa.get(clave) ?? null);
    const primera = specs.find((s): s is EspecificacionFichaV3 => s !== null)!;
    const valores = specs.map((s) => {
      if (!s) return "Sin ficha V3 / sin variante seleccionada";
      if (s.estado_dato !== "conocido") return s.estado_dato === "no_aplica" ? "No aplica" : s.estado_dato === "no_publicado" ? "No publicado" : "Desconocido";
      if (s.normalizacion.estado === "normalizada") return formatearValorFichaV3(s.normalizacion.valor);
      return s.valor_original ? `${s.valor_original.texto}${s.valor_original.unidad ? ` ${s.valor_original.unidad}` : ""}` : "Sin dato normalizado";
    });
    const rule = primera.comparacion;
    const evidenciasCompatibles = specs.every((spec, index) => !spec || evidenciaCompatibleConEspecificacion(fichas[index]!, spec));
    const allApplicable = specs.every((s) => s?.estado_dato === "conocido" && s.normalizacion.estado === "normalizada" && s.verificacion.estado !== "requiere_revision" && s.revision_conflicto.estado !== "conflicto_pendiente") && evidenciasCompatibles;
    const sameRule = rule.habilitada && specs.every((s) => s?.comparacion.habilitada && s.comparacion.id === rule.id && s.comparacion.modo === rule.modo && s.comparacion.unidad === rule.unidad && s.comparacion.direccion === rule.direccion && s.comparacion.objetivo === rule.objetivo && JSON.stringify(s.comparacion.tolerancia) === JSON.stringify(rule.tolerancia));
    const toleranciaCompatible = !rule.habilitada || rule.modo !== "orden_numerico" || rule.tolerancia === null || (
      rule.tolerancia.unidad === rule.unidad && Number.isFinite(rule.tolerancia.valor) && rule.tolerancia.valor >= 0
    );
    let comparable = Boolean(allApplicable && sameRule && toleranciaCompatible);
    let differs = false;
    let destacados: number[] | undefined;
    let note = !evidenciasCompatibles
      ? "No comparable: una evidencia enlazada no cubre la variante de la especificación."
      : !toleranciaCompatible
      ? "No comparable: la tolerancia no es válida o no usa la unidad de la regla."
      : "No comparable: faltan datos normalizados, hay conflictos o la regla no coincide.";
    if (comparable && rule.habilitada && rule.modo === "orden_numerico") {
      const numeric = specs.map((s) => {
        if (!s || s.normalizacion.estado !== "normalizada") return null;
        const v = s.normalizacion.valor;
        return v.tipo === "magnitud" && v.unidad === rule.unidad ? v.valor : null;
      });
      comparable = numeric.every((v): v is number => v !== null);
      if (comparable) {
        const numbers = numeric as number[];
        const tol = rule.tolerancia?.unidad === rule.unidad ? rule.tolerancia.valor : 0;
        const scores = rule.direccion === "objetivo" && rule.objetivo !== null ? numbers.map((n) => Math.abs(n - rule.objetivo!)) : numbers;
        differs = Math.max(...scores) - Math.min(...scores) > tol;
        if (differs) {
          // Mayor es mejor: el mejor es el máximo. Menor u objetivo: el mínimo
          // (para objetivo, la menor distancia). Dentro de la tolerancia, empatan.
          const mejor = rule.direccion === "mayor_es_mejor" ? Math.max(...scores) : Math.min(...scores);
          destacados = scores
            .map((score, indice) => (Math.abs(score - mejor) <= tol ? indice : -1))
            .filter((indice) => indice >= 0);
        }
        note = `Regla ${rule.direccion} · ${rule.unidad}${rule.tolerancia ? ` · tolerancia ${rule.tolerancia.valor} ${rule.tolerancia.unidad}` : ""}. Sin ganador global.`;
      }
    } else if (comparable && rule.habilitada && rule.modo === "igualdad_estructural") {
      differs = specs.slice(1).some((s) => !s || !valoresEstructuralmenteIgualesV3(specs[0]?.normalizacion.estado === "normalizada" ? specs[0].normalizacion.valor : null, s.normalizacion.estado === "normalizada" ? s.normalizacion.valor : null));
      note = "Igualdad estructural según la regla V3; no determina un ganador.";
    }
    if (comparable && rule.habilitada && rule.modo === "orden_numerico" && !note.startsWith("Regla")) note = "No comparable: el valor no es una magnitud escalar en la unidad definida.";
    const resultado: FilaComparacion = { clave: claveFilaTecnica("v3", clave), etiqueta: primera.nombre, valores, difiere: comparable && differs, comparabilidad: note };
    if (comparable && destacados && destacados.length < productos.length && rule.habilitada && rule.modo === "orden_numerico") {
      resultado.destacados = destacados;
      resultado.direccionRegla = rule.direccion;
    }
    return resultado;
  });
}

function evidenciaCompatibleConEspecificacion(
  ficha: DatosFichaTecnicaV3,
  especificacion: EspecificacionFichaV3,
): boolean {
  const variantIds = ficha.variantes.map((v) => v.id);
  return especificacion.evidencia_ids.every((id) => {
    const evidencia = ficha.evidencias.find((item) => item.id === id);
    const fuente = evidencia && ficha.fuentes.find((item) => item.id === evidencia.fuente_id);
    if (!evidencia || !fuente || (fuente.variante_id !== null && fuente.variante_id !== especificacion.variante_id)) return false;
    return esAlcanceCompatibleConVariante(evidencia.alcance, especificacion.variante_id, variantIds);
  });
}

function contarEspecificaciones(filas: FilaComparacion[], indice: number): number {
  return filas.filter(
    (fila) =>
      (fila.clave.startsWith("tecnica:") || fila.clave.startsWith("benchmark:")) &&
      fila.valores[indice] != null,
  ).length;
}

/** Compara métricas comparables presentes en todos los productos y con igual unidad. */
function construirFilasMetricasTecnicas(productos: ProductoViewModel[]): FilaComparacion[] {
  if (productos.length < 2) return [];
  if (new Set(productos.map((producto) => producto.categoria)).size !== 1) return [];

  const porProducto = productos.map((producto) => new Map(
    producto.datosFichaTecnica.metricasComparables
      .filter((metrica) => metrica.comparable)
      .map((metrica) => [metrica.clave, metrica] as const),
  ));
  const clavesComunes = [...porProducto[0].keys()].filter((clave) =>
    porProducto.every((mapa) => mapa.has(clave)),
  );

  return clavesComunes.flatMap((clave) => {
    const metricas = porProducto.map((mapa) => mapa.get(clave)!);
    const unidades = new Set(metricas.map((metrica) => metrica.unidad ?? ""));
    if (unidades.size !== 1) return [];
    const primera = metricas[0];
    const valores = metricas.map((metrica) => {
      if (typeof metrica.valor === "boolean") return metrica.valor ? "Sí" : "No";
      return metrica.unidad ? `${metrica.valor} ${metrica.unidad}` : String(metrica.valor);
    });
    return [fila(claveFilaTecnica("legacy", clave), primera.nombre, valores)];
  });
}

function construirFilasBenchmarks(productos: ProductoViewModel[]): FilaComparacion[] {
  if (productos.length < 2) return [];
  if (new Set(productos.map((producto) => producto.categoria)).size !== 1) return [];

  const claveBenchmark = (benchmark: ProductoViewModel["datosFichaTecnica"]["benchmarks"][number]) =>
    [benchmark.nombre, benchmark.prueba ?? "", benchmark.version ?? "", benchmark.unidad ?? ""].join("|");
  const mapas = productos.map((producto) =>
    new Map(producto.datosFichaTecnica.benchmarks.map((benchmark) => [claveBenchmark(benchmark), benchmark] as const)),
  );
  const clavesComunes = [...mapas[0].keys()].filter((clave) =>
    mapas.every((mapa) => mapa.has(clave)),
  );

  return clavesComunes.map((clave) => {
    const resultados = mapas.map((mapa) => mapa.get(clave)!);
    const primero = resultados[0];
    return fila(
      `benchmark:${clave}`,
      primero.prueba ? `${primero.nombre} · ${primero.prueba}` : primero.nombre,
      resultados.map((resultado) =>
        resultado.unidad ? `${resultado.valor} ${resultado.unidad}` : String(resultado.valor),
      ),
    );
  });
}

const TEXTO_DIRECCION: Record<NonNullable<FilaComparacion["direccionRegla"]>, string> = {
  mayor_es_mejor: "mayor es mejor",
  menor_es_mejor: "menor es mejor",
  objetivo: "más cercano al objetivo",
};

function formatearFechaCorta(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(fecha);
}

/**
 * Productos con el menor (o mayor) valor, si no empatan todos.
 * Devuelve null cuando todos comparten el mejor valor.
 */
function mejores(
  productos: ProductoViewModel[],
  valor: (producto: ProductoViewModel) => number,
  modo: "menor" | "mayor",
): ProductoViewModel[] | null {
  const valores = productos.map(valor);
  const objetivo = modo === "menor" ? Math.min(...valores) : Math.max(...valores);
  const elegidos = productos.filter((_, indice) => valores[indice] === objetivo);
  return elegidos.length < productos.length ? elegidos : null;
}

function insignia(criterio: string, elegidos: ProductoViewModel[], dato: string, fuente: string): InsigniaComparacion {
  return {
    criterio,
    idsProductos: elegidos.map((producto) => producto.idProducto),
    nombres: elegidos.map((producto) => producto.nombre),
    dato,
    fuente,
  };
}

/**
 * Fase 4 (H-10): reemplaza al «ganador» por insignias por criterio. Cada
 * insignia muestra el dato y su fuente; nunca hay un ganador global.
 * - Precio de referencia y tiendas: solo si todos los productos tienen el dato.
 * - Fichas V3: una insignia por fila comparable con orden numérico; dentro de
 *   la tolerancia los productos empatan.
 * - Filas técnicas legacy: no tienen regla declarada, así que no dan insignias.
 * - La cantidad de datos registrados es una nota informativa, nunca un mérito.
 */
export function generarInsignias(
  productos: ProductoViewModel[],
  filas: FilaComparacion[],
): ResultadoInsignias {
  if (productos.length < 2) {
    return { insignias: [], notas: [], mensaje: "Agrega al menos dos productos para ver en qué destaca cada uno." };
  }
  if (new Set(productos.map((producto) => producto.categoria)).size !== 1) {
    return { insignias: [], notas: [], mensaje: "Las insignias requieren productos de la misma categoría." };
  }

  const insignias: InsigniaComparacion[] = [];
  const notas: string[] = [];

  // Precio de referencia.
  const sinPrecio = productos.filter((producto) => producto.precioCOP <= 0);
  if (sinPrecio.length > 0) {
    notas.push(`Sin precio de referencia registrado: ${sinPrecio.map((p) => p.nombre).join(", ")}.`);
  } else {
    const elegidos = mejores(productos, (producto) => producto.precioCOP, "menor");
    if (elegidos) {
      insignias.push(insignia("Menor precio de referencia", elegidos, elegidos[0].precioFormateado,
        "Precio de referencia del catálogo de TecReview"));
    }
  }

  // Tiendas: solo con la disponibilidad confirmada por el backend.
  if (productos.some((producto) => !producto.disponibilidadConsultada)) {
    notas.push("La disponibilidad en tiendas no se pudo confirmar; no se comparan tiendas.");
  } else {
    const conOfertas = productos.filter(tieneOfertas);
    if (conOfertas.length >= 2) {
      const elegidos = mejores(conOfertas, (producto) => producto.precioDesdeCOP!, "menor");
      if (elegidos) {
        const fecha = formatearFechaCorta(elegidos[0].fechaPrecioTiendas);
        insignias.push(insignia("Menor precio en tiendas", elegidos, formatearCOP(elegidos[0].precioDesdeCOP!),
          `Ofertas registradas en tiendas${fecha ? ` · actualizado el ${fecha}` : ""}`));
      }
    }
    if (conOfertas.length < productos.length && conOfertas.length > 0) {
      notas.push(`Sin ofertas disponibles registradas: ${productos.filter((p) => !tieneOfertas(p)).map((p) => p.nombre).join(", ")}.`);
    }
    const elegidos = mejores(productos, (producto) => producto.numeroTiendas ?? 0, "mayor");
    if (elegidos && (elegidos[0].numeroTiendas ?? 0) > 0) {
      insignias.push(insignia("Disponible en más tiendas", elegidos, textoTiendas(elegidos[0].numeroTiendas ?? 0),
        "Ofertas disponibles registradas en TecReview"));
    }
  }

  // Filas V3 comparables con orden numérico.
  for (const filaV3 of filas) {
    if (!filaV3.destacados || !filaV3.direccionRegla) continue;
    const elegidos = filaV3.destacados.map((indice) => productos[indice]).filter(Boolean);
    if (elegidos.length === 0) continue;
    const dato = filaV3.destacados.map((indice) => filaV3.valores[indice]).filter(Boolean).join(" · ");
    insignias.push(insignia(`Destaca en «${filaV3.etiqueta}»`, elegidos, dato,
      `Ficha técnica V3 · ${TEXTO_DIRECCION[filaV3.direccionRegla]}`));
  }

  // Cantidad de datos: solo informativa.
  const cantidades = productos.map((_, indice) => contarEspecificaciones(filas, indice));
  if (new Set(cantidades).size > 1) {
    notas.push(`Datos técnicos registrados (informativo, no es un mérito): ${productos
      .map((producto, indice) => `${producto.nombre} ${cantidades[indice]}`).join(" · ")}.`);
  }

  return {
    insignias,
    notas,
    mensaje: insignias.length > 0
      ? "Cada insignia indica un criterio, su dato y su fuente. No hay un ganador global."
      : "Con los datos disponibles, ningún producto destaca en un criterio comparable. Revisa la tabla.",
  };
}
