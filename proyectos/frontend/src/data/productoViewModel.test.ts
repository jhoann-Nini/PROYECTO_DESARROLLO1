import { describe, expect, it } from "vitest";
import type { DispositivoKimovil, Producto } from "@/types/producto";
import { FICHA_V3_NOTHING_PHONE_2A } from "./fichasTecnicasV3Piloto";
import {
  adaptarAProductoViewModel,
  convertirKimovilAViewModel,
  convertirProductoAViewModel,
  crearProductoViewModel,
  idApiDeViewModel,
  idGlobalDeViewModel,
  normalizarTexto,
  type ProductoViewModel,
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

    const precioBajo = crearProductoViewModel({
      ...productoBase,
      precioReferencia: 437.25,
    });
    expect(precioBajo.precioCOP).toBe(437);

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

  it("extrae las tiendas y el precio mínimo desde las características", () => {
    const vista = crearProductoViewModel({
      ...productoBase,
      caracteristicas: {
        ...productoBase.caracteristicas,
        tiendas: [
          { nombre: "Tienda A", precio: 4_800_000, envioGratis: true },
          { nombre: "Tienda B", precio: 4_500_000, envioGratis: false },
          { nombre: "Tienda inválida", precio: "sin precio" },
        ],
      },
    });

    expect(vista.numeroTiendas).toBe(2);
    expect(vista.precioDesdeCOP).toBe(4_500_000);
  });

  it("deja las tiendas vacías cuando no hay datos válidos", () => {
    const vista = crearProductoViewModel(productoBase);

    expect(vista.numeroTiendas).toBe(0);
    expect(vista.precioDesdeCOP).toBeNull();
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

  it("asigna idGlobal canónico api:<id> y fichaTecnicaV2 normalizada", () => {
    const vista = crearProductoViewModel(productoBase);

    expect(vista.idGlobal).toBe("api:1");
    expect(vista.origen).toBe("api");
    expect(vista.idApi).toBe(1);
    expect(vista.claveMock).toBeNull();
    expect(vista.fichaTecnicaV2).toBeDefined();
    expect(vista.fichaTecnicaV2?.version_esquema).toBe(2);
    expect(vista.fichaTecnicaV2?.categoria).toBe("moviles");
  });
});

describe("convertirProductoAViewModel", () => {
  it("actúa como alias tipado de crearProductoViewModel", () => {
    const vista = convertirProductoAViewModel(productoBase);
    expect(vista.idProducto).toBe(1);
    expect(vista.idGlobal).toBe("api:1");
    expect(vista.origen).toBe("api");
    expect(vista.idApi).toBe(1);
  });
});

describe("convertirKimovilAViewModel", () => {
  const mockKimovil: DispositivoKimovil = {
    id: 15,
    ranking: 3,
    nombre: "OnePlus 12",
    marca: "OnePlus",
    especificaciones: "6.82 pulgadas AMOLED, Snapdragon 8 Gen 3, 16GB RAM, 5400 mAh",
    puntuacion: 9.3,
    precio: 3_800_000,
    tendencia: "igual",
    cambioRanking: 0,
    imagen: "https://example.com/oneplus12.png",
    tipo: "vendido",
    categoria: "moviles",
    chipInfo: "Snapdragon 8 Gen 3",
  };

  it("asigna idGlobal mock:<clave>, idApi null, y no colisiona con IDs de base de datos", () => {
    const vista = convertirKimovilAViewModel(mockKimovil);

    expect(vista.idGlobal).toBe("mock:15");
    expect(vista.origen).toBe("ranking");
    expect(vista.idApi).toBeNull();
    expect(vista.claveMock).toBe("15");
    expect(vista.idProducto).toBe(-15); // Diferenciado de IDs positivos de BD
    expect(vista.nombre).toBe("OnePlus 12");
    expect(vista.marca).toBe("OnePlus");
    expect(vista.categoria).toBe("moviles");
    expect(vista.posicionRanking).toBe(3);
    expect(vista.rating).toBeCloseTo(4.65, 2); // 9.3 / 2
    expect(vista.fichaTecnicaV2).toBeDefined();
    expect(vista.fichaTecnicaV2?.version_esquema).toBe(2);
  });

  it("mantiene origen mock cuando no tiene ranking", () => {
    const sinRanking: DispositivoKimovil = {
      ...mockKimovil,
      ranking: 0,
    };
    const vista = convertirKimovilAViewModel(sinRanking);
    expect(vista.origen).toBe("mock");
  });

  it("no inyecta fichas V3 piloto en dispositivos Kimovil que coincidan con nombres de piloto", () => {
    const dispositivoCoincidente: DispositivoKimovil = {
      ...mockKimovil,
      id: 202,
      nombre: "Samsung Galaxy S24 Ultra",
    };
    const vista = convertirKimovilAViewModel(dispositivoCoincidente);
    expect(vista.fichaTecnica?.version).toBe("legacy");
    expect(vista.fichaTecnica?.version).not.toBe("v3");
  });
});

describe("adaptarAProductoViewModel", () => {
  it("adapta un Producto de backend", () => {
    const vista = adaptarAProductoViewModel(productoBase);
    expect(vista).not.toBeNull();
    expect(vista?.idGlobal).toBe("api:1");
    expect(vista?.idApi).toBe(1);
    expect(vista?.origen).toBe("api");
  });

  it("adapta un DispositivoKimovil", () => {
    const kimovil: DispositivoKimovil = {
      id: 20,
      ranking: 5,
      nombre: "Galaxy Tab S9",
      marca: "Samsung",
      especificaciones: "11 pulgadas AMOLED, Snapdragon 8 Gen 2, 8400 mAh",
      puntuacion: 9.0,
      precio: 3_200_000,
      tendencia: "sube",
      cambioRanking: 1,
      imagen: "",
      tipo: "deseado",
      categoria: "tablets",
    };

    const vista = adaptarAProductoViewModel(kimovil);
    expect(vista).not.toBeNull();
    expect(vista?.idGlobal).toBe("mock:20");
    expect(vista?.idApi).toBeNull();
    expect(vista?.categoria).toBe("tablets");
  });

  it("devuelve null ante objetos desconocidos o nulos", () => {
    expect(adaptarAProductoViewModel(null)).toBeNull();
    expect(adaptarAProductoViewModel({})).toBeNull();
    expect(adaptarAProductoViewModel("cadena")).toBeNull();
  });
});

describe("idGlobalDeViewModel e idApiDeViewModel", () => {
  it("extrae idGlobal e idApi de forma segura", () => {
    const vistaApi = crearProductoViewModel(productoBase);
    expect(idGlobalDeViewModel(vistaApi)).toBe("api:1");
    expect(idApiDeViewModel(vistaApi)).toBe(1);

    const vistaMock = convertirKimovilAViewModel({
      id: 8,
      ranking: 2,
      nombre: "Mock Phone",
      marca: "MockBrand",
      especificaciones: "Specs",
      puntuacion: 8,
      precio: 1_000_000,
      tendencia: "igual",
      cambioRanking: 0,
      imagen: "",
      tipo: "oferta",
    });

    expect(idGlobalDeViewModel(vistaMock)).toBe("mock:8");
    expect(idApiDeViewModel(vistaMock)).toBeNull();
  });

  describe("validación estricta de identificadores inválidos, decimales o no seguros", () => {
    it("convertirKimovilAViewModel con id <= 0 genera identificadores mock seguros e idApi null", () => {
      const kimovilIdCero = convertirKimovilAViewModel({
        id: 0,
        ranking: 0,
        nombre: "Dispositivo Con Cero",
        marca: "Marca",
        especificaciones: "Specs",
        puntuacion: 8,
        precio: 1_000_000,
        tendencia: "igual",
        cambioRanking: 0,
        imagen: "",
        tipo: "oferta",
      });

      expect(kimovilIdCero.idProducto).toBeLessThan(0);
      expect(Number.isSafeInteger(kimovilIdCero.idProducto)).toBe(true);
      expect(kimovilIdCero.idApi).toBeNull();
      expect(kimovilIdCero.idGlobal).toBeDefined();
      expect(kimovilIdCero.idGlobal?.startsWith("mock:")).toBe(true);
      expect(kimovilIdCero.idGlobal).not.toBe("mock:0");
      expect(kimovilIdCero.claveMock).not.toBe("0");
      expect(idApiDeViewModel(kimovilIdCero)).toBeNull();

      const kimovilIdNegativo = convertirKimovilAViewModel({
        id: -5,
        ranking: 0,
        nombre: "Dispositivo Negativo",
        marca: "Marca",
        especificaciones: "Specs",
        puntuacion: 8,
        precio: 1_000_000,
        tendencia: "igual",
        cambioRanking: 0,
        imagen: "",
        tipo: "oferta",
      });

      expect(kimovilIdNegativo.idProducto).toBeLessThan(0);
      expect(Number.isSafeInteger(kimovilIdNegativo.idProducto)).toBe(true);
      expect(kimovilIdNegativo.idApi).toBeNull();
      expect(kimovilIdNegativo.idGlobal?.startsWith("mock:")).toBe(true);
      expect(kimovilIdNegativo.idGlobal).not.toBe("mock:-5");
      expect(idApiDeViewModel(kimovilIdNegativo)).toBeNull();
    });

    it("convertirKimovilAViewModel con ID decimal se sanea y no se trata como entero seguro", () => {
      const kimovilDecimal = convertirKimovilAViewModel({
        id: 15.75,
        ranking: 0,
        nombre: "Dispositivo Decimal",
        marca: "Marca",
        especificaciones: "Specs",
        puntuacion: 8,
        precio: 1_000_000,
        tendencia: "igual",
        cambioRanking: 0,
        imagen: "",
        tipo: "oferta",
      });

      expect(kimovilDecimal.idProducto).toBeLessThan(0);
      expect(Number.isSafeInteger(kimovilDecimal.idProducto)).toBe(true);
      expect(kimovilDecimal.idApi).toBeNull();
      expect(kimovilDecimal.idGlobal?.startsWith("mock:")).toBe(true);
      expect(idApiDeViewModel(kimovilDecimal)).toBeNull();
    });

    it("convertirKimovilAViewModel con ID no seguro se sanea de forma controlada", () => {
      const kimovilInseguro = convertirKimovilAViewModel({
        id: Number.MAX_SAFE_INTEGER + 100,
        ranking: 0,
        nombre: "Dispositivo Desbordado",
        marca: "Marca",
        especificaciones: "Specs",
        puntuacion: 8,
        precio: 1_000_000,
        tendencia: "igual",
        cambioRanking: 0,
        imagen: "",
        tipo: "oferta",
      });

      expect(kimovilInseguro.idProducto).toBeLessThan(0);
      expect(Number.isSafeInteger(kimovilInseguro.idProducto)).toBe(true);
      expect(kimovilInseguro.idApi).toBeNull();
      expect(kimovilInseguro.idGlobal?.startsWith("mock:")).toBe(true);
      expect(idApiDeViewModel(kimovilInseguro)).toBeNull();
    });

    it("crearProductoViewModel con idProducto <= 0 asigna idApi null y no genera idGlobal api inválido", () => {
      const productoCero = crearProductoViewModel({
        ...productoBase,
        idProducto: 0,
      });

      expect(productoCero.idProducto).toBe(0);
      expect(productoCero.idApi).toBeNull();
      expect(productoCero.idGlobal).toBeUndefined();
      expect(idApiDeViewModel(productoCero)).toBeNull();

      const productoNegativo = crearProductoViewModel({
        ...productoBase,
        idProducto: -10,
      });

      expect(productoNegativo.idProducto).toBe(-10);
      expect(productoNegativo.idApi).toBeNull();
      expect(productoNegativo.idGlobal).toBeUndefined();
      expect(idApiDeViewModel(productoNegativo)).toBeNull();
    });

    it("crearProductoViewModel con idProducto decimal o no seguro no genera idApi ni idGlobal api", () => {
      const productoDecimal = crearProductoViewModel({
        ...productoBase,
        idProducto: 3.1416,
      });

      expect(productoDecimal.idApi).toBeNull();
      expect(productoDecimal.idGlobal).toBeUndefined();
      expect(idApiDeViewModel(productoDecimal)).toBeNull();

      const productoInseguro = crearProductoViewModel({
        ...productoBase,
        idProducto: Number.MAX_SAFE_INTEGER + 50,
      });

      expect(productoInseguro.idApi).toBeNull();
      expect(productoInseguro.idGlobal).toBeUndefined();
      expect(idApiDeViewModel(productoInseguro)).toBeNull();
    });

    it("idApiDeViewModel retorna el número exclusivamente para productos legítimos de API", () => {
      const productoApi = crearProductoViewModel({
        ...productoBase,
        idProducto: 42,
      });
      expect(idApiDeViewModel(productoApi)).toBe(42);

      const mockRanking = convertirKimovilAViewModel({
        id: 42,
        ranking: 1,
        nombre: "Ranking Phone",
        marca: "Marca",
        especificaciones: "Specs",
        puntuacion: 9,
        precio: 1_000_000,
        tendencia: "igual",
        cambioRanking: 0,
        imagen: "",
        tipo: "vendido",
      });
      expect(idApiDeViewModel(mockRanking)).toBeNull();

      expect(idApiDeViewModel(null as unknown as ProductoViewModel)).toBeNull();
      expect(idApiDeViewModel({} as ProductoViewModel)).toBeNull();
    });
  });

  describe("HA-05: Prevención de colisiones en identificadores mock", () => {
    it("asigna idGlobal e idProducto diferentes a dispositivos distintos sin ID numérico válido", () => {
      const mockA = convertirKimovilAViewModel({
        id: 0,
        ranking: 0,
        nombre: "Teléfono Alfa",
        marca: "Marca A",
        especificaciones: "6.5 pulgadas, 5000 mAh",
        puntuacion: 8,
        precio: 1_200_000,
        tendencia: "igual",
        cambioRanking: 0,
        imagen: "",
        tipo: "oferta",
      });

      const mockB = convertirKimovilAViewModel({
        id: 0,
        ranking: 0,
        nombre: "Teléfono Beta",
        marca: "Marca B",
        especificaciones: "6.7 pulgadas, 4500 mAh",
        puntuacion: 8.5,
        precio: 1_800_000,
        tendencia: "igual",
        cambioRanking: 0,
        imagen: "",
        tipo: "oferta",
      });

      expect(mockA.idGlobal).toBeDefined();
      expect(mockB.idGlobal).toBeDefined();
      expect(mockA.idGlobal).not.toBe(mockB.idGlobal);
      expect(mockA.idProducto).not.toBe(mockB.idProducto);
      expect(mockA.idProducto).toBeLessThan(0);
      expect(mockB.idProducto).toBeLessThan(0);
    });

    it("asigna idGlobal e idProducto diferentes a dispositivos con nombre idéntico pero contenido distinto", () => {
      const mock1 = convertirKimovilAViewModel({
        id: 0,
        ranking: 0,
        nombre: "Galaxy Especial",
        marca: "Samsung",
        especificaciones: "128 GB Almacenamiento",
        puntuacion: 8,
        precio: 1_500_000,
        tendencia: "igual",
        cambioRanking: 0,
        imagen: "",
        tipo: "oferta",
      });

      const mock2 = convertirKimovilAViewModel({
        id: 0,
        ranking: 0,
        nombre: "Galaxy Especial",
        marca: "Genérica",
        especificaciones: "256 GB Almacenamiento",
        puntuacion: 7,
        precio: 900_000,
        tendencia: "igual",
        cambioRanking: 0,
        imagen: "",
        tipo: "oferta",
      });

      expect(mock1.idGlobal).not.toBe(mock2.idGlobal);
      expect(mock1.idProducto).not.toBe(mock2.idProducto);
    });

    it("asigna idGlobal diferente a dispositivos con nombres vacíos pero contenido distinto (sin recurrir al fallback fijo)", () => {
      const mockVacio1 = convertirKimovilAViewModel({
        id: 0,
        ranking: 0,
        nombre: "",
        marca: "Sony",
        especificaciones: "Auriculares ANC",
        puntuacion: 8,
        precio: 500_000,
        tendencia: "igual",
        cambioRanking: 0,
        imagen: "",
        tipo: "oferta",
      });

      const mockVacio2 = convertirKimovilAViewModel({
        id: 0,
        ranking: 0,
        nombre: "",
        marca: "Bose",
        especificaciones: "Auriculares Deportivos",
        puntuacion: 8.5,
        precio: 700_000,
        tendencia: "igual",
        cambioRanking: 0,
        imagen: "",
        tipo: "oferta",
      });

      expect(mockVacio1.idGlobal).toBeDefined();
      expect(mockVacio2.idGlobal).toBeDefined();
      expect(mockVacio1.idGlobal).not.toBe(mockVacio2.idGlobal);
      expect(mockVacio1.idGlobal).not.toBe("mock:kimovil-item");
      expect(mockVacio2.idGlobal).not.toBe("mock:kimovil-item");
      expect(mockVacio1.idProducto).not.toBe(mockVacio2.idProducto);
    });

    it("es estrictamente determinista: el mismo dispositivo genera exactamente el mismo idGlobal e idProducto en ejecuciones sucesivas", () => {
      const dispositivo = {
        id: 0,
        ranking: 0,
        nombre: "Dispositivo Determinista",
        marca: "Marca Fija",
        especificaciones: "Specs fijas",
        puntuacion: 8,
        precio: 1_000_000,
        tendencia: "igual" as const,
        cambioRanking: 0,
        imagen: "",
        tipo: "oferta" as const,
      };

      const res1 = convertirKimovilAViewModel(dispositivo);
      const res2 = convertirKimovilAViewModel(dispositivo);

      expect(res1.idGlobal).toBe(res2.idGlobal);
      expect(res1.claveMock).toBe(res2.claveMock);
      expect(res1.idProducto).toBe(res2.idProducto);
    });
  });

  describe("Desacoplamiento V3 de productos API", () => {
    it("no asigna ficha V3 a productos API sin caracteristicas aunque coincida el nombre o ID con el piloto", () => {
      const productoSinFicha: Producto = {
        idProducto: 1,
        nombre: "Nothing Phone (2a)",
        descripcion: "Smartphone sin ficha técnica cargada",
        idCategoria: 1,
        idMarca: 1,
        nombreCategoria: "Móviles",
        nombreMarca: "Nothing",
        imagen: null,
        precioReferencia: 1_800_000,
        estado: true,
        caracteristicas: null,
      };

      const vista = crearProductoViewModel(productoSinFicha);
      expect(vista.fichaTecnica?.version).not.toBe("v3");
      expect(vista.fichaTecnica?.version).toBe("legacy");
    });

    it("asigna ficha V3 válida exclusivamente si viene en producto.caracteristicas desde el backend", () => {
      const productoConV3: Producto = {
        idProducto: 99,
        nombre: "Nuevo Móvil V3",
        descripcion: "Móvil con ficha V3",
        idCategoria: 1,
        idMarca: 1,
        nombreCategoria: "Móviles",
        nombreMarca: "Marca V3",
        imagen: null,
        precioReferencia: 2_000_000,
        estado: true,
        caracteristicas: FICHA_V3_NOTHING_PHONE_2A as unknown as Record<string, unknown>,
      };

      const vista = crearProductoViewModel(productoConV3);
      expect(vista.fichaTecnica?.version).toBe("v3");
      expect(vista.fichaTecnica?.estado).toBe("valida");
      const ficha = vista.fichaTecnica;
      if (ficha && ficha.version === "v3" && ficha.estado === "valida") {
        expect(ficha.ficha.especificaciones.length).toBeGreaterThan(0);
      }
    });

    it("marca como invalida si las caracteristicas declaran version_esquema: 3 pero no cumplen el contrato", () => {
      const productoConV3Invalido: Producto = {
        idProducto: 100,
        nombre: "Móvil V3 Incompleto",
        descripcion: "Ficha incompleta",
        idCategoria: 1,
        idMarca: 1,
        nombreCategoria: "Móviles",
        nombreMarca: "Marca",
        imagen: null,
        precioReferencia: 1_000_000,
        estado: true,
        caracteristicas: {
          version_esquema: 3,
          categoria: "celulares",
          // faltan especificaciones, variantes, etc.
        },
      };

      const vista = crearProductoViewModel(productoConV3Invalido);
      expect(vista.fichaTecnica?.version).toBe("v3");
      expect(vista.fichaTecnica?.estado).toBe("invalida");
    });
  });
});
