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
  ResumenOfertasProducto,
} from "@/types/producto";
import type {
  AccionReporteOferta,
  EstadoModeracionResena,
  EstadoReporte,
  FiltrosResenasReportadas,
  ReporteOfertaModeracionResponse,
  ResenaEnRevisionResponse,
  ResenaReportadaResponse,
  ResumenPendientesModeracion,
  EstadoReincidencia,
  CuentaReincidente,
  Apelacion,
  ApelacionModeracion,
  DecisionApelable,
  EstadoApelacion,
} from "@/types/moderacion";
import type {
  Establecimiento,
  EstablecimientoRequest,
  OfertaAdmin,
  OfertaAdminRequest,
} from "@/types/establecimiento";
import type { RolAdmin, UsuarioAdmin,
  CategoriaTerminoModeracion,
  TerminoModeracion,
} from "@/types/administracion";
import type {
  AccionAlAceptarReporte,
  DecisionModeracionComunidad,
  ElementoRevisionComunidad,
  MotivoReporteComunidad,
  ReporteModeracionComunidad,
  MeGusta,
  OrdenComunidad,
  Pagina,
  PaginaPublicaciones,
  PublicacionDetalle,
  RespuestaComunidad,
  TipoPublicacion,
} from "@/types/comunidad";
import type {
  CrearReporteOfertaRequest,
  ReporteOfertaResponse,
  TiendaProductoResponse,
} from "@/types/reporteOferta";

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
    if (typeof respuesta.text === "function") {
      const texto = await respuesta.text();
      if (texto.trim() === "") {
        return undefined as unknown as T;
      }
      return JSON.parse(texto) as T;
    }
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
  roles?: string[];
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
    roles: perfil.roles ?? [perfil.rol],
    idUsuario: perfil.idUsuario,
    activo: perfil.activo,
    fechaRegistro: perfil.fechaRegistro,
    avatar: metadata.avatar_url
      ? String(metadata.avatar_url)
      : undefined,
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
  /** PENDIENTE si el filtro automático la retuvo; ausente en registros antiguos. */
  estadoModeracion?: EstadoModeracionResena | null;
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
 * Fase 4 (H-04): resumen de ofertas disponibles de todos los productos.
 * Un producto ausente de la lista no tiene ofertas disponibles.
 */
export async function obtenerResumenOfertas(): Promise<ResumenOfertasProducto[]> {
  const datos = await apiFetch<unknown>("/api/productos/resumen-ofertas");
  if (!Array.isArray(datos)) {
    throw new ApiError("La respuesta del servidor no tiene el formato esperado (resumen de ofertas).");
  }
  return datos as ResumenOfertasProducto[];
}

/** Consulta las ofertas de producto/establecimiento con IDs reales de TEC-134. */
export async function obtenerTiendasProducto(
  idProducto: number,
): Promise<TiendaProductoResponse[]> {
  if (!Number.isSafeInteger(idProducto) || idProducto <= 0) {
    throw new ApiError("El identificador del producto no es válido.", 400);
  }
  const datos = await apiFetch<unknown>(`/api/productos/${idProducto}/establecimientos`);
  if (!Array.isArray(datos) || !datos.every(
    (tienda) => tienda && Number.isSafeInteger(tienda.idEstablecimiento) &&
      tienda.idEstablecimiento > 0 && typeof tienda.nombre === "string" &&
      typeof tienda.precio === "number",
  )) {
    throw new ApiError("La respuesta del servidor no contiene ofertas con identificadores válidos.");
  }
  return datos as TiendaProductoResponse[];
}

/** TEC-147: la identidad del reportante se toma del JWT, nunca del cuerpo. */
export async function crearReporteOferta(
  request: CrearReporteOfertaRequest,
): Promise<ReporteOfertaResponse> {
  return apiFetchAutenticado<ReporteOfertaResponse>("/api/reportes/ofertas", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Consulta la lista de reseñas reportadas con sus métricas y reportes asociados.
 * Requiere autenticación con rol Moderador o Administrador activo.
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
    `/api/moderacion/resenas/${idResena}/${accion}`,
    {
      method: "PUT",
      ...(body ? { body } : {}),
    },
  );
}

/**
 * Oculta manualmente una reseña por incumplimiento de normas.
 * Requiere rol Administrador activo.
 */
export async function ocultarResenaReportada(
  idResena: number,
  motivo?: string,
): Promise<ResenaReportadaResponse> {
  return accionModeracionResena(idResena, "ocultar", motivo);
}

/**
 * Restaura la visibilidad de una reseña oculta por moderación.
 * Requiere rol Administrador activo.
 */
export async function publicarResenaReportada(
  idResena: number,
  motivo?: string,
): Promise<ResenaReportadaResponse> {
  return accionModeracionResena(idResena, "publicar", motivo);
}

/**
 * Rechaza en lote los reportes pendientes/en revisión de una reseña.
 * Requiere rol Administrador activo.
 */
export async function rechazarReportesResenaReportada(
  idResena: number,
  motivo?: string,
): Promise<ResenaReportadaResponse> {
  return accionModeracionResena(idResena, "rechazar-reportes", motivo);
}

/**
 * Reseñas retenidas por el filtro automático, pendientes de revisión humana.
 * Requiere rol Moderador o Administrador activo.
 */
export async function obtenerResenasEnRevision(): Promise<ResenaEnRevisionResponse[]> {
  return apiFetchAutenticado<ResenaEnRevisionResponse[]>(
    "/api/moderacion/resenas/en-revision",
    { method: "GET" },
  );
}

/** Caso 6: términos de moderación agregados (solo administradores). */
export async function obtenerTerminosModeracion(
  estado: "ACTIVOS" | "INACTIVOS" | "TODOS" = "ACTIVOS",
): Promise<TerminoModeracion[]> {
  return apiFetchAutenticado<TerminoModeracion[]>(`/api/admin/terminos-moderacion?estado=${estado}`, { method: "GET" });
}

/** Caso 6: agrega un término al filtro del servidor. */
export async function crearTerminoModeracion(
  termino: string,
  categoria: CategoriaTerminoModeracion,
): Promise<TerminoModeracion> {
  return apiFetchAutenticado<TerminoModeracion>("/api/admin/terminos-moderacion", {
    method: "POST",
    body: JSON.stringify({ termino: termino.trim(), categoria }),
  });
}

/** Caso 6: desactiva un término (no se borra). */
export async function desactivarTerminoModeracion(idTermino: number): Promise<TerminoModeracion> {
  return apiFetchAutenticado<TerminoModeracion>(`/api/admin/terminos-moderacion/${idTermino}/desactivar`, {
    method: "PUT",
  });
}

/** Caso 6: apela la decisión más reciente (rechazo u ocultamiento) de una reseña propia. */
export async function crearApelacion(idResena: number, motivo: string): Promise<Apelacion> {
  return apiFetchAutenticado<Apelacion>("/api/apelaciones", {
    method: "POST",
    body: JSON.stringify({ idResena, motivo: motivo.trim() }),
  });
}

/** Caso 6: decisiones de moderación recientes sobre mis reseñas, con su apelación. */
export async function obtenerMisDecisiones(): Promise<DecisionApelable[]> {
  return apiFetchAutenticado<DecisionApelable[]>("/api/apelaciones/mias", { method: "GET" });
}

/** Caso 6: cola de apelaciones para moderadores (por defecto, las pendientes). */
export async function obtenerApelacionesModeracion(estado?: EstadoApelacion): Promise<ApelacionModeracion[]> {
  const query = estado ? `?estado=${estado}` : "";
  return apiFetchAutenticado<ApelacionModeracion[]>(`/api/moderacion/apelaciones${query}`, { method: "GET" });
}

/** Caso 6: acepta (respuesta opcional) o rechaza (respuesta obligatoria) una apelación. */
export async function resolverApelacion(
  idApelacion: number,
  decision: "aceptar" | "rechazar",
  respuesta?: string,
): Promise<ApelacionModeracion> {
  const limpia = respuesta?.trim();
  return apiFetchAutenticado<ApelacionModeracion>(
    `/api/moderacion/apelaciones/${idApelacion}/${decision}`,
    { method: "PUT", body: JSON.stringify(limpia ? { respuesta: limpia } : {}) },
  );
}

/** Caso 6: faltas de moderación del usuario autenticado y restricción vigente. */
export async function obtenerMiReincidencia(): Promise<EstadoReincidencia> {
  return apiFetchAutenticado<EstadoReincidencia>("/api/usuarios/me/reincidencia", { method: "GET" });
}

/** Caso 6: cuentas activas con 4 faltas o más (solo administradores). */
export async function obtenerCuentasReincidentes(): Promise<CuentaReincidente[]> {
  return apiFetchAutenticado<CuentaReincidente[]>("/api/admin/usuarios/reincidentes", { method: "GET" });
}

/**
 * Contador de pendientes para moderadores (Caso 6): revisión automática y
 * reportes abiertos de reseñas y de ofertas.
 */
export async function obtenerResumenPendientesModeracion(): Promise<ResumenPendientesModeracion> {
  return apiFetchAutenticado<ResumenPendientesModeracion>(
    "/api/moderacion/pendientes/resumen",
    { method: "GET" },
  );
}

/**
 * Aprueba (publica) o rechaza una reseña retenida. La justificación es
 * obligatoria para rechazar y opcional para aprobar.
 */
export async function decidirRevisionResena(
  idResena: number,
  decision: "aprobar" | "rechazar",
  motivo?: string,
): Promise<ResenaEnRevisionResponse> {
  const motivoLimpio = motivo?.trim();
  return apiFetchAutenticado<ResenaEnRevisionResponse>(
    `/api/moderacion/resenas/${idResena}/revision/${decision}`,
    {
      method: "PUT",
      body: JSON.stringify(motivoLimpio ? { motivo: motivoLimpio } : {}),
    },
  );
}

/**
 * Fase 2: cola de reportes de ofertas. Requiere rol Moderador o Administrador.
 */
export async function obtenerReportesOfertaModeracion(
  estado?: EstadoReporte,
): Promise<ReporteOfertaModeracionResponse[]> {
  const consulta = estado ? `?estado=${encodeURIComponent(estado)}` : "";
  return apiFetchAutenticado<ReporteOfertaModeracionResponse[]>(
    `/api/moderacion/ofertas/reportes${consulta}`,
    { method: "GET" },
  );
}

/**
 * Toma, acepta o rechaza un reporte de oferta. La justificación es
 * obligatoria para rechazar; aceptar no modifica el precio de la oferta.
 */
export async function decidirReporteOferta(
  idReporte: number,
  accion: AccionReporteOferta,
  motivo?: string,
): Promise<ReporteOfertaModeracionResponse> {
  const motivoLimpio = motivo?.trim();
  return apiFetchAutenticado<ReporteOfertaModeracionResponse>(
    `/api/moderacion/ofertas/reportes/${idReporte}/${accion}`,
    {
      method: "PUT",
      body: JSON.stringify(motivoLimpio ? { motivo: motivoLimpio } : {}),
    },
  );
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

/**
 * Consulta la ficha técnica de un producto por su ID.
 */
export async function obtenerFichaTecnicaProducto(
  id: number,
): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>(`/api/productos/${id}/ficha-tecnica`);
}

/**
 * Actualiza exclusivamente la ficha técnica de un producto de forma independiente.
 * Requiere rol Administrador.
 */
export async function actualizarFichaTecnicaProducto(
  id: number,
  fichaTecnica: Record<string, unknown>,
): Promise<ProductoResponse> {
  return apiFetchAutenticado<ProductoResponse>(`/api/productos/${id}/ficha-tecnica`, {
    method: "PUT",
    body: JSON.stringify(fichaTecnica),
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

// ============================================================================
// SERVICIOS DE ESTABLECIMIENTOS (catálogo público y CRUD administrativo)
// ============================================================================

/**
 * Consulta el catálogo público de establecimientos activos, ordenados por
 * nombre. No requiere autenticación y no incluye inactivos.
 */
export async function obtenerEstablecimientos(): Promise<Establecimiento[]> {
  const datos = await apiFetch<unknown>("/api/establecimientos");

  if (!Array.isArray(datos)) {
    throw new ApiError(
      "La respuesta del servidor no tiene el formato esperado (lista de establecimientos).",
    );
  }

  return datos as Establecimiento[];
}

/**
 * Consulta un establecimiento activo por su identificador.
 */
export async function obtenerEstablecimientoPorId(
  id: number,
): Promise<Establecimiento> {
  return apiFetch<Establecimiento>(`/api/establecimientos/${id}`);
}

/**
 * Crea un establecimiento. Requiere rol Administrador activo.
 */
export async function crearEstablecimiento(
  request: EstablecimientoRequest,
): Promise<Establecimiento> {
  return apiFetchAutenticado<Establecimiento>("/api/establecimientos", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Actualiza los datos básicos de un establecimiento. Requiere rol Administrador.
 */
export async function actualizarEstablecimiento(
  id: number,
  request: EstablecimientoRequest,
): Promise<Establecimiento> {
  return apiFetchAutenticado<Establecimiento>(`/api/establecimientos/${id}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

/**
 * Ejecuta el borrado lógico (desactivación) de un establecimiento.
 * Requiere rol Administrador.
 */
export async function eliminarEstablecimiento(id: number): Promise<void> {
  return apiFetchAutenticado<void>(`/api/establecimientos/${id}`, {
    method: "DELETE",
  });
}

// ============================================================================
// ADMINISTRACIÓN DE OFERTAS (Fase 3)
// ============================================================================

/** Lista las ofertas, incluidas las no disponibles. Requiere rol Administrador. */
export async function obtenerOfertasAdmin(idProducto?: number): Promise<OfertaAdmin[]> {
  const consulta = idProducto ? `?idProducto=${idProducto}` : "";
  return apiFetchAutenticado<OfertaAdmin[]>(`/api/admin/ofertas${consulta}`, { method: "GET" });
}

/** Crea o actualiza la oferta de un producto en una tienda. Requiere rol Administrador. */
export async function guardarOfertaAdmin(
  idProducto: number,
  idEstablecimiento: number,
  request: OfertaAdminRequest,
): Promise<OfertaAdmin> {
  return apiFetchAutenticado<OfertaAdmin>(
    `/api/admin/productos/${idProducto}/establecimientos/${idEstablecimiento}`,
    { method: "PUT", body: JSON.stringify(request) },
  );
}

/**
 * Elimina una oferta sin reportes. Si tiene reportes, el backend responde 409
 * y la oferta debe marcarse como no disponible.
 */
export async function eliminarOfertaAdmin(idProducto: number, idEstablecimiento: number): Promise<void> {
  return apiFetchAutenticado<void>(
    `/api/admin/productos/${idProducto}/establecimientos/${idEstablecimiento}`,
    { method: "DELETE" },
  );
}

// ============================================================================
// SERVICIOS DEL REPRESENTANTE DE ESTABLECIMIENTO
// ============================================================================

/**
 * Lista los establecimientos activos asignados a la cuenta autenticada.
 * Un Administrador recibe el alcance global que permite el backend.
 */
export async function obtenerMisEstablecimientos(): Promise<Establecimiento[]> {
  const datos = await apiFetchAutenticado<unknown>(
    "/api/representante/establecimientos",
    { method: "GET" },
  );

  if (!Array.isArray(datos)) {
    throw new ApiError(
      "La respuesta del servidor no tiene el formato esperado (lista de establecimientos asignados).",
    );
  }

  return datos as Establecimiento[];
}

/**
 * Actualiza un establecimiento dentro del alcance autorizado del representante.
 */
export async function actualizarMiEstablecimiento(
  id: number,
  request: EstablecimientoRequest,
): Promise<Establecimiento> {
  return apiFetchAutenticado<Establecimiento>(
    `/api/representante/establecimientos/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

// ============================================================================
// CONSULTAS Y ASIGNACIONES ADMINISTRATIVAS
// ============================================================================

/**
 * Consulta las cuentas registradas. El filtro por correo es una coincidencia
 * parcial calculada por el backend. Requiere rol Administrador.
 */
export async function obtenerUsuariosAdmin(
  correo?: string,
): Promise<UsuarioAdmin[]> {
  const parametros = new URLSearchParams();
  if (correo !== undefined && correo.trim() !== "") {
    parametros.set("correo", correo.trim());
  }
  const query = parametros.toString();
  const datos = await apiFetchAutenticado<unknown>(
    `/api/admin/usuarios${query ? `?${query}` : ""}`,
    { method: "GET" },
  );

  if (!Array.isArray(datos)) {
    throw new ApiError(
      "La respuesta del servidor no tiene el formato esperado (lista de usuarios).",
    );
  }

  return datos as UsuarioAdmin[];
}

/**
 * Consulta el catálogo de roles disponibles para asignar.
 * Requiere rol Administrador.
 */
export async function obtenerRolesAdmin(): Promise<RolAdmin[]> {
  const datos = await apiFetchAutenticado<unknown>("/api/admin/roles", {
    method: "GET",
  });

  if (!Array.isArray(datos)) {
    throw new ApiError(
      "La respuesta del servidor no tiene el formato esperado (lista de roles).",
    );
  }

  return datos as RolAdmin[];
}

function cuerpoMotivoOpcional(motivo?: string): string | undefined {
  if (motivo === undefined || motivo.trim() === "") {
    return undefined;
  }
  return JSON.stringify({ motivo });
}

/**
 * Asigna o reactiva un rol a una cuenta. Requiere rol Administrador.
 */
/**
 * Caso 6: suspende (activo = false) o reactiva una cuenta. El motivo es
 * obligatorio y queda auditado. Requiere rol Administrador.
 */
export async function cambiarEstadoCuenta(
  usuarioId: number,
  activo: boolean,
  motivo: string,
): Promise<UsuarioAdmin> {
  return apiFetchAutenticado<UsuarioAdmin>(`/api/admin/usuarios/${usuarioId}/estado`, {
    method: "PUT",
    body: JSON.stringify({ activo, motivo: motivo.trim() }),
  });
}

export async function asignarRolUsuario(
  usuarioId: number,
  rolId: number,
  motivo?: string,
): Promise<void> {
  const body = cuerpoMotivoOpcional(motivo);
  return apiFetchAutenticado<void>(
    `/api/admin/usuarios/${usuarioId}/roles/${rolId}`,
    {
      method: "POST",
      ...(body ? { body } : {}),
    },
  );
}

/**
 * Revoca un rol de una cuenta conservando sus demás roles. Requiere Administrador.
 */
export async function revocarRolUsuario(
  usuarioId: number,
  rolId: number,
  motivo?: string,
): Promise<void> {
  const body = cuerpoMotivoOpcional(motivo);
  return apiFetchAutenticado<void>(
    `/api/admin/usuarios/${usuarioId}/roles/${rolId}`,
    { method: "DELETE", ...(body ? { body } : {}) },
  );
}

/**
 * Asigna o reactiva la representación de un establecimiento a una cuenta.
 * Requiere rol Administrador.
 */
export async function asignarRepresentante(
  usuarioId: number,
  establecimientoId: number,
  motivo?: string,
): Promise<void> {
  const body = cuerpoMotivoOpcional(motivo);
  return apiFetchAutenticado<void>(
    `/api/admin/usuarios/${usuarioId}/establecimientos/${establecimientoId}/representacion`,
    {
      method: "POST",
      ...(body ? { body } : {}),
    },
  );
}

/**
 * Revoca la representación de un establecimiento. Requiere rol Administrador.
 */
export async function revocarRepresentante(
  usuarioId: number,
  establecimientoId: number,
  motivo?: string,
): Promise<void> {
  const body = cuerpoMotivoOpcional(motivo);
  return apiFetchAutenticado<void>(
    `/api/admin/usuarios/${usuarioId}/establecimientos/${establecimientoId}/representacion`,
    { method: "DELETE", ...(body ? { body } : {}) },
  );
}

// ---------- Comunidad (fase 1) ----------

/**
 * Lecturas públicas de la comunidad: envían el token si hay sesión, para que
 * el backend informe meGustaPropio, esAutor y el contenido propio en revisión.
 */
async function apiFetchConSesionOpcional<T>(endpoint: string): Promise<T> {
  const token = await obtenerTokenAcceso();
  return apiFetch<T>(endpoint, token ? { method: "GET", headers: { Authorization: `Bearer ${token}` } } : { method: "GET" });
}

function consulta(parametros: Record<string, string | number | undefined | null>): string {
  const busqueda = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== "") busqueda.set(clave, String(valor));
  }
  const texto = busqueda.toString();
  return texto ? `?${texto}` : "";
}

export interface OpcionesListaComunidad {
  orden?: OrdenComunidad;
  cursor?: string | null;
  limite?: number;
}

export async function obtenerPublicacionesComunidad(opciones: OpcionesListaComunidad = {}): Promise<PaginaPublicaciones> {
  return apiFetchConSesionOpcional<PaginaPublicaciones>(`/api/comunidad/publicaciones${consulta({ ...opciones })}`);
}

export async function obtenerPublicacionesProducto(
  idProducto: number,
  opciones: OpcionesListaComunidad = {},
): Promise<PaginaPublicaciones> {
  return apiFetchConSesionOpcional<PaginaPublicaciones>(
    `/api/productos/${idProducto}/comunidad/publicaciones${consulta({ ...opciones })}`,
  );
}

export async function obtenerPublicacionComunidad(idPublicacion: number): Promise<PublicacionDetalle> {
  return apiFetchConSesionOpcional<PublicacionDetalle>(`/api/comunidad/publicaciones/${idPublicacion}`);
}

export async function crearPublicacionComunidad(datos: {
  tipo: TipoPublicacion;
  idProducto?: number | null;
  titulo: string;
  contenido: string;
}): Promise<PublicacionDetalle> {
  return apiFetchAutenticado<PublicacionDetalle>("/api/comunidad/publicaciones", {
    method: "POST",
    body: JSON.stringify({ ...datos, idProducto: datos.idProducto ?? null }),
  });
}

export async function editarPublicacionComunidad(
  idPublicacion: number,
  datos: { titulo: string; contenido: string },
): Promise<PublicacionDetalle> {
  return apiFetchAutenticado<PublicacionDetalle>(`/api/comunidad/publicaciones/${idPublicacion}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export async function eliminarPublicacionComunidad(idPublicacion: number): Promise<void> {
  await apiFetchAutenticado<void>(`/api/comunidad/publicaciones/${idPublicacion}`, { method: "DELETE" });
}

export async function obtenerRespuestasComunidad(
  idPublicacion: number,
  opciones: { padre?: number | null; cursor?: string | null; limite?: number } = {},
): Promise<Pagina<RespuestaComunidad>> {
  return apiFetchConSesionOpcional<Pagina<RespuestaComunidad>>(
    `/api/comunidad/publicaciones/${idPublicacion}/respuestas${consulta({ ...opciones })}`,
  );
}

export async function crearRespuestaComunidad(
  idPublicacion: number,
  contenido: string,
  idRespuestaPadre?: number | null,
): Promise<RespuestaComunidad> {
  return apiFetchAutenticado<RespuestaComunidad>(`/api/comunidad/publicaciones/${idPublicacion}/respuestas`, {
    method: "POST",
    body: JSON.stringify({ contenido, idRespuestaPadre: idRespuestaPadre ?? null }),
  });
}

export async function editarRespuestaComunidad(idRespuesta: number, contenido: string): Promise<RespuestaComunidad> {
  return apiFetchAutenticado<RespuestaComunidad>(`/api/comunidad/respuestas/${idRespuesta}`, {
    method: "PUT",
    body: JSON.stringify({ contenido }),
  });
}

export async function eliminarRespuestaComunidad(idRespuesta: number): Promise<void> {
  await apiFetchAutenticado<void>(`/api/comunidad/respuestas/${idRespuesta}`, { method: "DELETE" });
}

export type ContenidoReaccionable = "publicaciones" | "respuestas";

export async function darMeGustaComunidad(tipo: ContenidoReaccionable, id: number): Promise<MeGusta> {
  return apiFetchAutenticado<MeGusta>(`/api/comunidad/${tipo}/${id}/me-gusta`, { method: "PUT" });
}

export async function retirarMeGustaComunidad(tipo: ContenidoReaccionable, id: number): Promise<MeGusta> {
  return apiFetchAutenticado<MeGusta>(`/api/comunidad/${tipo}/${id}/me-gusta`, { method: "DELETE" });
}

// ---------- Comunidad (fase 2): reportes y moderación ----------

export async function reportarContenidoComunidad(
  tipo: ContenidoReaccionable,
  id: number,
  motivo: MotivoReporteComunidad,
  descripcion: string | null,
): Promise<{ idReporte: number; estado: string }> {
  return apiFetchAutenticado<{ idReporte: number; estado: string }>(`/api/comunidad/${tipo}/${id}/reportes`, {
    method: "POST",
    body: JSON.stringify({ motivo, descripcion }),
  });
}

export async function obtenerColaRevisionComunidad(): Promise<ElementoRevisionComunidad[]> {
  return apiFetchAutenticado<ElementoRevisionComunidad[]>("/api/moderacion/comunidad/en-revision", { method: "GET" });
}

export async function decidirModeracionComunidad(
  tipo: ContenidoReaccionable,
  id: number,
  decision: DecisionModeracionComunidad,
  motivo: string,
): Promise<unknown> {
  return apiFetchAutenticado<unknown>(`/api/moderacion/comunidad/${tipo}/${id}/${decision}`, {
    method: "PUT",
    body: JSON.stringify({ motivo }),
  });
}

export async function obtenerReportesComunidad(estado?: string): Promise<ReporteModeracionComunidad[]> {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : "";
  return apiFetchAutenticado<ReporteModeracionComunidad[]>(`/api/moderacion/comunidad/reportes${query}`, { method: "GET" });
}

export async function resolverReporteComunidad(
  idReporte: number,
  resolucion: "aceptar" | "rechazar",
  datos: { justificacion: string; accion?: AccionAlAceptarReporte; motivo?: string },
): Promise<{ idReporte: number; estado: string }> {
  return apiFetchAutenticado<{ idReporte: number; estado: string }>(
    `/api/moderacion/comunidad/reportes/${idReporte}/${resolucion}`,
    { method: "PUT", body: JSON.stringify(datos) },
  );
}
