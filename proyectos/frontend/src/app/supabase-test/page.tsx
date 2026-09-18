import { createClient } from "@/lib/supabase/server";

export default async function SupabaseTestPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reviews").select("id").limit(1);

  const connected = !error;

  return (
    <main className="min-h-screen p-8 font-sans">
      <h1 className="text-2xl font-bold">Prueba de conexión con Supabase</h1>
      <p className="mt-4">
        Estado: {connected ? "Conectado correctamente" : "No se pudo consultar Supabase"}
      </p>
      {error ? (
        <pre className="mt-4 whitespace-pre-wrap rounded border p-4 text-sm">{error.message}</pre>
      ) : (
        <p className="mt-2 text-sm">La consulta a la tabla reviews respondió correctamente.</p>
      )}
      <p className="mt-6 text-xs text-gray-500">Filas recibidas: {data?.length ?? 0}</p>
    </main>
  );
}
