// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminPanelModal from "./AdminPanelModal";
import type {
  UsuarioSesion,
  ProductoResponse,
  CategoriaResponse,
  MarcaResponse,
} from "@/types/producto";
import * as api from "@/services/api";

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return {
    ...actual,
    obtenerProductos: vi.fn(),
    obtenerCategorias: vi.fn(),
    obtenerMarcas: vi.fn(),
    crearProducto: vi.fn(),
    actualizarProducto: vi.fn(),
    eliminarProducto: vi.fn(),
    crearCategoria: vi.fn(),
    actualizarCategoria: vi.fn(),
    eliminarCategoria: vi.fn(),
    crearMarca: vi.fn(),
    actualizarMarca: vi.fn(),
    eliminarMarca: vi.fn(),
  };
});

describe("AdminPanelModal - CRUD Integral (Fase 3.3)", () => {
  const adminUser: UsuarioSesion = {
    id: "admin-1",
    nombre: "Admin Principal",
    usuario: "admin",
    email: "admin@tecreview.com",
    rol: "Administrador",
    idUsuario: 1,
    activo: true,
  };

  const regularUser: UsuarioSesion = {
    id: "user-1",
    nombre: "Juan Perez",
    usuario: "juan",
    email: "juan@example.com",
    rol: "Usuario registrado",
    idUsuario: 2,
    activo: true,
  };

  const mockCategorias: CategoriaResponse[] = [
    { idCategoria: 1, nombre: "Smartphones", descripcion: "Móviles y teléfonos", estado: true },
    { idCategoria: 2, nombre: "Laptops", descripcion: "Portátiles y ultrabooks", estado: true },
  ];

  const mockMarcas: MarcaResponse[] = [
    { idMarca: 10, nombre: "Nothing", descripcion: "Londres, diseño transparente", estado: true },
    { idMarca: 20, nombre: "Apple", descripcion: "Cupertino, hardware premium", estado: true },
  ];

  const mockProductos: ProductoResponse[] = [
    {
      idProducto: 101,
      nombre: "Nothing Phone (2)",
      descripcion: "Diseño Glyph transparente",
      idCategoria: 1,
      idMarca: 10,
      imagen: "https://example.com/phone2.jpg",
      precioReferencia: 699.99,
      estado: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.obtenerProductos).mockResolvedValue(mockProductos);
    vi.mocked(api.obtenerCategorias).mockResolvedValue(mockCategorias);
    vi.mocked(api.obtenerMarcas).mockResolvedValue(mockMarcas);
  });

  afterEach(() => {
    cleanup();
  });

  describe("Seguridad Zero-Trust", () => {
    it("NO se renderiza para usuarios sin rol Administrador", () => {
      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={regularUser}
        />,
      );
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("NO se renderiza cuando isOpen es false", () => {
      render(
        <AdminPanelModal
          isOpen={false}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  describe("Gestión CRUD de Categorías (Paso 2)", () => {
    it("debe cargar y listar las categorías activas correctamente", async () => {
      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Categorías/i }));

      expect(await screen.findByText("Smartphones")).toBeDefined();
      expect(screen.getByText("Laptops")).toBeDefined();
      expect(screen.getByText("#1")).toBeDefined();
      expect(screen.getByText("#2")).toBeDefined();
      expect(screen.getAllByText("Activa").length).toBeGreaterThanOrEqual(2);
    });

    it("debe mostrar estado vacío cuando no existan categorías", async () => {
      vi.mocked(api.obtenerCategorias).mockResolvedValue([]);

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Categorías/i }));

      expect(
        await screen.findByText(/No hay categorías registradas en el catálogo/i),
      ).toBeDefined();
      expect(screen.getByRole("button", { name: /Registrar Primera Categoría/i })).toBeDefined();
    });

    it("debe validar que el nombre sea obligatorio al crear categoría", async () => {
      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Categorías/i }));
      await screen.findByText("Smartphones");

      fireEvent.click(screen.getByRole("button", { name: /\+ Nueva Categoría/i }));
      expect(screen.getByText(/Registrar Nueva Categoría/i)).toBeDefined();

      const btnSubmit = screen.getByRole("button", { name: /Crear Categoría/i });
      fireEvent.click(btnSubmit);

      expect(
        await screen.findByText(/El nombre de la categoría es obligatorio/i),
      ).toBeDefined();
      expect(api.crearCategoria).not.toHaveBeenCalled();
    });

    it("debe crear una categoría exitosamente y actualizar la lista", async () => {
      const nuevaCat: CategoriaResponse = {
        idCategoria: 3,
        nombre: "Audio / Auriculares",
        descripcion: "Dispositivos de audio Hi-Fi",
        estado: true,
      };
      vi.mocked(api.crearCategoria).mockResolvedValue(nuevaCat);
      vi.mocked(api.obtenerCategorias)
        .mockResolvedValueOnce(mockCategorias)
        .mockResolvedValueOnce([...mockCategorias, nuevaCat]);

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Categorías/i }));
      await screen.findByText("Smartphones");

      fireEvent.click(screen.getByRole("button", { name: /\+ Nueva Categoría/i }));

      fireEvent.change(screen.getByLabelText(/Nombre de la Categoría/i), {
        target: { value: "Audio / Auriculares" },
      });
      fireEvent.change(screen.getByLabelText(/Descripción/i), {
        target: { value: "Dispositivos de audio Hi-Fi" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Crear Categoría/i }));

      await waitFor(() => {
        expect(api.crearCategoria).toHaveBeenCalledWith({
          nombre: "Audio / Auriculares",
          descripcion: "Dispositivos de audio Hi-Fi",
        });
      });

      expect(
        await screen.findByText(/Categoría registrada exitosamente/i),
      ).toBeDefined();
    });

    it("debe editar una categoría existente con contrato PUT", async () => {
      const catActualizada: CategoriaResponse = {
        idCategoria: 1,
        nombre: "Smartphones 5G",
        descripcion: "Teléfonos de última generación",
        estado: true,
      };
      vi.mocked(api.actualizarCategoria).mockResolvedValue(catActualizada);

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Categorías/i }));
      await screen.findByText("Smartphones");

      fireEvent.click(screen.getByRole("button", { name: /Editar Smartphones/i }));
      expect(screen.getByText(/Editar Categoría: Smartphones/i)).toBeDefined();

      const inputNombre = screen.getByLabelText(/Nombre de la Categoría/i) as HTMLInputElement;
      expect(inputNombre.value).toBe("Smartphones");

      fireEvent.change(inputNombre, { target: { value: "Smartphones 5G" } });
      fireEvent.click(screen.getByRole("button", { name: /Guardar Cambios/i }));

      await waitFor(() => {
        expect(api.actualizarCategoria).toHaveBeenCalledWith(1, {
          nombre: "Smartphones 5G",
          descripcion: "Móviles y teléfonos",
        });
      });

      expect(await screen.findByText(/Categoría actualizada exitosamente/i)).toBeDefined();
    });

    it("debe confirmar antes de eliminar una categoría y procesar borrado lógico (204)", async () => {
      vi.mocked(api.eliminarCategoria).mockResolvedValue(undefined);

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Categorías/i }));
      await screen.findByText("Smartphones");

      fireEvent.click(screen.getByRole("button", { name: /Eliminar Smartphones/i }));

      expect(screen.getByRole("alertdialog")).toBeDefined();
      expect(screen.getByText(/Confirmar Eliminación de Categoría/i)).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: /Eliminar Categoría/i }));

      await waitFor(() => {
        expect(api.eliminarCategoria).toHaveBeenCalledWith(1);
      });

      expect(
        await screen.findByText(/Categoría "Smartphones" eliminada correctamente/i),
      ).toBeDefined();
    });

    it("debe mostrar mensaje comprensible y conservar el registro si el backend rechaza la eliminación (409 Conflict)", async () => {
      vi.mocked(api.eliminarCategoria).mockRejectedValue(
        new api.ApiError("Categoría ya está inactiva o tiene productos asociados", 409),
      );

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Categorías/i }));
      await screen.findByText("Smartphones");

      fireEvent.click(screen.getByRole("button", { name: /Eliminar Smartphones/i }));
      fireEvent.click(screen.getByRole("button", { name: /Eliminar Categoría/i }));

      expect(
        await screen.findByText(/Conflicto \(409\): Categoría ya está inactiva o tiene productos asociados/i),
      ).toBeDefined();
      expect(screen.getByText("Smartphones")).toBeDefined();
    });
  });

  describe("Gestión CRUD de Marcas (Paso 3)", () => {
    it("debe cargar y listar las marcas activas correctamente", async () => {
      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Marcas/i }));

      expect(await screen.findByText("Nothing")).toBeDefined();
      expect(screen.getByText("Apple")).toBeDefined();
      expect(screen.getByText("#10")).toBeDefined();
      expect(screen.getByText("#20")).toBeDefined();
    });

    it("debe mostrar estado vacío cuando no existan marcas", async () => {
      vi.mocked(api.obtenerMarcas).mockResolvedValue([]);

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Marcas/i }));

      expect(
        await screen.findByText(/No hay marcas registradas en el catálogo/i),
      ).toBeDefined();
      expect(screen.getByRole("button", { name: /Registrar Primera Marca/i })).toBeDefined();
    });

    it("debe validar que el nombre sea obligatorio al crear marca", async () => {
      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Marcas/i }));
      await screen.findByText("Nothing");

      fireEvent.click(screen.getByRole("button", { name: /\+ Nueva Marca/i }));
      expect(screen.getByText(/Registrar Nueva Marca/i)).toBeDefined();

      const btnSubmit = screen.getByRole("button", { name: /Crear Marca/i });
      fireEvent.click(btnSubmit);

      expect(await screen.findByText(/El nombre de la marca es obligatorio/i)).toBeDefined();
      expect(api.crearMarca).not.toHaveBeenCalled();
    });

    it("debe crear una marca exitosamente sin campo sitioWeb inventado", async () => {
      const nuevaMarca: MarcaResponse = {
        idMarca: 30,
        nombre: "Sony",
        descripcion: "Corporación tecnológica japonesa",
        estado: true,
      };
      vi.mocked(api.crearMarca).mockResolvedValue(nuevaMarca);

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Marcas/i }));
      await screen.findByText("Nothing");

      fireEvent.click(screen.getByRole("button", { name: /\+ Nueva Marca/i }));

      fireEvent.change(screen.getByLabelText(/Nombre de la Marca/i), {
        target: { value: "Sony" },
      });
      fireEvent.change(screen.getByLabelText(/Descripción/i), {
        target: { value: "Corporación tecnológica japonesa" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Crear Marca/i }));

      await waitFor(() => {
        expect(api.crearMarca).toHaveBeenCalledWith({
          nombre: "Sony",
          descripcion: "Corporación tecnológica japonesa",
        });
      });

      expect(await screen.findByText(/Marca registrada exitosamente/i)).toBeDefined();
    });

    it("debe editar una marca existente con contrato PUT", async () => {
      const marcaActualizada: MarcaResponse = {
        idMarca: 10,
        nombre: "Nothing Technology",
        descripcion: "Londres, diseño y software",
        estado: true,
      };
      vi.mocked(api.actualizarMarca).mockResolvedValue(marcaActualizada);

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Marcas/i }));
      await screen.findByText("Nothing");

      fireEvent.click(screen.getByRole("button", { name: /Editar Nothing/i }));
      expect(screen.getByText(/Editar Marca: Nothing/i)).toBeDefined();

      fireEvent.change(screen.getByLabelText(/Nombre de la Marca/i), {
        target: { value: "Nothing Technology" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Guardar Cambios/i }));

      await waitFor(() => {
        expect(api.actualizarMarca).toHaveBeenCalledWith(10, {
          nombre: "Nothing Technology",
          descripcion: "Londres, diseño transparente",
        });
      });

      expect(await screen.findByText(/Marca actualizada exitosamente/i)).toBeDefined();
    });

    it("debe confirmar antes de eliminar una marca y manejar 204 No Content", async () => {
      vi.mocked(api.eliminarMarca).mockResolvedValue(undefined);

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Marcas/i }));
      await screen.findByText("Nothing");

      fireEvent.click(screen.getByRole("button", { name: /Eliminar Nothing/i }));

      expect(screen.getByRole("alertdialog")).toBeDefined();
      expect(screen.getByText(/Confirmar Eliminación de Marca/i)).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: /Eliminar Marca/i }));

      await waitFor(() => {
        expect(api.eliminarMarca).toHaveBeenCalledWith(10);
      });

      expect(
        await screen.findByText(/Marca "Nothing" eliminada correctamente/i),
      ).toBeDefined();
    });

    it("debe manejar error 403 Forbidden al mutar marcas", async () => {
      vi.mocked(api.crearMarca).mockRejectedValue(
        new api.ApiError("Forbidden", 403),
      );

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Marcas/i }));
      await screen.findByText("Nothing");

      fireEvent.click(screen.getByRole("button", { name: /\+ Nueva Marca/i }));
      fireEvent.change(screen.getByLabelText(/Nombre de la Marca/i), {
        target: { value: "Xiaomi" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Crear Marca/i }));

      expect(
        await screen.findByText(/Acceso denegado \(403\): Se requieren permisos de Administrador/i),
      ).toBeDefined();
    });
  });

  describe("Gestión CRUD de Productos (Fase 3.2)", () => {
    it("debe cargar y listar productos con sus categorías y marcas resueltas", async () => {
      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      expect(await screen.findByText("Nothing Phone (2)")).toBeDefined();
      expect(screen.getByText("#101")).toBeDefined();
      expect(screen.getByText("Smartphones")).toBeDefined();
      expect(screen.getByText("Nothing")).toBeDefined();
      expect(screen.getByText("$699.99")).toBeDefined();
    });

    it("debe validar campos y crear un producto exitosamente", async () => {
      const nuevoProducto: ProductoResponse = {
        idProducto: 102,
        nombre: "MacBook Pro M3",
        descripcion: "Laptop pro",
        idCategoria: 2,
        idMarca: 20,
        imagen: null,
        precioReferencia: 1999.0,
        estado: true,
      };
      vi.mocked(api.crearProducto).mockResolvedValue(nuevoProducto);

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      await screen.findByText("Nothing Phone (2)");
      fireEvent.click(screen.getByRole("button", { name: /\+ Nuevo Producto/i }));

      fireEvent.change(screen.getByLabelText(/Nombre del Producto/i), {
        target: { value: "MacBook Pro M3" },
      });
      fireEvent.change(screen.getByLabelText(/Categoría/i), {
        target: { value: "2" },
      });
      fireEvent.change(screen.getByLabelText(/Marca/i), {
        target: { value: "20" },
      });
      fireEvent.change(screen.getByLabelText(/Precio de Referencia/i), {
        target: { value: "1999" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Crear Producto/i }));

      await waitFor(() => {
        expect(api.crearProducto).toHaveBeenCalledWith({
          nombre: "MacBook Pro M3",
          descripcion: null,
          idCategoria: 2,
          idMarca: 20,
          imagen: null,
          precioReferencia: 1999,
        });
      });

      expect(await screen.findByText(/Producto registrado exitosamente en el catálogo/i)).toBeDefined();
    });

    it("debe editar un producto existente y enviar PUT", async () => {
      const prodActualizado: ProductoResponse = {
        ...mockProductos[0],
        nombre: "Nothing Phone (2) Special Edition",
      };
      vi.mocked(api.actualizarProducto).mockResolvedValue(prodActualizado);

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      await screen.findByText("Nothing Phone (2)");
      fireEvent.click(screen.getByRole("button", { name: /Editar Nothing Phone \(2\)/i }));

      fireEvent.change(screen.getByLabelText(/Nombre del Producto/i), {
        target: { value: "Nothing Phone (2) Special Edition" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Guardar Cambios/i }));

      await waitFor(() => {
        expect(api.actualizarProducto).toHaveBeenCalledWith(
          101,
          expect.objectContaining({
            nombre: "Nothing Phone (2) Special Edition",
          }),
        );
      });

      expect(await screen.findByText(/Producto actualizado exitosamente/i)).toBeDefined();
    });

    it("debe confirmar antes de eliminar un producto y manejar 204 No Content", async () => {
      vi.mocked(api.eliminarProducto).mockResolvedValue(undefined);

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      await screen.findByText("Nothing Phone (2)");
      fireEvent.click(screen.getByRole("button", { name: /Eliminar Nothing Phone \(2\)/i }));

      expect(screen.getByRole("alertdialog")).toBeDefined();
      expect(screen.getByText(/Confirmar Eliminación de Producto/i)).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: /Eliminar Producto/i }));

      await waitFor(() => {
        expect(api.eliminarProducto).toHaveBeenCalledWith(101);
      });

      expect(await screen.findByText(/Producto "Nothing Phone \(2\)" eliminado correctamente/i)).toBeDefined();
    });
  });

  describe("Integración con Opciones de Productos (Paso 5)", () => {
    it("debe mostrar las categorías y marcas sincronizadas en el formulario de productos", async () => {
      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      await screen.findByText("Nothing Phone (2)");
      fireEvent.click(screen.getByRole("button", { name: /\+ Nuevo Producto/i }));

      const selectCategoria = screen.getByLabelText(/Categoría/i) as HTMLSelectElement;
      expect(selectCategoria.options.length).toBe(3); // 1 placeholder + 2 opciones
      expect(screen.getByRole("option", { name: "Smartphones" })).toBeDefined();
      expect(screen.getByRole("option", { name: "Laptops" })).toBeDefined();

      const selectMarca = screen.getByLabelText(/Marca/i) as HTMLSelectElement;
      expect(selectMarca.options.length).toBe(3);
      expect(screen.getByRole("option", { name: "Nothing" })).toBeDefined();
      expect(screen.getByRole("option", { name: "Apple" })).toBeDefined();
    });
  });
});
