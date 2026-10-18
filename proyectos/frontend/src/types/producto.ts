export interface Producto {
  idProducto: number;
  nombre: string;
  descripcion: string | null;
  idCategoria: number;
  idMarca: number;
  imagen: string | null;
  precioReferencia: number | null;
  estado: boolean;
  nombreCategoria?: string;
  nombreMarca?: string;
}

/**
 * DTO para la creación y actualización de productos (ProductoRequest en Spring Boot).
 */
export interface ProductoRequest {
  nombre: string;
  descripcion?: string | null;
  idCategoria: number;
  idMarca: number;
  imagen?: string | null;
  precioReferencia?: number | null;
}

/**
 * DTO de respuesta para productos (ProductoResponse en Spring Boot).
 */
export type ProductoResponse = Producto;

/**
 * DTO para la creación y actualización de categorías (CategoriaRequest en Spring Boot).
 */
export interface CategoriaRequest {
  nombre: string;
  descripcion?: string | null;
}

/**
 * DTO de respuesta para categorías (CategoriaResponse en Spring Boot).
 */
export interface CategoriaResponse {
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}

/**
 * DTO para la creación y actualización de marcas (MarcaRequest en Spring Boot).
 */
export interface MarcaRequest {
  nombre: string;
  descripcion?: string | null;
}

/**
 * DTO de respuesta para marcas (MarcaResponse en Spring Boot).
 */
export interface MarcaResponse {
  idMarca: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}


export type CategoriaDispositivo = "moviles" | "tablets" | "laptops" | "auriculares";

export interface SeccionHardware {
  icono: string;
  titulo: string;
  descripcion: string;
  detalleExtra?: string;
}

export interface MetricaPuntuacion {
  nombre: string;
  puntos: number;
}

export interface TiendaPrecio {
  nombre: string;
  precio: number;
  envioGratis: boolean;
  url?: string;
}

export interface EspecificacionesDetalladas {
  categoriaTipo?: CategoriaDispositivo;
  secciones?: SeccionHardware[];
  metricas?: MetricaPuntuacion[];
  benchmarkEtiqueta?: string;
  benchmarkValor?: string;
  tiendas?: TiendaPrecio[];

  // Campos heredados / retrocompatibles
  pantalla?: string;
  procesador?: string;
  ramAlmacenamiento?: string;
  camaras?: string;
  bateriaCarga?: string;
  sistemaOperativo?: string;
  conectividad?: string;
  antutuScore?: string;
  puntuaciones?: {
    rendimiento: number;
    camara: number;
    bateria: number;
    pantalla: number;
    calidadPrecio: number;
  };
}

export interface DispositivoKimovil {
  id: number;
  ranking: number;
  nombre: string;
  marca: string;
  especificaciones: string;
  puntuacion: number;
  precio: number;
  precioOriginal?: number;
  descuento?: string;
  tendencia: "sube" | "baja" | "igual";
  cambioRanking: number;
  imagen: string;
  tipo: "vendido" | "deseado" | "oferta";
  categoria?: string;
  chipInfo?: string;
  vendedor?: string;
  detalleSpecs?: EspecificacionesDetalladas;
}

export interface UsuarioSesion {
  id: string;
  nombre: string;
  usuario: string;
  email: string;
  avatar?: string;
  rol?: string;
  idUsuario?: number;
  activo?: boolean;
  fechaRegistro?: string;
}

export type RolSistema = "Usuario registrado" | "Administrador" | "Representante de establecimiento";

export const ROLES_SISTEMA = {
  USUARIO_REGISTRADO: "Usuario registrado",
  ADMINISTRADOR: "Administrador",
  REPRESENTANTE: "Representante de establecimiento",
} as const;

/**
 * Valida si la sesión tiene rol de Administrador confirmado por el backend.
 * Compara de forma estricta e insensible a mayúsculas/minúsculas.
 */
export function esAdministrador(usuario?: UsuarioSesion | null): boolean {
  if (!usuario?.rol) return false;
  return usuario.rol.trim().toLowerCase() === "administrador";
}

/**
 * Valida si la sesión tiene rol de Representante de establecimiento confirmado por el backend.
 */
export function esRepresentante(usuario?: UsuarioSesion | null): boolean {
  if (!usuario?.rol) return false;
  return usuario.rol.trim().toLowerCase() === "representante de establecimiento";
}

/**
 * Valida si la sesión tiene rol de Usuario registrado confirmado por el backend.
 */
export function esUsuarioRegistrado(usuario?: UsuarioSesion | null): boolean {
  if (!usuario?.rol) return false;
  return usuario.rol.trim().toLowerCase() === "usuario registrado";
}