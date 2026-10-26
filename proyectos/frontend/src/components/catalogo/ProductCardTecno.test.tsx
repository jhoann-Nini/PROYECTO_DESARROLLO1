// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ProductCardTecno from "./ProductCardTecno";
import type { ProductoViewModel } from "@/data/productoViewModel";

afterEach(() => {
  cleanup();
});

function crearProducto(
  overrides: Partial<ProductoViewModel> = {}
): ProductoViewModel {
  return {
    idProducto: 1,
    nombre: "Samsung Galaxy S24 Ultra",
    marca: "Samsung",
    categoria: "moviles",
    categoriaEtiqueta: "Celulares",
    imagen: "https://example.com/s24.png",
    precioCOP: 5_499_000,
    precioFormateado: "$ 5.499.000 COP",
    disponible: true,
    rating: null,
    cantidadResenas: null,
    especificaciones: {
      pantalla: "6.8 pulgadas Dynamic AMOLED",
      procesador: "Snapdragon 8 Gen 3",
      ram: "12 GB",
      almacenamiento: "256 GB",
      camaras: "200 MP",
      bateria: "5000 mAh",
    },
    caracteristicas: ["5g"],
    textoBusqueda: "samsung galaxy s24 ultra celulares",
    ...overrides,
  };
}

describe("ProductCardTecno", () => {
  it("muestra nombre, marca, categoría y precio formateado", () => {
    render(<ProductCardTecno producto={crearProducto()} />);

    expect(
      screen.getByRole("heading", { name: "Samsung Galaxy S24 Ultra" })
    ).toBeDefined();
    expect(screen.getByText("Samsung")).toBeDefined();
    expect(screen.getByText("Celulares")).toBeDefined();
    expect(screen.getByText("$ 5.499.000 COP")).toBeDefined();
  });

  it("muestra 'Consultar disponibilidad' cuando no hay precio", () => {
    render(
      <ProductCardTecno
        producto={crearProducto({
          precioCOP: 0,
          precioFormateado: "Consultar disponibilidad",
        })}
      />
    );

    expect(screen.getByText("Consultar disponibilidad")).toBeDefined();
  });

  it("muestra 'No disponible' cuando estado es false", () => {
    render(<ProductCardTecno producto={crearProducto({ disponible: false })} />);

    expect(screen.getByText("No disponible")).toBeDefined();
    expect(screen.queryByText("Disponible")).toBeNull();
  });

  it("muestra 'Sin reseñas' cuando no hay rating", () => {
    render(<ProductCardTecno producto={crearProducto()} />);

    expect(screen.getByText("Sin reseñas")).toBeDefined();
  });

  it("muestra el rating numérico cuando existe", () => {
    render(
      <ProductCardTecno
        producto={crearProducto({ rating: 4.5, cantidadResenas: 120 })}
      />
    );

    expect(
      screen.getByRole("img", { name: /Valoración 4,5 de 5/i })
    ).toBeDefined();
    expect(screen.getByText(/120 reseñas/)).toBeDefined();
    expect(screen.queryByText("Sin reseñas")).toBeNull();
  });

  it("omite especificaciones ausentes", () => {
    render(
      <ProductCardTecno
        producto={crearProducto({
          especificaciones: {
            pantalla: null,
            procesador: null,
            ram: null,
            almacenamiento: null,
            camaras: null,
            bateria: null,
          },
        })}
      />
    );

    expect(screen.queryByText("6.8 pulgadas Dynamic AMOLED")).toBeNull();
    expect(screen.queryByText("Snapdragon 8 Gen 3")).toBeNull();
  });

  it("invoca onVerDetalle al pulsar el nombre y el botón", () => {
    const onVerDetalle = vi.fn();
    const producto = crearProducto();

    render(
      <ProductCardTecno producto={producto} onVerDetalle={onVerDetalle} />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Ver detalle de Samsung Galaxy S24 Ultra/i,
      })
    );
    expect(onVerDetalle).toHaveBeenCalledWith(producto);

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));
    expect(onVerDetalle).toHaveBeenCalledTimes(2);
  });
});
