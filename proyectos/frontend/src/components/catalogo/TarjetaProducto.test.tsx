// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TarjetaProducto from "./TarjetaProducto";
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

describe("TarjetaProducto", () => {
  it("muestra nombre, marca, categoría y precio formateado", () => {
    render(<TarjetaProducto producto={crearProducto()} />);

    expect(
      screen.getByRole("heading", { name: "Samsung Galaxy S24 Ultra" })
    ).toBeDefined();
    expect(screen.getByText("Samsung")).toBeDefined();
    expect(screen.getByText("Celulares")).toBeDefined();
    expect(screen.getByText("$ 5.499.000 COP")).toBeDefined();
  });

  it("muestra 'Consultar disponibilidad' cuando no hay precio", () => {
    render(
      <TarjetaProducto
        producto={crearProducto({
          precioCOP: 0,
          precioFormateado: "Consultar disponibilidad",
        })}
      />
    );

    expect(screen.getByText("Consultar disponibilidad")).toBeDefined();
  });

  it("muestra 'No disponible' cuando estado es false", () => {
    render(<TarjetaProducto producto={crearProducto({ disponible: false })} />);

    expect(screen.getByText("No disponible")).toBeDefined();
    expect(screen.queryByText("Disponible")).toBeNull();
  });

  it("muestra 'Sin opiniones' cuando no hay rating", () => {
    render(<TarjetaProducto producto={crearProducto()} />);

    expect(screen.getByText("0,0")).toBeDefined();
    expect(screen.getByText("Sin opiniones")).toBeDefined();
  });

  it("muestra el rating numérico cuando existe", () => {
    render(
      <TarjetaProducto
        producto={crearProducto({ rating: 4.5, cantidadResenas: 120 })}
      />
    );

    expect(
      screen.getByRole("img", { name: /Valoración 4,5 de 5/i })
    ).toBeDefined();
    expect(screen.getByText("4,5")).toBeDefined();
    expect(screen.getByText("(120 opiniones)")).toBeDefined();
    expect(screen.queryByText("Sin opiniones")).toBeNull();
  });

  it("muestra el badge de posición cuando se usa en un ranking", () => {
    const { rerender } = render(
      <TarjetaProducto producto={crearProducto()} posicionRanking={1} />
    );

    expect(screen.getByText("#1 TOP")).toBeDefined();

    rerender(<TarjetaProducto producto={crearProducto()} />);

    expect(screen.queryByText("#1 TOP")).toBeNull();
  });

  it("muestra el precio desde y la cantidad de tiendas cuando existen", () => {
    render(
      <TarjetaProducto
        producto={crearProducto({
          numeroTiendas: 3,
          precioDesdeCOP: 4_800_000,
        })}
      />
    );

    expect(screen.getByText(/Desde \$ 4\.800\.000 COP/)).toBeDefined();
    expect(screen.getByText(/3 tiendas/)).toBeDefined();
  });

  it("usa el singular cuando solo hay una tienda", () => {
    render(
      <TarjetaProducto
        producto={crearProducto({
          numeroTiendas: 1,
          precioDesdeCOP: 4_800_000,
        })}
      />
    );

    expect(screen.getByText(/1 tienda/)).toBeDefined();
  });

  it("soporta la variante de lista sin perder el contenido", () => {
    const { container } = render(
      <TarjetaProducto producto={crearProducto()} variante="lista" />
    );

    const articulo = container.querySelector("article");
    expect(articulo?.getAttribute("data-variante")).toBe("lista");
    expect(
      screen.getByRole("heading", { name: "Samsung Galaxy S24 Ultra" })
    ).toBeDefined();
    expect(screen.getByText("$ 5.499.000 COP")).toBeDefined();
  });

  it("omite especificaciones ausentes", () => {
    render(
      <TarjetaProducto
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
      <TarjetaProducto producto={producto} onVerDetalle={onVerDetalle} />
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

  it("muestra '✓ En presupuesto' cuando el producto cabe en el límite", () => {
    render(
      <TarjetaProducto
        producto={crearProducto({ precioCOP: 1_000_000 })}
        presupuesto="dentro"
      />
    );

    expect(screen.getByText("✓ En presupuesto")).toBeDefined();
    expect(screen.queryByText("Supera presupuesto")).toBeNull();
  });

  it("muestra 'Supera presupuesto' cuando el producto excede el límite", () => {
    render(
      <TarjetaProducto
        producto={crearProducto({ precioCOP: 5_499_000 })}
        presupuesto="fuera"
      />
    );

    expect(screen.getByText("Supera presupuesto")).toBeDefined();
    expect(screen.queryByText("✓ En presupuesto")).toBeNull();
  });

  it("no muestra badge de presupuesto si no se pasa la prop", () => {
    render(<TarjetaProducto producto={crearProducto()} />);

    expect(screen.queryByText("✓ En presupuesto")).toBeNull();
    expect(screen.queryByText("Supera presupuesto")).toBeNull();
  });
});
