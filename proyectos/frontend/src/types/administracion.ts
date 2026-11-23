/**
 * Tipos de las consultas administrativas de cuentas y roles.
 * Reflejan `UsuarioAdminResponse` y `RolResponse` del backend.
 */

export interface UsuarioAdmin {
  idUsuario: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  fechaRegistro: string;
  roles: string[];
}

export interface RolAdmin {
  idRol: number;
  nombre: string;
  descripcion: string | null;
}

/** Categoría de un término de moderación agregado (Caso 6, migración 027). */
export type CategoriaTerminoModeracion = "AMENAZA" | "ACOSO" | "DISCRIMINACION" | "INSULTO" | "SPAM";

/** `GET /api/admin/terminos-moderacion`. */
export interface TerminoModeracion {
  idTermino: number;
  termino: string;
  categoria: CategoriaTerminoModeracion;
  etiquetaCategoria: string;
  activo: boolean;
  creadoPor: string | null;
  fechaCreacion: string;
  desactivadoPor: string | null;
  fechaDesactivacion: string | null;
}
