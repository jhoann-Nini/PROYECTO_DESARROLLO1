/**
 * Tipos de establecimientos según los contratos públicos y administrativos
 * del backend (`EstablecimientoResponse` y `EstablecimientoUpdateRequest`).
 */

export interface Establecimiento {
  idEstablecimiento: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  descripcion: string | null;
  latitud: number | null;
  longitud: number | null;
  estado: boolean;
  /** Verificación administrativa (TEC-151). Opcional por compatibilidad. */
  verificado?: boolean;
}

/**
 * Datos editables de un establecimiento. No incluye `estado` ni las
 * asignaciones de representantes: el backend no permite cambiarlos por esta vía.
 */
export interface EstablecimientoRequest {
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  descripcion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}

/** Oferta producto–tienda vista por un administrador (Fase 3). */
export interface OfertaAdmin {
  idProducto: number;
  nombreProducto: string;
  idEstablecimiento: number;
  nombreEstablecimiento: string;
  establecimientoActivo: boolean;
  establecimientoVerificado: boolean;
  precio: number | null;
  disponibilidad: boolean;
  urlOferta: string | null;
  fechaActualizacionPrecio: string;
  reportesAbiertos: number;
}

/** Datos que envía el administrador. La fecha la decide el servidor. */
export interface OfertaAdminRequest {
  precio: number;
  disponibilidad: boolean;
  urlOferta?: string;
}
