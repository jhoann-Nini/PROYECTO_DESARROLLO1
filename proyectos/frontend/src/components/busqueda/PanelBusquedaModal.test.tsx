// @vitest-environment happy-dom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ProductoViewModel } from "@/data/productoViewModel";
import PanelBusquedaModal from "./PanelBusquedaModal";

afterEach(() => {
  cleanup();
});

function crearProducto(
  overrides: Partial<ProductoViewModel> = {},
): ProductoViewModel {
  const nombre = overrides.nombre ?? "iPhone 16";
  const marca = overrides.marca ?? "Apple";
  const categoriaEtiqueta = overrides.categoriaEtiqueta ?? "Móviles";

  return {
    idProducto: 1,
    nombre,
    marca,
    categoria: "moviles",
    categoriaEtiqueta,
    imagen: null,
    precioCOP: 4_000_000,
    precioFormateado: "$ 4.000.000 COP",
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
    caracteristicas: [],
    textoBusqueda: `${nombre} ${marca} ${categoriaEtiqueta}`.toLowerCase(),
    ...overrides,
  };
}

const ETIQUETAS_CATEGORIA = [
  "Todos",
  "Celulares",
  "Tablets",
  "Portátiles / PC",
  "Auriculares",
];

describe("PanelBusquedaModal", () => {
  it("renderiza un diálogo modal accesible y enfoca el campo de búsqueda", () => {
    render(
      <PanelBusquedaModal
        abierto
        onCerrar={vi.fn()}
        productos={[crearProducto()]}
      />,
    );

    const dialogo = screen.getByRole("dialog");
    expect(dialogo.getAttribute("aria-modal")).toBe("true");
    expect(dialogo.getAttribute("aria-labelledby")).toBe(
      "titulo-busqueda-modal",
    );
    expect(
      document.getElementById("titulo-busqueda-modal")?.textContent,
    ).toContain("Buscar dispositivos");

    const input = screen.getByRole("searchbox", {
      name: /Buscar por modelo, marca o especificación/i,
    });
    expect(document.activeElement).toBe(input);
    expect(screen.getByText("Se encontraron 1 producto")).toBeDefined();
  });

  it("muestra los cinco interruptores de categoría con aria-pressed", () => {
    render(
      <PanelBusquedaModal abierto onCerrar={vi.fn()} productos={[]} />,
    );

    const grupo = screen.getByRole("group", {
      name: "Filtrar por categoría",
    });

    for (const etiqueta of ETIQUETAS_CATEGORIA) {
      expect(within(grupo).getByRole("button", { name: etiqueta })).toBeDefined();
    }

    const todos = within(grupo).getByRole("button", { name: "Todos" });
    expect(todos.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(within(grupo).getByRole("button", { name: "Tablets" }));
    expect(
      within(grupo)
        .getByRole("button", { name: "Tablets" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(todos.getAttribute("aria-pressed")).toBe("false");
  });

  it("muestra esqueletos animados cuando cargando es true", () => {
    render(
      <PanelBusquedaModal
        abierto
        onCerrar={vi.fn()}
        productos={[]}
        cargando
      />,
    );

    const dialogo = screen.getByRole("dialog");
    expect(dialogo.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(
      4,
    );
    expect(dialogo.querySelector(".h-12.w-12.rounded-md")).not.toBeNull();
    expect(dialogo.querySelector(".h-4.w-3\\/4.rounded")).not.toBeNull();
    expect(dialogo.querySelector(".h-3.w-1\\/2.rounded")).not.toBeNull();
    expect(screen.getByText("Buscando dispositivos...")).toBeDefined();
  });

  it("se cierra al presionar Escape", () => {
    const onCerrar = vi.fn();
    render(<PanelBusquedaModal abierto onCerrar={onCerrar} productos={[]} />);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("se cierra al hacer clic en el backdrop", () => {
    const onCerrar = vi.fn();
    render(<PanelBusquedaModal abierto onCerrar={onCerrar} productos={[]} />);

    fireEvent.click(screen.getByTestId("backdrop-busqueda"));

    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("mantiene el foco atrapado entre el primer y el último elemento", () => {
    render(
      <PanelBusquedaModal
        abierto
        onCerrar={vi.fn()}
        productos={[
          crearProducto({ idProducto: 1 }),
          crearProducto({
            idProducto: 2,
            nombre: "Galaxy Tab S10",
            marca: "Samsung",
            categoria: "tablets",
            categoriaEtiqueta: "Tablets",
          }),
        ]}
      />,
    );

    const dialogo = screen.getByRole("dialog");
    const cerrar = screen.getByRole("button", { name: "Cerrar búsqueda" });
    const enlaces = within(dialogo).getAllByRole("link");
    const ultimo = enlaces[enlaces.length - 1];

    ultimo.focus();
    fireEvent.keyDown(ultimo, { key: "Tab" });
    expect(document.activeElement).toBe(cerrar);

    cerrar.focus();
    fireEvent.keyDown(cerrar, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(ultimo);
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  it("devuelve el foco al disparador al cerrarse", () => {
    function Disparador() {
      const [abierto, setAbierto] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setAbierto(true)}>
            Abrir búsqueda de prueba
          </button>
          <PanelBusquedaModal
            abierto={abierto}
            onCerrar={() => setAbierto(false)}
            productos={[]}
          />
        </>
      );
    }

    render(<Disparador />);

    const disparador = screen.getByRole("button", {
      name: "Abrir búsqueda de prueba",
    });
    disparador.focus();
    fireEvent.click(disparador);

    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(disparador);
  });

  it("filtra por texto y categoría y anuncia la cantidad de resultados", () => {
    render(
      <PanelBusquedaModal
        abierto
        onCerrar={vi.fn()}
        productos={[
          crearProducto({ idProducto: 1 }),
          crearProducto({
            idProducto: 2,
            nombre: "Galaxy Tab S10",
            marca: "Samsung",
            categoria: "tablets",
            categoriaEtiqueta: "Tablets",
          }),
          crearProducto({
            idProducto: 3,
            nombre: "Galaxy Buds FE",
            marca: "Samsung",
            categoria: "auriculares",
            categoriaEtiqueta: "Auriculares",
          }),
        ]}
      />,
    );

    const input = screen.getByRole("searchbox", {
      name: /Buscar por modelo, marca o especificación/i,
    });

    fireEvent.change(input, { target: { value: "galaxy" } });

    expect(screen.getByText("Galaxy Tab S10")).toBeDefined();
    expect(screen.getByText("Galaxy Buds FE")).toBeDefined();
    expect(screen.queryByText("iPhone 16")).toBeNull();
    expect(screen.getByText("Se encontraron 2 productos")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Tablets" }));

    expect(screen.getByText("Galaxy Tab S10")).toBeDefined();
    expect(screen.queryByText("Galaxy Buds FE")).toBeNull();
    expect(screen.getByText("Se encontraron 1 producto")).toBeDefined();
  });
});
