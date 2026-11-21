import { describe, expect, it } from "vitest";
import { normalizarDatosFichaTecnica } from "@/data/fichaTecnica";
import type { ProductoViewModel } from "./productoViewModel";
import {
  ORDENES_CATALOGO,
  analizarBusqueda,
  buscarAlternativas,
  coincideConBusqueda,
  coincideProductoConBusqueda,
  construirChips,
  filtrarProductos,
  hayFiltrosActivos,
  ordenarProductos,
  paginar,
  prepararCatalogo,
  type FiltrosCatalogo,
} from "./catalogo";
import { formatearCOP } from "./specsHelper";

function crearVista(
  overrides: Partial<ProductoViewModel> = {}
): ProductoViewModel {
  return {
    idProducto: 1,
    nombre: "Producto",
    marca: "Samsung",
    categoria: "moviles",
    categoriaEtiqueta: "Móviles",
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
    datosFichaTecnica:
      overrides.datosFichaTecnica ?? normalizarDatosFichaTecnica(null),
  };
}

const productos: ProductoViewModel[] = [
  crearVista({
    idProducto: 1,
    nombre: "Samsung Galaxy S24 Ultra",
    marca: "Samsung",
    categoria: "moviles",
    categoriaEtiqueta: "Móviles",
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
    categoriaEtiqueta: "Móviles",
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
    categoriaEtiqueta: "Laptops / PCs",
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
    categoriaEtiqueta: "Móviles",
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
      { valor: "moviles", etiqueta: "Móviles", cantidad: 3 },
      { valor: "laptops", etiqueta: "Laptops / PCs", cantidad: 1 },
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
  it("filtra por búsqueda sin acentos ni mayúsculas, por nombre o marca", () => {
    const resultado = filtrarProductos(productos, {
      ...filtrosVacios(),
      busqueda: "GÁLAXY",
    });

    expect(resultado.map((producto) => producto.idProducto)).toEqual([1, 6]);
    // Las especificaciones ya no cuentan: «cámara» no identifica un dispositivo.
    expect(filtrarProductos(productos, { ...filtrosVacios(), busqueda: "cámara" })).toEqual([]);
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

describe("ordenarProductos", () => {
  it("conserva el orden de relevancia", () => {
    const resultado = ordenarProductos(productos, "relevancia");

    expect(resultado.map((producto) => producto.idProducto)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("ordena por menor y mayor precio dejando los desconocidos al final", () => {
    expect(
      ordenarProductos(productos, "menor-precio").map(
        (producto) => producto.idProducto
      )
    ).toEqual([5, 3, 2, 1, 4, 6]);

    expect(
      ordenarProductos(productos, "mayor-precio").map(
        (producto) => producto.idProducto
      )
    ).toEqual([4, 1, 2, 3, 5, 6]);
  });

  it("ordena por mejor valorados y desempata por cantidad de reseñas", () => {
    const valorados = [
      crearVista({ idProducto: 11, rating: 4.5, cantidadResenas: 100 }),
      crearVista({ idProducto: 12, rating: 4.8, cantidadResenas: 10 }),
      crearVista({ idProducto: 13, rating: 4.8, cantidadResenas: 50 }),
      crearVista({ idProducto: 14, rating: null, cantidadResenas: 999 }),
      crearVista({ idProducto: 15, rating: 4.2, cantidadResenas: 200 }),
    ];

    expect(
      ordenarProductos(valorados, "mejor-valorados").map(
        (producto) => producto.idProducto
      )
    ).toEqual([13, 12, 11, 15, 14]);
  });

  it("no muta el arreglo original", () => {
    const copia = [...productos];
    const resultado = ordenarProductos(productos, "menor-precio");

    expect(resultado).not.toBe(productos);
    expect(productos).toEqual(copia);
  });
});

describe("ORDENES_CATALOGO", () => {
  it("expone las cuatro opciones con sus etiquetas", () => {
    expect(ORDENES_CATALOGO).toEqual([
      { valor: "relevancia", etiqueta: "Relevancia" },
      { valor: "menor-precio", etiqueta: "Menor precio" },
      { valor: "mayor-precio", etiqueta: "Mayor precio" },
      { valor: "mejor-valorados", etiqueta: "Mejor valorados" },
    ]);
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
        { tipo: "categoria", valor: "moviles", etiqueta: "Móviles" },
        { tipo: "marca", valor: "Apple", etiqueta: "Apple" },
        { tipo: "caracteristica", valor: "5g", etiqueta: "5G" },
      ])
    );

    const chipPrecio = chips.find((chip) => chip.tipo === "precio");
    expect(chipPrecio?.etiqueta).toContain("1.000.000");
    expect(chipPrecio?.etiqueta).toContain("4.000.000");
  });

  it("usa 'Desde' cuando solo hay un precio mínimo", () => {
    const chips = construirChips({
      ...filtrosVacios(),
      precioMin: 2_000_000,
    });
    const chipPrecio = chips.find((chip) => chip.tipo === "precio");

    expect(chipPrecio?.etiqueta).toBe(`Desde ${formatearCOP(2_000_000)}`);
  });

  it("usa 'Hasta' cuando solo hay un precio máximo", () => {
    const chips = construirChips({
      ...filtrosVacios(),
      precioMax: 4_000_000,
    });
    const chipPrecio = chips.find((chip) => chip.tipo === "precio");

    expect(chipPrecio?.etiqueta).toBe(`Hasta ${formatearCOP(4_000_000)}`);
  });
});

describe("hayFiltrosActivos", () => {
  it("detecta filtros activos y distingue un máximo finito del sentinela sin límite", () => {
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
    ).toBe(true);
  });

  it("un máximo superior al rango sigue excluyendo precios desconocidos y es un filtro activo", () => {
    const filtros = { ...filtrosVacios(), precioMax: 10000000 };
    expect(hayFiltrosActivos(filtros, { min: 1000000, max: 6000000 })).toBe(true);
  });
});

describe("coincideConBusqueda (Fase 4, H-12)", () => {
  const texto = "apple iphone 16 pro camara 48 mp 5g celulares";

  it("encuentra palabras en cualquier orden", () => {
    expect(coincideConBusqueda(texto, "pro iphone")).toBe(true);
    expect(coincideConBusqueda(texto, "  IPHONE   Pro ")).toBe(true);
  });

  it("encuentra la búsqueda escrita sin espacios", () => {
    expect(coincideConBusqueda(texto, "iphone16")).toBe(true);
    expect(coincideConBusqueda(texto, "iPhone16Pro")).toBe(true);
  });

  it("exige todas las palabras", () => {
    expect(coincideConBusqueda(texto, "iphone 18")).toBe(false);
    expect(coincideConBusqueda(texto, "galaxy pro")).toBe(false);
  });

  it("una búsqueda vacía coincide con todo", () => {
    expect(coincideConBusqueda(texto, "   ")).toBe(true);
  });

  it("filtrarProductos usa la coincidencia por palabras", () => {
    const resultado = filtrarProductos(productos, { ...filtrosVacios(), busqueda: "ultra galaxy" });
    expect(resultado.map((producto) => producto.idProducto)).toEqual([1]);
  });
});

describe("buscarAlternativas (Fase 4, H-12)", () => {
  it("sugiere productos registrados de la marca mencionada", () => {
    const alternativas = buscarAlternativas(productos, "iPhone 18 Apple");
    expect(alternativas.map((producto) => producto.idProducto)).toEqual([2, 4]);
  });

  it("sugiere productos que coinciden en alguna palabra significativa", () => {
    const alternativas = buscarAlternativas(productos, "galaxy z fold 7");
    expect(alternativas.map((producto) => producto.idProducto)).toEqual([1, 6]);
  });

  it("no sugiere nada si ninguna palabra coincide, ni por números sueltos", () => {
    expect(buscarAlternativas(productos, "nokia 3310")).toEqual([]);
    expect(buscarAlternativas(productos, "5")).toEqual([]);
  });

  it("respeta el máximo de alternativas", () => {
    expect(buscarAlternativas(productos, "samsung apple sony", 2)).toHaveLength(2);
  });
});

describe("búsqueda por identidad del dispositivo (corrección de buscadores)", () => {
  // Datos como los reales: el chip A18 y «pixel» aparecen en las especificaciones.
  const iphone = crearVista({
    idProducto: 20, nombre: "Apple iPhone 16 Pro", marca: "Apple", categoria: "moviles", categoriaEtiqueta: "Móviles",
    textoBusqueda: "apple iphone 16 pro chip a18 pro 18 w carga pixel density 460 ppi",
  });
  const tablet = crearVista({
    idProducto: 21, nombre: "Lenovo Tab M11", marca: "Lenovo", categoria: "tablets", categoriaEtiqueta: "Tablets",
    textoBusqueda: "lenovo tab m11 1920 x 1200 pixel 90 hz 9 horas",
  });
  const macbook = crearVista({
    idProducto: 22, nombre: "Apple MacBook Air 13 M3", marca: "Apple", categoria: "laptops", categoriaEtiqueta: "Laptops / PCs",
    textoBusqueda: "apple macbook air 13 m3 jack para audifonos",
  });
  const sony = crearVista({
    idProducto: 23, nombre: "Sony WH-1000XM5", marca: "Sony", categoria: "auriculares", categoriaEtiqueta: "Auriculares",
    textoBusqueda: "sony wh-1000xm5 auriculares",
  });
  const catalogo = [iphone, tablet, macbook, sony];
  const buscar = (busqueda: string) =>
    filtrarProductos(catalogo, { ...filtrosVacios(), busqueda }).map((producto) => producto.idProducto);

  it("no confunde números ni palabras de las especificaciones con el nombre", () => {
    expect(buscar("iphone 18")).toEqual([]);
    expect(buscar("pixel 9")).toEqual([]);
    expect(buscar("iphone 16")).toEqual([20]);
    expect(buscar("iphone16pro")).toEqual([20]);
  });

  it("no usa la descripción ni las especificaciones para palabras genéricas", () => {
    expect(buscar("audífonos")).toEqual([]);
    expect(buscar("teléfono")).toEqual([]);
  });

  it("usa la palabra genérica para limitar la categoría cuando hay otras palabras", () => {
    expect(buscar("audífonos sony")).toEqual([23]);
    expect(buscar("celular apple")).toEqual([20]);
    expect(buscar("portátil apple")).toEqual([22]);
  });

  it("distingue los modelos con «+» de los que no lo tienen", () => {
    const plus = crearVista({ idProducto: 30, nombre: "Samsung Galaxy Tab S10+", marca: "Samsung", categoria: "tablets", categoriaEtiqueta: "Tablets" });
    const ultra = crearVista({ idProducto: 31, nombre: "Samsung Galaxy Tab S10 Ultra", marca: "Samsung", categoria: "tablets", categoriaEtiqueta: "Tablets" });
    const buscarEn = (busqueda: string) =>
      filtrarProductos([plus, ultra], { ...filtrosVacios(), busqueda }).map((producto) => producto.idProducto);

    expect(buscarEn("Samsung Galaxy Tab S10+")).toEqual([30]);
    expect(buscarEn("tab s10")).toEqual([30, 31]);
    expect(buscarEn("s10 ultra")).toEqual([31]);
  });

  it("detecta las búsquedas que solo tienen palabras genéricas", () => {
    expect(analizarBusqueda("Teléfono").generica).toBe(true);
    expect(analizarBusqueda("audifonos").generica).toBe(true);
    expect(analizarBusqueda("un celular").generica).toBe(true);
    expect(analizarBusqueda("celular apple").generica).toBe(false);
    expect(analizarBusqueda("celular apple").categoria).toBe("moviles");
    expect(analizarBusqueda("iphone 16").generica).toBe(false);
    expect(analizarBusqueda("   ").vacia).toBe(true);
  });

  it("coincideProductoConBusqueda respeta la categoría de la palabra genérica", () => {
    expect(coincideProductoConBusqueda(macbook, "apple")).toBe(true);
    expect(coincideProductoConBusqueda(macbook, "celular apple")).toBe(false);
  });
});

