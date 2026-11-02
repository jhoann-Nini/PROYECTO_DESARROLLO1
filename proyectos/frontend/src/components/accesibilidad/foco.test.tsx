// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type {
  CategoriaResponse,
  MarcaResponse,
  Producto,
  ProductoMejorValorado,
  UsuarioSesion,
} from "@/types/producto";

vi.mock("next/navigation", () => ({
  usePathname: () => "/productos",
  useRouter: () => ({ push: vi.fn() }),
}));

const sesionMock = vi.hoisted(() => ({
  usuario: null as UsuarioSesion | null,
  cargando: false,
  error: null as string | null,
  establecerUsuario: vi.fn(),
  limpiarError: vi.fn(),
  cerrarSesion: vi.fn(),
  reintentar: vi.fn(),
}));

vi.mock("@/hooks/useSesionTecReview", () => ({
  useSesionTecReview: () => sesionMock,
}));

vi.mock("@/components/AuthModal", () => ({
  default: () => null,
}));

vi.mock("@/components/AdminPanelModal", () => ({
  default: () => null,
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerProductos: vi.fn(),
    obtenerCategorias: vi.fn(),
    obtenerMarcas: vi.fn(),
    obtenerResenas: vi.fn(),
    obtenerMejorValorados: vi.fn(),
    crearResena: vi.fn(),
    editarResena: vi.fn(),
    eliminarResena: vi.fn(),
  };
});

import {
  obtenerCategorias,
  obtenerMarcas,
  obtenerMejorValorados,
  obtenerProductos,
  obtenerResenas,
  type ResenaResponse as ResenaApi,
} from "@/services/api";
import { CLAVE_COMPARADOR } from "@/data/comparador";
import { CLAVE_FAVORITOS } from "@/data/favoritos";
import { construirCatalogo } from "@/data/catalogoApi";
import { prepararCatalogo, type FiltrosCatalogo } from "@/data/catalogo";
import SiteHeader from "@/components/shell/SiteHeader";
import BottomNav from "@/components/shell/BottomNav";
import PanelBusquedaModal from "@/components/busqueda/PanelBusquedaModal";
import CatalogoCliente from "@/components/catalogo/CatalogoCliente";
import FilterSidebar from "@/components/catalogo/FilterSidebar";
import ComparadorCliente from "@/app/comparador/ComparadorCliente";
import FavoritosCliente from "@/app/favoritos/FavoritosCliente";
import PerfilCliente from "@/app/perfil/PerfilCliente";
import ResenasCliente from "@/app/resenas/ResenasCliente";
import EditarResena from "@/app/resenas/EditarResena";
import ReportarResenaModal from "@/app/resenas/ReportarResenaModal";

const REGLA_ANILLO = /focus-visible:ring-2/;
const REGLA_COLOR = /focus-visible:ring-\[var\(--color-brand-blue\)\]/;

const PRODUCTO: Producto = {
  idProducto: 1,
  nombre: "Galaxy S25",
  descripcion: "Smartphone de prueba",
  idCategoria: 1,
  idMarca: 1,
  imagen: null,
  precioReferencia: 3_500_000,
  estado: true,
  caracteristicas: {
    pantalla: "6.2 pulgadas",
    procesador: "Snapdragon 8",
  },
};

const CATEGORIAS: CategoriaResponse[] = [
  { idCategoria: 1, nombre: "Móviles", descripcion: null, estado: true },
];

const MARCAS: MarcaResponse[] = [
  { idMarca: 1, nombre: "Samsung", descripcion: null, estado: true },
];

const RESENA: ResenaApi = {
  idResena: 7,
  idProducto: 1,
  nombreProducto: "Galaxy S25",
  idUsuario: 10,
  nombreUsuario: "Ana Torres",
  comentario: "La batería me dura todo el día.",
  fechaCreacion: "2026-10-20T12:00:00",
  estado: true,
};

const USUARIO: UsuarioSesion = {
  id: "auth-1",
  nombre: "Ana Torres",
  usuario: "ana",
  email: "ana@example.com",
  rol: "Usuario registrado",
  idUsuario: 10,
  activo: true,
  fechaRegistro: "2026-01-15T12:00:00",
};

const RANKING: ProductoMejorValorado[] = [
  {
    idProducto: 1,
    nombre: "Galaxy S25",
    descripcion: null,
    idCategoria: 1,
    idMarca: 1,
    imagen: null,
    precioReferencia: 3_500_000,
    promedioPuntuacion: 4.5,
    cantidadValoraciones: 12,
    posicionRanking: 1,
  },
];

const FILTROS_BASE: FiltrosCatalogo = {
  busqueda: "",
  categorias: [],
  marcas: [],
  precioMin: 0,
  precioMax: Number.MAX_SAFE_INTEGER,
  caracteristicas: [],
};

function interactivos(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      "a[href], button, input, select, textarea, [role='button'], [role='link']",
    ),
  ).filter(
    (elemento) =>
      !elemento.hasAttribute("disabled") &&
      elemento.tabIndex >= 0 &&
      !elemento.closest('[aria-hidden="true"]'),
  );
}

function auditarFoco(container: HTMLElement, contexto: string) {
  const sinFoco = interactivos(container).filter((elemento) => {
    const clases = elemento.className ?? "";
    return !REGLA_ANILLO.test(clases) || !REGLA_COLOR.test(clases);
  });

  expect(
    sinFoco.map((elemento) => {
      const etiqueta =
        elemento.getAttribute("aria-label") ??
        elemento.textContent?.trim().slice(0, 40) ??
        "";
      return `${elemento.tagName.toLowerCase()}:${etiqueta}`;
    }),
    `Interactivos sin anillo de foco en ${contexto}`,
  ).toEqual([]);
}

function configurarApi() {
  vi.mocked(obtenerProductos).mockResolvedValue([PRODUCTO]);
  vi.mocked(obtenerCategorias).mockResolvedValue(CATEGORIAS);
  vi.mocked(obtenerMarcas).mockResolvedValue(MARCAS);
  vi.mocked(obtenerResenas).mockResolvedValue([RESENA] as ResenaApi[]);
  vi.mocked(obtenerMejorValorados).mockResolvedValue(RANKING);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sesionMock.usuario = null;
  sesionMock.cargando = false;
  sesionMock.error = null;
  configurarApi();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Auditoría de foco visible", () => {
  it("el header mantiene foco visible en enlaces y acciones", () => {
    const { container } = render(<SiteHeader />);
    auditarFoco(container, "SiteHeader");
  });

  it("el bottom nav mantiene foco visible en sus enlaces", () => {
    const { container } = render(<BottomNav />);
    auditarFoco(container, "BottomNav");
  });

  it("el panel de búsqueda global mantiene foco visible", async () => {
    const catalogo = construirCatalogo({
      productos: [PRODUCTO],
      categorias: CATEGORIAS,
      marcas: MARCAS,
    });

    const { container } = render(
      <PanelBusquedaModal abierto onCerrar={vi.fn()} productos={catalogo} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Galaxy S25")).toBeDefined();
    });
    auditarFoco(container, "PanelBusquedaModal");
  });

  it("el cajón de filtros mantiene foco visible en controles y acciones", () => {
    const catalogo = prepararCatalogo(
      construirCatalogo({
        productos: [PRODUCTO],
        categorias: CATEGORIAS,
        marcas: MARCAS,
      }),
    );

    const { container } = render(
      <FilterSidebar
        catalogo={catalogo}
        filtros={FILTROS_BASE}
        onCambiar={vi.fn()}
        onLimpiar={vi.fn()}
        hayFiltros={false}
        abierto
        onCerrar={vi.fn()}
      />,
    );

    auditarFoco(container, "FilterSidebar");
  });

  it("el modal de edición de reseñas mantiene foco visible", () => {
    const { container } = render(
      <EditarResena resena={RESENA} onEditada={vi.fn()} onEliminada={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar reseña" }));
    auditarFoco(container, "EditarResena");
  });

  it("el modal de reporte de reseñas mantiene foco visible", () => {
    const { container } = render(
      <ReportarResenaModal
        resenaId={7}
        abierto
        onCerrar={vi.fn()}
        onReportado={vi.fn()}
      />,
    );

    auditarFoco(container, "ReportarResenaModal");
  });

  it("la vista de comparador mantiene foco visible", async () => {
    localStorage.setItem(CLAVE_COMPARADOR, JSON.stringify([1]));

    const { container } = render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        screen.getByRole("table", { name: "Comparación de productos" }),
      ).toBeDefined();
    });
    auditarFoco(container, "ComparadorCliente");
  });

  it("la vista de favoritos mantiene foco visible", async () => {
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify([1]));

    const { container } = render(<FavoritosCliente />);

    await waitFor(() => {
      expect(screen.getByText("Galaxy S25")).toBeDefined();
    });
    auditarFoco(container, "FavoritosCliente");
  });

  it("la vista de perfil mantiene foco visible", async () => {
    sesionMock.usuario = USUARIO;

    const { container } = render(<PerfilCliente />);

    await waitFor(() => {
      expect(screen.getByText("La batería me dura todo el día.")).toBeDefined();
    });
    auditarFoco(container, "PerfilCliente");
  });

  it("la vista de reseñas mantiene foco visible", async () => {
    const { container } = render(<ResenasCliente />);

    await waitFor(() => {
      expect(screen.getByText("La batería me dura todo el día.")).toBeDefined();
    });
    auditarFoco(container, "ResenasCliente");
  });

  it("el catálogo mantiene foco visible en búsqueda, chips, orden y paginación", async () => {
    const productos = Array.from({ length: 13 }, (_, indice) => ({
      ...PRODUCTO,
      idProducto: indice + 1,
      nombre: `Producto ${indice + 1}`,
    }));
    vi.mocked(obtenerProductos).mockResolvedValue(productos);

    const { container } = render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/13 productos/)).toBeDefined();
    });

    fireEvent.change(
      screen.getByRole("searchbox", {
        name: "Buscar dispositivos tecnológicos por marca o modelo",
      }),
      { target: { value: "Producto" } },
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Quitar filtro/ }),
      ).toBeDefined();
    });

    auditarFoco(container, "CatalogoCliente");
  });
});
