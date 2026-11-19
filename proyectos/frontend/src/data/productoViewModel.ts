import type {
  CategoriaDispositivo,
  DispositivoKimovil,
  Producto,
  TiendaPrecio,
} from "@/types/producto";
import type { FichaTecnicaV2 } from "@/types/fichaTecnica";
import { categoriaProductoDesdeNombre, clasificarFichaTecnicaProducto, type EstadoFichaTecnicaProducto } from "./fichaTecnicaProducto";
import type { IdProductoGlobal } from "./identificadores";
import {
  claveMockDe,
  idGlobalApi,
  idGlobalMock,
  idProductoApiDe,
} from "./identificadores";
import { detectarCategoria, formatearCOP } from "./specsHelper";
import { sanearPrecioCOP } from "./precios";
import { normalizarDatosFichaTecnica } from "./fichaTecnica";
import type { DatosFichaTecnica } from "./fichaTecnica";
import { obtenerFichaTecnicaV3Piloto } from "./fichasTecnicasV3Piloto";
import {
  normalizarDesdeKimovil,
  normalizarFichaTecnicaV2,
} from "./normalizadorFicha";

export type CaracteristicaClave =
  | "5g"
  | "buena-camara"
  | "alto-rendimiento"
  | "gran-bateria";

export interface EspecificacionesClave {
  pantalla: string | null;
  procesador: string | null;
  ram: string | null;
  almacenamiento: string | null;
  camaras: string | null;
  bateria: string | null;
}

export type OrigenProductoViewModel = "api" | "mock" | "ranking";

export interface ProductoViewModel {
  idProducto: number;
  nombre: string;
  marca: string;
  categoria: CategoriaDispositivo;
  categoriaEtiqueta: string;
  imagen: string | null;
  precioCOP: number;
  precioFormateado: string;
  disponible: boolean;
  rating: number | null;
  cantidadResenas: number | null;
  especificaciones: EspecificacionesClave;
  datosFichaTecnica: DatosFichaTecnica;
  caracteristicas: CaracteristicaClave[];
  textoBusqueda: string;
  posicionRanking?: number | null;
  numeroTiendas?: number;
  precioDesdeCOP?: number | null;
  idGlobal?: IdProductoGlobal;
  fichaTecnicaV2?: FichaTecnicaV2;
  /** Ficha versionada; conserva el JSON original y los errores de despacho. */
  fichaTecnica?: EstadoFichaTecnicaProducto;
  origen?: OrigenProductoViewModel;
  idApi?: number | null;
  claveMock?: string | null;
}

export interface OpcionesProductoViewModel {
  rating?: number | null;
  cantidadResenas?: number | null;
  nombreMarca?: string | null;
  idGlobal?: IdProductoGlobal;
  idProducto?: number;
  origen?: OrigenProductoViewModel;
}

export const ETIQUETAS_CATEGORIA: Record<CategoriaDispositivo, string> = {
  moviles: "Móviles",
  laptops: "Laptops / PCs",
  tablets: "Tablets",
  auriculares: "Auriculares",
};

const ESPECIFICACIONES_VACIAS: EspecificacionesClave = {
  pantalla: null,
  procesador: null,
  ram: null,
  almacenamiento: null,
  camaras: null,
  bateria: null,
};

export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizarClave(clave: string): string {
  return normalizarTexto(clave)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}

function hashTextoDeterminista(texto: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function hashEnteroDeterminista(texto: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0);
}

function generarClaveMockDeterminista(dispositivo: DispositivoKimovil): string {
  const nombreNorm = normalizarClave(dispositivo.nombre || "");
  const marcaNorm = normalizarClave(dispositivo.marca || "");
  const catNorm = normalizarClave(dispositivo.categoria || "");
  const specsNorm = normalizarClave(dispositivo.especificaciones || "");
  const precioNorm = String(dispositivo.precio || 0);

  const huella = [nombreNorm, marcaNorm, catNorm, specsNorm, precioNorm].filter(Boolean).join("-");
  const hash = hashTextoDeterminista(huella || "item");

  let base = "";
  if (nombreNorm) {
    base = `${nombreNorm.slice(0, 30)}-${hash}`;
  } else if (marcaNorm) {
    base = `${marcaNorm.slice(0, 30)}-${hash}`;
  } else {
    base = `mock-${hash}`;
  }

  const limpia = base
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/[._-]{2,}/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");

  return limpia || `mock-${hash}`;
}

function valorATexto(valor: unknown): string | null {
  if (typeof valor === "string") {
    const limpio = valor.trim();
    return limpio.length > 0 ? limpio : null;
  }

  if (typeof valor === "number" && Number.isFinite(valor)) {
    return String(valor);
  }

  if (Array.isArray(valor)) {
    const partes = valor
      .map((item) => valorATexto(item))
      .filter((item): item is string => Boolean(item));
    return partes.length > 0 ? partes.join(", ") : null;
  }

  return null;
}

function buscarPorClaves(
  caracteristicas: Record<string, unknown>,
  claves: string[]
): string | null {
  const normalizadas = new Map<string, unknown>();
  for (const [clave, valor] of Object.entries(caracteristicas)) {
    normalizadas.set(normalizarClave(clave), valor);
  }

  for (const clave of claves) {
    const texto = valorATexto(normalizadas.get(normalizarClave(clave)));
    if (texto) return texto;
  }

  return null;
}

function extraerEspecificaciones(
  caracteristicas?: Record<string, unknown> | null
): EspecificacionesClave {
  if (!caracteristicas) return { ...ESPECIFICACIONES_VACIAS };

  const pantalla = buscarPorClaves(caracteristicas, ["pantalla", "display"]);
  const procesador = buscarPorClaves(caracteristicas, [
    "procesador",
    "cpu",
    "chipset",
  ]);
  let ram = buscarPorClaves(caracteristicas, [
    "ram",
    "memoria_ram",
    "memoria",
  ]);
  let almacenamiento = buscarPorClaves(caracteristicas, [
    "almacenamiento",
    "disco",
    "storage",
  ]);
  const camaras = buscarPorClaves(caracteristicas, [
    "camaras",
    "camara",
    "camara_trasera",
  ]);
  const bateria = buscarPorClaves(caracteristicas, [
    "bateria",
    "autonomia",
    "bateria_carga",
  ]);

  if (!ram || !almacenamiento) {
    const combinado = buscarPorClaves(caracteristicas, [
      "ram_almacenamiento",
      "memoria_y_almacenamiento",
    ]);

    if (combinado) {
      const partes = combinado
        .split("+")
        .map((parte) => parte.trim())
        .filter(Boolean);
      const parteRam = partes.find((parte) => /\bram\b/i.test(parte));
      const parteAlmacenamiento = partes.find((parte) =>
        /almacenamiento|storage|disco/i.test(parte)
      );

      if (!ram && parteRam) ram = parteRam;
      if (!almacenamiento && parteAlmacenamiento) {
        almacenamiento = parteAlmacenamiento;
      }
    }
  }

  return { pantalla, procesador, ram, almacenamiento, camaras, bateria };
}

function construirTextoBusqueda(
  producto: Producto,
  marca: string,
  categoriaEtiqueta: string,
  especificaciones: EspecificacionesClave
): string {
  const valoresCaracteristicas = producto.caracteristicas
    ? Object.values(producto.caracteristicas)
        .map((valor) => valorATexto(valor))
        .filter((valor): valor is string => Boolean(valor))
    : [];

  return normalizarTexto(
    [
      producto.nombre,
      producto.descripcion ?? "",
      marca,
      producto.nombreCategoria ?? "",
      categoriaEtiqueta,
      ...Object.values(especificaciones).filter(
        (valor): valor is string => Boolean(valor)
      ),
      ...valoresCaracteristicas,
    ].join(" ")
  );
}

function extraerMayorMP(valor: string | null): number {
  if (!valor) return 0;
  const coincidencias = valor.match(/(\d+(?:[.,]\d+)?)\s*MP/gi) ?? [];
  return coincidencias.reduce((mayor, coincidencia) => {
    const numero = Number.parseFloat(
      coincidencia.replace(/MP/i, "").replace(",", ".")
    );
    return Number.isFinite(numero) ? Math.max(mayor, numero) : mayor;
  }, 0);
}

function extraerRamGB(ram: string | null): number {
  if (!ram) return 0;
  const coincidencia = ram.match(/(\d+(?:[.,]\d+)?)\s*(GB|TB)/i);
  if (!coincidencia) return 0;

  const numero = Number.parseFloat(coincidencia[1].replace(",", "."));
  return coincidencia[2].toUpperCase() === "TB" ? numero * 1024 : numero;
}

function extraerMiliamperios(bateria: string | null): number {
  if (!bateria) return 0;
  const coincidencia = bateria.match(/(\d{3,6})\s*mAh/i);
  return coincidencia ? Number.parseInt(coincidencia[1], 10) : 0;
}

function extraerHoras(bateria: string | null): number {
  if (!bateria) return 0;
  const coincidencias = [
    ...bateria.matchAll(/(\d{1,3})\s*(?:h|horas?)\b/gi),
  ];
  return coincidencias.reduce(
    (mayor, coincidencia) =>
      Math.max(mayor, Number.parseInt(coincidencia[1], 10)),
    0
  );
}

function detectarCaracteristicas(
  especificaciones: EspecificacionesClave,
  textoBusqueda: string
): CaracteristicaClave[] {
  const resultado: CaracteristicaClave[] = [];

  if (/\b5g\b/.test(textoBusqueda)) {
    resultado.push("5g");
  }

  const megapixeles =
    extraerMayorMP(especificaciones.camaras) ||
    extraerMayorMP(textoBusqueda);
  if (megapixeles >= 12) {
    resultado.push("buena-camara");
  }

  const procesador = normalizarTexto(especificaciones.procesador ?? "");
  const altoRendimiento =
    /snapdragon 8|dimensity 9|apple a1[7-9]|\bm[2-4]\b|ryzen (7|9)|core i[7-9]|ultra (7|9)/.test(
      procesador
    ) || extraerRamGB(especificaciones.ram) >= 8;

  if (altoRendimiento) {
    resultado.push("alto-rendimiento");
  }

  if (
    extraerMiliamperios(especificaciones.bateria) >= 5000 ||
    extraerHoras(especificaciones.bateria) >= 12
  ) {
    resultado.push("gran-bateria");
  }

  return resultado;
}

function extraerTiendas(
  caracteristicas?: Record<string, unknown> | null
): TiendaPrecio[] {
  const tiendas = caracteristicas?.tiendas;
  if (!Array.isArray(tiendas)) return [];

  const resultado: TiendaPrecio[] = [];

  for (const item of tiendas) {
    if (!item || typeof item !== "object") continue;

    const registro = item as Record<string, unknown>;
    const precio = sanearPrecioCOP(
      typeof registro.precio === "number"
        ? registro.precio
        : Number(registro.precio)
    );

    if (precio <= 0) continue;

    resultado.push({
      nombre:
        typeof registro.nombre === "string" && registro.nombre.trim()
          ? registro.nombre.trim()
          : "Tienda",
      precio,
      envioGratis: registro.envioGratis === true,
      url: typeof registro.url === "string" ? registro.url : undefined,
    });
  }

  return resultado;
}

function normalizarRating(valor: number | null | undefined): number | null {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return null;
  }
  return Math.min(5, Math.max(0, valor));
}

function normalizarCantidadResenas(
  valor: number | null | undefined
): number | null {
  if (
    valor === null ||
    valor === undefined ||
    !Number.isFinite(valor) ||
    valor < 0
  ) {
    return null;
  }
  return Math.round(valor);
}

export function crearProductoViewModel(
  producto: Producto,
  opciones: OpcionesProductoViewModel = {}
): ProductoViewModel {
  const categoria = detectarCategoria(producto);
  const categoriaEtiqueta = ETIQUETAS_CATEGORIA[categoria];
  const marca =
    producto.nombreMarca?.trim() ||
    opciones.nombreMarca?.trim() ||
    `Marca #${producto.idMarca}`;
  const especificaciones = extraerEspecificaciones(producto.caracteristicas);
  const tiendas = extraerTiendas(producto.caracteristicas);
  const imagen = producto.imagen?.trim() || null;
  const textoBusqueda = construirTextoBusqueda(
    producto,
    marca,
    categoriaEtiqueta,
    especificaciones
  );

  const esIdApiValido =
    typeof producto.idProducto === "number" &&
    Number.isSafeInteger(producto.idProducto) &&
    producto.idProducto > 0;

  const idGlobal =
    opciones.idGlobal ?? (esIdApiValido ? idGlobalApi(producto.idProducto) ?? undefined : undefined);
  const fichaTecnicaClasificada = clasificarFichaTecnicaProducto(producto, {
    idGlobal,
    categoriaPorDefecto: categoria,
    categoriaProducto: producto.nombreCategoria?.trim() ? categoriaProductoDesdeNombre(producto.nombreCategoria) : null,
  });
  const tieneEsquemaExplicito = typeof producto.caracteristicas === "object" && producto.caracteristicas !== null && "version_esquema" in producto.caracteristicas;
  const fichaV3Piloto = fichaTecnicaClasificada.version !== "v3" && fichaTecnicaClasificada.version !== "error" && !tieneEsquemaExplicito
    ? obtenerFichaTecnicaV3Piloto({ id: producto.idProducto, nombre: producto.nombre })
    : null;
  const fichaTecnica: EstadoFichaTecnicaProducto = fichaV3Piloto
    ? {
        version: "v3",
        estado: "valida",
        original: fichaV3Piloto as unknown as Record<string, unknown>,
        ficha: fichaV3Piloto,
      }
    : fichaTecnicaClasificada;
  const fichaTecnicaV2 = fichaTecnica.estado === "valida" && fichaTecnica.version !== "v3"
    ? fichaTecnica.fichaV2
    : undefined;
  const datosFichaTecnica = fichaTecnica.version === "v3" || fichaTecnica.estado === "invalida"
    ? normalizarDatosFichaTecnica(null)
    : normalizarDatosFichaTecnica(producto.caracteristicas);

  return {
    idProducto: producto.idProducto,
    idGlobal,
    origen: opciones.origen ?? "api",
    idApi: esIdApiValido ? producto.idProducto : null,
    claveMock: null,
    nombre: producto.nombre,
    marca,
    categoria,
    categoriaEtiqueta,
    imagen,
    precioCOP: sanearPrecioCOP(producto.precioReferencia),
    precioFormateado: formatearCOP(producto.precioReferencia),
    disponible: producto.estado === true,
    rating: normalizarRating(opciones.rating),
    cantidadResenas: normalizarCantidadResenas(opciones.cantidadResenas),
    especificaciones,
    datosFichaTecnica,
    fichaTecnicaV2,
    fichaTecnica,
    caracteristicas: detectarCaracteristicas(
      especificaciones,
      textoBusqueda
    ),
    textoBusqueda,
    numeroTiendas: tiendas.length,
    precioDesdeCOP:
      tiendas.length > 0
        ? Math.min(...tiendas.map((tienda) => tienda.precio))
        : null,
  };
}

/**
 * Convierte un Producto de la API backend a ProductoViewModel garantizando
 * la asignación de idGlobal canónico (api:<id>), ficha técnica normalizada v2
 * y trazabilidad de origen backend.
 */
export function convertirProductoAViewModel(
  producto: Producto,
  opciones: OpcionesProductoViewModel = {}
): ProductoViewModel {
  return crearProductoViewModel(producto, opciones);
}

/**
 * Convierte un DispositivoKimovil (mock o ranking) a ProductoViewModel.
 *
 * Reglas de diseño estricto:
 * 1. NO reutiliza identificadores de base de datos (`idApi: null`).
 * 2. Asigna un idGlobal con espacio de nombres `mock:<clave>` aislado.
 * 3. NO utiliza idMarca = 0.
 * 4. Mantiene la trazabilidad del origen ("ranking" si tiene ranking, de lo contrario "mock").
 * 5. Genera la FichaTecnicaV2 canónica y mantiene retrocompatibilidad con datosFichaTecnica v1.
 */
export function convertirKimovilAViewModel(
  dispositivo: DispositivoKimovil,
  opciones: OpcionesProductoViewModel = {}
): ProductoViewModel {
  const categoria = detectarCategoria(dispositivo);
  const categoriaEtiqueta = ETIQUETAS_CATEGORIA[categoria];
  const marca =
    dispositivo.marca?.trim() ||
    opciones.nombreMarca?.trim() ||
    "Marca no especificada";

  // Identificador mock seguro sin colisión con auto-incrementos de BD
  const esIdValido =
    typeof dispositivo.id === "number" &&
    Number.isSafeInteger(dispositivo.id) &&
    dispositivo.id > 0;

  const claveBase = esIdValido
    ? String(dispositivo.id)
    : generarClaveMockDeterminista(dispositivo);

  const idGlobal =
    opciones.idGlobal ?? (idGlobalMock(claveBase) ?? idGlobalMock("kimovil-item") ?? undefined);
  const claveMock = (idGlobal ? claveMockDe(idGlobal) : null) ?? claveBase;

  // El idProducto para mocks se mantiene diferenciado de IDs de BD positivos (entero negativo seguro)
  let idProducto = -1;
  if (
    typeof opciones.idProducto === "number" &&
    Number.isSafeInteger(opciones.idProducto) &&
    opciones.idProducto < 0
  ) {
    idProducto = opciones.idProducto;
  } else if (esIdValido) {
    idProducto = -Math.abs(dispositivo.id);
  } else {
    const huella = [
      dispositivo.nombre || "",
      dispositivo.marca || "",
      dispositivo.categoria || "",
      dispositivo.especificaciones || "",
      String(dispositivo.precio || 0),
    ].join("|");
    const intHash = (hashEnteroDeterminista(huella) % 999_999) + 1;
    idProducto = -intHash;
  }

  // Aplanar características para compatibilidad con v1
  const caracteristicasObj: Record<string, unknown> = {};
  if (dispositivo.especificaciones) {
    caracteristicasObj.resumen = dispositivo.especificaciones;
  }
  if (dispositivo.chipInfo) {
    caracteristicasObj.procesador = dispositivo.chipInfo;
  }
  if (dispositivo.detalleSpecs?.secciones) {
    for (const seccion of dispositivo.detalleSpecs.secciones) {
      if (seccion && seccion.titulo && seccion.descripcion) {
        caracteristicasObj[seccion.titulo] = seccion.descripcion;
      }
    }
  }
  if (dispositivo.detalleSpecs?.tiendas) {
    caracteristicasObj.tiendas = dispositivo.detalleSpecs.tiendas;
  }

  const especificaciones = extraerEspecificaciones(caracteristicasObj);
  const fichaV3Piloto = obtenerFichaTecnicaV3Piloto({
    id: dispositivo.id,
    nombre: dispositivo.nombre,
  });
  const datosFichaTecnica = fichaV3Piloto
    ? normalizarDatosFichaTecnica(null)
    : normalizarDatosFichaTecnica(caracteristicasObj);
  const tiendas = extraerTiendas(caracteristicasObj);
  const imagen = dispositivo.imagen?.trim() || null;

  const textoBusqueda = normalizarTexto(
    [
      dispositivo.nombre,
      marca,
      categoriaEtiqueta,
      dispositivo.especificaciones ?? "",
      ...Object.values(especificaciones).filter((v): v is string => Boolean(v)),
    ].join(" ")
  );

  const ratingCalculado =
    typeof dispositivo.puntuacion === "number" && Number.isFinite(dispositivo.puntuacion)
      ? Math.min(5, Math.max(0, dispositivo.puntuacion / 2))
      : normalizarRating(opciones.rating);

  let fichaTecnica: EstadoFichaTecnicaProducto;
  let fichaTecnicaV2: FichaTecnicaV2 | undefined;

  if (fichaV3Piloto) {
    fichaTecnica = {
      version: "v3",
      estado: "valida",
      original: fichaV3Piloto as unknown as Record<string, unknown>,
      ficha: fichaV3Piloto,
    };
    fichaTecnicaV2 = undefined;
  } else {
    const v2 = normalizarDesdeKimovil(dispositivo, {
      idGlobal: idGlobal ?? undefined,
      categoriaPorDefecto: categoria,
    });
    fichaTecnica = {
      version: "legacy",
      estado: "valida",
      original: caracteristicasObj,
      fichaV2: v2,
    };
    fichaTecnicaV2 = v2;
  }

  return {
    idProducto,
    idGlobal: idGlobal ?? undefined,
    origen: opciones.origen ?? (dispositivo.ranking ? "ranking" : "mock"),
    idApi: null,
    claveMock,
    nombre: dispositivo.nombre,
    marca,
    categoria,
    categoriaEtiqueta,
    imagen,
    precioCOP: sanearPrecioCOP(dispositivo.precio),
    precioFormateado: formatearCOP(dispositivo.precio),
    disponible: true,
    rating: ratingCalculado,
    cantidadResenas: normalizarCantidadResenas(opciones.cantidadResenas),
    especificaciones,
    datosFichaTecnica,
    fichaTecnicaV2,
    fichaTecnica,
    caracteristicas: detectarCaracteristicas(
      especificaciones,
      textoBusqueda
    ),
    textoBusqueda,
    posicionRanking: dispositivo.ranking ?? null,
    numeroTiendas: tiendas.length,
    precioDesdeCOP:
      tiendas.length > 0
        ? Math.min(...tiendas.map((tienda) => tienda.precio))
        : null,
  };
}

/**
 * Adaptador polimórfico universal que recibe una entidad desconocida (Producto,
 * DispositivoKimovil o ProductoViewModel previo) y devuelve una vista coherente
 * con tipado exhaustivo, idGlobal y FichaTecnicaV2.
 */
export function adaptarAProductoViewModel(
  origen: unknown,
  opciones: OpcionesProductoViewModel = {}
): ProductoViewModel | null {
  if (!origen || typeof origen !== "object") return null;

  const obj = origen as Record<string, unknown>;

  // Caso 1: ya es ProductoViewModel
  if ("especificaciones" in obj && "datosFichaTecnica" in obj && "categoriaEtiqueta" in obj) {
    const vm = obj as unknown as ProductoViewModel;
    if (!vm.fichaTecnicaV2 || !vm.idGlobal) {
      const idGlobal =
        vm.idGlobal ??
        (vm.idProducto > 0
          ? (idGlobalApi(vm.idProducto) ?? undefined)
          : (idGlobalMock(`mock-${Math.abs(vm.idProducto)}`) ?? undefined));
      const esFichaIndependienteV3 = vm.fichaTecnica?.version === "v3" || vm.fichaTecnica?.estado === "invalida";
      const fichaTecnicaV2 = vm.fichaTecnicaV2 ?? (esFichaIndependienteV3
        ? undefined
        : normalizarFichaTecnicaV2(vm.datosFichaTecnica, {
            idGlobal,
            categoriaPorDefecto: vm.categoria,
          }));
      return {
        ...vm,
        idGlobal,
        fichaTecnicaV2,
        origen: vm.origen ?? (vm.idProducto > 0 ? "api" : "mock"),
        idApi: vm.idApi !== undefined ? vm.idApi : (vm.idProducto > 0 ? vm.idProducto : null),
        claveMock:
          vm.claveMock !== undefined
            ? vm.claveMock
            : (vm.idProducto <= 0 ? String(Math.abs(vm.idProducto)) : null),
      };
    }
    return vm;
  }

  // Caso 2: es Producto de backend
  if ("idProducto" in obj && "nombre" in obj && typeof obj.idProducto === "number") {
    return crearProductoViewModel(obj as unknown as Producto, opciones);
  }

  // Caso 3: es DispositivoKimovil
  if ("ranking" in obj || ("id" in obj && "marca" in obj && !("idProducto" in obj))) {
    return convertirKimovilAViewModel(obj as unknown as DispositivoKimovil, opciones);
  }

  return null;
}

/**
 * Obtiene el IdProductoGlobal canónico de un ProductoViewModel.
 * Si no está presente, lo reconstruye a partir del origen o idProducto.
 */
export function idGlobalDeViewModel(
  vm: ProductoViewModel
): IdProductoGlobal | null {
  if (!vm || typeof vm !== "object") return null;
  if (vm.idGlobal) return vm.idGlobal;
  if (typeof vm.idProducto === "number" && Number.isSafeInteger(vm.idProducto) && vm.idProducto > 0) {
    return idGlobalApi(vm.idProducto);
  }
  if (typeof vm.idProducto === "number" && Number.isSafeInteger(vm.idProducto) && vm.idProducto < 0) {
    return idGlobalMock(`mock-${Math.abs(vm.idProducto)}`);
  }
  return null;
}

/**
 * Obtiene el ID numérico de base de datos de un ProductoViewModel únicamente
 * si el producto proviene legítimamente del backend API. Para mocks y rankings
 * siempre retorna null.
 */
export function idApiDeViewModel(vm: ProductoViewModel): number | null {
  if (!vm || typeof vm !== "object") return null;
  if (vm.origen === "mock" || vm.origen === "ranking") return null;
  if (vm.idGlobal) return idProductoApiDe(vm.idGlobal);
  if (typeof vm.idApi === "number" && Number.isSafeInteger(vm.idApi) && vm.idApi > 0) {
    return vm.idApi;
  }
  return typeof vm.idProducto === "number" && Number.isSafeInteger(vm.idProducto) && vm.idProducto > 0
    ? vm.idProducto
    : null;
}
