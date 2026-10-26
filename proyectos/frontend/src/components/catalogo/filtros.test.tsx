// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FilterSidebar from "./FilterSidebar";
import FilterChips from "./FilterChips";
import Pagination from "./Pagination";
import { prepararCatalogo, type FiltrosCatalogo } from "@/data/catalogo";
import type { ProductoViewModel } from "@/data/productoViewModel";

afterEach(() => {
  cleanup();
});

function crearVista(
  overrides: Partial<ProductoViewModel> = {}
): ProductoViewModel {
  return {
    idProducto: 1,
    nombre: "Producto",
    marca: "Samsung",
    categoria: "moviles",
    categoriaEtiqueta: "Celulares",
    imagen: null,
    precioCOP: 1_000_000,
    precioFormateado: "$ 1.000.000 COP",
    disponible: true,
    rating: null,
    cantidadResenas: null,
    especificaciones: {
      pantalla: null,
      procesador: null,
      ram: null,
      almacenamiento: null,
      camaras: null,
      bateria: null,
    },
    caracteristicas: ["5g"],
    textoBusqueda: "producto samsung celulares",
    ...overrides,
  };
}

const catalogo = prepararCatalogo([
  crearVista({ idProducto: 1, marca: "Samsung", precioCOP: 1_000_000 }),
  crearVista({
    idProducto: 2,
    marca: "Apple",
    precioCOP: 3_000_000,
    categoria: "laptops",
    categoriaEtiqueta: "Laptops y PC",
    caracteristicas: [],
  }),
  crearVista({
    idProducto: 3,
    marca: "Apple",
    precioCOP: 6_000_000,
    categoria: "tablets",
    categoriaEtiqueta: "Tablets",
    caracteristicas: ["alto-rendimiento"],
  }),
]);

function filtrosVacios(): FiltrosCatalogo {
  return {
    busqueda: "",
    categorias: [],
    marcas: [],
    precioMin: 1_000_000,
    precioMax: 6_000_000,
    caracteristicas: [],
  };
}

describe("FilterSidebar", () => {
  it("marca una categoría y devuelve los filtros actualizados", () => {
    const onCambiar = vi.fn();
    const filtros = filtrosVacios();

    render(
      <FilterSidebar
        catalogo={catalogo}
        filtros={filtros}
        onCambiar={onCambiar}
        onLimpiar={vi.fn()}
        hayFiltros={false}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Móviles/i }));

    expect(onCambiar).toHaveBeenCalledWith({
      ...filtros,
      categorias: ["moviles"],
    });
  });

  it("añade y quita una marca", () => {
    const onCambiar = vi.fn();
    const filtros = filtrosVacios();

    const { rerender } = render(
      <FilterSidebar
        catalogo={catalogo}
        filtros={filtros}
        onCambiar={onCambiar}
        onLimpiar={vi.fn()}
        hayFiltros={false}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Apple/i }));
    expect(onCambiar).toHaveBeenCalledWith({
      ...filtros,
      marcas: ["Apple"],
    });

    rerender(
      <FilterSidebar
        catalogo={catalogo}
        filtros={{ ...filtros, marcas: ["Apple"] }}
        onCambiar={onCambiar}
        onLimpiar={vi.fn()}
        hayFiltros
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Apple/i }));
    expect(onCambiar).toHaveBeenLastCalledWith({ ...filtros, marcas: [] });
  });

  it("mueve el rango de precio", () => {
    const onCambiar = vi.fn();
    const filtros = filtrosVacios();

    render(
      <FilterSidebar
        catalogo={catalogo}
        filtros={filtros}
        onCambiar={onCambiar}
        onLimpiar={vi.fn()}
        hayFiltros={false}
      />
    );

    fireEvent.change(screen.getByLabelText("Precio mínimo"), {
      target: { value: "2000000" },
    });

    expect(onCambiar).toHaveBeenCalledWith({
      ...filtros,
      precioMin: 2_000_000,
    });
  });

  it("deshabilita 'Limpiar filtros' sin filtros activos", () => {
    render(
      <FilterSidebar
        catalogo={catalogo}
        filtros={filtrosVacios()}
        onCambiar={vi.fn()}
        onLimpiar={vi.fn()}
        hayFiltros={false}
      />
    );

    const boton = screen.getByRole("button", { name: /Limpiar filtros/i });
    expect(boton.hasAttribute("disabled")).toBe(true);
  });
});

describe("FilterChips", () => {
  const chips = [
    { tipo: "busqueda" as const, valor: "iphone", etiqueta: "Búsqueda: iphone" },
    { tipo: "categoria" as const, valor: "moviles", etiqueta: "Celulares" },
  ];

  it("quita un chip concreto", () => {
    const onQuitar = vi.fn();
    render(<FilterChips chips={chips} onQuitar={onQuitar} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Quitar filtro Búsqueda: iphone" })
    );

    expect(onQuitar).toHaveBeenCalledWith(chips[0]);
  });

  it("no renderiza chips vacíos", () => {
    const { container } = render(<FilterChips chips={[]} onQuitar={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("Pagination", () => {
  it("deshabilita Anterior en la primera página y Siguiente en la última", () => {
    const { rerender } = render(
      <Pagination pagina={1} totalPaginas={3} total={30} onCambiar={vi.fn()} />
    );

    expect(
      screen.getByRole("button", { name: "Anterior" }).hasAttribute("disabled")
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Siguiente" }).hasAttribute("disabled")
    ).toBe(false);
    expect(screen.getByText(/Página 1 de 3/)).toBeDefined();

    rerender(
      <Pagination pagina={3} totalPaginas={3} total={30} onCambiar={vi.fn()} />
    );

    expect(
      screen.getByRole("button", { name: "Siguiente" }).hasAttribute("disabled")
    ).toBe(true);
  });
});
