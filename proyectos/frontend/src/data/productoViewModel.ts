import type { CategoriaDispositivo, Producto } from "@/types/producto";
import { detectarCategoria, formatearCOP } from "./specsHelper";
import { normalizarPrecioCOP } from "./precios";

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
  caracteristicas: CaracteristicaClave[];
  textoBusqueda: string;
}

export interface OpcionesProductoViewModel {
  rating?: number | null;
  cantidadResenas?: number | null;
  nombreMarca?: string | null;
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
    .replace(/^_+|_+$/g, "");
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
  const imagen = producto.imagen?.trim() || null;
  const textoBusqueda = construirTextoBusqueda(
    producto,
    marca,
    categoriaEtiqueta,
    especificaciones
  );

  return {
    idProducto: producto.idProducto,
    nombre: producto.nombre,
    marca,
    categoria,
    categoriaEtiqueta,
    imagen,
    precioCOP: normalizarPrecioCOP(producto.precioReferencia),
    precioFormateado: formatearCOP(producto.precioReferencia),
    disponible: producto.estado === true,
    rating: normalizarRating(opciones.rating),
    cantidadResenas: normalizarCantidadResenas(opciones.cantidadResenas),
    especificaciones,
    caracteristicas: detectarCaracteristicas(
      especificaciones,
      textoBusqueda
    ),
    textoBusqueda,
  };
}
