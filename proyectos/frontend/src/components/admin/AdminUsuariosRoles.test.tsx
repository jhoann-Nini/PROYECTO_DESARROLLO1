// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerUsuariosAdmin: vi.fn(),
    obtenerRolesAdmin: vi.fn(),
    obtenerEstablecimientos: vi.fn(),
    asignarRolUsuario: vi.fn(),
    revocarRolUsuario: vi.fn(),
    asignarRepresentante: vi.fn(),
    revocarRepresentante: vi.fn(),
    cambiarEstadoCuenta: vi.fn(),
  };
});

import {
  ApiError,
  asignarRepresentante,
  asignarRolUsuario,
  cambiarEstadoCuenta,
  obtenerEstablecimientos,
  obtenerRolesAdmin,
  obtenerUsuariosAdmin,
  revocarRepresentante,
  revocarRolUsuario,
} from "@/services/api";
import AdminUsuariosRoles from "./AdminUsuariosRoles";

const mockUsuarios = vi.mocked(obtenerUsuariosAdmin);
const mockRoles = vi.mocked(obtenerRolesAdmin);
const mockEstablecimientos = vi.mocked(obtenerEstablecimientos);
const mockAsignarRol = vi.mocked(asignarRolUsuario);
const mockRevocarRol = vi.mocked(revocarRolUsuario);
const mockAsignarRepresentante = vi.mocked(asignarRepresentante);
const mockRevocarRepresentante = vi.mocked(revocarRepresentante);
const mockCambiarEstado = vi.mocked(cambiarEstadoCuenta);

const USUARIO = {
  idUsuario: 12,
  nombre: "María López",
  correo: "maria@ejemplo.com",
  rol: "Usuario registrado",
  activo: true,
  fechaRegistro: "2026-11-13T10:15:00",
  roles: ["Usuario registrado"],
};

const ROLES = [
  { idRol: 1, nombre: "Administrador", descripcion: "Acceso global" },
  { idRol: 2, nombre: "Moderador", descripcion: "Modera reseñas" },
  {
    idRol: 3,
    nombre: "Representante de establecimiento",
    descripcion: "Gestiona su tienda",
  },
  {
    idRol: 4,
    nombre: "Usuario registrado",
    descripcion: "Cuenta base",
  },
];

const ESTABLECIMIENTO = {
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

describe("AdminUsuariosRoles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsuarios.mockResolvedValue([USUARIO]);
    mockRoles.mockResolvedValue(ROLES);
    mockEstablecimientos.mockResolvedValue([ESTABLECIMIENTO]);
    mockAsignarRol.mockResolvedValue(undefined);
    mockRevocarRol.mockResolvedValue(undefined);
    mockAsignarRepresentante.mockResolvedValue(undefined);
    mockRevocarRepresentante.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  async function renderizarYSeleccionar() {
    render(<AdminUsuariosRoles />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Gestionar María López" }),
      ).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Gestionar María López" }),
    );
  }

  it("muestra el estado de carga inicial", () => {
    mockUsuarios.mockReturnValue(new Promise(() => {}));
    mockRoles.mockReturnValue(new Promise(() => {}));
    mockEstablecimientos.mockReturnValue(new Promise(() => {}));

    render(<AdminUsuariosRoles />);

    expect(screen.getByText("Cargando usuarios y roles…")).toBeDefined();
  });

  it("muestra el error de carga y permite reintentar", async () => {
    mockRoles
      .mockRejectedValueOnce(new ApiError("Catálogo no disponible", 500))
      .mockResolvedValueOnce(ROLES);

    render(<AdminUsuariosRoles />);

    await waitFor(() => {
      expect(screen.getByText("Catálogo no disponible")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Gestionar María López" }),
      ).toBeDefined();
    });
  });

  it("muestra el estado vacío cuando no hay cuentas", async () => {
    mockUsuarios.mockResolvedValueOnce([]);

    render(<AdminUsuariosRoles />);

    await waitFor(() => {
      expect(screen.getByText("No hay cuentas para mostrar")).toBeDefined();
    });
  });

  it("lista cuentas y muestra los roles activos de la cuenta seleccionada", async () => {
    await renderizarYSeleccionar();

    expect(screen.getByText("maria@ejemplo.com")).toBeDefined();
    expect(screen.getByText("Cuenta activa")).toBeDefined();
    expect(screen.getByText("Roles activos:")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Revocar rol Usuario registrado" }),
    ).toBeDefined();
  });

  it("aclara que la API no entrega historial ni lista de representaciones activas", async () => {
    await renderizarYSeleccionar();
    expect(screen.getByText(/historial y las representaciones activas todavía no se pueden consultar/i)).toBeDefined();
  });

  it("busca cuentas por correo y conserva el filtro aplicado", async () => {
    await renderizarYSeleccionar();

    fireEvent.change(screen.getByLabelText("Buscar por correo"), {
      target: { value: "maria@ejemplo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(mockUsuarios).toHaveBeenLastCalledWith("maria@ejemplo.com");
    });
  });

  // Caso 6: suspensión auditada de cuentas.
  it("exige motivo para suspender y no llama a la API sin él", async () => {
    await renderizarYSeleccionar();

    fireEvent.click(screen.getByRole("button", { name: "Suspender cuenta" }));

    expect(await screen.findByText("Escribe el motivo de la suspensión.")).toBeDefined();
    expect(mockCambiarEstado).not.toHaveBeenCalled();
  });

  it("suspende la cuenta con motivo y recarga las cuentas", async () => {
    mockCambiarEstado.mockResolvedValueOnce({ ...USUARIO, activo: false });
    await renderizarYSeleccionar();

    fireEvent.change(screen.getByLabelText("Motivo (obligatorio)"), {
      target: { value: "Insultos reiterados" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Suspender cuenta" }));

    await waitFor(() => {
      expect(mockCambiarEstado).toHaveBeenCalledWith(12, false, "Insultos reiterados");
    });
    expect(await screen.findByText("Cuenta suspendida.")).toBeDefined();
  });

  it("muestra el error del backend al intentar suspender a un administrador", async () => {
    mockCambiarEstado.mockRejectedValueOnce(
      new ApiError("No se puede suspender a un administrador activo; primero retira su rol.", 409),
    );
    await renderizarYSeleccionar();

    fireEvent.change(screen.getByLabelText("Motivo (obligatorio)"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Suspender cuenta" }));

    expect(await screen.findByText(/primero retira su rol/)).toBeDefined();
  });

  it("asigna un rol con motivo y recarga las cuentas", async () => {
    await renderizarYSeleccionar();

    fireEvent.change(screen.getByLabelText("Rol a asignar"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Motivo (opcional)"), {
      target: { value: "Asignación autorizada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Asignar rol" }));

    await waitFor(() => {
      expect(mockAsignarRol).toHaveBeenCalledWith(12, 2, "Asignación autorizada");
    });
    await waitFor(() => {
      expect(mockUsuarios).toHaveBeenCalledTimes(2);
    });
    expect(
      await screen.findByText("Rol asignado correctamente."),
    ).toBeDefined();
  });

  it("revoca un rol activo y recarga las cuentas", async () => {
    await renderizarYSeleccionar();

    fireEvent.click(
      screen.getByRole("button", { name: "Revocar rol Usuario registrado" }),
    );

    await waitFor(() => {
      expect(mockRevocarRol).toHaveBeenCalledWith(12, 4, undefined);
    });
    await waitFor(() => {
      expect(mockUsuarios).toHaveBeenCalledTimes(2);
    });
    expect(
      await screen.findByText("Rol revocado correctamente."),
    ).toBeDefined();
  });

  it("envía el motivo del formulario al revocar un rol", async () => {
    await renderizarYSeleccionar();
    fireEvent.change(screen.getByLabelText("Motivo (opcional)"), {
      target: { value: "Retiro autorizado" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Revocar rol Usuario registrado" }),
    );

    await waitFor(() => {
      expect(mockRevocarRol).toHaveBeenCalledWith(12, 4, "Retiro autorizado");
    });
  });

  it("asigna representación sobre un establecimiento activo", async () => {
    await renderizarYSeleccionar();

    fireEvent.change(screen.getByLabelText("Establecimiento"), {
      target: { value: "7" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Asignar representación" }),
    );

    await waitFor(() => {
      expect(mockAsignarRepresentante).toHaveBeenCalledWith(12, 7, undefined);
    });
    expect(
      await screen.findByText("Representación asignada correctamente."),
    ).toBeDefined();
  });

  it("revoca representación sobre el establecimiento indicado", async () => {
    await renderizarYSeleccionar();

    fireEvent.change(screen.getByLabelText("Establecimiento"), {
      target: { value: "7" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Revocar representación" }),
    );

    await waitFor(() => {
      expect(mockRevocarRepresentante).toHaveBeenCalledWith(12, 7, undefined);
    });
  });

  it("envía el motivo del formulario al revocar una representación", async () => {
    await renderizarYSeleccionar();
    fireEvent.change(screen.getByLabelText("Establecimiento"), {
      target: { value: "7" },
    });
    fireEvent.change(screen.getByLabelText("Motivo (opcional)"), {
      target: { value: "Finalizó la representación" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Revocar representación" }),
    );

    await waitFor(() => {
      expect(mockRevocarRepresentante).toHaveBeenCalledWith(
        12,
        7,
        "Finalizó la representación",
      );
    });
  });

  it("muestra el error del backend y conserva la cuenta seleccionada", async () => {
    mockAsignarRol.mockRejectedValueOnce(
      new ApiError("La cuenta ya tiene ese rol activo.", 409),
    );
    await renderizarYSeleccionar();

    fireEvent.click(screen.getByRole("button", { name: "Asignar rol" }));

    await waitFor(() => {
      expect(
        screen.getByText("La cuenta ya tiene ese rol activo."),
      ).toBeDefined();
    });
    expect(
      screen.getByRole("button", { name: "Revocar rol Usuario registrado" }),
    ).toBeDefined();
  });

  it("advierte que el backend no expone asignaciones activas ni historial", async () => {
    render(<AdminUsuariosRoles />);

    await waitFor(() => {
      expect(
        screen.getByText(/no expone todavía el listado de representaciones activas/i),
      ).toBeDefined();
    });
    expect(
      screen.getByText(/historial de auditoría/i),
    ).toBeDefined();
  });
});
