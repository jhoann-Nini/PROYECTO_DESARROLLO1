"use client";

import { useEffect, useState } from "react";
import { obtenerProductos } from "@/services/api";

export default function ProductosPage() {
  const [productos, setProductos] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerProductos()
      .then((datos) => {
        setProductos(datos);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setCargando(false);
      });
  }, []);

  if (cargando) {
    return <p className="p-6">Cargando productos...</p>;
  }

  if (error) {
    return <p className="p-6 text-red-600">Error: {error}</p>;
  }

  return (
    <main className="p-6">
      <h1 className="mb-4 text-3xl font-bold">
        Productos
      </h1>

      <pre className="rounded-lg bg-gray-100 p-4">
        {JSON.stringify(productos, null, 2)}
      </pre>
    </main>
  );
}