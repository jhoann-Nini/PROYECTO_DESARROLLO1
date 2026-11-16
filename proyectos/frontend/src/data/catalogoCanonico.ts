import type {
  CategoriaDispositivo,
  DispositivoKimovil,
  Producto,
} from "@/types/producto";
import {
  DISPOSITIVOS_DESEADOS,
  DISPOSITIVOS_VENDIDOS,
  PRODUCTOS_MOCK,
  ULTIMAS_OFERTAS,
} from "./mockProductos";

/**
 * Las claves canónicas identifican modelos; no sustituyen los IDs de API,
 * ranking u objetos mock. Las referencias conservan el origen y su ID original.
 */
export type ColeccionOrigenCanonica =
  | "vendidos"
  | "deseados"
  | "ofertas"
  | "mock";

export interface ReferenciaProductoCanonico {
  coleccion: ColeccionOrigenCanonica;
  idRegistro: number;
  /** Variante conocida en la fuente. null significa que la fuente no la precisa. */
  varianteId: string | null;
}

export interface VarianteProductoCanonico {
  id: string;
  nombre: string;
  ram?: string | null;
  almacenamiento?: string | null;
  color?: string | null;
  mercado?: string | null;
}

export type EstadoImagenCanonica = "pendiente" | "sin_imagen";

export interface ImagenProductoCanonico {
  url: string | null;
  proveedor: string | null;
  referenciaOrigen: string;
  licencia: string | null;
  atribucion: string | null;
  estadoVerificacion: EstadoImagenCanonica;
}

export interface ProductoCanonico {
  id: string;
  nombre: string;
  marca: string;
  categoria: CategoriaDispositivo;
  /** Los datos mock no se consideran verificados por estar presentes en código. */
  estadoVerificacion: "pendiente";
  referencias: ReferenciaProductoCanonico[];
  variantes: VarianteProductoCanonico[];
}

export interface ProductoCanonicoResuelto extends ProductoCanonico {
  registros: Array<DispositivoKimovil | Producto>;
  imagen: ImagenProductoCanonico;
}

const referencia = (
  coleccion: ColeccionOrigenCanonica,
  idRegistro: number,
  varianteId: string | null = null,
): ReferenciaProductoCanonico => ({ coleccion, idRegistro, varianteId });

/**
 * Piloto controlado de ocho modelos. No se copian precios, puntuaciones ni
 * especificaciones a esta identidad: permanecen en sus registros de origen.
 */
export const CATALOGO_CANONICO_PILOTO: readonly ProductoCanonico[] = [
  {
    id: "nothing-phone-2a-special-edition",
    nombre: "Nothing Phone (2a) Special Edition",
    marca: "Nothing",
    categoria: "moviles",
    estadoVerificacion: "pendiente",
    referencias: [referencia("mock", 1, "12gb-256gb")],
    variantes: [
      {
        id: "12gb-256gb",
        nombre: "12 GB RAM · 256 GB",
        ram: "12 GB",
        almacenamiento: "256 GB",
      },
    ],
  },
  {
    id: "samsung-galaxy-s24-ultra",
    nombre: "Samsung Galaxy S24 Ultra",
    marca: "Samsung",
    categoria: "moviles",
    estadoVerificacion: "pendiente",
    referencias: [
      referencia("deseados", 202),
      referencia("ofertas", 300, "512gb"),
    ],
    variantes: [
      {
        id: "512gb",
        nombre: "512 GB",
        almacenamiento: "512 GB",
      },
    ],
  },
  {
    id: "oneplus-pad-2",
    nombre: "OnePlus Pad 2",
    marca: "OnePlus",
    categoria: "tablets",
    estadoVerificacion: "pendiente",
    referencias: [
      referencia("vendidos", 108, "12gb-256gb"),
      referencia("ofertas", 303, "12gb-256gb"),
      referencia("mock", 5, "12gb-256gb"),
    ],
    variantes: [
      {
        id: "12gb-256gb",
        nombre: "12 GB RAM · 256 GB",
        ram: "12 GB",
        almacenamiento: "256 GB",
      },
    ],
  },
  {
    id: "apple-ipad-pro-11-m4",
    nombre: "Apple iPad Pro 11 pulgadas M4",
    marca: "Apple",
    categoria: "tablets",
    estadoVerificacion: "pendiente",
    referencias: [referencia("deseados", 208, "8gb-512gb")],
    variantes: [
      {
        id: "8gb-512gb",
        nombre: "8 GB memoria unificada · 512 GB",
        ram: "8 GB memoria unificada",
        almacenamiento: "512 GB",
      },
    ],
  },
  {
    id: "lenovo-thinkpad-e14-gen-5",
    nombre: "Lenovo ThinkPad E14 Gen 5",
    marca: "Lenovo",
    categoria: "laptops",
    estadoVerificacion: "pendiente",
    referencias: [referencia("mock", 6, "16gb-512gb")],
    variantes: [
      {
        id: "16gb-512gb",
        nombre: "16 GB RAM · 512 GB SSD",
        ram: "16 GB",
        almacenamiento: "512 GB SSD",
      },
    ],
  },
  {
    id: "apple-macbook-pro-16-m3-max",
    nombre: "Apple MacBook Pro 16 pulgadas M3 Max",
    marca: "Apple",
    categoria: "laptops",
    estadoVerificacion: "pendiente",
    referencias: [referencia("deseados", 209, "36gb-1tb")],
    variantes: [
      {
        id: "36gb-1tb",
        nombre: "36 GB memoria unificada · 1 TB SSD",
        ram: "36 GB memoria unificada",
        almacenamiento: "1 TB SSD",
      },
    ],
  },
  {
    id: "nothing-ear-2",
    nombre: "Nothing Ear (2)",
    marca: "Nothing",
    categoria: "auriculares",
    estadoVerificacion: "pendiente",
    referencias: [referencia("mock", 3, "transparent-white")],
    variantes: [
      {
        id: "transparent-white",
        nombre: "Transparent White",
        color: "Transparent White",
      },
    ],
  },
  {
    id: "sony-wh-1000xm5",
    nombre: "Sony WH-1000XM5",
    marca: "Sony",
    categoria: "auriculares",
    estadoVerificacion: "pendiente",
    referencias: [referencia("vendidos", 109)],
    variantes: [],
  },
] as const;

function buscarRegistro(
  origen: ReferenciaProductoCanonico,
): DispositivoKimovil | Producto | null {
  switch (origen.coleccion) {
    case "vendidos":
      return DISPOSITIVOS_VENDIDOS.find((item) => item.id === origen.idRegistro) ?? null;
    case "deseados":
      return DISPOSITIVOS_DESEADOS.find((item) => item.id === origen.idRegistro) ?? null;
    case "ofertas":
      return ULTIMAS_OFERTAS.find((item) => item.id === origen.idRegistro) ?? null;
    case "mock":
      return PRODUCTOS_MOCK.find((item) => item.idProducto === origen.idRegistro) ?? null;
  }
}

function imagenDeRegistro(
  registro: DispositivoKimovil | Producto,
  referenciaOrigen: ReferenciaProductoCanonico,
): ImagenProductoCanonico {
  const url = typeof registro.imagen === "string" && registro.imagen.trim()
    ? registro.imagen.trim()
    : null;

  let proveedor: string | null = null;
  if (url) {
    try {
      proveedor = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      proveedor = null;
    }
  }

  return {
    url,
    proveedor,
    referenciaOrigen: `${referenciaOrigen.coleccion}:${referenciaOrigen.idRegistro}`,
    // No se atribuye una licencia ni autoría sin metadatos de la imagen concreta.
    licencia: null,
    atribucion: null,
    estadoVerificacion: url ? "pendiente" : "sin_imagen",
  };
}

export function obtenerProductoCanonico(
  id: string,
): ProductoCanonicoResuelto | null {
  const producto = CATALOGO_CANONICO_PILOTO.find((item) => item.id === id);
  if (!producto) return null;

  const registros = producto.referencias
    .map(buscarRegistro)
    .filter((registro): registro is DispositivoKimovil | Producto => registro !== null);

  const indiceImagen = producto.referencias.findIndex((origen) => {
    const registro = buscarRegistro(origen);
    return Boolean(registro?.imagen?.trim());
  });
  const referenciaImagen = indiceImagen >= 0
    ? producto.referencias[indiceImagen]
    : producto.referencias[0];
  const registroImagen = referenciaImagen
    ? buscarRegistro(referenciaImagen)
    : null;

  const imagen = registroImagen && referenciaImagen
    ? imagenDeRegistro(registroImagen, referenciaImagen)
    : {
        url: null,
        proveedor: null,
        referenciaOrigen: "sin_referencia",
        licencia: null,
        atribucion: null,
        estadoVerificacion: "sin_imagen" as const,
      };

  return { ...producto, registros, imagen };
}

export function obtenerCatalogoCanonicoPiloto(): ProductoCanonicoResuelto[] {
  return CATALOGO_CANONICO_PILOTO.map((producto) => {
    const resuelto = obtenerProductoCanonico(producto.id);
    if (!resuelto) {
      throw new Error(`No se pudo resolver el producto canónico: ${producto.id}`);
    }
    return resuelto;
  });
}

/**
 * Comprueba integridad referencial del piloto sin alterar los datos originales.
 */
export function validarCatalogoCanonicoPiloto(): string[] {
  const errores: string[] = [];
  const ids = new Set<string>();
  const referenciasUsadas = new Set<string>();

  for (const producto of CATALOGO_CANONICO_PILOTO) {
    if (ids.has(producto.id)) {
      errores.push(`ID canónico duplicado: ${producto.id}`);
    }
    ids.add(producto.id);

    const variantes = new Set(producto.variantes.map((variante) => variante.id));
    for (const origen of producto.referencias) {
      const clave = `${origen.coleccion}:${origen.idRegistro}`;
      if (referenciasUsadas.has(clave)) {
        errores.push(`Referencia de origen asignada más de una vez: ${clave}`);
      }
      referenciasUsadas.add(clave);

      if (!buscarRegistro(origen)) {
        errores.push(`No existe el registro de origen: ${clave}`);
      }
      if (origen.varianteId && !variantes.has(origen.varianteId)) {
        errores.push(
          `La referencia ${clave} apunta a una variante inexistente: ${origen.varianteId}`,
        );
      }
    }
  }

  return errores;
}
