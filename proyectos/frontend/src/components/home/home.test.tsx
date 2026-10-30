// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FormEvent } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import CategoriasHome from "./CategoriasHome";
import PresupuestoHome from "./PresupuestoHome";
import OfertasHome from "./OfertasHome";
import DestacadosHome, {
  type DestacadosHomeProps,
} from "./DestacadosHome";
import RankingsHome from "./RankingsHome";
import OpinionesHome from "./OpinionesHome";
import CtaComparador from "./CtaComparador";
import type { ProductoViewModel } from "@/data/productoViewModel";
import type {
  Producto,
  ProductoDeseado,
  ProductoMasComentado,
  ProductoMejorValorado,
  ProductoOferta,
} from "@/types/producto";
import type { ResenaResponse } from "@/services/api";

afterEach(() => {
  cleanup();
});

function crearVista(
  overrides: Partial<ProductoViewModel> = {},
): ProductoViewModel {
  return {
    idProducto: 1,
    nombre: "Samsung Galaxy S24 Ultra",
    marca: "Samsung",
    categoria: "moviles",
    categoriaEtiqueta: "Móviles",
    imagen: null,
    precioCOP: 5_499_000,
    precioFormateado: "$ 5.499.000 COP",
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
    textoBusqueda: "samsung galaxy s24 ultra",
    ...overrides,
  };
}

function crearOferta(overrides: Partial<ProductoOferta> = {}): ProductoOferta {
  return {
    idProducto: 10,
    nombre: "Oferta Uno",
    descripcion: "Edición especial",
    idCategoria: 1,
    idMarca: 1,
    imagen: null,
    precioReferencia: 1000,
    precioActual: 800,
    ahorroMonetario: 200,
    porcentajeDescuento: 20,
    idEstablecimiento: 3,
    nombreEstablecimiento: "Tienda Central",
    posicionRanking: 1,
    ...overrides,
  };
}

function crearMejorValorado(
  overrides: Partial<ProductoMejorValorado> = {},
): ProductoMejorValorado {
  return {
    idProducto: 20,
    nombre: "Mejor Uno",
    descripcion: "El mejor puntuado",
    idCategoria: 1,
    idMarca: 1,
    imagen: null,
    precioReferencia: 900,
    promedioPuntuacion: 4.8,
    cantidadValoraciones: 12,
    posicionRanking: 1,
    ...overrides,
  };
}

function crearMasComentado(
  overrides: Partial<ProductoMasComentado> = {},
): ProductoMasComentado {
  return {
    idProducto: 30,
    nombre: "Comentado Uno",
    descripcion: "El más comentado",
    idCategoria: 1,
    idMarca: 1,
    imagen: null,
    precioReferencia: 950,
    cantidadResenas: 8,
    posicionRanking: 1,
    ...overrides,
  };
}

function crearDeseado(
  overrides: Partial<ProductoDeseado> = {},
): ProductoDeseado {
  return {
    idProducto: 40,
    nombre: "Deseado Uno",
    descripcion: "El más deseado",
    idCategoria: 1,
    idMarca: 1,
    imagen: null,
    precioReferencia: 1200,
    cantidadDeseados: 5,
    posicionRanking: 1,
    ...overrides,
  };
}

function crearResena(overrides: Partial<ResenaResponse> = {}): ResenaResponse {
  return {
    idResena: 1,
    idProducto: 1,
    nombreProducto: "Samsung Galaxy S24 Ultra",
    idUsuario: 7,
    nombreUsuario: "ana",
    comentario: "Excelente cámara y batería.",
    fechaCreacion: "2026-10-20T12:00:00",
    estado: true,
    ...overrides,
  };
}

function propsRankings() {
  return {
    mejorValorados: [crearMejorValorado()],
    cargandoMejorValorados: false,
    errorMejorValorados: null,
    onReintentarMejorValorados: vi.fn(),
    mostrarTodosMejorValorados: false,
    onAlternarMejorValorados: vi.fn(),
    masComentados: [crearMasComentado()],
    cargandoMasComentados: false,
    errorMasComentados: null,
    onReintentarMasComentados: vi.fn(),
    mostrarTodosComentados: false,
    onAlternarComentados: vi.fn(),
    masDeseados: [crearDeseado()],
    cargandoMasDeseados: false,
    errorMasDeseados: null,
    onReintentarMasDeseados: vi.fn(),
    onVerDetalle: vi.fn(),
  };
}

function propsDestacados(
  overrides: Partial<DestacadosHomeProps> = {},
): DestacadosHomeProps {
  return {
    productos: [],
    totalVerificados: 0,
    totalMostrados: 0,
    cargando: false,
    estadoBackend: "online",
    busqueda: "",
    filtroPresupuesto: false,
    presupuestoMax: 1000,
    limitePresupuestoCOP: 4_000_000,
    onVerDetalle: vi.fn(),
    onLimpiarBusqueda: vi.fn(),
    onMostrarTodos: vi.fn(),
    ...overrides,
  };
}

describe("CategoriasHome", () => {
  it("muestra 'Todos' y las cuatro categorías navegables", () => {
    const onSeleccionarTodos = vi.fn();
    render(<CategoriasHome onSeleccionarTodos={onSeleccionarTodos} />);

    const grupo = screen.getByRole("group", {
      name: "Explorar por categoría",
    });

    fireEvent.click(within(grupo).getByRole("button", { name: /Todos/ }));
    expect(onSeleccionarTodos).toHaveBeenCalledTimes(1);

    const enlaces = within(grupo).getAllByRole("link");
    expect(enlaces).toHaveLength(4);
    expect(
      within(grupo).getByRole("link", { name: /Teléfonos \/ Celulares/ }).getAttribute("href"),
    ).toBe("/categorias/celulares");
    expect(
      within(grupo).getByRole("link", { name: /Tablets/ }).getAttribute("href"),
    ).toBe("/categorias/tablets");
    expect(
      within(grupo).getByRole("link", { name: /Portátiles \/ PC/ }).getAttribute("href"),
    ).toBe("/categorias/portatiles");
    expect(
      within(grupo).getByRole("link", { name: /Auriculares/ }).getAttribute("href"),
    ).toBe("/categorias/auriculares");
  });

  it("usa iconos SVG consistentes en lugar de emojis", () => {
    render(<CategoriasHome onSeleccionarTodos={vi.fn()} />);

    const grupo = screen.getByRole("group", {
      name: "Explorar por categoría",
    });

    expect(grupo.querySelectorAll("svg")).toHaveLength(5);
    expect(grupo.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});

describe("PresupuestoHome", () => {
  it("mueve el slider y alterna el filtro explícito", () => {
    const onCambiarPresupuesto = vi.fn();
    const onAlternarFiltro = vi.fn();
    const { rerender } = render(
      <PresupuestoHome
        presupuestoMax={1000}
        onCambiarPresupuesto={onCambiarPresupuesto}
        totalEnPresupuesto={4}
        totalProductos={10}
        filtrarSolo={false}
        onAlternarFiltro={onAlternarFiltro}
      />,
    );

    const slider = screen.getByLabelText(
      "Ajustar presupuesto máximo en pesos colombianos",
    );
    expect(slider.getAttribute("min")).toBe("50");
    expect(slider.getAttribute("max")).toBe("1500");
    expect(slider.getAttribute("step")).toBe("25");

    fireEvent.change(slider, { target: { value: "250" } });
    expect(onCambiarPresupuesto).toHaveBeenCalledWith(250);

    expect(screen.getByText(/de 10 dentro del presupuesto/)).toBeDefined();

    const alternar = screen.getByRole("button", {
      name: /Filtrar por presupuesto/,
    });
    expect(alternar.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(alternar);
    expect(onAlternarFiltro).toHaveBeenCalledTimes(1);

    rerender(
      <PresupuestoHome
        presupuestoMax={1000}
        onCambiarPresupuesto={onCambiarPresupuesto}
        totalEnPresupuesto={4}
        totalProductos={10}
        filtrarSolo
        onAlternarFiltro={onAlternarFiltro}
      />,
    );

    const activo = screen.getByRole("button", { name: /Solo en presupuesto/ });
    expect(activo.getAttribute("aria-pressed")).toBe("true");
  });

  it("notifica el fin del ajuste con el valor actual del slider", () => {
    const onCambiarPresupuesto = vi.fn();
    const onFinalizarAjuste = vi.fn();
    const { rerender } = render(
      <PresupuestoHome
        presupuestoMax={1000}
        onCambiarPresupuesto={onCambiarPresupuesto}
        onFinalizarAjuste={onFinalizarAjuste}
        totalEnPresupuesto={4}
        totalProductos={10}
        filtrarSolo={false}
        onAlternarFiltro={vi.fn()}
      />,
    );

    const slider = screen.getByLabelText(
      "Ajustar presupuesto máximo en pesos colombianos",
    );
    fireEvent.change(slider, { target: { value: "250" } });

    rerender(
      <PresupuestoHome
        presupuestoMax={250}
        onCambiarPresupuesto={onCambiarPresupuesto}
        onFinalizarAjuste={onFinalizarAjuste}
        totalEnPresupuesto={4}
        totalProductos={10}
        filtrarSolo={false}
        onAlternarFiltro={vi.fn()}
      />,
    );

    expect(onFinalizarAjuste).not.toHaveBeenCalled();

    for (const evento of ["pointerUp", "mouseUp", "touchEnd", "keyUp"] as const) {
      onFinalizarAjuste.mockClear();
      fireEvent[evento](slider);
      expect(onFinalizarAjuste).toHaveBeenCalledTimes(1);
      expect(onFinalizarAjuste).toHaveBeenCalledWith(250);
    }
  });
});

describe("OfertasHome", () => {
  const propsBase = {
    ofertas: [crearOferta()],
    cargando: false,
    error: null,
    onReintentar: vi.fn(),
    mostrarTodas: false,
    onAlternar: vi.fn(),
    onVerDetalle: vi.fn(),
  };

  it("muestra la oferta, el descuento y el reintento", () => {
    const { rerender } = render(<OfertasHome {...propsBase} />);

    expect(screen.getByText("Ofertas destacadas")).toBeDefined();
    expect(screen.getByText("En promoción (1)")).toBeDefined();
    expect(screen.getByText("Oferta Uno")).toBeDefined();
    expect(screen.getByText("Tienda Central · Edición especial")).toBeDefined();
    expect(screen.getByText("-20%")).toBeDefined();
    expect(screen.getByText(/Ahorras:/)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Oferta Uno/ }));
    expect(propsBase.onVerDetalle).toHaveBeenCalledWith(propsBase.ofertas[0]);

    rerender(
      <OfertasHome
        {...propsBase}
        error="No se pudieron cargar las ofertas"
      />,
    );
    expect(screen.getByText(/No se pudieron cargar las ofertas/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar ofertas" }));
    expect(propsBase.onReintentar).toHaveBeenCalledTimes(1);
  });

  it("muestra el estado vacío y el botón para ver todas", () => {
    render(
      <OfertasHome
        {...propsBase}
        ofertas={[]}
        mostrarTodas={false}
      />,
    );

    expect(
      screen.getByText("No hay ofertas coincidentes con este filtro."),
    ).toBeDefined();
  });
});

describe("DestacadosHome", () => {
  it("muestra el estado de carga", () => {
    render(<DestacadosHome {...propsDestacados({ cargando: true })} />);

    expect(screen.getByText("Cargando catálogo de dispositivos...")).toBeDefined();
  });

  it("muestra tarjetas con los badges de presupuesto", () => {
    const productos = [
      crearVista({ idProducto: 1, precioCOP: 1_000_000, precioFormateado: "$ 1.000.000 COP" }),
      crearVista({ idProducto: 2, nombre: "iPhone 15 Pro Max", precioCOP: 5_499_000, precioFormateado: "$ 5.499.000 COP" }),
    ];
    const onVerDetalle = vi.fn();

    render(
      <DestacadosHome
        {...propsDestacados({
          productos,
          totalVerificados: 2,
          totalMostrados: 2,
          onVerDetalle,
        })}
      />,
    );

    expect(screen.getByText("✓ En presupuesto")).toBeDefined();
    expect(screen.getByText("Supera presupuesto")).toBeDefined();
    expect(
      screen.getByText("2 productos verificados en la plataforma • 2 mostrados"),
    ).toBeDefined();
    expect(screen.getByText("Servidor conectado")).toBeDefined();

    fireEvent.click(screen.getAllByRole("button", { name: "Ver detalle" })[0]);
    expect(onVerDetalle).toHaveBeenCalledWith(productos[0]);
  });

  it("muestra el badge de ranking en los destacados que tienen posición", () => {
    render(
      <DestacadosHome
        {...propsDestacados({
          productos: [crearVista({ idProducto: 1, posicionRanking: 1 })],
          totalVerificados: 1,
          totalMostrados: 1,
        })}
      />,
    );

    expect(screen.getByText("#1 TOP")).toBeDefined();
  });

  it("enlaza al catálogo completo desde la cabecera y al final de la cuadrícula", () => {
    const productos = [crearVista({ idProducto: 1 })];
    render(
      <DestacadosHome
        {...propsDestacados({
          productos,
          totalVerificados: 80,
          totalMostrados: 1,
        })}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Ver catálogo completo" }).getAttribute("href"),
    ).toBe("/productos");
    expect(
      screen
        .getByRole("link", { name: "Explorar todos los productos (80)" })
        .getAttribute("href"),
    ).toBe("/productos");
  });

  it("no muestra el CTA final mientras carga o no hay productos", () => {
    const { rerender } = render(
      <DestacadosHome {...propsDestacados({ cargando: true })} />,
    );

    expect(
      screen.queryByRole("link", { name: /Explorar todos los productos/ }),
    ).toBeNull();

    rerender(<DestacadosHome {...propsDestacados()} />);

    expect(
      screen.queryByRole("link", { name: /Explorar todos los productos/ }),
    ).toBeNull();
  });

  it("muestra el estado vacío de búsqueda y permite limpiarla", () => {
    const onLimpiarBusqueda = vi.fn();
    render(
      <DestacadosHome
        {...propsDestacados({ busqueda: "pixel", onLimpiarBusqueda })}
      />,
    );

    expect(
      screen.getByText(/No encontramos productos con/),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(onLimpiarBusqueda).toHaveBeenCalledTimes(1);
  });

  it("muestra el estado vacío de presupuesto y permite mostrar todos", () => {
    const onMostrarTodos = vi.fn();
    render(
      <DestacadosHome
        {...propsDestacados({ filtroPresupuesto: true, onMostrarTodos })}
      />,
    );

    expect(
      screen.getByText(/No hay productos registrados dentro del presupuesto/),
    ).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", { name: "Mostrar todos los productos" }),
    );
    expect(onMostrarTodos).toHaveBeenCalledTimes(1);
  });

  it("expone el ancla de destacados y el presupuesto aplicado", () => {
    const { rerender } = render(
      <DestacadosHome {...propsDestacados({ filtroPresupuesto: false })} />,
    );

    const seccion = screen.getByRole("region", {
      name: "Destacados para ti.",
    });
    expect(seccion.getAttribute("id")).toBe("seccion-destacados");
    expect(seccion.className).toContain("scroll-mt-16");
    expect(screen.queryByText(/Presupuesto aplicado/)).toBeNull();

    rerender(
      <DestacadosHome
        {...propsDestacados({
          filtroPresupuesto: true,
          limitePresupuestoCOP: 4_000_000,
        })}
      />,
    );

    expect(
      screen.getByText(/Presupuesto aplicado:.*4\.000\.000.*COP/),
    ).toBeDefined();
  });

  it("muestra 'Modo local' cuando la API no responde", () => {
    render(
      <DestacadosHome
        {...propsDestacados({ estadoBackend: "offline" })}
      />,
    );

    expect(screen.getByText("Modo local")).toBeDefined();
  });
});

describe("RankingsHome", () => {
  it("muestra los tres rankings y sus estados vacíos", () => {
    const props = propsRankings();
    const { rerender } = render(<RankingsHome {...props} />);

    expect(screen.getByText("Mejor valorados.")).toBeDefined();
    expect(screen.getByText("Más comentados.")).toBeDefined();
    expect(screen.getByText("Los más deseados.")).toBeDefined();
    expect(screen.getByText("Mejor Uno")).toBeDefined();
    expect(screen.getByText("Comentado Uno")).toBeDefined();
    expect(screen.getByText("Deseado Uno")).toBeDefined();
    expect(screen.getByText("5 deseos")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Ver ficha de Mejor Uno" }));
    expect(props.onVerDetalle).toHaveBeenCalledWith(props.mejorValorados[0]);

    rerender(
      <RankingsHome
        {...props}
        mejorValorados={[]}
        masComentados={[]}
        masDeseados={[]}
      />,
    );

    expect(
      screen.getByText(
        "Aún no hay productos con valoraciones registradas en el catálogo.",
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        "Aún no hay reseñas registradas para los productos en la plataforma.",
      ),
    ).toBeDefined();
    expect(screen.getByText("Sin listas de deseos registradas")).toBeDefined();
  });

  it("sintetiza la ficha con descripción truncada y métrica compacta", () => {
    const props = propsRankings();
    props.mejorValorados = [
      crearMejorValorado({
        descripcion:
          "Un teléfono con una ficha técnica extensa que antes ocupaba demasiadas líneas estrechas dentro de la tarjeta.",
      }),
    ];

    render(<RankingsHome {...props} />);

    const descripcion = screen.getByText(/ficha técnica extensa/);
    expect(descripcion.className).toContain("line-clamp-2");
    expect(screen.getByText("12 valoraciones")).toBeDefined();
    expect(screen.queryByText("Interacción comunitaria")).toBeNull();
    expect(screen.queryByText("Interés de la comunidad")).toBeNull();
  });

  it("muestra el error y permite reintentar cada ranking", () => {
    const props = propsRankings();
    render(
      <RankingsHome
        {...props}
        errorMejorValorados="Falló valoraciones"
        errorMasComentados="Falló comentarios"
        errorMasDeseados="Falló deseos"
      />,
    );

    expect(screen.getByText(/Falló valoraciones/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar valoraciones" }));
    expect(props.onReintentarMejorValorados).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Reintentar comentarios" }));
    expect(props.onReintentarMasComentados).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Reintentar deseos" }));
    expect(props.onReintentarMasDeseados).toHaveBeenCalledTimes(1);
  });
});

describe("OpinionesHome", () => {
  const propsBase = {
    usuario: null,
    resenas: [] as ResenaResponse[],
    resenasFiltradas: [] as ResenaResponse[],
    cargando: false,
    filtro: "",
    onCambiarFiltro: vi.fn(),
    onActualizar: vi.fn(),
    comentario: "",
    onCambiarComentario: vi.fn(),
    idProducto: "" as const,
    onCambiarProducto: vi.fn(),
    productos: [] as Producto[],
    enviando: false,
    error: null,
    onPublicar: vi.fn((evento: FormEvent<HTMLFormElement>) =>
      evento.preventDefault(),
    ),
    onPedirLogin: vi.fn(),
  };

  it("muestra el aviso de login y el formulario", () => {
    const onPedirLogin = vi.fn();
    const onCambiarComentario = vi.fn();
    const onPublicar = vi.fn((evento: FormEvent<HTMLFormElement>) =>
      evento.preventDefault(),
    );

    render(
      <OpinionesHome
        {...propsBase}
        onPedirLogin={onPedirLogin}
        onCambiarComentario={onCambiarComentario}
        onPublicar={onPublicar}
      />,
    );

    expect(screen.getByText(/Opiniones de la comunidad \(0\)/)).toBeDefined();
    expect(screen.getByText(/Inicia sesión con tu cuenta/)).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", { name: "Identificarse para opinar" }),
    );
    expect(onPedirLogin).toHaveBeenCalledTimes(1);

    fireEvent.change(
      screen.getByPlaceholderText(/Inicia sesión para publicar tu opinión aquí/),
      { target: { value: "Muy buen equipo" } },
    );
    expect(onCambiarComentario).toHaveBeenCalledWith("Muy buen equipo");

    fireEvent.click(screen.getByRole("button", { name: "Publicar opinión" }));
    expect(onPublicar).toHaveBeenCalledTimes(1);
  });

  it("lista las opiniones y filtra por texto", () => {
    const resena = crearResena();
    const onCambiarFiltro = vi.fn();

    render(
      <OpinionesHome
        {...propsBase}
        usuario={{
          id: "u-1",
          nombre: "Ana",
          usuario: "ana",
          email: "ana@example.com",
        }}
        resenas={[resena]}
        resenasFiltradas={[resena]}
        onCambiarFiltro={onCambiarFiltro}
        productos={[
          {
            idProducto: 1,
            nombre: "Samsung Galaxy S24 Ultra",
            descripcion: null,
            idCategoria: 1,
            idMarca: 1,
            imagen: null,
            precioReferencia: 1000,
            estado: true,
          },
        ]}
        idProducto={1}
        comentario="Me encanta"
      />,
    );

    expect(screen.getByText(/Opiniones de la comunidad \(1\)/)).toBeDefined();
    expect(screen.getByText("@ana")).toBeDefined();
    expect(screen.getByText("Excelente cámara y batería.")).toBeDefined();
    expect(
      screen.getByText("Samsung Galaxy S24 Ultra", { selector: "span" }),
    ).toBeDefined();

    fireEvent.change(
      screen.getByLabelText("Filtrar opiniones de la comunidad"),
      { target: { value: "batería" } },
    );
    expect(onCambiarFiltro).toHaveBeenCalledWith("batería");

    expect(screen.queryByText("Identificarse para opinar")).toBeNull();
  });
});

describe("CtaComparador", () => {
  it("enlaza al catálogo y al comparador", () => {
    render(<CtaComparador />);

    const catalogo = screen.getByRole("link", { name: "Explorar catálogo" });
    expect(catalogo.getAttribute("href")).toBe("/productos");

    const comparador = screen.getByRole("link", { name: "Ir al comparador" });
    expect(comparador.getAttribute("href")).toBe("/comparador");
  });
});
