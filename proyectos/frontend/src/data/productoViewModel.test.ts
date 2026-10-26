import { describe, expect, it } from "vitest";
import type { Producto } from "@/types/producto";
import {
  crearProductoViewModel,
  normalizarTexto,
} from "./productoViewModel";

const productoBase: Producto = {
  idProducto: 1,
  nombre: "Samsung Galaxy S24 Ultra",
  descripcion: "Smartphone tope de gama con cámara de 200 MP y conectividad 5G.",
  idCategoria: 1,
  idMarca: 1,
  nombreCategoria: "Móviles",
  nombreMarca: "Samsung",
  imagen: "https://example.com/s24.png",
  precioReferencia: 5_499_000,
  estado: true,
  caracteristicas: {
    pantalla: "6.8 pulgadas Dynamic AMOLED 2X",
    procesador: "Snapdragon 8 Gen 3",
    ram_almacenamiento: "12GB RAM + 256GB Almacenamiento",
    camaras: "200 MP + 12 MP + 10 MP",
    bateria: "5000 mAh",
  },
};

describe("crearProductoViewModel", () => {
  it("mapea identidad, categoría, marca y disponibilidad", () => {
    const vista = crearProductoViewModel(productoBase);

    expect(vista.idProducto).toBe(1);
    expect(vista.nombre).toBe("Samsung Galaxy S24 Ultra");
    expect(vista.marca).toBe("Samsung");
    expect(vista.categoria).toBe("moviles");
    expect(vista.categoriaEtiqueta).toBe("Móviles");
    expect(vista.imagen).toBe("https://example.com/s24.png");
    expect(vista.disponible).toBe(true);
  });

  it("normaliza el precio a COP y lo formatea", () => {
    const vista = crearProductoViewModel(productoBase);

    expect(vista.precioCOP).toBe(5_499_000);
    expect(vista.precioFormateado).toContain("5.499.000");
    expect(vista.precioFormateado).toContain("COP");

    const legado = crearProductoViewModel({
      ...productoBase,
      precioReferencia: 437.25,
    });
    expect(legado.precioCOP).toBe(1_749_000);

    const sinPrecio = crearProductoViewModel({
      ...productoBase,
      precioReferencia: null,
    });
    expect(sinPrecio.precioCOP).toBe(0);
    expect(sinPrecio.precioFormateado).toBe("Consultar disponibilidad");
  });

  it("marca como no disponible cuando estado es false", () => {
    const vista = crearProductoViewModel({ ...productoBase, estado: false });
    expect(vista.disponible).toBe(false);
  });

  it("extrae especificaciones clave sin inventar las ausentes", () => {
    const vista = crearProductoViewModel(productoBase);

    expect(vista.especificaciones.pantalla).toBe(
      "6.8 pulgadas Dynamic AMOLED 2X"
    );
    expect(vista.especificaciones.procesador).toBe("Snapdragon 8 Gen 3");
    expect(vista.especificaciones.ram).toBe("12GB RAM");
    expect(vista.especificaciones.almacenamiento).toBe("256GB Almacenamiento");
    expect(vista.especificaciones.camaras).toBe("200 MP + 12 MP + 10 MP");
    expect(vista.especificaciones.bateria).toBe("5000 mAh");

    const sinCaracteristicas = crearProductoViewModel({
      ...productoBase,
      caracteristicas: null,
    });
    expect(sinCaracteristicas.especificaciones).toEqual({
      pantalla: null,
      procesador: null,
      ram: null,
      almacenamiento: null,
      camaras: null,
      bateria: null,
    });
  });

  it("separa RAM y almacenamiento cuando vienen combinados", () => {
    const vista = crearProductoViewModel({
      ...productoBase,
      caracteristicas: {
        ram_almacenamiento: "8 GB RAM + 128 GB Almacenamiento",
      },
    });

    expect(vista.especificaciones.ram).toBe("8 GB RAM");
    expect(vista.especificaciones.almacenamiento).toBe(
      "128 GB Almacenamiento"
    );
  });

  it("acepta rating y cantidad de reseñas opcionales", () => {
    const sinRating = crearProductoViewModel(productoBase);
    expect(sinRating.rating).toBeNull();
    expect(sinRating.cantidadResenas).toBeNull();

    const conRating = crearProductoViewModel(productoBase, {
      rating: 4.8,
      cantidadResenas: 120,
    });
    expect(conRating.rating).toBe(4.8);
    expect(conRating.cantidadResenas).toBe(120);

    expect(
      crearProductoViewModel(productoBase, { rating: 5.5 }).rating
    ).toBe(5);
    expect(
      crearProductoViewModel(productoBase, { rating: -1 }).rating
    ).toBe(0);
    expect(
      crearProductoViewModel(productoBase, { rating: Number.NaN }).rating
    ).toBeNull();
    expect(
      crearProductoViewModel(productoBase, { cantidadResenas: -5 })
        .cantidadResenas
    ).toBeNull();
  });

  it("detecta 5G, buena cámara, alto rendimiento y gran batería", () => {
    const vista = crearProductoViewModel(productoBase);
    expect(vista.caracteristicas).toEqual(
      expect.arrayContaining([
        "5g",
        "buena-camara",
        "alto-rendimiento",
        "gran-bateria",
      ])
    );

    const basico = crearProductoViewModel({
      ...productoBase,
      nombre: "Samsung Galaxy A05",
      descripcion: "Smartphone básico para uso diario.",
      caracteristicas: {
        pantalla: "6.7 pulgadas",
        procesador: "Helio G85",
        ram: "4 GB",
        almacenamiento: "64 GB",
        camaras: "8 MP",
        bateria: "3000 mAh",
      },
    });

    expect(basico.caracteristicas).toEqual([]);
  });

  it("construye un texto de búsqueda sin acentos", () => {
    const vista = crearProductoViewModel(productoBase);

    expect(normalizarTexto("Móviles Cámara")).toBe("moviles camara");
    expect(vista.textoBusqueda).toContain("samsung");
    expect(vista.textoBusqueda).toContain("galaxy");
    expect(vista.textoBusqueda).toContain("moviles");
    expect(vista.textoBusqueda).toContain("snapdragon");
    expect(vista.textoBusqueda).toContain("5g");
    expect(vista.textoBusqueda).not.toContain("Móviles");
  });

  it("usa Marca #id cuando no hay nombre de marca", () => {
    const vista = crearProductoViewModel({
      ...productoBase,
      nombreMarca: undefined,
      idMarca: 7,
    });
    expect(vista.marca).toBe("Marca #7");

    const conOpcion = crearProductoViewModel(
      { ...productoBase, nombreMarca: undefined, idMarca: 7 },
      { nombreMarca: "Samsung" }
    );
    expect(conOpcion.marca).toBe("Samsung");
  });
});
