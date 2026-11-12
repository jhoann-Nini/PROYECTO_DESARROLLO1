// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ResenaResponse } from "@/services/api";
import type { UsuarioSesion } from "@/types/producto";
import OpinionesProducto from "./OpinionesProducto";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    crearResena: vi.fn(),
    editarResena: vi.fn(),
    eliminarResena: vi.fn(),
  };
});

import { crearResena, editarResena, eliminarResena } from "@/services/api";

const mockCrear = vi.mocked(crearResena);
const mockEditar = vi.mocked(editarResena);
const mockEliminar = vi.mocked(eliminarResena);

const usuarioAutor: UsuarioSesion = {
  id: "10",
  idUsuario: 10,
  nombre: "Ana Torres",
  usuario: "anatorres",
  email: "ana@example.com",
  rol: "Usuario registrado",
};

const usuarioOtro: UsuarioSesion = {
  id: "20",
  idUsuario: 20,
  nombre: "Carlos Perez",
  usuario: "carlosp",
  email: "carlos@example.com",
  rol: "Usuario registrado",
};

const usuarioAdmin: UsuarioSesion = {
  id: "99",
  idUsuario: 99,
  nombre: "Admin General",
  usuario: "admin",
  email: "admin@example.com",
  rol: "Administrador",
};

const resenaAna: ResenaResponse = {
  idResena: 1,
  idProducto: 100,
  nombreProducto: "Galaxy S25",
  idUsuario: 10,
  nombreUsuario: "anatorres",
  comentario: "Excelente celular, muy rápido.",
  puntuacion: 5,
  fechaCreacion: "2026-10-20T12:00:00",
  estado: true,
};

const resenaCarlos: ResenaResponse = {
  idResena: 2,
  idProducto: 100,
  nombreProducto: "Galaxy S25",
  idUsuario: 20,
  nombreUsuario: "carlosp",
  comentario: "La pantalla es buena pero la batería dura poco.",
  puntuacion: 3,
  fechaCreacion: "2026-10-21T12:00:00",
  estado: true,
};

function renderComponente(
  props: {
    usuario?: UsuarioSesion | null;
    resenas?: ResenaResponse[];
    onResenaEditada?: (r: ResenaResponse) => void;
    onResenaEliminada?: (id: number) => void;
    onActualizarStats?: () => void;
    onPedirLogin?: () => void;
  } = {},
) {
  return render(
    <OpinionesProducto
      idProducto={100}
      nombreProducto="Galaxy S25"
      usuario={props.usuario !== undefined ? props.usuario : usuarioAutor}
      resenas={props.resenas ?? [resenaAna, resenaCarlos]}
      cargando={false}
      error={null}
      onReintentar={vi.fn()}
      onResenaCreada={vi.fn()}
      onPedirLogin={props.onPedirLogin ?? vi.fn()}
      onResenaEditada={props.onResenaEditada}
      onResenaEliminada={props.onResenaEliminada}
      onActualizarStats={props.onActualizarStats}
    />,
  );
}

afterEach(() => {
  cleanup();
  mockCrear.mockReset();
  mockEditar.mockReset();
  mockEliminar.mockReset();
});

describe("OpinionesProducto — Permisos y Operaciones de Edición y Eliminación", () => {
  // 1. El autor puede ver el botón "Editar" en su propia reseña
  it("permite al autor ver el botón de editar en su propia reseña", () => {
    renderComponente({ usuario: usuarioAutor });

    const botonEditar = screen.getByRole("button", { name: "Editar reseña" });
    expect(botonEditar).toBeDefined();
  });

  // 2. Un usuario que no es autor no puede ver "Editar" en la reseña de otro usuario
  it("no permite a un usuario no autor ver el botón de editar en reseñas ajenas", () => {
    renderComponente({
      usuario: usuarioOtro,
      resenas: [resenaAna],
    });

    expect(screen.queryByRole("button", { name: "Editar reseña" })).toBeNull();
  });

  // 3. El autor puede ver el botón "Eliminar" en su propia reseña
  it("permite al autor ver el botón de eliminar en su propia reseña", () => {
    renderComponente({ usuario: usuarioAutor, resenas: [resenaAna] });

    const botonEliminar = screen.getByRole("button", {
      name: "Eliminar reseña",
    });
    expect(botonEliminar).toBeDefined();
  });

  // 4. El Administrador puede ver el botón "Eliminar" en la reseña de cualquier usuario
  it("permite al administrador ver el botón de eliminar en reseñas de otros usuarios", () => {
    renderComponente({ usuario: usuarioAdmin, resenas: [resenaAna] });

    const botonEliminar = screen.getByRole("button", {
      name: "Eliminar reseña",
    });
    expect(botonEliminar).toBeDefined();
    // Pero el administrador no puede editar la reseña ajena
    expect(screen.queryByRole("button", { name: "Editar reseña" })).toBeNull();
  });

  // 5. Un usuario normal no puede ver "Eliminar" en la reseña de otro usuario
  it("no permite a un usuario normal ver el botón de eliminar en reseñas ajenas", () => {
    renderComponente({ usuario: usuarioOtro, resenas: [resenaAna] });

    expect(
      screen.queryByRole("button", { name: "Eliminar reseña" }),
    ).toBeNull();
  });

  // 6. Cancelar el modal de eliminación no ejecuta eliminarResena ni borra el elemento
  it("no llama a la API de eliminación al cancelar el modal de confirmación", () => {
    renderComponente({ usuario: usuarioAutor, resenas: [resenaAna] });

    fireEvent.click(screen.getByRole("button", { name: "Eliminar reseña" }));

    const modal = screen.getByRole("dialog", {
      name: "Confirmar eliminación de reseña",
    });
    expect(modal).toBeDefined();

    const botonCancelar = within(modal).getByRole("button", {
      name: "Cancelar",
    });
    fireEvent.click(botonCancelar);

    expect(
      screen.queryByRole("dialog", {
        name: "Confirmar eliminación de reseña",
      }),
    ).toBeNull();
    expect(mockEliminar).not.toHaveBeenCalled();
    expect(screen.getByText("Excelente celular, muy rápido.")).toBeDefined();
  });

  // 7. Guardar edición llama a editarResena con nuevo texto y estrellas y actualiza la UI
  it("envía la edición a la API y actualiza la interfaz sin recargar", async () => {
    const onResenaEditada = vi.fn();
    const onActualizarStats = vi.fn();

    const resenaActualizada: ResenaResponse = {
      ...resenaAna,
      comentario: "Excelente celular, la cámara es impresionante.",
      puntuacion: 4,
    };
    mockEditar.mockResolvedValueOnce(resenaActualizada);

    renderComponente({
      usuario: usuarioAutor,
      resenas: [resenaAna],
      onResenaEditada,
      onActualizarStats,
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar reseña" }));

    const formEdicion = screen.getByText("Editando tu opinión").closest("form")!;
    const textarea = within(formEdicion).getByLabelText("Editar comentario");
    fireEvent.change(textarea, {
      target: { value: "Excelente celular, la cámara es impresionante." },
    });

    const botonEstrella4 = within(formEdicion).getByRole("button", {
      name: "Calificar con 4 estrellas",
    });
    fireEvent.click(botonEstrella4);

    const botonGuardar = within(formEdicion).getByRole("button", { name: "Guardar" });
    fireEvent.click(botonGuardar);

    await waitFor(() => {
      expect(mockEditar).toHaveBeenCalledWith(
        1,
        "Excelente celular, la cámara es impresionante.",
        4,
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText("Excelente celular, la cámara es impresionante."),
      ).toBeDefined();
    });

    expect(onResenaEditada).toHaveBeenCalledWith(resenaActualizada);
    expect(onActualizarStats).toHaveBeenCalled();
  });

  // 8. Confirmar eliminación llama a eliminarResena, quita la reseña de la lista y actualiza stats
  it("elimina la reseña de la lista y actualiza estadísticas al confirmar en el modal", async () => {
    const onResenaEliminada = vi.fn();
    const onActualizarStats = vi.fn();
    mockEliminar.mockResolvedValueOnce();

    renderComponente({
      usuario: usuarioAutor,
      resenas: [resenaAna],
      onResenaEliminada,
      onActualizarStats,
    });

    fireEvent.click(screen.getByRole("button", { name: "Eliminar reseña" }));

    const modal = screen.getByRole("dialog", {
      name: "Confirmar eliminación de reseña",
    });
    const botonConfirmar = within(modal).getByRole("button", {
      name: "Eliminar",
    });
    fireEvent.click(botonConfirmar);

    await waitFor(() => {
      expect(mockEliminar).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Excelente celular, muy rápido."),
      ).toBeNull();
    });

    expect(onResenaEliminada).toHaveBeenCalledWith(1);
    expect(onActualizarStats).toHaveBeenCalled();
  });

  // 9. Los errores del backend en edición y eliminación se muestran en la UI de forma accesible
  it("muestra mensajes de error cuando el backend rechaza la edición o la eliminación", async () => {
    mockEditar.mockRejectedValueOnce(
      new Error("Error al modificar reseña en el servidor"),
    );
    mockEliminar.mockRejectedValueOnce(
      new Error("No fue posible eliminar la reseña por permisos"),
    );

    renderComponente({ usuario: usuarioAutor, resenas: [resenaAna] });

    // Intento de edición que falla
    fireEvent.click(screen.getByRole("button", { name: "Editar reseña" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(
        screen.getByText("Error al modificar reseña en el servidor"),
      ).toBeDefined();
    });

    // Cancelar edición
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // Intento de eliminación que falla
    fireEvent.click(screen.getByRole("button", { name: "Eliminar reseña" }));
    const modal = screen.getByRole("dialog", {
      name: "Confirmar eliminación de reseña",
    });
    const botonConfirmar = within(modal).getByRole("button", {
      name: "Eliminar",
    });
    fireEvent.click(botonConfirmar);

    await waitFor(() => {
      expect(
        screen.getByText("No fue posible eliminar la reseña por permisos"),
      ).toBeDefined();
    });
  });

  // 10. Un usuario anónimo no ve botones de edición ni de eliminación
  it("no muestra opciones de editar ni eliminar a usuarios no autenticados", () => {
    renderComponente({ usuario: null, resenas: [resenaAna, resenaCarlos] });

    expect(screen.queryByRole("button", { name: "Editar reseña" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Eliminar reseña" }),
    ).toBeNull();
  });

  it("muestra el aviso de revisión mientras se escribe y lo quita con texto limpio", () => {
    renderComponente({ usuario: usuarioAutor });

    const area = screen.getByLabelText(
      /Escribe tu opinión sobre/i,
    ) as HTMLTextAreaElement;

    fireEvent.change(area, { target: { value: "esto es una estafa" } });

    expect(
      screen.getByText(
        "Tu reseña contiene términos que requieren revisión antes de publicarse.",
      ),
    ).toBeDefined();

    fireEvent.change(area, {
      target: { value: "la computadora y el último pedido" },
    });

    expect(
      screen.queryByText(/Tu reseña contiene términos que requieren revisión/),
    ).toBeNull();
  });

  it("no borra el texto ni envía al detectar términos bloqueados", async () => {
    renderComponente({ usuario: usuarioAutor });

    const area = screen.getByLabelText(
      /Escribe tu opinión sobre/i,
    ) as HTMLTextAreaElement;

    fireEvent.change(area, { target: { value: "esto es un timo" } });
    fireEvent.click(screen.getByRole("button", { name: "Publicar opinión" }));

    await waitFor(() => {
      expect(
        screen.getByText(/El comentario contiene palabras no permitidas/i),
      ).toBeDefined();
    });

    expect(area.value).toBe("esto es un timo");
    expect(mockCrear).not.toHaveBeenCalled();
  });
});
