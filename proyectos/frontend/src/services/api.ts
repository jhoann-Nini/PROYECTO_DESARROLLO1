const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(endpoint: string): Promise<T> {
  if (!API_URL) {
    throw new ApiError("No se ha configurado la URL de la API.");
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(`${API_URL.replace(/\/$/, "")}${endpoint}`);
  } catch {
    throw new ApiError(
      "No fue posible conectarse con el servidor. Verifica que el backend esté activo e inténtalo de nuevo.",
    );
  }

  if (!respuesta.ok) {
    throw new ApiError(
      `El servidor respondió con un error (${respuesta.status}). Inténtalo de nuevo más tarde.`,
      respuesta.status,
    );
  }

  try {
    return (await respuesta.json()) as T;
  } catch {
    throw new ApiError(
      "El servidor respondió, pero los datos recibidos no son JSON válido.",
    );
  }
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