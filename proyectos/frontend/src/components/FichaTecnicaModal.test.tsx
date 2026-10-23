// @vitest-environment happy-dom
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import FichaTecnicaModal from "./FichaTecnicaModal";
import { Producto, UsuarioSesion } from "@/types/producto";
import { DISPOSITIVOS_VENDIDOS } from "@/data/mockProductos";

const mockCrearValoracion = vi.fn();
const mockObtenerMiValoracion = vi.fn();

vi.mock("@/services/api", () => ({
  crearValoracion: (...args: unknown[]) => mockCrearValoracion(...args),
  obtenerMiValoracion: (...args: unknown[]) => mockObtenerMiValoracion(...args),
}));

describe("Componente FichaTecnicaModal — Fase 4.2: Fichas técnicas dinámicas", () => {
  afterEach(() => {
    cleanup();
  });

  it("unos auriculares NO muestran especificaciones de pantalla, resolución ni frecuencia de actualización", () => {
    const auriculares: Producto = {
      idProducto: 401,
      nombre: "Sony WH-1000XM5 Wireless",
      descripcion: "Auriculares circumaurales inalámbricos con cancelación activa de ruido.",
      idCategoria: 4,
      idMarca: 1,
      nombreCategoria: "Auriculares",
      nombreMarca: "Sony",
      imagen: "https://example.com/sony-xm5.jpg",
      precioReferencia: 1499000,
      estado: true,
      caracteristicas: {
        transductores: "Drivers de 30mm con fibra de carbono",
        cancelacion_ruido: "Cancelación activa de ruido con procesador HD QN1",
        microfonos: "Matriz de 8 micrófonos con beamforming",
        bateria: "Hasta 30 horas con ANC",
        codecs: "Bluetooth 5.2 con soporte LDAC Hi-Res",
      },
    };

    render(<FichaTecnicaModal producto={auriculares} onClose={vi.fn()} />);

    // Verificar que se renderiza el título del producto
    expect(screen.getByText("Sony WH-1000XM5 Wireless")).toBeDefined();
    // La insignia de categoría debe ser Auriculares & Audio
    expect(screen.getAllByText(/Auriculares & Audio/i).length).toBeGreaterThan(0);

    // NO debe contener pestañas ni textos de pantalla o resolución
    expect(screen.queryByText(/Pantalla y diseño/i)).toBeNull();
    expect(screen.queryByText(/Nitidez certificada FHD\+/i)).toBeNull();
    expect(screen.queryByText(/Fluidez adaptativa \(hasta 120 Hz\)/i)).toBeNull();
    expect(screen.queryByText(/120 Hz/i)).toBeNull();

    // SÍ debe mostrar pestañas de acústica y cancelación de ruido
    expect(screen.getByRole("tab", { name: /ACÚSTICA & TRANSDUCTORES/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /CANCELACIÓN DE RUIDO/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /MICRÓFONOS & LLAMADAS/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /BATERÍA & AUTONOMÍA/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /CONECTIVIDAD & CÓDECS/i })).toBeDefined();
  });

  it("un móvil puede mostrar sus especificaciones de pantalla", () => {
    const movil: Producto = {
      idProducto: 101,
      nombre: "Samsung Galaxy S24 Ultra",
      descripcion: "Smartphone insignia con pantalla Dynamic AMOLED 2X.",
      idCategoria: 1,
      idMarca: 2,
      nombreCategoria: "Móviles",
      nombreMarca: "Samsung",
      imagen: "https://example.com/s24.jpg",
      precioReferencia: 5200000,
      estado: true,
      caracteristicas: {
        pantalla: "6.8'' Dynamic AMOLED 2X QHD+ · 120Hz LTPO · 2600 nits pico",
        procesador: "Snapdragon 8 Gen 3 for Galaxy (4nm)",
        ram_almacenamiento: "12GB RAM · 512GB UFS 4.0",
        camaras: "200MP OIS + 50MP Periscopio 5x + 10MP Telefoto + 12MP UW",
        bateria: "5000 mAh · Carga rápida 45W",
      },
    };

    render(<FichaTecnicaModal producto={movil} onClose={vi.fn()} />);

    expect(screen.getByText("Samsung Galaxy S24 Ultra")).toBeDefined();
    expect(screen.getByRole("tab", { name: /PANTALLA & RENDIMIENTO VISUAL/i })).toBeDefined();
    expect(screen.getAllByText(/6.8'' Dynamic AMOLED 2X QHD\+/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/120Hz LTPO/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: /SISTEMA DE CÁMARAS/i })).toBeDefined();
  });

  it("un portátil presenta características de hardware (CPU, GPU, RAM, Almacenamiento, Puertos)", () => {
    const laptop: Producto = {
      idProducto: 201,
      nombre: "ASUS ROG Zephyrus G16",
      descripcion: "Portátil gaming de alto rendimiento con panel OLED.",
      idCategoria: 3,
      idMarca: 3,
      nombreCategoria: "Laptops / PCs",
      nombreMarca: "ASUS",
      imagen: "https://example.com/zephyrus.jpg",
      precioReferencia: 7800000,
      estado: true,
      caracteristicas: {
        procesador: "Intel Core Ultra 9 185H con NPU IA",
        grafica: "NVIDIA GeForce RTX 4070 8GB GDDR6",
        ram: "32GB LPDDR5X 7467MHz Dual Channel",
        almacenamiento: "1TB SSD PCIe 4.0 NVMe M.2",
        puertos: "Thunderbolt 4, HDMI 2.1, USB-C 3.2",
      },
    };

    render(<FichaTecnicaModal producto={laptop} onClose={vi.fn()} />);

    expect(screen.getByText("ASUS ROG Zephyrus G16")).toBeDefined();
    expect(screen.getByRole("tab", { name: /PROCESADOR & RENDIMIENTO/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /GRÁFICOS DEDICADOS/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /MEMORIA RAM/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /ALMACENAMIENTO NVMe/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /PUERTOS & CONECTIVIDAD/i })).toBeDefined();
  });

  it("una tablet presenta las características disponibles", () => {
    const tablet: Producto = {
      idProducto: 301,
      nombre: "OnePlus Pad 2 Pro",
      descripcion: "Tablet de productividad con panel 3K a 144Hz.",
      idCategoria: 2,
      idMarca: 4,
      nombreCategoria: "Tablets",
      nombreMarca: "OnePlus",
      imagen: "https://example.com/pad2.jpg",
      precioReferencia: 2400000,
      estado: true,
      caracteristicas: {
        pantalla: "12.1'' LCD 3K (3000x2120) · 144Hz fluidez · 900 nits",
        procesador: "Qualcomm Snapdragon 8 Gen 3 Flagship",
        bateria: "9510 mAh · Carga rápida 67W SuperVOOC",
        productividad: "Compatible con Stylus Stylo 2 y teclado magnético",
      },
    };

    render(<FichaTecnicaModal producto={tablet} onClose={vi.fn()} />);

    expect(screen.getByText("OnePlus Pad 2 Pro")).toBeDefined();
    expect(screen.getByRole("tab", { name: /PANTALLA & RENDIMIENTO VISUAL/i })).toBeDefined();
    const tabProductividad = screen.getByRole("tab", { name: /PRODUCTIVIDAD & STYLUS/i });
    expect(tabProductividad).toBeDefined();
    fireEvent.click(tabProductividad);
    expect(screen.getByText(/Compatible con Stylus Stylo 2/i)).toBeDefined();
  });

  it("un monitor muestra las características de pantalla disponibles y no incluye batería ni cámaras", () => {
    const monitor: Producto = {
      idProducto: 501,
      nombre: "LG UltraGear 27GR93U",
      descripcion: "Monitor gaming UHD 4K con panel IPS.",
      idCategoria: 5,
      idMarca: 5,
      nombreCategoria: "Monitores",
      nombreMarca: "LG",
      imagen: "https://example.com/lg27.jpg",
      precioReferencia: 2200000,
      estado: true,
      caracteristicas: {
        panel: "27'' UHD 4K (3840x2160) Fast IPS · 144Hz · 1ms GtG",
        color_hdr: "95% DCI-P3 · VESA DisplayHDR 400",
        puertos: "2x HDMI 2.1, 1x DisplayPort 1.4, USB 3.0 Hub",
        ergonomia: "Ajuste de altura, inclinación y giro vertical",
      },
    };

    render(<FichaTecnicaModal producto={monitor} onClose={vi.fn()} />);

    expect(screen.getByText("LG UltraGear 27GR93U")).toBeDefined();
    expect(screen.getAllByText(/Monitores & Pantallas/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: /TECNOLOGÍA DE PANEL/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /GAMUT DE COLOR & HDR/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /PUERTOS & CONECTIVIDAD/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /ERGONOMÍA & AJUSTES/i })).toBeDefined();

    // No debe contener características de móviles o laptops irrelevantes
    expect(screen.queryByText(/BATERÍA/i)).toBeNull();
    expect(screen.queryByText(/CÁMARAS/i)).toBeNull();
  });

  it("un producto sin características no provoca errores y muestra el estado vacío apropiado", () => {
    const prodSinSpecs: Producto = {
      idProducto: 999,
      nombre: "Dispositivo Básico Sin Datos",
      descripcion: null,
      idCategoria: 1,
      idMarca: 1,
      imagen: null,
      precioReferencia: 200000,
      estado: true,
      caracteristicas: null,
    };

    render(<FichaTecnicaModal producto={prodSinSpecs} onClose={vi.fn()} />);

    // El modal no se rompe y muestra el nombre y la marca
    expect(screen.getByText("Dispositivo Básico Sin Datos")).toBeDefined();
    // Muestra el estado vacío sin datos inventados
    expect(screen.getByText("Sin especificaciones técnicas registradas")).toBeDefined();
    expect(
      screen.getByText(/Este producto no dispone de características técnicas detalladas registradas/i)
    ).toBeDefined();

    // Puntuación indica pendiente y no 9.3 ficticio
    expect(screen.getByText("Pendiente de valoraciones")).toBeDefined();
    expect(screen.queryByText("9.3 / 10")).toBeNull();
    // No debe mostrar benchmark ficticio AnTuTu
    expect(screen.queryByText(/AnTuTu/i)).toBeNull();
  });

  it("los valores procedentes del backend se representan correctamente en las pestañas y tarjetas", () => {
    const productoBackend: Producto = {
      idProducto: 777,
      nombre: "Auriculares Estudio Hi-Fi",
      descripcion: "Auriculares abiertos para mezcla y masterización.",
      idCategoria: 4,
      idMarca: 6,
      nombreCategoria: "Auriculares",
      nombreMarca: "Sennheiser",
      imagen: "https://example.com/sennheiser.jpg",
      precioReferencia: 850000,
      estado: true,
      caracteristicas: {
        transductores: "Transductores angulados de 38mm · Impedancia de 300 ohmios · THD < 0.05%",
        conectividad: "Cable desmontable con conector jack 6.3mm y adaptador 3.5mm",
      },
    };

    render(<FichaTecnicaModal producto={productoBackend} onClose={vi.fn()} />);

    expect(screen.getByText("Auriculares Estudio Hi-Fi")).toBeDefined();
    expect(screen.getByRole("tab", { name: /ACÚSTICA & TRANSDUCTORES/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /CONECTIVIDAD & SISTEMA/i })).toBeDefined();

    // Verificamos el desglose de sub-especificaciones por ' · '
    expect(screen.getByText("Transductores angulados de 38mm")).toBeDefined();
    expect(screen.getByText("Impedancia de 300 ohmios")).toBeDefined();
    expect(screen.getByText("THD < 0.05%")).toBeDefined();
  });

  it("los productos antiguos de los rankings siguen siendo compatibles", () => {
    const demo = DISPOSITIVOS_VENDIDOS[0];

    render(<FichaTecnicaModal producto={demo} onClose={vi.fn()} />);

    expect(screen.getByText(demo.nombre)).toBeDefined();
    expect(screen.getByText(new RegExp(`RANKING #${demo.ranking}`))).toBeDefined();
    expect(screen.getByText(`${demo.puntuacion.toFixed(1)} / 10`)).toBeDefined();
    expect(screen.getByText(demo.detalleSpecs!.benchmarkEtiqueta! + ":")).toBeDefined();
  });

  it("permite cambiar dinámicamente de pestaña al hacer clic", () => {
    const producto: Producto = {
      idProducto: 888,
      nombre: "Multi-Tab Tech Phone",
      descripcion: "Dispositivo con múltiples especificaciones.",
      idCategoria: 1,
      idMarca: 1,
      nombreCategoria: "Móviles",
      nombreMarca: "TechBrand",
      imagen: null,
      precioReferencia: 900000,
      estado: true,
      caracteristicas: {
        pantalla: "Panel AMOLED 120Hz",
        procesador: "Snapdragon 7s Gen 2",
        bateria: "5100 mAh con carga de 67W",
      },
    };

    render(<FichaTecnicaModal producto={producto} onClose={vi.fn()} />);

    // Por defecto la primera pestaña está activa
    const tabPantalla = screen.getByRole("tab", { name: /PANTALLA & RENDIMIENTO VISUAL/i });
    expect(tabPantalla.getAttribute("aria-selected")).toBe("true");

    // Hacemos clic en la pestaña de procesador
    const tabProcesador = screen.getByRole("tab", { name: /PROCESADOR & RENDIMIENTO/i });
    fireEvent.click(tabProcesador);

    expect(tabProcesador.getAttribute("aria-selected")).toBe("true");
    expect(tabPantalla.getAttribute("aria-selected")).toBe("false");
    expect(screen.getByText("Snapdragon 7s Gen 2")).toBeDefined();
  });

  it("el modal responde al evento de cierre y la tecla Escape", () => {
    const handleClose = vi.fn();
    const demo = DISPOSITIVOS_VENDIDOS[0];

    render(<FichaTecnicaModal producto={demo} onClose={handleClose} />);

    // Cerrar por botón
    const botonCerrar = screen.getByLabelText(/Cerrar ventana de especificaciones técnicas/i);
    fireEvent.click(botonCerrar);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Cerrar por Escape
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});

describe("Componente FichaTecnicaModal — Fase 4.6: Sistema Real de Valoraciones", () => {
  const productoTest: Producto = {
    idProducto: 101,
    nombre: "Google Pixel 8 Pro",
    descripcion: "Smartphone de gama alta.",
    idCategoria: 1,
    idMarca: 3,
    nombreCategoria: "Móviles",
    nombreMarca: "Google",
    imagen: "https://example.com/pixel8.jpg",
    precioReferencia: 3800000,
    estado: true,
  };

  const usuarioTest: UsuarioSesion = {
    id: "usr-123",
    nombre: "Carlos Usuario",
    usuario: "carlos",
    email: "carlos@example.com",
    rol: "Usuario registrado",
    idUsuario: 3,
    activo: true,
    fechaRegistro: "2026-10-01",
  };

  beforeEach(() => {
    mockCrearValoracion.mockReset();
    mockObtenerMiValoracion.mockReset();
    mockObtenerMiValoracion.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it("muestra mensaje para iniciar sesión cuando el usuario no está autenticado", () => {
    const handlePedirLogin = vi.fn();
    render(
      <FichaTecnicaModal
        producto={productoTest}
        onClose={vi.fn()}
        usuarioSesion={null}
        onPedirLogin={handlePedirLogin}
      />
    );

    expect(screen.getByText(/Inicia sesión para calificar este dispositivo con estrellas/i)).toBeDefined();
    const btnLogin = screen.getByRole("button", { name: /Identificarse para valorar/i });
    expect(btnLogin).toBeDefined();

    fireEvent.click(btnLogin);
    expect(handlePedirLogin).toHaveBeenCalledTimes(1);
  });

  it("muestra el selector de 5 estrellas con etiquetas accesibles cuando el usuario está autenticado", () => {
    render(
      <FichaTecnicaModal
        producto={productoTest}
        onClose={vi.fn()}
        usuarioSesion={usuarioTest}
      />
    );

    expect(screen.getByRole("group", { name: /Calificación de 1 a 5 estrellas/i })).toBeDefined();
    for (let i = 1; i <= 5; i++) {
      expect(
        screen.getByRole("button", {
          name: new RegExp(`Calificar con ${i} ${i === 1 ? "estrella" : "estrellas"}`, "i"),
        })
      ).toBeDefined();
    }

    const btnGuardar = screen.getByRole("button", { name: /Guardar valoración/i });
    expect(btnGuardar.hasAttribute("disabled")).toBe(true);
  });

  it("permite seleccionar una puntuación de 1 a 5 estrellas y actualiza el texto de selección", () => {
    render(
      <FichaTecnicaModal
        producto={productoTest}
        onClose={vi.fn()}
        usuarioSesion={usuarioTest}
      />
    );

    const btn4Estrellas = screen.getByRole("button", { name: /Calificar con 4 estrellas/i });
    fireEvent.click(btn4Estrellas);

    expect(screen.getByText(/Puntuación seleccionada: 4 de 5 estrellas/i)).toBeDefined();
    const btnGuardar = screen.getByRole("button", { name: /Guardar valoración/i });
    expect(btnGuardar.hasAttribute("disabled")).toBe(false);
  });

  it("envía la puntuación mediante la API, muestra confirmación y llama a onValoracionGuardada", async () => {
    const handleValoracionGuardada = vi.fn();
    mockCrearValoracion.mockResolvedValueOnce({
      idValoracion: 1,
      idProducto: 101,
      nombreProducto: "Google Pixel 8 Pro",
      idUsuario: 3,
      nombreUsuario: "Carlos Usuario",
      puntuacion: 5,
      fechaCreacion: "2026-10-20T12:00:00",
      estado: true,
    });

    render(
      <FichaTecnicaModal
        producto={productoTest}
        onClose={vi.fn()}
        usuarioSesion={usuarioTest}
        onValoracionGuardada={handleValoracionGuardada}
      />
    );

    // Seleccionar 5 estrellas
    const btn5 = screen.getByRole("button", { name: /Calificar con 5 estrellas/i });
    fireEvent.click(btn5);

    // Guardar
    const btnGuardar = screen.getByRole("button", { name: /Guardar valoración/i });
    fireEvent.click(btnGuardar);

    await waitFor(() => {
      expect(mockCrearValoracion).toHaveBeenCalledWith({
        idProducto: 101,
        puntuacion: 5,
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/¡Tu valoración de 5 estrellas ha sido guardada!/i)
      ).toBeDefined();
    });

    expect(handleValoracionGuardada).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/★ 5 \/ 5/i)).toBeDefined();
  });

  it("muestra estado de error si el servicio de la API falla", async () => {
    mockCrearValoracion.mockRejectedValueOnce(
      new Error("Fallo de conexión con el servicio de valoraciones.")
    );

    render(
      <FichaTecnicaModal
        producto={productoTest}
        onClose={vi.fn()}
        usuarioSesion={usuarioTest}
      />
    );

    const btn3 = screen.getByRole("button", { name: /Calificar con 3 estrellas/i });
    fireEvent.click(btn3);

    const btnGuardar = screen.getByRole("button", { name: /Guardar valoración/i });
    fireEvent.click(btnGuardar);

    await waitFor(() => {
      expect(
        screen.getByText(/Fallo de conexión con el servicio de valoraciones/i)
      ).toBeDefined();
    });
  });

  it("pre-carga la valoración previa del usuario si ya existe", async () => {
    mockObtenerMiValoracion.mockResolvedValueOnce({
      idValoracion: 9,
      idProducto: 101,
      nombreProducto: "Google Pixel 8 Pro",
      idUsuario: 3,
      nombreUsuario: "Carlos Usuario",
      puntuacion: 4,
      fechaCreacion: "2026-10-20T09:00:00",
      estado: true,
    });

    render(
      <FichaTecnicaModal
        producto={productoTest}
        onClose={vi.fn()}
        usuarioSesion={usuarioTest}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/★ 4 \/ 5/i)).toBeDefined();
      expect(screen.getByText(/Puntuación seleccionada: 4 de 5 estrellas/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /Actualizar valoración/i })).toBeDefined();
    });
  });
});
