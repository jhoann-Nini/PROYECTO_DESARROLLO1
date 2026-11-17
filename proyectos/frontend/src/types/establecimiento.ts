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
