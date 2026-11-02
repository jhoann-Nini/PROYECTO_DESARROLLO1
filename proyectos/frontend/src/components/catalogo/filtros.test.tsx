// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

function renderSidebar(
  overrides: {
    filtros?: FiltrosCatalogo;
    onCambiar?: (filtros: FiltrosCatalogo) => void;
    hayFiltros?: boolean;
    abierto?: boolean;
    onCerrar?: () => void;
  } = {}
) {
  return render(
    <FilterSidebar
      catalogo={catalogo}
      filtros={overrides.filtros ?? filtrosVacios()}
      onCambiar={overrides.onCambiar ?? vi.fn()}
      onLimpiar={vi.fn()}
      hayFiltros={overrides.hayFiltros ?? false}
      abierto={overrides.abierto}
      onCerrar={overrides.onCerrar}
    />
  );
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

describe("FilterSidebar — buscador de marcas", () => {
  it("filtra las marcas sin distinguir mayúsculas ni acentos", () => {
    renderSidebar();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar marcas" }),
      { target: { value: "SAMSÚNG" } }
    );

    expect(screen.getByRole("checkbox", { name: /Samsung/i })).toBeDefined();
    expect(screen.queryByRole("checkbox", { name: /Apple/i })).toBeNull();
  });

  it("mantiene visibles las marcas ya seleccionadas", () => {
    renderSidebar({
      filtros: { ...filtrosVacios(), marcas: ["Samsung"] },
    });

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar marcas" }),
      { target: { value: "apple" } }
    );

    expect(screen.getByRole("checkbox", { name: /Samsung/i })).toBeDefined();
    expect(screen.getByRole("checkbox", { name: /Apple/i })).toBeDefined();
  });

  it("avisa cuando ninguna marca coincide", () => {
    renderSidebar();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar marcas" }),
      { target: { value: "zzz" } }
    );

    expect(screen.getByText("No encontramos marcas.")).toBeDefined();
  });
});

describe("FilterSidebar — precios manuales", () => {
  it("muestra vacíos los límites sin restricción", () => {
    renderSidebar();

    expect(
      (screen.getByLabelText("Precio mínimo en pesos") as HTMLInputElement)
        .value
    ).toBe("");
    expect(
      (screen.getByLabelText("Precio máximo en pesos") as HTMLInputElement)
        .value
    ).toBe("");
  });

  it("aplica el precio mínimo al salir del campo", () => {
    const onCambiar = vi.fn();
    const filtros = filtrosVacios();
    renderSidebar({ filtros, onCambiar });

    const minimo = screen.getByLabelText("Precio mínimo en pesos");
    fireEvent.change(minimo, { target: { value: "2000000" } });
    expect(onCambiar).not.toHaveBeenCalled();

    fireEvent.blur(minimo);

    expect(onCambiar).toHaveBeenCalledWith({
      ...filtros,
      precioMin: 2_000_000,
      precioMax: 6_000_000,
    });
  });

  it("aplica el precio máximo con Enter", () => {
    const onCambiar = vi.fn();
    const filtros = filtrosVacios();
    renderSidebar({ filtros, onCambiar });

    const maximo = screen.getByLabelText("Precio máximo en pesos");
    fireEvent.change(maximo, { target: { value: "4000000" } });
    fireEvent.keyDown(maximo, { key: "Enter" });

    expect(onCambiar).toHaveBeenCalledWith({
      ...filtros,
      precioMin: 1_000_000,
      precioMax: 4_000_000,
    });
  });

  it("vaciar los campos restablece los límites", () => {
    const onCambiar = vi.fn();
    const filtros = {
      ...filtrosVacios(),
      precioMin: 2_000_000,
      precioMax: 4_000_000,
    };
    renderSidebar({ filtros, onCambiar });

    const minimo = screen.getByLabelText(
      "Precio mínimo en pesos"
    ) as HTMLInputElement;
    const maximo = screen.getByLabelText(
      "Precio máximo en pesos"
    ) as HTMLInputElement;

    expect(minimo.value).toBe("2000000");
    expect(maximo.value).toBe("4000000");

    fireEvent.change(minimo, { target: { value: "" } });
    fireEvent.blur(minimo);
    expect(onCambiar).toHaveBeenCalledWith({ ...filtros, precioMin: 0 });

    fireEvent.change(maximo, { target: { value: "" } });
    fireEvent.blur(maximo);
    expect(onCambiar).toHaveBeenLastCalledWith({
      ...filtros,
      precioMax: Number.MAX_SAFE_INTEGER,
    });
  });

  it("limita los valores escritos al rango del catálogo", () => {
    const onCambiar = vi.fn();
    const filtros = filtrosVacios();
    renderSidebar({ filtros, onCambiar });

    const minimo = screen.getByLabelText("Precio mínimo en pesos");
    fireEvent.change(minimo, { target: { value: "500000" } });
    fireEvent.blur(minimo);
    expect(onCambiar).toHaveBeenCalledWith({ ...filtros, precioMin: 0 });

    const maximo = screen.getByLabelText("Precio máximo en pesos");
    fireEvent.change(maximo, { target: { value: "99000000" } });
    fireEvent.blur(maximo);
    expect(onCambiar).toHaveBeenLastCalledWith({
      ...filtros,
      precioMax: Number.MAX_SAFE_INTEGER,
    });
  });
});

describe("FilterSidebar — cajón móvil", () => {
  it("no expone un diálogo mientras está cerrado", () => {
    renderSidebar({ abierto: false, onCerrar: vi.fn() });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("expone un diálogo accesible y enfoca el cierre al abrirse", () => {
    renderSidebar({ abierto: true, onCerrar: vi.fn() });

    const dialogo = screen.getByRole("dialog", {
      name: "Filtros del catálogo",
    });
    const cerrar = within(dialogo).getByRole("button", {
      name: "Cerrar filtros",
    });

    expect(document.activeElement).toBe(cerrar);
  });

  it("cierra con el botón, el fondo, Escape y 'Ver resultados'", () => {
    const onCerrar = vi.fn();
    renderSidebar({ abierto: true, onCerrar });

    fireEvent.click(screen.getByRole("button", { name: "Cerrar filtros" }));
    expect(onCerrar).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("backdrop-filtros"));
    expect(onCerrar).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCerrar).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByRole("button", { name: "Ver resultados" }));
    expect(onCerrar).toHaveBeenCalledTimes(4);
  });

  it("atrapa el foco dentro del cajón", () => {
    renderSidebar({ abierto: true, onCerrar: vi.fn() });

    const dialogo = screen.getByRole("dialog");
    const cerrar = within(dialogo).getByRole("button", {
      name: "Cerrar filtros",
    });
    const verResultados = within(dialogo).getByRole("button", {
      name: "Ver resultados",
    });

    verResultados.focus();
    fireEvent.keyDown(verResultados, { key: "Tab" });
    expect(document.activeElement).toBe(cerrar);

    fireEvent.keyDown(cerrar, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(verResultados);
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  it("bloquea el desplazamiento mientras está abierto y lo restaura al cerrar", () => {
    const onCerrar = vi.fn();
    const { rerender } = renderSidebar({ abierto: true, onCerrar });

    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <FilterSidebar
        catalogo={catalogo}
        filtros={filtrosVacios()}
        onCambiar={vi.fn()}
        onLimpiar={vi.fn()}
        hayFiltros={false}
        abierto={false}
        onCerrar={onCerrar}
      />
    );

    expect(document.body.style.overflow).toBe("");
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
