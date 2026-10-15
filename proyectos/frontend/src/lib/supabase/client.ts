import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

let clientInstance: SupabaseClient | null = null;

/**
 * Retorna una instancia única y reutilizable del cliente de Supabase para el navegador.
 *
 * Lee las credenciales públicas desde las variables de entorno:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Lanza un error descriptivo si las variables no están configuradas al momento de su uso.
 */
export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase no está configurado. Las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar definidas en el entorno del frontend."
    );
  }

  if (!clientInstance) {
    clientInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return clientInstance;
}

export const getSupabaseClient = createClient;

/**
 * Proxy seguro para acceso directo a la instancia de Supabase.
 * Permite importar `supabase` directamente sin ejecutar la validación de entorno
 * hasta el momento en que se invoque alguna de sus propiedades o métodos.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = createClient();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
