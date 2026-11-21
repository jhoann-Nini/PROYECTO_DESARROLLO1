// @vitest-environment happy-dom
import { normalizarDatosFichaTecnica } from "@/data/fichaTecnica";
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
    datosFichaTecnica:
      overrides.datosFichaTecnica ?? normalizarDatosFichaTecnica(null),
  };
}

const ETIQUETAS_CATEGORIA = [
  "Todos",
  "Celulares",
  "Tablets",
  "Portátiles",
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
      name: /Buscar dispositivos por marca o modelo/i,
    });
    expect(document.activeElement).toBe(input);
    expect(screen.getByText("Encontramos 1 producto.")).toBeDefined();
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
    expect(screen.getByText("Buscando dispositivos…")).toBeDefined();
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
      name: /Buscar dispositivos por marca o modelo/i,
    });

    fireEvent.change(input, { target: { value: "galaxy" } });

    expect(screen.getByText("Galaxy Tab S10")).toBeDefined();
    expect(screen.getByText("Galaxy Buds FE")).toBeDefined();
    expect(screen.queryByText("iPhone 16")).toBeNull();
    expect(screen.getByText("Encontramos 2 productos.")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Tablets" }));

    expect(screen.getByText("Galaxy Tab S10")).toBeDefined();
    expect(screen.queryByText("Galaxy Buds FE")).toBeNull();
    expect(screen.getByText("Encontramos 1 producto.")).toBeDefined();
  });

  describe("HA-04: Protección de enlaces en PanelBusquedaModal", () => {
    it("renderiza un enlace <Link> hacia /productos/{id} para productos legítimos de API", () => {
      render(
        <PanelBusquedaModal
          abierto
          onCerrar={vi.fn()}
          productos={[
            crearProducto({
              idProducto: 42,
              idApi: 42,
              origen: "api",
              nombre: "Dispositivo API",
            }),
          ]}
        />
      );

      const link = screen.getByRole("link", { name: /Dispositivo API/i });
      expect(link).toBeDefined();
      expect(link.getAttribute("href")).toBe("/productos/42");
    });

    it("no genera un enlace para productos mock o con ID negativo, pero permite seleccionar y cerrar", () => {
      const onSeleccionar = vi.fn();
      const onCerrar = vi.fn();

      render(
        <PanelBusquedaModal
          abierto
          onCerrar={onCerrar}
          onSeleccionarProducto={onSeleccionar}
          productos={[
            crearProducto({
              idProducto: -15,
              idApi: null,
              origen: "mock",
              nombre: "Dispositivo Mock Negativo",
            }),
          ]}
        />
      );

      expect(screen.queryByRole("link", { name: /Dispositivo Mock Negativo/i })).toBeNull();
      const item = screen.getByText("Dispositivo Mock Negativo");
      expect(item).toBeDefined();

      fireEvent.click(item);
      expect(onSeleccionar).toHaveBeenCalled();
      expect(onCerrar).toHaveBeenCalled();
    });
  });

  describe("avisos cuando la búsqueda no encuentra un dispositivo", () => {
    const catalogo = () => [
      crearProducto({ idProducto: 1, nombre: "Apple iPhone 16", textoBusqueda: "apple iphone 16 chip a18 18 w" }),
      crearProducto({ idProducto: 2, nombre: "Apple iPhone 15", textoBusqueda: "apple iphone 15 moviles" }),
      crearProducto({
        idProducto: 3, nombre: "Sony WH-1000XM5", marca: "Sony", categoria: "auriculares",
        categoriaEtiqueta: "Auriculares", textoBusqueda: "sony wh-1000xm5 auriculares",
      }),
    ];
    const buscar = (valor: string) =>
      fireEvent.change(screen.getByRole("searchbox", { name: /Buscar dispositivos por marca o modelo/i }), {
        target: { value: valor },
      });

    it("avisa que un dispositivo no está registrado y sugiere similares reales", () => {
      render(<PanelBusquedaModal abierto onCerrar={vi.fn()} productos={catalogo()} />);
      buscar("iPhone 18");

      expect(screen.getByText("«iPhone 18» no está en nuestro catálogo.")).toBeDefined();
      const similares = screen.getByRole("list", { name: "Productos parecidos en nuestro catálogo" });
      expect(similares.textContent).toContain("Apple iPhone 16");
      expect(similares.textContent).toContain("Apple iPhone 15");
      expect(similares.textContent).not.toContain("Sony");
    });

    it.each(["teléfono", "audífonos", "celular", "portátil"])(
      "pide marca o nombre cuando solo se busca «%s»",
      (termino) => {
        render(<PanelBusquedaModal abierto onCerrar={vi.fn()} productos={catalogo()} />);
        buscar(termino);

        expect(screen.getAllByText("Escribe la marca o el modelo del dispositivo.").length).toBeGreaterThan(0);
        expect(screen.queryByText("Sony WH-1000XM5")).toBeNull();
        expect(screen.queryByText("Apple iPhone 16")).toBeNull();
      },
    );

    it("usa la palabra genérica como categoría cuando va con una marca", () => {
      render(<PanelBusquedaModal abierto onCerrar={vi.fn()} productos={catalogo()} />);
      buscar("audífonos sony");

      expect(screen.getByText("Sony WH-1000XM5")).toBeDefined();
      expect(screen.queryByText("Apple iPhone 16")).toBeNull();
    });
  });
});

