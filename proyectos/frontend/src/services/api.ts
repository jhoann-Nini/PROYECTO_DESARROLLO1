import { createClient } from "@/lib/supabase/client";
import type { UsuarioSesion } from "@/types/producto";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export interface FetchOptions extends RequestInit {
  /**
   * Indica si la petición requiere adjuntar el token de acceso de Supabase Auth
   * en el encabezado Authorization: Bearer <token>.
   */
  requiresAuth?: boolean;
  /**
   * Token Bearer explícito para enviar en la cabecera Authorization sin consultar getSession().
   */
  accessToken?: string;
}

/**
 * Obtiene el access_token de la sesión activa de Supabase Auth de forma segura.
 * Si no hay sesión o falla la lectura, retorna null sin exponer información sensible.
 */
async function obtenerTokenAcceso(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (!error && session?.access_token) {
      return session.access_token;
    }
    return null;
  } catch {
    // Si Supabase no está configurado en el entorno o la lectura falla
    return null;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options?: FetchOptions,
): Promise<T> {
  if (!API_URL) {
    throw new ApiError("No se ha configurado la URL de la API.");
  }

  const url = `${API_URL.replace(/\/$/, "")}${endpoint}`;
  let respuesta: Response;

  try {
    if (options) {
      const headers = new Headers(options.headers);

      if (options.requiresAuth) {
        const token = options.accessToken || (await obtenerTokenAcceso());
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        } else if (!headers.has("Authorization")) {
          throw new ApiError(
            "No se encontró una sesión de autenticación activa para autorizar la petición.",
            401,
          );
        }
      }

      if (options.body && !headers.has("Content-Type") && typeof options.body === "string") {
        headers.set("Content-Type", "application/json");
      }

      const init: RequestInit = {
        ...options,
        headers,
      };
      delete (init as { requiresAuth?: boolean }).requiresAuth;
      delete (init as { accessToken?: string }).accessToken;
      respuesta = await fetch(url, init);
    } else {
      respuesta = await fetch(url);
    }
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      "No fue posible conectarse con el servidor. Verifica que el backend esté activo e inténtalo de nuevo.",
    );
  }

  if (!respuesta.ok) {
    let mensajeError = `El servidor respondió con un error (${respuesta.status}). Inténtalo de nuevo más tarde.`;
    if (typeof (respuesta as unknown as { json?: unknown }).json === "function") {
      try {
        const cuerpoError = await respuesta.json();
        if (cuerpoError && typeof cuerpoError.message === "string" && cuerpoError.message.trim()) {
          mensajeError = cuerpoError.message.trim();
        } else if (cuerpoError && typeof cuerpoError.error === "string" && cuerpoError.error.trim()) {
          mensajeError = cuerpoError.error.trim();
        }
      } catch {
        // Si no es JSON legible, conservar mensaje genérico con status
      }
    }
    throw new ApiError(mensajeError, respuesta.status);
  }

  try {
    return (await respuesta.json()) as T;
  } catch {
    throw new ApiError(
      "El servidor respondió, pero los datos recibidos no son JSON válido.",
    );
  }
}

/**
 * Helper tipado para peticiones que requieren obligatoriamente autenticación Bearer.
 */
export async function apiFetchAutenticado<T>(
  endpoint: string,
  options?: Omit<FetchOptions, "requiresAuth">,
): Promise<T> {
  return apiFetch<T>(endpoint, { ...options, requiresAuth: true });
}

export async function obtenerProductos<T = unknown>(): Promise<T[]> {
  const datos = await apiFetch<unknown>("/api/productos");

  if (!Array.isArray(datos)) {
    throw new ApiError(
      "La respuesta del servidor no tiene el formato esperado (lista de productos).",
    );
  }

  return datos as T[];
}

/**
 * Respuesta del endpoint de perfil del backend Spring Boot (GET /api/usuarios/me).
 */
export interface UsuarioMeResponse {
  idUsuario: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  fechaRegistro: string;
}

/**
 * Mapa de promesas en vuelo para deduplicar peticiones concurrentes a obtenerMiPerfil.
 * Cada entrada se elimina inmediatamente al finalizar la petición (.finally()),
 * garantizando que no se retengan tokens ni perfiles en memoria persistente.
 */
const solicitudesPerfilEnCurso = new Map<string, Promise<UsuarioMeResponse>>();

/**
 * Consulta el perfil del usuario autenticado en Spring Boot (GET /api/usuarios/me).
 * Si el usuario no existía en la base de datos de negocio, Spring Boot lo aprovisiona JIT.
 *
 * @param token Token de acceso Bearer opcional. Si no se pasa, se obtiene de la sesión de Supabase.
 * @returns El perfil de negocio retornado por el backend.
 */
export async function obtenerMiPerfil(token?: string): Promise<UsuarioMeResponse> {
  const tokenEfectivo = token || (await obtenerTokenAcceso());
  if (!tokenEfectivo) {
    throw new ApiError(
      "No se encontró una sesión de autenticación activa para autorizar la petición.",
      401,
    );
  }

  const claveCache = tokenEfectivo;
  const promesaEnVuelo = solicitudesPerfilEnCurso.get(claveCache);
  if (promesaEnVuelo) {
    return promesaEnVuelo;
  }

  const promesa = apiFetch<UsuarioMeResponse>("/api/usuarios/me", {
    method: "GET",
    requiresAuth: true,
    accessToken: tokenEfectivo,
  }).finally(() => {
    solicitudesPerfilEnCurso.delete(claveCache);
  });

  solicitudesPerfilEnCurso.set(claveCache, promesa);
  return promesa;
}

/**
 * Mapea el perfil de negocio validado por Spring Boot hacia el objeto de sesión del frontend,
 * garantizando que el nombre, correo, rol y estado provengan de la base de datos de negocio.
 */
export function mapearPerfilABusinessSession(
  perfil: UsuarioMeResponse,
  user?: { id?: string; user_metadata?: Record<string, unknown> } | null,
): UsuarioSesion {
  const metadata = user?.user_metadata || {};
  const email = perfil.correo;
  const fallbackUsername = email.split("@")[0] || "usuario";

  return {
    id: user?.id || String(perfil.idUsuario),
    nombre: perfil.nombre,
    usuario: String(metadata.usuario || metadata.user_name || fallbackUsername),
    email: perfil.correo,
    rol: perfil.rol,
    idUsuario: perfil.idUsuario,
    activo: perfil.activo,
    fechaRegistro: perfil.fechaRegistro,
    avatar: metadata.avatar_url
      ? String(metadata.avatar_url)
      : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  };
}

/**
 * Representación de una reseña devuelta por la API REST de TecReview.
 */
export interface ResenaResponse {
  idResena: number;
  idProducto: number;
  nombreProducto: string;
  idUsuario: number;
  nombreUsuario: string;
  comentario: string;
  fechaCreacion: string;
  estado: boolean;
}

/**
 * Payload para crear una reseña en el backend.
 */
export interface CrearResenaRequest {
  idProducto: number;
  comentario: string;
}

/**
 * Consulta las reseñas persistidas desde el backend de Spring Boot.
 *
 * @param idProducto Opcional. Si se provee, filtra las reseñas por el producto especificado.
 * @returns Lista de reseñas activas ordenadas de forma descendente por fecha.
 */
export async function obtenerResenas(idProducto?: number): Promise<ResenaResponse[]> {
  const query = idProducto ? `?idProducto=${idProducto}` : "";
  const datos = await apiFetch<unknown>(`/api/resenas${query}`);

  if (!Array.isArray(datos)) {
    throw new ApiError(
      "La respuesta del servidor no tiene el formato esperado (lista de reseñas).",
    );
  }

  return datos as ResenaResponse[];
}

/**
 * Envía una nueva reseña al backend de Spring Boot requiriendo autenticación Bearer.
 * La identidad del autor se valida en el backend exclusivamente a partir del token JWT.
 *
 * @param request Datos de la reseña (idProducto y comentario).
 * @returns La reseña persistida en la base de datos.
 */
export async function crearResena(request: CrearResenaRequest): Promise<ResenaResponse> {
  return apiFetchAutenticado<ResenaResponse>("/api/resenas", {
    method: "POST",
    body: JSON.stringify(request),
  });
}