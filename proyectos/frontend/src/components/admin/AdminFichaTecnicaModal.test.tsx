// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import AdminFichaTecnicaModal from "./AdminFichaTecnicaModal";
import type { ProductoResponse } from "@/types/producto";
import * as api from "@/services/api";

vi.mock("@/services/api", () => ({
  obtenerFichaTecnicaProducto: vi.fn(),
  actualizarFichaTecnicaProducto: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, readonly status?: number) {
      super(message);
      this.name = "ApiError";
    }
  },
}));

const productoMock: ProductoResponse = {
  idProducto: 42,
  nombre: "Smartphone Test V3",
  descripcion: "Descripción",
  idCategoria: 1, // celulares
  idMarca: 2,
  imagen: "https://example.com/foto.jpg",
  precioReferencia: 1500000,
  estado: true,
  caracteristicas: null,
};

const fichaV3Mock = {
  version_esquema: 3,
  categoria: "celulares",
  variantes: [
    {
      id: "var-1",
      modelo: "Test Modelo",
      sku: "SKU-001",
      mercado: "CO",
      identificadores: {},
    },
  ],
  especificaciones: [
    {
      id: "spec-pantalla",
      clave: "display.diagonal",
      nombre: "Diagonal de pantalla",
      grupo: "pantalla",
      variante_id: null,
      estado_dato: "conocido",
      justificacion_estado: null,
      valor_original: { texto: "6.7", unidad: "in" },
      normalizacion: {
        estado: "normalizada",
        valor: { tipo: "magnitud", valor: 6.7, unidad: "in" },
        regla_conversion_id: null,
        precision: { decimales: 1 },
      },
      evidencia_ids: ["ev-1"],
      revision_conflicto: {
        estado: "sin_conflicto",
        resuelto_en: null,
        resuelto_por: null,
        resolucion: null,
      },
      verificacion: {
        estado: "verificado",
        verificado_en: "2026-11-19T00:00:00Z",
        verificado_por: "admin",
        evento_auditoria_id: "audit-001",
        motivo_revision: null,
      },
      comparacion: {
        habilitada: true,
        id: "rule-1",
        modo: "orden_numerico",
        unidad: "in",
        direccion: "mayor_es_mejor",
        objetivo: null,
        tolerancia: null,
      },
    },
    {
      id: "spec-bateria",
      clave: "bateria.capacidad",
      nombre: "Capacidad de Batería",
      grupo: "bateria",
      variante_id: null,
      estado_dato: "conocido",
      justificacion_estado: null,
      valor_original: { texto: "5000", unidad: "mAh" },
      normalizacion: {
        estado: "normalizada",
        valor: { tipo: "magnitud", valor: 5000, unidad: "mAh" },
        regla_conversion_id: null,
        precision: null,
      },
      evidencia_ids: ["ev-1"],
      revision_conflicto: {
        estado: "sin_conflicto",
        resuelto_en: null,
        resuelto_por: null,
        resolucion: null,
      },
      verificacion: {
        estado: "pendiente",
        verificado_en: null,
        verificado_por: null,
        evento_auditoria_id: null,
        motivo_revision: null,
      },
      comparacion: { habilitada: false },
    },
  ],
  fuentes: [
    {
      id: "src-1",
      nombre: "Fabricante Test",
      tipo: "fabricante",
      url: "https://example.com/specs",
      localizador: "Ficha oficial",
      consultada_en: "2026-11-19",
      variante_id: null,
      mercado: null,
    },
  ],
  evidencias: [
    {
      id: "ev-1",
      fuente_id: "src-1",
      alcance: { tipo: "todas_las_variantes", variante_ids: ["var-1"] },
      localizador: "Sección especificaciones",
      extracto: "Batería y pantalla oficiales",
      postura: "respalda",
      registrada_en: "2026-11-19",
      registrada_por: "admin",
    },
  ],
  benchmarks: [],
};

describe("AdminFichaTecnicaModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("muestra estado inicial 'Sin Ficha V3' cuando el producto no tiene V3 en backend", async () => {
    vi.mocked(api.obtenerFichaTecnicaProducto).mockResolvedValueOnce({});

    render(
      <AdminFichaTecnicaModal
        producto={productoMock}
        abierto={true}
        onCerrar={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Este producto no cuenta con ficha técnica V3"),
      ).toBeDefined();
    });

    expect(
      screen.getByRole("button", { name: /\+ Iniciar Ficha V3/i }),
    ).toBeDefined();
  });

  it("permite iniciar una plantilla V3 en borrador para el producto", async () => {
    vi.mocked(api.obtenerFichaTecnicaProducto).mockResolvedValueOnce({});

    render(
      <AdminFichaTecnicaModal
        producto={productoMock}
        abierto={true}
        onCerrar={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /\+ Iniciar Ficha V3/i }),
      ).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /\+ Iniciar Ficha V3/i }),
    );

    expect(screen.getByText(/Plantilla V3 inicializada/i)).toBeDefined();
    expect(screen.getByText("Especificaciones (0)")).toBeDefined();
  });

  it("renderiza las especificaciones y métricas cuando el producto tiene ficha V3", async () => {
    vi.mocked(api.obtenerFichaTecnicaProducto).mockResolvedValueOnce(fichaV3Mock);

    render(
      <AdminFichaTecnicaModal
        producto={productoMock}
        abierto={true}
        onCerrar={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Diagonal de pantalla")).toBeDefined();
      expect(screen.getByText("Capacidad de Batería")).toBeDefined();
    });

    expect(screen.getByText("Total: 2")).toBeDefined();
    expect(screen.getByText("✓ 1")).toBeDefined();
    expect(screen.getByText("⏳ 1")).toBeDefined();
  });

  it("guarda la ficha técnica de forma independiente llamando a actualizarFichaTecnicaProducto", async () => {
    vi.mocked(api.obtenerFichaTecnicaProducto).mockResolvedValueOnce(fichaV3Mock);
    vi.mocked(api.actualizarFichaTecnicaProducto).mockResolvedValueOnce({
      ...productoMock,
      caracteristicas: fichaV3Mock,
    });

    const onGuardada = vi.fn();

    render(
      <AdminFichaTecnicaModal
        producto={productoMock}
        abierto={true}
        onCerrar={vi.fn()}
        onFichaGuardada={onGuardada}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Guardar Ficha Técnica" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar Ficha Técnica" }));

    await waitFor(() => {
      expect(api.actualizarFichaTecnicaProducto).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          version_esquema: 3,
          categoria: "celulares",
        }),
      );
      expect(onGuardada).toHaveBeenCalled();
    });
  });
});
