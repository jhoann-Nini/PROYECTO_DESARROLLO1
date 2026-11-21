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
  caracteristicas?: Record<string, unknown> | null;
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
  caracteristicas?: Record<string, unknown> | null;
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

// ============================================================================
// DTOs DE RANKINGS (Fase 4.4 / 4.5)
// ============================================================================

export interface ProductoMejorValorado {
  idProducto: number;
  nombre: string;
  descripcion: string | null;
  idCategoria: number;
  idMarca: number;
  imagen: string | null;
  precioReferencia: number | null;
  caracteristicas?: Record<string, unknown> | null;
  promedioPuntuacion: number;
  cantidadValoraciones: number;
  posicionRanking: number;
}

export interface ProductoDeseado {
  idProducto: number;
  nombre: string;
  descripcion: string | null;
  idCategoria: number;
  idMarca: number;
  imagen: string | null;
  precioReferencia: number | null;
  caracteristicas?: Record<string, unknown> | null;
  cantidadDeseados: number;
  posicionRanking: number;
}

export interface ProductoMasComentado {
  idProducto: number;
  nombre: string;
  descripcion: string | null;
  idCategoria: number;
  idMarca: number;
  imagen: string | null;
  precioReferencia: number | null;
  caracteristicas?: Record<string, unknown> | null;
  cantidadResenas: number;
  posicionRanking: number;
}

export interface ProductoOferta {
  idProducto: number;
  nombre: string;
  descripcion: string | null;
  idCategoria: number;
  idMarca: number;
  imagen: string | null;
  caracteristicas?: Record<string, unknown> | null;
  precioReferencia: number;
  precioActual: number;
  ahorroMonetario: number;
  porcentajeDescuento: number;
  idEstablecimiento: number;
  nombreEstablecimiento: string;
  posicionRanking: number;
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
  verificada?: boolean;
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

/**
 * Resumen público de ofertas disponibles de un producto (Fase 4,
 * `GET /api/productos/resumen-ofertas`). Un producto sin ofertas no aparece.
 */
export interface ResumenOfertasProducto {
  idProducto: number;
  tiendasDisponibles: number;
  menorPrecio: number | null;
  fechaActualizacionMasReciente: string | null;
}

export interface UsuarioSesion {
  id: string;
  nombre: string;
  usuario: string;
  email: string;
  avatar?: string;
  rol?: string;
  /**
   * Roles activos confirmados por el backend. Para cuentas multirrol,
   * `rol` conserva el rol principal y este arreglo contiene todos los vigentes.
   */
  roles?: string[];
  idUsuario?: number;
  activo?: boolean;
  fechaRegistro?: string;
}

export type RolSistema =
  | "Usuario registrado"
  | "Moderador"
  | "Administrador"
  | "Representante de establecimiento";

export const ROLES_SISTEMA = {
  USUARIO_REGISTRADO: "Usuario registrado",
  MODERADOR: "Moderador",
  ADMINISTRADOR: "Administrador",
  REPRESENTANTE: "Representante de establecimiento",
} as const;

/**
 * Comprueba si la sesión tiene un rol activo, ya sea el principal o uno de
 * los roles adicionales de una cuenta multirrol. El backend sigue siendo la
 * autoridad final de autorización.
 */
function tieneRol(usuario: UsuarioSesion | null | undefined, rol: string): boolean {
  // El estado debe estar confirmado por /api/usuarios/me. Si falta o es false,
  // no mostramos capacidades asociadas a roles potencialmente obsoletos.
  if (!usuario || usuario.activo !== true) return false;

  const objetivo = rol.trim().toLowerCase();
  const roles = [usuario.rol, ...(usuario.roles ?? [])].filter(
    (valor): valor is string => typeof valor === "string",
  );
  return roles.some((valor) => valor.trim().toLowerCase() === objetivo);
}

/**
 * Valida si la sesión tiene rol de Moderador confirmado por el backend.
 * Compara de forma estricta e insensible a mayúsculas/minúsculas.
 */
export function esModerador(usuario?: UsuarioSesion | null): boolean {
  return tieneRol(usuario, "Moderador");
}

/**
 * Valida si la sesión puede consultar la cola de moderación: Moderador o
 * Administrador activo. El backend sigue siendo la autoridad final.
 */
export function puedeModerar(usuario?: UsuarioSesion | null): boolean {
  return esModerador(usuario) || esAdministrador(usuario);
}

/**
 * Valida si la sesión tiene rol de Administrador confirmado por el backend.
 * Compara de forma estricta e insensible a mayúsculas/minúsculas.
 */
export function esAdministrador(usuario?: UsuarioSesion | null): boolean {
  return tieneRol(usuario, "Administrador");
}

/**
 * Valida si la sesión tiene rol de Representante de establecimiento confirmado por el backend.
 */
export function esRepresentante(usuario?: UsuarioSesion | null): boolean {
  return tieneRol(usuario, "Representante de establecimiento");
}

/**
 * Valida si la sesión tiene rol de Usuario registrado confirmado por el backend.
 */
export function esUsuarioRegistrado(usuario?: UsuarioSesion | null): boolean {
  return tieneRol(usuario, "Usuario registrado");
}

