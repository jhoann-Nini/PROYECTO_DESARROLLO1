import { describe, expect, it } from "vitest";
import type { ProductoViewModel } from "./productoViewModel";
import {
  construirChips,
  filtrarProductos,
  hayFiltrosActivos,
  paginar,
  prepararCatalogo,
  type FiltrosCatalogo,
} from "./catalogo";

function crearVista(
  overrides: Partial<ProductoViewModel> = {}
): ProductoViewModel {
  return {
    idProducto: 1,
    nombre: "Producto",
    marca: "Samsung",
    categoria: "moviles",
    categoriaEtiqueta: "Celulares",
    imagen: null,
    precioCOP: 1_000_000,
    precioFormateado: "$ 1.000.000 COP",
    disponible: true,
    rating: null,
    cantidadResenas: null,
    especificaciones: {
      pantalla: null,
      procesador: null,
      ram: null,
      almacenamiento: null,
      camaras: null,
      bateria: null,
    },
    caracteristicas: [],
    textoBusqueda: "producto samsung celulares",
    ...overrides,
  };
}

const productos: ProductoViewModel[] = [
  crearVista({
    idProducto: 1,
    nombre: "Samsung Galaxy S24 Ultra",
    marca: "Samsung",
    categoria: "moviles",
    categoriaEtiqueta: "Celulares",
    precioCOP: 5_000_000,
    caracteristicas: [
      "5g",
      "buena-camara",
      "alto-rendimiento",
      "gran-bateria",
    ],
    textoBusqueda:
      "samsung galaxy s24 ultra camara 200 mp 5g celulares snapdragon 8",
  }),
  crearVista({
    idProducto: 2,
    nombre: "iPhone 15",
    marca: "Apple",
    categoria: "moviles",
    categoriaEtiqueta: "Celulares",
    precioCOP: 4_000_000,
    caracteristicas: ["5g", "buena-camara", "alto-rendimiento"],
    textoBusqueda: "apple iphone 15 camara 48 mp 5g celulares",
  }),
  crearVista({
    idProducto: 3,
    nombre: "Xiaomi Pad 6",
    marca: "Xiaomi",
    categoria: "tablets",
    categoriaEtiqueta: "Tablets",
    precioCOP: 1_500_000,
    caracteristicas: ["alto-rendimiento"],
    textoBusqueda: "xiaomi pad 6 tablets snapdragon",
  }),
  crearVista({
    idProducto: 4,
    nombre: "MacBook Air M3",
    marca: "Apple",
    categoria: "laptops",
    categoriaEtiqueta: "Laptops y PC",
    precioCOP: 6_000_000,
    caracteristicas: ["alto-rendimiento", "gran-bateria"],
    textoBusqueda: "apple macbook air m3 laptops y pc",
  }),
  crearVista({
    idProducto: 5,
    nombre: "Sony WH-1000XM5",
    marca: "Sony",
    categoria: "auriculares",
    categoriaEtiqueta: "Auriculares",
    precioCOP: 1_000_000,
    caracteristicas: ["gran-bateria"],
    textoBusqueda: "sony wh-1000xm5 auriculares",
  }),
  crearVista({
    idProducto: 6,
    nombre: "Samsung Galaxy A05",
    marca: "Samsung",
    categoria: "moviles",
    categoriaEtiqueta: "Celulares",
    precioCOP: 0,
    precioFormateado: "Consultar disponibilidad",
    caracteristicas: [],
    textoBusqueda: "samsung galaxy a05 celulares economico",
  }),
];

function filtrosVacios(): FiltrosCatalogo {
  return {
    busqueda: "",
    categorias: [],
    marcas: [],
    precioMin: 0,
    precioMax: Number.MAX_SAFE_INTEGER,
    caracteristicas: [],
  };
}

describe("prepararCatalogo", () => {
  it("cuenta categorías, marcas y características", () => {
    const catalogo = prepararCatalogo(productos);

    expect(catalogo.categorias).toEqual([
      { valor: "moviles", etiqueta: "Celulares", cantidad: 3 },
      { valor: "laptops", etiqueta: "Laptops y PC", cantidad: 1 },
      { valor: "tablets", etiqueta: "Tablets", cantidad: 1 },
      { valor: "auriculares", etiqueta: "Auriculares", cantidad: 1 },
    ]);

    expect(catalogo.marcas).toEqual([
      { nombre: "Apple", cantidad: 2 },
      { nombre: "Samsung", cantidad: 2 },
      { nombre: "Sony", cantidad: 1 },
      { nombre: "Xiaomi", cantidad: 1 },
    ]);

    expect(catalogo.caracteristicas).toEqual([
      { valor: "5g", etiqueta: "5G", cantidad: 2 },
      { valor: "buena-camara", etiqueta: "Buena cámara", cantidad: 2 },
      {
        valor: "alto-rendimiento",
        etiqueta: "Alto rendimiento",
        cantidad: 4,
      },
      { valor: "gran-bateria", etiqueta: "Gran batería", cantidad: 3 },
    ]);
  });

  it("calcula el rango de precios ignorando precios desconocidos", () => {
    const catalogo = prepararCatalogo(productos);
    expect(catalogo.rangoPrecio).toEqual({ min: 1_000_000, max: 6_000_000 });
  });
});

describe("filtrarProductos", () => {
  it("filtra por búsqueda sin acentos ni mayúsculas", () => {
    const resultado = filtrarProductos(productos, {
      ...filtrosVacios(),
      busqueda: "CÁMARA",
    });

    expect(resultado.map((producto) => producto.idProducto)).toEqual([1, 2]);
  });

  it("filtra por categoría y marca", () => {
    const soloMoviles = filtrarProductos(productos, {
      ...filtrosVacios(),
      categorias: ["moviles"],
    });
    expect(soloMoviles).toHaveLength(3);

    const soloApple = filtrarProductos(productos, {
      ...filtrosVacios(),
      marcas: ["Apple"],
    });
    expect(soloApple.map((producto) => producto.idProducto)).toEqual([2, 4]);

    const appleMoviles = filtrarProductos(productos, {
      ...filtrosVacios(),
      categorias: ["moviles"],
      marcas: ["Apple"],
    });
    expect(appleMoviles.map((producto) => producto.idProducto)).toEqual([2]);
  });

  it("filtra por rango de precio inclusivo", () => {
    const resultado = filtrarProductos(productos, {
      ...filtrosVacios(),
      precioMin: 1_500_000,
      precioMax: 4_000_000,
    });

    expect(resultado.map((producto) => producto.idProducto)).toEqual([2, 3]);
  });

  it("excluye precios desconocidos cuando hay filtro de precio", () => {
    const resultado = filtrarProductos(productos, {
      ...filtrosVacios(),
      precioMin: 1,
      precioMax: 10_000_000,
    });

    expect(resultado.map((producto) => producto.idProducto)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("filtra por características clave con AND", () => {
    const resultado = filtrarProductos(productos, {
      ...filtrosVacios(),
      caracteristicas: ["5g", "gran-bateria"],
    });

    expect(resultado.map((producto) => producto.idProducto)).toEqual([1]);
  });

  it("combina búsqueda, categoría, marca, precio y características", () => {
    const resultado = filtrarProductos(productos, {
      busqueda: "samsung",
      categorias: ["moviles"],
      marcas: ["Samsung"],
      precioMin: 4_000_000,
      precioMax: 6_000_000,
      caracteristicas: ["5g", "buena-camara"],
    });

    expect(resultado.map((producto) => producto.idProducto)).toEqual([1]);
  });
});

describe("paginar", () => {
  it("pagina y limita la página al rango válido", () => {
    expect(paginar(productos, 1, 2)).toMatchObject({
      pagina: 1,
      totalPaginas: 3,
      total: 6,
    });
    expect(paginar(productos, 1, 2).items).toHaveLength(2);
    expect(paginar(productos, 3, 2).items).toHaveLength(2);
    expect(paginar(productos, 99, 2).pagina).toBe(3);
    expect(paginar(productos, 0, 2).pagina).toBe(1);
    expect(paginar([], 1, 2)).toEqual({
      items: [],
      pagina: 1,
      totalPaginas: 1,
      total: 0,
    });
  });
});

describe("construirChips", () => {
  it("construye chips legibles para filtros activos", () => {
    const chips = construirChips({
      busqueda: "iphone",
      categorias: ["moviles"],
      marcas: ["Apple"],
      precioMin: 1_000_000,
      precioMax: 4_000_000,
      caracteristicas: ["5g"],
    });

    expect(chips).toEqual(
      expect.arrayContaining([
        { tipo: "busqueda", valor: "iphone", etiqueta: "Búsqueda: iphone" },
        { tipo: "categoria", valor: "moviles", etiqueta: "Celulares" },
        { tipo: "marca", valor: "Apple", etiqueta: "Apple" },
        { tipo: "caracteristica", valor: "5g", etiqueta: "5G" },
      ])
    );

    const chipPrecio = chips.find((chip) => chip.tipo === "precio");
    expect(chipPrecio?.etiqueta).toContain("1.000.000");
    expect(chipPrecio?.etiqueta).toContain("4.000.000");
  });
});

describe("hayFiltrosActivos", () => {
  it("detecta si hay filtros activos comparando con el rango completo", () => {
    const rango = { min: 1_000_000, max: 6_000_000 };

    expect(hayFiltrosActivos(filtrosVacios(), rango)).toBe(false);
    expect(
      hayFiltrosActivos({ ...filtrosVacios(), busqueda: "iphone" }, rango)
    ).toBe(true);
    expect(
      hayFiltrosActivos({ ...filtrosVacios(), precioMin: 2_000_000 }, rango)
    ).toBe(true);
    expect(
      hayFiltrosActivos(
        {
          ...filtrosVacios(),
          precioMin: 1_000_000,
          precioMax: 6_000_000,
        },
        rango
      )
    ).toBe(false);
  });
});
