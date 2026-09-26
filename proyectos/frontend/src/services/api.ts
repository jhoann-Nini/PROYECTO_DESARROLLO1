const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function apiFetch<T>(endpoint: string): Promise<T> {
  if (!API_URL) {
    throw new Error("No se ha configurado la URL de la API");
  }

  const respuesta = await fetch(`${API_URL}${endpoint}`);

  if (!respuesta.ok) {
    throw new Error(`Error en la API: ${respuesta.status}`);
  }

  return respuesta.json() as Promise<T>;
}

export function obtenerProductos<T = unknown>(): Promise<T> {
  return apiFetch<T>("/api/productos");
}