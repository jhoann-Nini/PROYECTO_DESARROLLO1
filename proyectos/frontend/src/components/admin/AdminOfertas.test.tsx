// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Establecimiento, OfertaAdmin } from "@/types/establecimiento";
import type { ProductoResponse } from "@/types/producto";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerOfertasAdmin: vi.fn(),
    obtenerProductos: vi.fn(),
    obtenerEstablecimientos: vi.fn(),
    guardarOfertaAdmin: vi.fn(),
    eliminarOfertaAdmin: vi.fn(),
  };
});

import {
  ApiError,
  eliminarOfertaAdmin,
  guardarOfertaAdmin,
  obtenerEstablecimientos,
  obtenerOfertasAdmin,
  obtenerProductos,
} from "@/services/api";
import AdminOfertas, { validarFormularioOferta } from "./AdminOfertas";

const mockOfertas = vi.mocked(obtenerOfertasAdmin);
const mockGuardar = vi.mocked(guardarOfertaAdmin);
const mockEliminar = vi.mocked(eliminarOfertaAdmin);

const PRODUCTO = { idProducto: 3, nombre: "Galaxy Buds FE" } as ProductoResponse;
const TIENDA: Establecimiento = {
  idEstablecimiento: 8, nombre: "Tienda Centro", direccion: null, telefono: null, correo: null,
  descripcion: null, latitud: null, longitud: null, estado: true, verificado: true,
};
const OFERTA: OfertaAdmin = {
  idProducto: 3, nombreProducto: "Galaxy Buds FE", idEstablecimiento: 8, nombreEstablecimiento: "Tienda Centro",
  establecimientoActivo: true, establecimientoVerificado: true, precio: 95000, disponibilidad: true,
  urlOferta: "https://tienda.co/buds", fechaActualizacionPrecio: "2026-11-20T10:00:00", reportesAbiertos: 0,
};

beforeEach(() => {
  vi.mocked(obtenerProductos).mockResolvedValue([PRODUCTO]);
  vi.mocked(obtenerEstablecimientos).mockResolvedValue([TIENDA]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("validarFormularioOferta", () => {
  const base = { idProducto: "3", idEstablecimiento: "8", precio: "1000", disponibilidad: true, urlOferta: "" };

  it("acepta una oferta completa, con o sin enlace", () => {
    expect(validarFormularioOferta(base)).toEqual([]);
    expect(validarFormularioOferta({ ...base, urlOferta: "HTTPS://tienda.co/x" })).toEqual([]);
  });

  it("rechaza precio no positivo, selección vacía y enlaces inválidos", () => {
    expect(validarFormularioOferta({ ...base, precio: "0" })).toContain("El precio debe ser un número mayor que cero.");
    expect(validarFormularioOferta({ ...base, idProducto: "" })).toContain("Selecciona un producto.");
    expect(validarFormularioOferta({ ...base, urlOferta: "javascript:alert(1)" })).toHaveLength(1);
    expect(validarFormularioOferta({ ...base, urlOferta: "https://a b.co" })).toHaveLength(1);
  });
});

describe("AdminOfertas", () => {
  it("lista las ofertas con precio, sello de tienda y reportes abiertos", async () => {
    mockOfertas.mockResolvedValueOnce([{ ...OFERTA, reportesAbiertos: 2, disponibilidad: false }]);
    render(<AdminOfertas />);

    expect(await screen.findByText("Galaxy Buds FE · Tienda Centro")).toBeDefined();
    expect(screen.getByText("Tienda verificada")).toBeDefined();
    expect(screen.getByText(/No disponible/)).toBeDefined();
    expect(screen.getByText("2 reportes abiertos en moderación")).toBeDefined();
  });

  it("muestra un estado vacío cuando no hay ofertas", async () => {
    mockOfertas.mockResolvedValueOnce([]);
    render(<AdminOfertas />);
    expect(await screen.findByText("No hay ofertas registradas")).toBeDefined();
  });

  it("no envía el formulario si falta información", async () => {
    mockOfertas.mockResolvedValueOnce([]);
    render(<AdminOfertas />);
    await screen.findByText("No hay ofertas registradas");

    fireEvent.click(screen.getByRole("button", { name: "Guardar oferta" }));

    expect(screen.getByText("Selecciona un producto.")).toBeDefined();
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  it("guarda una oferta nueva y la agrega a la lista", async () => {
    mockOfertas.mockResolvedValueOnce([]);
    mockGuardar.mockResolvedValueOnce(OFERTA);
    render(<AdminOfertas />);
    await screen.findByText("No hay ofertas registradas");

    fireEvent.change(screen.getByLabelText("Producto"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Tienda"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Precio (COP)"), { target: { value: "95000" } });
    fireEvent.change(screen.getByLabelText("Enlace de la oferta (opcional)"), { target: { value: " https://tienda.co/buds " } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar oferta" }));

    expect(await screen.findByText("Oferta de Galaxy Buds FE en Tienda Centro guardada.")).toBeDefined();
    expect(mockGuardar).toHaveBeenCalledWith(3, 8, {
      precio: 95000, disponibilidad: true, urlOferta: "https://tienda.co/buds",
    });
    expect(screen.getByText("Galaxy Buds FE · Tienda Centro")).toBeDefined();
  });

  it("edita una oferta existente sin cambiar producto ni tienda", async () => {
    mockOfertas.mockResolvedValueOnce([OFERTA]);
    mockGuardar.mockResolvedValueOnce({ ...OFERTA, precio: 89000, urlOferta: null });
    render(<AdminOfertas />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar oferta de Galaxy Buds FE en Tienda Centro" }));

    expect((screen.getByLabelText("Producto") as HTMLSelectElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Precio (COP)"), { target: { value: "89000" } });
    fireEvent.change(screen.getByLabelText("Enlace de la oferta (opcional)"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mockGuardar).toHaveBeenCalledWith(3, 8, { precio: 89000, disponibilidad: true }));
    expect(await screen.findByText(/89\.000/)).toBeDefined();
  });

  it("pide confirmación para eliminar y muestra el 409 si la oferta tiene reportes", async () => {
    mockOfertas.mockResolvedValueOnce([OFERTA]);
    mockEliminar.mockRejectedValueOnce(new ApiError(
      "La oferta tiene reportes asociados y no se puede eliminar. Márcala como no disponible.", 409));
    render(<AdminOfertas />);

    fireEvent.click(await screen.findByRole("button", { name: "Eliminar oferta de Galaxy Buds FE en Tienda Centro" }));
    expect(mockEliminar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar eliminación" }));

    expect(await screen.findByText(/no se puede eliminar\. Márcala como no disponible/)).toBeDefined();
    expect(screen.getByText("Galaxy Buds FE · Tienda Centro")).toBeDefined();
  });

  it("elimina una oferta sin reportes", async () => {
    mockOfertas.mockResolvedValueOnce([OFERTA]);
    mockEliminar.mockResolvedValueOnce(undefined);
    render(<AdminOfertas />);

    fireEvent.click(await screen.findByRole("button", { name: "Eliminar oferta de Galaxy Buds FE en Tienda Centro" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar eliminación" }));

    expect(await screen.findByText("No hay ofertas registradas")).toBeDefined();
    expect(mockEliminar).toHaveBeenCalledWith(3, 8);
  });
});
