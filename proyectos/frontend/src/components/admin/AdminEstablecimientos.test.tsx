// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerEstablecimientos: vi.fn(),
    crearEstablecimiento: vi.fn(),
    actualizarEstablecimiento: vi.fn(),
    eliminarEstablecimiento: vi.fn(),
  };
});

import {
  ApiError,
  actualizarEstablecimiento,
  crearEstablecimiento,
  eliminarEstablecimiento,
  obtenerEstablecimientos,
} from "@/services/api";
import AdminEstablecimientos from "./AdminEstablecimientos";

const mockObtener = vi.mocked(obtenerEstablecimientos);
const mockCrear = vi.mocked(crearEstablecimiento);
const mockActualizar = vi.mocked(actualizarEstablecimiento);
const mockEliminar = vi.mocked(eliminarEstablecimiento);

const TIENDA = {
  idEstablecimiento: 7,
  nombre: "Tienda Tecnológica",
  direccion: "Carrera 10 # 20-30",
  telefono: "3001234567",
  correo: "tienda@ejemplo.com",
  descripcion: "Tienda de tecnología",
  latitud: 4.08,
  longitud: -76.19,
  estado: true,
};

describe("AdminEstablecimientos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObtener.mockResolvedValue([TIENDA]);
    mockCrear.mockResolvedValue({ ...TIENDA, idEstablecimiento: 8 });
    mockActualizar.mockResolvedValue({ ...TIENDA, nombre: "Tienda Renovada" });
    mockEliminar.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("muestra el estado de carga inicial", () => {
    mockObtener.mockReturnValue(new Promise(() => {}));

    render(<AdminEstablecimientos />);

    expect(screen.getByText("Cargando establecimientos…")).toBeDefined();
  });

  it("muestra el error de carga y permite reintentar", async () => {
    mockObtener
      .mockRejectedValueOnce(new ApiError("Servicio no disponible", 500))
      .mockResolvedValueOnce([TIENDA]);

    render(<AdminEstablecimientos />);

    await waitFor(() => {
      expect(screen.getByText("Servicio no disponible")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("Tienda Tecnológica")).toBeDefined();
    });
  });

  it("muestra el estado vacío cuando no hay establecimientos activos", async () => {
    mockObtener.mockResolvedValueOnce([]);

    render(<AdminEstablecimientos />);

    await waitFor(() => {
      expect(
        screen.getByText("No hay establecimientos activos"),
      ).toBeDefined();
    });
  });

  it("lista los establecimientos activos con sus datos de contacto", async () => {
    render(<AdminEstablecimientos />);

    await waitFor(() => {
      expect(screen.getByText("Tienda Tecnológica")).toBeDefined();
    });
    expect(screen.getByText("tienda@ejemplo.com")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Editar Tienda Tecnológica" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Desactivar Tienda Tecnológica" }),
    ).toBeDefined();
  });

  it("crea un establecimiento con el contrato POST y actualiza la lista", async () => {
    render(<AdminEstablecimientos />);

    await waitFor(() => {
      expect(screen.getByText("Tienda Tecnológica")).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Nuevo establecimiento" }),
    );

    fireEvent.change(screen.getByLabelText("Nombre del establecimiento"), {
      target: { value: "Nueva Tienda" },
    });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "nueva@ejemplo.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Crear establecimiento" }),
    );

    await waitFor(() => {
      expect(mockCrear).toHaveBeenCalledWith({
        nombre: "Nueva Tienda",
        direccion: null,
        telefono: null,
        correo: "nueva@ejemplo.com",
        descripcion: null,
        latitud: null,
        longitud: null,
      });
    });
    expect(
      await screen.findByText("Establecimiento creado correctamente."),
    ).toBeDefined();
  });

  it("valida el nombre obligatorio antes de crear", async () => {
    render(<AdminEstablecimientos />);

    await waitFor(() => {
      expect(screen.getByText("Tienda Tecnológica")).toBeDefined();
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Nuevo establecimiento" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Crear establecimiento" }),
    );

    expect(screen.getByText("El nombre es obligatorio.")).toBeDefined();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it("edita un establecimiento con el contrato PUT", async () => {
    render(<AdminEstablecimientos />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Editar Tienda Tecnológica" }),
      ).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Editar Tienda Tecnológica" }),
    );
    fireEvent.change(screen.getByLabelText("Nombre del establecimiento"), {
      target: { value: "Tienda Renovada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockActualizar).toHaveBeenCalledWith(7, {
        nombre: "Tienda Renovada",
        direccion: "Carrera 10 # 20-30",
        telefono: "3001234567",
        correo: "tienda@ejemplo.com",
        descripcion: "Tienda de tecnología",
        latitud: 4.08,
        longitud: -76.19,
      });
    });
    expect(
      await screen.findByText("Establecimiento actualizado correctamente."),
    ).toBeDefined();
  });

  it("confirma la desactivación y elimina el establecimiento de la lista", async () => {
    render(<AdminEstablecimientos />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Desactivar Tienda Tecnológica" }),
      ).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Desactivar Tienda Tecnológica" }),
    );

    const dialogo = screen.getByRole("alertdialog");
    expect(within(dialogo).getByText(/Tienda Tecnológica/)).toBeDefined();

    fireEvent.click(
      within(dialogo).getByRole("button", {
        name: "Desactivar establecimiento",
      }),
    );

    await waitFor(() => {
      expect(mockEliminar).toHaveBeenCalledWith(7);
    });
    expect(
      await screen.findByText("Establecimiento desactivado correctamente."),
    ).toBeDefined();
    await waitFor(() => {
      expect(screen.queryByText("Tienda Tecnológica")).toBeNull();
    });
  });

  it("cancelar la confirmación no desactiva el establecimiento", async () => {
    render(<AdminEstablecimientos />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Desactivar Tienda Tecnológica" }),
      ).toBeDefined();
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Desactivar Tienda Tecnológica" }),
    );
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Cancelar",
      }),
    );

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(mockEliminar).not.toHaveBeenCalled();
  });

  it("muestra el error del backend al desactivar y conserva la lista", async () => {
    mockEliminar.mockRejectedValueOnce(
      new ApiError(
        "No se puede desactivar: tiene productos o representantes asociados.",
        409,
      ),
    );
    render(<AdminEstablecimientos />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Desactivar Tienda Tecnológica" }),
      ).toBeDefined();
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Desactivar Tienda Tecnológica" }),
    );
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Desactivar establecimiento",
      }),
    );

    expect(
      await screen.findByText(
        "No se puede desactivar: tiene productos o representantes asociados.",
      ),
    ).toBeDefined();
    expect(screen.getByText("Tienda Tecnológica")).toBeDefined();
  });
});
