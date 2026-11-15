// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { UsuarioSesion } from "@/types/producto";
import type { Establecimiento } from "@/types/establecimiento";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerMisEstablecimientos: vi.fn(),
    actualizarMiEstablecimiento: vi.fn(),
  };
});

import {
  ApiError,
  obtenerMisEstablecimientos,
  actualizarMiEstablecimiento,
} from "@/services/api";
import PanelRepresentanteModal from "./PanelRepresentanteModal";

const mockObtener = vi.mocked(obtenerMisEstablecimientos);
const mockActualizar = vi.mocked(actualizarMiEstablecimiento);

const ADMIN: UsuarioSesion = {
  id: "u-admin",
  nombre: "Ana Administradora",
  usuario: "ana",
  email: "ana@tecreview.com",
  rol: "Administrador",
  idUsuario: 1,
  activo: true,
};

const REPRESENTANTE: UsuarioSesion = {
  id: "u-rep",
  nombre: "Raúl Representante",
  usuario: "raul",
  email: "raul@tienda.com",
  rol: "Representante de establecimiento",
  idUsuario: 2,
  activo: true,
};

const ESTABLECIMIENTO: Establecimiento = {
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

describe("PanelRepresentanteModal", () => {
  beforeEach(() => {
    mockObtener.mockReset();
    mockActualizar.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("no se renderiza si está cerrado o el rol no está autorizado", () => {
    const { container, rerender } = render(
      <PanelRepresentanteModal
        isOpen={false}
        onClose={vi.fn()}
        usuarioSesion={ADMIN}
      />,
    );
    expect(container.firstChild).toBeNull();

    rerender(
      <PanelRepresentanteModal
        isOpen
        onClose={vi.fn()}
        usuarioSesion={{ ...ADMIN, rol: "Usuario registrado" }}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(mockObtener).not.toHaveBeenCalled();
  });

  it("muestra el estado de carga al consultar los establecimientos asignados", () => {
    mockObtener.mockReturnValue(new Promise(() => {}));

    render(
      <PanelRepresentanteModal
        isOpen
        onClose={vi.fn()}
        usuarioSesion={REPRESENTANTE}
      />,
    );

    expect(screen.getByText("Cargando establecimientos asignados…")).toBeDefined();
  });

  it("muestra el error de carga y permite reintentar", async () => {
    mockObtener
      .mockRejectedValueOnce(new ApiError("No fue posible conectar", 500))
      .mockResolvedValueOnce([ESTABLECIMIENTO]);

    render(
      <PanelRepresentanteModal
        isOpen
        onClose={vi.fn()}
        usuarioSesion={REPRESENTANTE}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("No fue posible conectar")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("Tienda Tecnológica")).toBeDefined();
    });
    expect(mockObtener).toHaveBeenCalledTimes(2);
  });

  it("muestra el estado vacío cuando no hay establecimientos asignados", async () => {
    mockObtener.mockResolvedValueOnce([]);

    render(
      <PanelRepresentanteModal
        isOpen
        onClose={vi.fn()}
        usuarioSesion={REPRESENTANTE}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("No tienes establecimientos asignados"),
      ).toBeDefined();
    });
  });

  it("lista los establecimientos y permite editar uno con los datos actuales", async () => {
    mockObtener.mockResolvedValueOnce([ESTABLECIMIENTO]);

    render(
      <PanelRepresentanteModal
        isOpen
        onClose={vi.fn()}
        usuarioSesion={ADMIN}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Tienda Tecnológica")).toBeDefined();
    });
    expect(screen.queryByLabelText("Nombre del establecimiento")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Editar Tienda Tecnológica" }),
    );

    expect(
      (screen.getByLabelText("Nombre del establecimiento") as HTMLInputElement)
        .value,
    ).toBe("Tienda Tecnológica");
    expect((screen.getByLabelText("Dirección") as HTMLInputElement).value).toBe(
      "Carrera 10 # 20-30",
    );
    expect((screen.getByLabelText("Latitud") as HTMLInputElement).value).toBe(
      "4.08",
    );
  });

  it("valida nombre obligatorio, correo y rangos geográficos antes de guardar", async () => {
    mockObtener.mockResolvedValueOnce([ESTABLECIMIENTO]);

    render(
      <PanelRepresentanteModal
        isOpen
        onClose={vi.fn()}
        usuarioSesion={REPRESENTANTE}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Editar Tienda Tecnológica" }),
      ).toBeDefined();
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Editar Tienda Tecnológica" }),
    );

    fireEvent.change(screen.getByLabelText("Nombre del establecimiento"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(screen.getByText("El nombre es obligatorio.")).toBeDefined();
    expect(mockActualizar).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Nombre del establecimiento"), {
      target: { value: "Tienda Tecnológica" },
    });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "no-es-correo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      screen.getByText("El correo del establecimiento no es válido."),
    ).toBeDefined();
    expect(mockActualizar).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "tienda@ejemplo.com" },
    });
    fireEvent.change(screen.getByLabelText("Latitud"), {
      target: { value: "95" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      screen.getByText("La latitud debe estar entre -90 y 90."),
    ).toBeDefined();
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  it("guarda los cambios con el contrato PUT y actualiza la lista", async () => {
    mockObtener.mockResolvedValueOnce([ESTABLECIMIENTO]);
    mockActualizar.mockResolvedValueOnce({
      ...ESTABLECIMIENTO,
      nombre: "Tienda Actualizada",
    });

    render(
      <PanelRepresentanteModal
        isOpen
        onClose={vi.fn()}
        usuarioSesion={REPRESENTANTE}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Editar Tienda Tecnológica" }),
      ).toBeDefined();
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Editar Tienda Tecnológica" }),
    );
    fireEvent.change(screen.getByLabelText("Nombre del establecimiento"), {
      target: { value: "Tienda Actualizada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockActualizar).toHaveBeenCalledWith(7, {
        nombre: "Tienda Actualizada",
        direccion: "Carrera 10 # 20-30",
        telefono: "3001234567",
        correo: "tienda@ejemplo.com",
        descripcion: "Tienda de tecnología",
        latitud: 4.08,
        longitud: -76.19,
      });
    });

    expect(
      await screen.findByText("Cambios guardados correctamente."),
    ).toBeDefined();
    expect(screen.getByText("Tienda Actualizada")).toBeDefined();
  });

  it("muestra el error del backend y conserva el formulario", async () => {
    mockObtener.mockResolvedValueOnce([ESTABLECIMIENTO]);
    mockActualizar.mockRejectedValueOnce(
      new ApiError("No tienes permisos sobre este establecimiento.", 403),
    );

    render(
      <PanelRepresentanteModal
        isOpen
        onClose={vi.fn()}
        usuarioSesion={REPRESENTANTE}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Editar Tienda Tecnológica" }),
      ).toBeDefined();
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Editar Tienda Tecnológica" }),
    );
    fireEvent.change(screen.getByLabelText("Nombre del establecimiento"), {
      target: { value: "Tienda Sin Permiso" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(
        screen.getByText("No tienes permisos sobre este establecimiento."),
      ).toBeDefined();
    });
    expect(
      (screen.getByLabelText("Nombre del establecimiento") as HTMLInputElement)
        .value,
    ).toBe("Tienda Sin Permiso");
  });

  it("cierra el panel con Escape", async () => {
    mockObtener.mockResolvedValueOnce([ESTABLECIMIENTO]);
    const onClose = vi.fn();

    render(
      <PanelRepresentanteModal
        isOpen
        onClose={onClose}
        usuarioSesion={REPRESENTANTE}
      />,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
