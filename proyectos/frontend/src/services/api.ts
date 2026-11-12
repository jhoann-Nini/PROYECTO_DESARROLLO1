import { createClient } from "@/lib/supabase/client";
import type {
  UsuarioSesion,
  ProductoRequest,
  ProductoResponse,
  CategoriaRequest,
  CategoriaResponse,
  MarcaRequest,
  MarcaResponse,
  ProductoMejorValorado,
  ProductoDeseado,
  ProductoMasComentado,
  ProductoOferta,
} from "@/types/producto";
import type {
  FiltrosResenasReportadas,
  ResenaReportadaResponse,
} from "@/types/moderacion";

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

  if (respuesta.status === 204) {
    return undefined as unknown as T;
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
 * Consulta únicamente los productos activos de una categoría real.
 * El identificador debe provenir de `GET /api/categorias`; nunca se asume
 * un ID fijo para celulares, tablets, portátiles o auriculares.
 */
export async function obtenerProductosPorCategoria<T = unknown>(
  idCategoria: number,
): Promise<T[]> {
  if (!Number.isInteger(idCategoria) || idCategoria <= 0) {
    throw new ApiError(
      "El identificador de categoría debe ser un número entero positivo.",
      400,
    );
  }

  const datos = await apiFetch<unknown>(
    `/api/productos?idCategoria=${idCategoria}`,
  );

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
  puntuacion?: number | null;
  fechaCreacion: string;
  estado: boolean;
}

/**
 * Payload para crear una reseña en el backend.
 */
export interface CrearResenaRequest {
  idProducto: number;
  comentario: string;
  puntuacion?: number;
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

/**
 * Actualiza una reseña existente. Requiere autenticación Bearer y ser el autor.
 *
 * @param idResena Identificador de la reseña a modificar.
 * @param comentario Contenido actualizado de la opinión (obligatorio, máx 1000 caracteres).
 * @param puntuacion Calificación opcional de 1 a 5 estrellas.
 * @returns La reseña actualizada en el backend.
 */
export async function editarResena(
  idResena: number,
  comentario: string,
  puntuacion?: number | null,
): Promise<ResenaResponse> {
  const payload: { comentario: string; puntuacion?: number } = {
    comentario: comentario.trim(),
  };
  if (puntuacion !== undefined && puntuacion !== null) {
    payload.puntuacion = puntuacion;
  }
  return apiFetchAutenticado<ResenaResponse>(`/api/resenas/${idResena}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Elimina una reseña existente. Requiere autenticación.
 * Contrato pendiente de MG (TEC-76/77/78).
 */
export async function eliminarResena(idResena: number): Promise<void> {
  return apiFetchAutenticado<void>(`/api/resenas/${idResena}`, {
    method: "DELETE",
  });
}

/**
 * Crea un reporte persistente sobre una reseña. Requiere una sesión autenticada.
 * La identidad del reportante se obtiene exclusivamente del JWT en el backend.
 */
export interface CrearReporteResenaRequest {
  motivo: "spam" | "lenguaje-ofensivo" | "falso" | "otro";
  descripcion?: string;
}

export async function crearReporteResena(
  idResena: number,
  request: CrearReporteResenaRequest,
): Promise<void> {
  await apiFetchAutenticado<unknown>(`/api/resenas/${idResena}/reportes`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Consulta la cola de reseñas reportadas. Requiere rol Moderador o
 * Administrador activo; el backend valida el JWT y devuelve 403 en caso
 * contrario.
 */
export async function obtenerResenasReportadas(
  filtros: FiltrosResenasReportadas = {},
): Promise<ResenaReportadaResponse[]> {
  const parametros = new URLSearchParams();
  if (filtros.estado) parametros.set("estado", filtros.estado);
  if (filtros.oculta !== undefined) {
    parametros.set("oculta", String(filtros.oculta));
  }
  if (filtros.idProducto !== undefined) {
    parametros.set("idProducto", String(filtros.idProducto));
  }

  const query = parametros.toString();
  const datos = await apiFetchAutenticado<unknown>(
    `/api/moderacion/resenas/reportadas${query ? `?${query}` : ""}`,
  );

  if (!Array.isArray(datos)) {
    throw new ApiError(
      "La respuesta del servidor no tiene el formato esperado (lista de reseñas reportadas).",
    );
  }

  return datos as ResenaReportadaResponse[];
}

async function accionModeracionResena(
  idResena: number,
  accion: "ocultar" | "publicar" | "rechazar-reportes",
  motivo?: string,
): Promise<ResenaReportadaResponse> {
  const body = motivo ? JSON.stringify({ motivo }) : undefined;
  return apiFetchAutenticado<ResenaReportadaResponse>(
    `/api/admin/resenas/${idResena}/${accion}`,
    {
      method: "PUT",
      ...(body ? { body } : {}),
    },
  );
}

/** Oculta una reseña reportada. Solo Administrador activo. */
export async function ocultarResenaReportada(
  idResena: number,
  motivo?: string,
): Promise<ResenaReportadaResponse> {
  return accionModeracionResena(idResena, "ocultar", motivo);
}

/** Restaura la visibilidad de una reseña reportada. Solo Administrador activo. */
export async function publicarResenaReportada(
  idResena: number,
  motivo?: string,
): Promise<ResenaReportadaResponse> {
  return accionModeracionResena(idResena, "publicar", motivo);
}

/** Rechaza en lote los reportes pendientes de una reseña. Solo Administrador activo. */
export async function rechazarReportesResenaReportada(
  idResena: number,
  motivo?: string,
): Promise<ResenaReportadaResponse> {
  return accionModeracionResena(idResena, "rechazar-reportes", motivo);
}

/**
 * Representación de una valoración devuelta por la API REST de TecReview.
 */
export interface ValoracionResponse {
  idValoracion: number;
  idProducto: number;
  nombreProducto: string;
  idUsuario: number;
  nombreUsuario: string;
  puntuacion: number;
  fechaCreacion: string;
  estado: boolean;
}

/**
 * Consulta la valoración activa del usuario autenticado para un producto específico.
 * Retorna null si el usuario no ha valorado este producto o no está autenticado.
 */
export async function obtenerMiValoracion(
  idProducto: number,
): Promise<ValoracionResponse | null> {
  try {
    const token = await obtenerTokenAcceso();
    if (!token) return null;
    const res = await apiFetchAutenticado<ValoracionResponse>(
      `/api/valoraciones/mi-valoracion?idProducto=${idProducto}`,
      { method: "GET", accessToken: token },
    );
    return res || null;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 204 || err.status === 401)) {
      return null;
    }
    return null;
  }
}

/**
 * Estadísticas públicas de valoración de un producto.
 */
export interface ValoracionPublicaStats {
  idProducto: number;
  promedioPuntuacion: number | null;
  cantidadValoraciones: number;
}

/**
 * Consulta el promedio de estrellas (1 a 5) y el total de valoraciones activas de un producto.
 * No requiere autenticación. Se usa en la ficha técnica de cada producto.
 *
 * @param idProducto Identificador único del producto.
 * @returns Estadísticas de valoración del producto.
 */
export async function obtenerValoracionStats(
  idProducto: number,
): Promise<ValoracionPublicaStats> {
  return apiFetch<ValoracionPublicaStats>(
    `/api/productos/${idProducto}/valoracion-stats`,
  );
}




// ============================================================================
// SERVICIOS DE PRODUCTOS (CRUD)
// ============================================================================

/**
 * Consulta el detalle de un producto activo por su identificador.
 */
export async function obtenerProductoPorId(id: number): Promise<ProductoResponse> {
  return apiFetch<ProductoResponse>(`/api/productos/${id}`);
}

/**
 * Crea un nuevo producto en el catálogo. Requiere rol Administrador.
 */
export async function crearProducto(request: ProductoRequest): Promise<ProductoResponse> {
  return apiFetchAutenticado<ProductoResponse>("/api/productos", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Actualiza un producto existente en el catálogo. Requiere rol Administrador.
 */
export async function actualizarProducto(
  id: number,
  request: ProductoRequest,
): Promise<ProductoResponse> {
  return apiFetchAutenticado<ProductoResponse>(`/api/productos/${id}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

/**
 * Ejecuta el borrado lógico de un producto en el catálogo. Requiere rol Administrador.
 */
export async function eliminarProducto(id: number): Promise<void> {
  return apiFetchAutenticado<void>(`/api/productos/${id}`, {
    method: "DELETE",
  });
}

// ============================================================================
// SERVICIOS DE CATEGORÍAS (CRUD)
// ============================================================================

/**
 * Consulta el listado público de categorías activas registradas en el backend.
 */
export async function obtenerCategorias(): Promise<CategoriaResponse[]> {
  const datos = await apiFetch<unknown>("/api/categorias");
  if (!Array.isArray(datos)) {
    throw new ApiError(
      "La respuesta del servidor no tiene el formato esperado (lista de categorías).",
    );
  }
  return datos as CategoriaResponse[];
}

/**
 * Consulta una categoría por su identificador.
 */
export async function obtenerCategoriaPorId(id: number): Promise<CategoriaResponse> {
  return apiFetch<CategoriaResponse>(`/api/categorias/${id}`);
}

/**
 * Crea una nueva categoría en el sistema. Requiere rol Administrador.
 */
export async function crearCategoria(request: CategoriaRequest): Promise<CategoriaResponse> {
  return apiFetchAutenticado<CategoriaResponse>("/api/categorias", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Actualiza una categoría existente. Requiere rol Administrador.
 */
export async function actualizarCategoria(
  id: number,
  request: CategoriaRequest,
): Promise<CategoriaResponse> {
  return apiFetchAutenticado<CategoriaResponse>(`/api/categorias/${id}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

/**
 * Ejecuta el borrado lógico de una categoría. Requiere rol Administrador.
 */
export async function eliminarCategoria(id: number): Promise<void> {
  return apiFetchAutenticado<void>(`/api/categorias/${id}`, {
    method: "DELETE",
  });
}

// ============================================================================
// SERVICIOS DE MARCAS (CRUD)
// ============================================================================

/**
 * Consulta el listado público de marcas activas registradas en el backend.
 */
export async function obtenerMarcas(): Promise<MarcaResponse[]> {
  const datos = await apiFetch<unknown>("/api/marcas");
  if (!Array.isArray(datos)) {
    throw new ApiError(
      "La respuesta del servidor no tiene el formato esperado (lista de marcas).",
    );
  }
  return datos as MarcaResponse[];
}

/**
 * Consulta una marca por su identificador.
 */
export async function obtenerMarcaPorId(id: number): Promise<MarcaResponse> {
  return apiFetch<MarcaResponse>(`/api/marcas/${id}`);
}

/**
 * Crea una nueva marca en el sistema. Requiere rol Administrador.
 */
export async function crearMarca(request: MarcaRequest): Promise<MarcaResponse> {
  return apiFetchAutenticado<MarcaResponse>("/api/marcas", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Actualiza una marca existente. Requiere rol Administrador.
 */
export async function actualizarMarca(
  id: number,
  request: MarcaRequest,
): Promise<MarcaResponse> {
  return apiFetchAutenticado<MarcaResponse>(`/api/marcas/${id}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

/**
 * Ejecuta el borrado lógico de una marca. Requiere rol Administrador.
 */
export async function eliminarMarca(id: number): Promise<void> {
  return apiFetchAutenticado<void>(`/api/marcas/${id}`, {
    method: "DELETE",
  });
}

// ============================================================================
// SERVICIOS DE RANKINGS (Fase 4.4 / 4.5)
// ============================================================================

/**
 * Valida y normaliza el parámetro de límite para los endpoints de ranking.
 * El backend acepta limit entre 1 y 100 (por defecto 10).
 */
function normalizarParametroLimit(limit?: number): string {
  if (limit === undefined || limit === null) {
    return "";
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApiError(
      "El parámetro limit debe ser un número entero entre 1 y 100.",
      400,
    );
  }
  return `?limit=${limit}`;
}

/**
 * Consulta el ranking de productos mejor valorados según las valoraciones reales almacenadas en la base de datos.
 *
 * @param limit Opcional. Cantidad máxima de productos a retornar (1 a 100).
 */
export async function obtenerMejorValorados(limit?: number): Promise<ProductoMejorValorado[]> {
  const query = normalizarParametroLimit(limit);
  const datos = await apiFetch<unknown>(`/api/rankings/mejor-valorados${query}`);

  if (!Array.isArray(datos)) {
    throw new ApiError(
      "La respuesta del servidor no tiene el formato esperado (lista de mejor valorados).",
    );
  }

  return datos as ProductoMejorValorado[];
}

/**
 * Consulta el ranking de productos más deseados.
 * Actualmente el sistema no registra listas de deseos en la base de datos,
 * por lo que el backend devuelve un arreglo vacío sin inventar datos ficticios.
 *
 * @param limit Opcional. Cantidad máxima de productos a retornar (1 a 100).
 */
export async function obtenerMasDeseados(limit?: number): Promise<ProductoDeseado[]> {
  const query = normalizarParametroLimit(limit);
  const datos = await apiFetch<unknown>(`/api/rankings/mas-deseados${query}`);

  if (!Array.isArray(datos)) {
    throw new ApiError(
      "La respuesta del servidor no tiene el formato esperado (lista de más deseados).",
    );
  }

  return datos as ProductoDeseado[];
}

/**
 * Consulta el ranking de ofertas destacadas comparando precios de establecimientos con el precio de referencia.
 *
 * @param limit Opcional. Cantidad máxima de ofertas a retornar (1 a 100).
 */
export async function obtenerOfertas(limit?: number): Promise<ProductoOferta[]> {
  const query = normalizarParametroLimit(limit);
  const datos = await apiFetch<unknown>(`/api/rankings/ofertas${query}`);

  if (!Array.isArray(datos)) {
    throw new ApiError(
      "La respuesta del servidor no tiene el formato esperado (lista de ofertas).",
    );
  }

  return datos as ProductoOferta[];
}

/**
 * Consulta el ranking alternativo de interacción comunitaria basado en la cantidad real de reseñas publicadas.
 *
 * @param limit Opcional. Cantidad máxima de productos a retornar (1 a 100).
 */
export async function obtenerMasComentados(limit?: number): Promise<ProductoMasComentado[]> {
  const query = normalizarParametroLimit(limit);
  const datos = await apiFetch<unknown>(`/api/rankings/mas-comentados${query}`);

  if (!Array.isArray(datos)) {
    throw new ApiError(
      "La respuesta del servidor no tiene el formato esperado (lista de más comentados).",
    );
  }

  return datos as ProductoMasComentado[];
}

/**
 * Descarga el catálogo completo de productos en formato CSV llamando al endpoint administrativo
 * protegido GET /api/productos/exportar-csv.
 *
 * Utiliza fetch nativo con respuesta en blob para evitar que el CSV sea procesado como JSON.
 *
 * @param options Opciones adicionales para la solicitud, como un token explícito.
 * @returns Promesa con el Blob del archivo CSV y el nombre de archivo extraído del encabezado.
 */
export async function descargarCatalogoCsv(options?: {
  accessToken?: string;
}): Promise<{ blob: Blob; nombreArchivo: string }> {
  if (!API_URL) {
    throw new ApiError("No se ha configurado la URL de la API.");
  }

  const token = options?.accessToken || (await obtenerTokenAcceso());
  if (!token) {
    throw new ApiError(
      "No se encontró una sesión de autenticación activa para autorizar la descarga del catálogo.",
      401,
    );
  }

  const url = `${API_URL.replace(/\/$/, "")}/api/productos/exportar-csv`;
  let respuesta: Response;

  try {
    respuesta = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/csv, application/octet-stream, */*",
      },
    });
  } catch {
    throw new ApiError(
      "No fue posible conectarse con el servidor para exportar el catálogo. Verifica que el backend esté activo e inténtalo de nuevo.",
    );
  }

  if (!respuesta.ok) {
    let mensajeError = `El servidor respondió con un error (${respuesta.status}) al intentar exportar el catálogo.`;
    if (respuesta.status === 403) {
      mensajeError = "No tienes permisos de administrador para exportar el catálogo de productos.";
    } else if (respuesta.status === 401) {
      mensajeError = "Tu sesión ha expirado o no es válida. Por favor, inicia sesión nuevamente.";
    } else {
      try {
        const errorJson = await respuesta.json();
        if (errorJson && typeof errorJson.message === "string" && errorJson.message.trim()) {
          mensajeError = errorJson.message.trim();
        } else if (errorJson && typeof errorJson.error === "string" && errorJson.error.trim()) {
          mensajeError = errorJson.error.trim();
        }
      } catch {
        // Si no es JSON, conservar mensaje por status
      }
    }
    throw new ApiError(mensajeError, respuesta.status);
  }

  let nombreArchivo = "catalogo_productos.csv";
  const disposition = respuesta.headers.get("Content-Disposition");
  if (disposition) {
    const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      nombreArchivo = filenameMatch[1].replace(/['"]/g, "").trim();
    }
  }

  const blob = await respuesta.blob();
  return { blob, nombreArchivo };
}

/**
 * Utilidad para invocar la descarga en el navegador a partir de un Blob.
 */
export function dispararDescargaArchivo(blob: Blob, nombreArchivo: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}