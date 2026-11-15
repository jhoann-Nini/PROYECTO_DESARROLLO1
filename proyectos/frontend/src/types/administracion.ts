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
