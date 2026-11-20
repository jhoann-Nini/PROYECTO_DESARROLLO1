import type { ProductoViewModel } from "@/data/productoViewModel";
import type { Producto } from "@/types/producto";
import { obtenerFilasTecnicasComparador } from "./especificacionesComparador";
import { formatearValorFichaV3 } from "./fichaTecnicaProducto";
import { esAlcanceCompatibleConVariante, valoresEstructuralmenteIgualesV3, type DatosFichaTecnicaV3, type EspecificacionFichaV3 } from "@/types/fichaTecnicaV3";

export const CLAVE_COMPARADOR = "tecreview:comparador";
export const MAX_COMPARADOR = 4;

export interface ProductoComparable {
  idProducto: number;
  idCategoria: number;
}

export type ClaveFilaComparacion =
  | "precio"
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
}

export interface ResultadoRecomendacion {
  idProducto: number | null;
  nombre: string | null;
  motivos: string[];
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

function hayDiferencia(valores: Array<string | null>): boolean {
  return new Set(valores.map((valor) => valor ?? "\u0000")).size > 1;
}

function fila(
  clave: ClaveFilaComparacion,
  etiqueta: string,
  valores: Array<string | null>,
): FilaComparacion {
  return { clave, etiqueta, valores, difiere: hayDiferencia(valores) };
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
    fila(
      "disponibilidad",
      "Disponibilidad",
      productos.map((producto) =>
        producto.disponible ? "Disponible" : "No disponible",
      ),
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
        note = `Regla ${rule.direccion} · ${rule.unidad}${rule.tolerancia ? ` · tolerancia ${rule.tolerancia.valor} ${rule.tolerancia.unidad}` : ""}. Sin ganador global.`;
      }
    } else if (comparable && rule.habilitada && rule.modo === "igualdad_estructural") {
      differs = specs.slice(1).some((s) => !s || !valoresEstructuralmenteIgualesV3(specs[0]?.normalizacion.estado === "normalizada" ? specs[0].normalizacion.valor : null, s.normalizacion.estado === "normalizada" ? s.normalizacion.valor : null));
      note = "Igualdad estructural según la regla V3; no determina un ganador.";
    }
    if (comparable && rule.habilitada && rule.modo === "orden_numerico" && !note.startsWith("Regla")) note = "No comparable: el valor no es una magnitud escalar en la unidad definida.";
    return { clave: claveFilaTecnica("v3", clave), etiqueta: primera.nombre, valores, difiere: comparable && differs, comparabilidad: note };
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

/**
 * Genera una sugerencia informativa usando solo datos reales:
 * disponibilidad, precio de referencia y cantidad de especificaciones.
 * Nunca declara un ganador absoluto ni inventa una calificación editorial.
 */
export function generarRecomendacion(
  productos: ProductoViewModel[],
  filas: FilaComparacion[],
): ResultadoRecomendacion {
  if (productos.some((producto) => producto.fichaTecnica?.version === "v3")) return {
    idProducto: null, nombre: null, motivos: [],
    mensaje: "Las fichas V3 no generan un ganador global automático. Compara cada atributo con su regla explícita.",
  };
  if (productos.length < 2) {
    return {
      idProducto: null,
      nombre: null,
      motivos: [],
      mensaje: "Agrega al menos dos productos para generar una recomendación.",
    };
  }

  if (new Set(productos.map((producto) => producto.categoria)).size !== 1) {
    return {
      idProducto: null,
      nombre: null,
      motivos: [],
      mensaje: "La recomendación requiere productos de la misma categoría.",
    };
  }

  const disponibles = productos.filter((producto) => producto.disponible);

  if (disponibles.length === 0) {
    return {
      idProducto: null,
      nombre: null,
      motivos: [],
      mensaje:
        "Ninguno de los productos seleccionados tiene disponibilidad confirmada; no es posible recomendar uno.",
    };
  }

  let candidatos = disponibles;
  const motivos: string[] = [];

  motivos.push(
    disponibles.length < productos.length
      ? "Tiene disponibilidad confirmada y se descartaron los productos no disponibles."
      : "Tiene disponibilidad confirmada.",
  );

  if (
    candidatos.length > 1 &&
    candidatos.every((producto) => producto.precioCOP > 0)
  ) {
    const menorPrecio = Math.min(
      ...candidatos.map((producto) => producto.precioCOP),
    );
    const masBaratos = candidatos.filter(
      (producto) => producto.precioCOP === menorPrecio,
    );

    if (masBaratos.length < candidatos.length) {
      candidatos = masBaratos;
      motivos.push(
        `Su precio de referencia es el más bajo entre los candidatos (${candidatos[0].precioFormateado}).`,
      );
    }
  }

  if (candidatos.length > 1) {
    const cantidades = new Map(productos.map((producto, indice) => [
      producto.idProducto,
      contarEspecificaciones(filas, indice),
    ]));
    const mayorCantidad = Math.max(
      ...candidatos.map((producto) => cantidades.get(producto.idProducto) ?? 0),
    );
    const masCompletos = candidatos.filter(
      (producto) => cantidades.get(producto.idProducto) === mayorCantidad,
    );

    if (masCompletos.length < candidatos.length) {
      candidatos = masCompletos;
      motivos.push(
        `Registra más especificaciones de la comparación (${mayorCantidad}).`,
      );
    }
  }

  if (candidatos.length !== 1) {
    return {
      idProducto: null,
      nombre: null,
      motivos,
      mensaje:
        "Hay un empate técnico con los datos disponibles; revisa la tabla antes de decidir.",
    };
  }

  return {
    idProducto: candidatos[0].idProducto,
    nombre: candidatos[0].nombre,
    motivos,
    mensaje: "Sugerencia basada en los datos disponibles.",
  };
}
