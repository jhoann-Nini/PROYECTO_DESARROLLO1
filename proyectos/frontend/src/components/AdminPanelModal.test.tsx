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
    descargarCatalogoCsv: vi.fn(),
    dispararDescargaArchivo: vi.fn(),
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

  describe("Gestión de Características Técnicas Dinámicas (Fase 4.3)", () => {
    const categoriasCompletas: CategoriaResponse[] = [
      { idCategoria: 1, nombre: "Smartphones", descripcion: "Móviles y teléfonos", estado: true },
      { idCategoria: 2, nombre: "Laptops", descripcion: "Portátiles y ultrabooks", estado: true },
      { idCategoria: 3, nombre: "Tablets", descripcion: "Tabletas táctiles", estado: true },
      { idCategoria: 4, nombre: "Auriculares", descripcion: "Auriculares y audio", estado: true },
      { idCategoria: 5, nombre: "Monitores", descripcion: "Pantallas de escritorio", estado: true },
    ];

    it("permite registrar características técnicas pertinentes a la categoría al crear un producto", async () => {
      vi.mocked(api.obtenerCategorias).mockResolvedValue(categoriasCompletas);
      vi.mocked(api.crearProducto).mockResolvedValue({
        idProducto: 301,
        nombre: "Sony WH-1000XM5",
        descripcion: null,
        idCategoria: 4,
        idMarca: 10,
        imagen: null,
        precioReferencia: null,
        estado: true,
      });

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      await screen.findByText("Nothing Phone (2)");
      fireEvent.click(screen.getByRole("button", { name: /\+ Nuevo Producto/i }));

      // Seleccionar categoría Auriculares
      fireEvent.change(screen.getByLabelText(/Categoría/i), {
        target: { value: "4" },
      });

      // Verificar que los campos estándar de Auriculares se muestran
      expect(screen.getByTestId("input-spec-transductores")).toBeDefined();
      expect(screen.getByTestId("input-spec-cancelacion_ruido")).toBeDefined();
      expect(screen.getByTestId("input-spec-bateria")).toBeDefined();

      // Verificar que no se inventaron datos ni hay valores predeterminados
      expect((screen.getByTestId("input-spec-transductores") as HTMLInputElement).value).toBe("");

      // Rellenar formulario básico y características
      fireEvent.change(screen.getByLabelText(/Nombre del Producto/i), {
        target: { value: "Sony WH-1000XM5" },
      });
      fireEvent.change(screen.getByLabelText(/Marca/i), {
        target: { value: "10" },
      });
      fireEvent.change(screen.getByTestId("input-spec-transductores"), {
        target: { value: "Drivers de 30mm fibra de carbono" },
      });
      fireEvent.change(screen.getByTestId("input-spec-cancelacion_ruido"), {
        target: { value: "Auto NC Optimizer con 8 micrófonos" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Crear Producto/i }));

      await waitFor(() => {
        expect(api.crearProducto).toHaveBeenCalledWith({
          nombre: "Sony WH-1000XM5",
          descripcion: null,
          idCategoria: 4,
          idMarca: 10,
          imagen: null,
          precioReferencia: null,
          caracteristicas: {
            transductores: "Drivers de 30mm fibra de carbono",
            cancelacion_ruido: "Auto NC Optimizer con 8 micrófonos",
          },
        });
      });

      expect(await screen.findByText(/Producto registrado exitosamente en el catálogo/i)).toBeDefined();
    });

    it("al editar un producto carga sus características actuales en el formulario y permite modificarlas", async () => {
      const prodConSpecs: ProductoResponse = {
        idProducto: 401,
        nombre: "Galaxy Tab S9",
        descripcion: "Tablet de alta gama",
        idCategoria: 3,
        idMarca: 10,
        imagen: "https://example.com/tab.jpg",
        precioReferencia: 799.99,
        estado: true,
        caracteristicas: {
          pantalla: "11'' Dynamic AMOLED 2X 120Hz",
          procesador: "Snapdragon 8 Gen 2 for Galaxy",
          certificacion_extra: "IP68 resistente al agua",
        },
      };

      vi.mocked(api.obtenerCategorias).mockResolvedValue(categoriasCompletas);
      vi.mocked(api.obtenerProductos).mockResolvedValue([prodConSpecs]);
      vi.mocked(api.actualizarProducto).mockResolvedValue(prodConSpecs);

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      await screen.findByText("Galaxy Tab S9");

      // Verificar que la insignia de especificaciones se muestra en la tabla
      expect(screen.getByTestId("badge-specs-401")).toBeDefined();
      expect(screen.getByText(/3 specs/i)).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: /Editar Galaxy Tab S9/i }));

      // Verificar carga de características estándar
      const inputPantalla = screen.getByTestId("input-spec-pantalla") as HTMLInputElement;
      expect(inputPantalla.value).toBe("11'' Dynamic AMOLED 2X 120Hz");

      const inputProcesador = screen.getByTestId("input-spec-procesador") as HTMLInputElement;
      expect(inputProcesador.value).toBe("Snapdragon 8 Gen 2 for Galaxy");

      // Verificar carga de característica personalizada
      const inputClavePers = screen.getByTestId("input-spec-personalizada-clave-0") as HTMLInputElement;
      expect(inputClavePers.value).toBe("certificacion_extra");
      const inputValorPers = screen.getByTestId("input-spec-personalizada-valor-0") as HTMLInputElement;
      expect(inputValorPers.value).toBe("IP68 resistente al agua");

      // Modificar pantalla y guardar
      fireEvent.change(inputPantalla, {
        target: { value: "11'' Dynamic AMOLED 2X 120Hz HDR10+" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Guardar Cambios/i }));

      await waitFor(() => {
        expect(api.actualizarProducto).toHaveBeenCalledWith(
          401,
          expect.objectContaining({
            caracteristicas: {
              pantalla: "11'' Dynamic AMOLED 2X 120Hz HDR10+",
              procesador: "Snapdragon 8 Gen 2 for Galaxy",
              certificacion_extra: "IP68 resistente al agua",
            },
          }),
        );
      });

      expect(await screen.findByText(/Producto actualizado exitosamente/i)).toBeDefined();
    });

    it("al cambiar de categoría muestra alerta de campos incompatibles y el botón 'Adaptar' los descarta con seguridad", async () => {
      vi.mocked(api.obtenerCategorias).mockResolvedValue(categoriasCompletas);
      vi.mocked(api.crearProducto).mockResolvedValue({
        idProducto: 501,
        nombre: "Test Hybrid",
        descripcion: null,
        idCategoria: 1,
        idMarca: 10,
        imagen: null,
        precioReferencia: null,
        estado: true,
      });

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      await screen.findByText("Nothing Phone (2)");
      fireEvent.click(screen.getByRole("button", { name: /\+ Nuevo Producto/i }));

      // Inicialmente en Auriculares
      fireEvent.change(screen.getByLabelText(/Categoría/i), {
        target: { value: "4" },
      });
      fireEvent.change(screen.getByTestId("input-spec-transductores"), {
        target: { value: "Drivers 40mm" },
      });

      // Cambiar a Smartphones
      fireEvent.change(screen.getByLabelText(/Categoría/i), {
        target: { value: "1" },
      });

      // Comprobar que aparece alerta de incompatibilidad
      const alerta = screen.getByTestId("alerta-cambio-categoria");
      expect(alerta).toBeDefined();
      expect(alerta.textContent).toContain("transductores");

      // Hacer clic en 'Adaptar a Móviles' para limpiar incompatibles
      fireEvent.click(screen.getByTestId("btn-adaptar-categoria"));
      expect(screen.queryByTestId("alerta-cambio-categoria")).toBeNull();

      // Completar campos para Smartphones
      fireEvent.change(screen.getByLabelText(/Nombre del Producto/i), {
        target: { value: "Nuevo Smartphone" },
      });
      fireEvent.change(screen.getByLabelText(/Marca/i), {
        target: { value: "10" },
      });
      fireEvent.change(screen.getByTestId("input-spec-pantalla"), {
        target: { value: "6.7'' OLED FHD+" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Crear Producto/i }));

      await waitFor(() => {
        expect(api.crearProducto).toHaveBeenCalledWith(
          expect.objectContaining({
            idCategoria: 1,
            caracteristicas: {
              pantalla: "6.7'' OLED FHD+",
            },
          }),
        );
      });
    });

    it("al cambiar de categoría permite 'Conservar como personalizadas' para no perder datos", async () => {
      vi.mocked(api.obtenerCategorias).mockResolvedValue(categoriasCompletas);
      vi.mocked(api.crearProducto).mockResolvedValue({
        idProducto: 601,
        nombre: "Monitor Gaming",
        descripcion: null,
        idCategoria: 5,
        idMarca: 10,
        imagen: null,
        precioReferencia: null,
        estado: true,
      });

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      await screen.findByText("Nothing Phone (2)");
      fireEvent.click(screen.getByRole("button", { name: /\+ Nuevo Producto/i }));

      // Primero en Auriculares con cancelación de ruido
      fireEvent.change(screen.getByLabelText(/Categoría/i), {
        target: { value: "4" },
      });
      fireEvent.change(screen.getByTestId("input-spec-cancelacion_ruido"), {
        target: { value: "ANC avanzada" },
      });

      // Cambiar a Monitores
      fireEvent.change(screen.getByLabelText(/Categoría/i), {
        target: { value: "5" },
      });

      // Hacer clic en 'Conservar como personalizadas'
      fireEvent.click(screen.getByTestId("btn-conservar-personalizadas"));
      expect(screen.queryByTestId("alerta-cambio-categoria")).toBeNull();

      // La especificación anterior ahora está en un campo personalizado
      expect(screen.getByTestId("input-spec-personalizada-clave-0")).toBeDefined();
      expect((screen.getByTestId("input-spec-personalizada-clave-0") as HTMLInputElement).value).toBe("cancelacion_ruido");

      // Rellenar datos del monitor
      fireEvent.change(screen.getByLabelText(/Nombre del Producto/i), {
        target: { value: "Monitor Gaming 27" },
      });
      fireEvent.change(screen.getByLabelText(/Marca/i), {
        target: { value: "10" },
      });
      fireEvent.change(screen.getByTestId("input-spec-panel"), {
        target: { value: "Fast IPS 2K" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Crear Producto/i }));

      await waitFor(() => {
        expect(api.crearProducto).toHaveBeenCalledWith(
          expect.objectContaining({
            idCategoria: 5,
            caracteristicas: {
              panel: "Fast IPS 2K",
              cancelacion_ruido: "ANC avanzada",
            },
          }),
        );
      });
    });

    it("valida características personalizadas impidiendo el guardado si falta el nombre del campo", async () => {
      vi.mocked(api.obtenerCategorias).mockResolvedValue(categoriasCompletas);

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
        target: { value: "Producto Incompleto" },
      });
      fireEvent.change(screen.getByLabelText(/Categoría/i), {
        target: { value: "1" },
      });
      fireEvent.change(screen.getByLabelText(/Marca/i), {
        target: { value: "10" },
      });

      // Añadir característica personalizada sin nombre de clave
      fireEvent.click(screen.getByTestId("btn-agregar-spec-personalizada"));
      fireEvent.change(screen.getByTestId("input-spec-personalizada-valor-0"), {
        target: { value: "Valor sin clave definida" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Crear Producto/i }));

      expect(await screen.findByText(/Las características personalizadas deben tener un nombre de campo/i)).toBeDefined();
      expect(api.crearProducto).not.toHaveBeenCalled();
    });

    it("valida que los productos antiguos sin características sigan funcionando con normalidad", async () => {
      const prodAntiguo: ProductoResponse = {
        idProducto: 701,
        nombre: "Producto Clásico",
        descripcion: "Sin características técnicas",
        idCategoria: 1,
        idMarca: 10,
        imagen: null,
        precioReferencia: 150,
        estado: true,
        caracteristicas: null,
      };

      vi.mocked(api.obtenerCategorias).mockResolvedValue(categoriasCompletas);
      vi.mocked(api.obtenerProductos).mockResolvedValue([prodAntiguo]);
      vi.mocked(api.actualizarProducto).mockResolvedValue(prodAntiguo);

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      await screen.findByText("Producto Clásico");
      // No debe tener insignia de specs
      expect(screen.queryByTestId("badge-specs-701")).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: /Editar Producto Clásico/i }));

      // Campos de características están vacíos sin errores
      expect((screen.getByTestId("input-spec-pantalla") as HTMLInputElement).value).toBe("");

      fireEvent.click(screen.getByRole("button", { name: /Guardar Cambios/i }));

      await waitFor(() => {
        expect(api.actualizarProducto).toHaveBeenCalledWith(
          701,
          expect.objectContaining({
            nombre: "Producto Clásico",
          }),
        );
      });
      expect(await screen.findByText(/Producto actualizado exitosamente/i)).toBeDefined();
    });
  });

  describe("Fase 4.7.1-B: Exportación del catálogo a CSV", () => {
    it("debe mostrar el botón 'Exportar catálogo CSV' en la pestaña de productos", async () => {
      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      await screen.findByText("Gestión de Catálogo de Productos");
      const btnExportar = screen.getByRole("button", { name: /Exportar catálogo CSV/i });
      expect(btnExportar).toBeDefined();
    });

    it("al hacer clic en 'Exportar catálogo CSV', descarga el archivo y muestra mensaje de éxito", async () => {
      const fakeBlob = new Blob(["id_producto,nombre\n1,Prueba"], { type: "text/csv" });
      vi.mocked(api.descargarCatalogoCsv).mockResolvedValueOnce({
        blob: fakeBlob,
        nombreArchivo: "catalogo_productos_20261021.csv",
      });

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      await screen.findByText("Gestión de Catálogo de Productos");
      const btnExportar = screen.getByRole("button", { name: /Exportar catálogo CSV/i });

      fireEvent.click(btnExportar);

      await waitFor(() => {
        expect(api.descargarCatalogoCsv).toHaveBeenCalledTimes(1);
        expect(api.dispararDescargaArchivo).toHaveBeenCalledWith(
          fakeBlob,
          "catalogo_productos_20261021.csv",
        );
      });

      expect(await screen.findByText(/Catálogo exportado exitosamente a CSV/i)).toBeDefined();
    });

    it("al fallar la descarga del CSV, muestra el mensaje de error comprensible en el panel", async () => {
      vi.mocked(api.descargarCatalogoCsv).mockRejectedValueOnce(
        new api.ApiError("No tienes permisos de administrador para exportar el catálogo de productos.", 403),
      );

      render(
        <AdminPanelModal
          isOpen={true}
          onClose={vi.fn()}
          usuarioSesion={adminUser}
        />,
      );

      await screen.findByText("Gestión de Catálogo de Productos");
      const btnExportar = screen.getByRole("button", { name: /Exportar catálogo CSV/i });

      fireEvent.click(btnExportar);

      await waitFor(() => {
        expect(api.descargarCatalogoCsv).toHaveBeenCalledTimes(1);
      });

      expect(
        await screen.findByText(/No tienes permisos de administrador para exportar el catálogo de productos/i),
      ).toBeDefined();
      expect(api.dispararDescargaArchivo).not.toHaveBeenCalled();
    });
  });
});
