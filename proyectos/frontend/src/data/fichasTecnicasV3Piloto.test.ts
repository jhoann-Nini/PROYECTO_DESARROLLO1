import { describe, it, expect } from "vitest";
import {
  validarTodasLasFichasV3Piloto,
  obtenerFichaTecnicaV3Piloto,
  obtenerImagenCandidataV3Piloto,
  IMAGENES_CANDIDATAS_V3_PILOTO,
} from "./fichasTecnicasV3Piloto";
import {
  PRODUCTOS_MOCK,
  DISPOSITIVOS_DESEADOS,
  DISPOSITIVOS_VENDIDOS,
  ULTIMAS_OFERTAS,
} from "./mockProductos";
import {
  crearProductoViewModel,
  convertirKimovilAViewModel,
} from "./productoViewModel";
import { construirFilasComparacion } from "./comparador";

describe("Fichas Técnicas V3 Piloto", () => {
  it("las 8 fichas piloto superan la validación estricta del contrato DatosFichaTecnicaV3", () => {
    const resultados = validarTodasLasFichasV3Piloto();
    const claves = Object.keys(resultados);
    expect(claves).toHaveLength(8);

    for (const clave of claves) {
      const res = resultados[clave];
      if (!res.valido) {
        console.error(`Errores de validación en ${clave}:`, res.errores);
      }
      expect(res.valido, `Ficha ${clave} debe ser válida: ${res.errores.join("; ")}`).toBe(true);
      expect(res.errores).toEqual([]);
    }
  });

  describe("1. Imágenes principales asociadas y visibles", () => {
    it("los productos piloto con imagen publicada tienen una URL no vacía", () => {
      // Mock: 1 (Nothing Phone), 3 (Nothing Ear 2), 5 (OnePlus Pad 2), 6 (ThinkPad)
      for (const id of [1, 3, 5, 6]) {
        const prod = PRODUCTOS_MOCK.find((p) => p.idProducto === id);
        expect(prod).toBeDefined();
        expect(typeof prod?.imagen).toBe("string");
        expect(prod?.imagen?.trim().length).toBeGreaterThan(0);
      }

      // Deseados: 202 (S24 Ultra), 208 (iPad Pro), 209 (MacBook Pro)
      for (const id of [202, 208, 209]) {
        const prod = DISPOSITIVOS_DESEADOS.find((p) => p.id === id);
        expect(prod).toBeDefined();
        expect(typeof prod?.imagen).toBe("string");
        expect(prod?.imagen?.trim().length).toBeGreaterThan(0);
      }

      // Vendidos: 108 (OnePlus Pad 2), 109 (Sony WH-1000XM5)
      for (const id of [108, 109]) {
        const prod = DISPOSITIVOS_VENDIDOS.find((p) => p.id === id);
        expect(prod).toBeDefined();
        expect(typeof prod?.imagen).toBe("string");
        expect(prod?.imagen?.trim().length).toBeGreaterThan(0);
      }

      // Ofertas: 300 (S24 Ultra), 303 (OnePlus Pad 2)
      for (const id of [300, 303]) {
        const prod = ULTIMAS_OFERTAS.find((p) => p.id === id);
        expect(prod).toBeDefined();
        expect(typeof prod?.imagen).toBe("string");
        expect(prod?.imagen?.trim().length).toBeGreaterThan(0);
      }
    });

    it("conserva las imágenes candidatas sin publicarlas mientras la licencia siga pendiente", () => {
      const thinkpad = PRODUCTOS_MOCK.find((p) => p.idProducto === 6);
      const macbook = DISPOSITIVOS_DESEADOS.find((p) => p.id === 209);
      const thinkpadImg = obtenerImagenCandidataV3Piloto("lenovo-thinkpad-e14-gen-5");
      const macbookImg = obtenerImagenCandidataV3Piloto("macbook-pro-16-m3-max");

      expect(thinkpad?.imagen).toBeNull();
      expect(macbook?.imagen).toBe("");
      expect(thinkpadImg?.uso_permitido).toBe(false);
      expect(macbookImg?.uso_permitido).toBe(false);
      expect(thinkpadImg?.estado_licencia).toBe("pendiente_autorizacion");
      expect(macbookImg?.estado_licencia).toBe("pendiente_autorizacion");
    });

    it("provee catálogo de imágenes candidatas y metadatos de procedencia para los 8 productos piloto", () => {
      expect(IMAGENES_CANDIDATAS_V3_PILOTO.length).toBeGreaterThanOrEqual(8);
      const thinkpadImg = obtenerImagenCandidataV3Piloto("lenovo-thinkpad-e14-gen-5");
      expect(thinkpadImg).not.toBeNull();
      expect(thinkpadImg?.url_original).toContain("lenovo-thinkpad-e14-gen-5");
      expect(thinkpadImg?.pagina_procedencia).toContain("psref.lenovo.com");

      const macbookImg = obtenerImagenCandidataV3Piloto("macbook-pro-16-m3-max");
      expect(macbookImg).not.toBeNull();
      expect(macbookImg?.url_original).toContain("Apple-MacBook-Pro");
      expect(macbookImg?.pagina_procedencia).toContain("apple.com/newsroom");
    });
  });

  describe("Resolución segura de la familia MacBook Pro", () => {
    it("no confunde MacBook Pro 16 M3 Pro con la ficha de la variante M3 Max", () => {
      expect(obtenerFichaTecnicaV3Piloto({ nombre: "Apple MacBook Pro 16 pulgadas M3 Pro" })).toBeNull();
      expect(obtenerFichaTecnicaV3Piloto({ nombre: "Apple MacBook Pro 16 pulgadas M3 Max" })?.categoria).toBe("portatiles");
    });
  });

  describe("2. Asociación de cada JSON con los IDs reales de TecReview", () => {
    it("asocia cada producto de PRODUCTOS_MOCK con su ficha V3 correspondiente", () => {
      const nothingPhone = PRODUCTOS_MOCK.find((p) => p.idProducto === 1)!;
      const nothingEar = PRODUCTOS_MOCK.find((p) => p.idProducto === 3)!;
      const oneplusPad = PRODUCTOS_MOCK.find((p) => p.idProducto === 5)!;
      const thinkpad = PRODUCTOS_MOCK.find((p) => p.idProducto === 6)!;

      expect(obtenerFichaTecnicaV3Piloto({ id: nothingPhone.idProducto, nombre: nothingPhone.nombre })?.categoria).toBe("celulares");
      expect(obtenerFichaTecnicaV3Piloto({ id: nothingEar.idProducto, nombre: nothingEar.nombre })?.categoria).toBe("auriculares");
      expect(obtenerFichaTecnicaV3Piloto({ id: oneplusPad.idProducto, nombre: oneplusPad.nombre })?.categoria).toBe("tablets");
      expect(obtenerFichaTecnicaV3Piloto({ id: thinkpad.idProducto, nombre: thinkpad.nombre })?.categoria).toBe("portatiles");
    });

    it("asocia cada producto de rankings/listas Kimovil con su ficha V3 correspondiente", () => {
      const s24 = DISPOSITIVOS_DESEADOS.find((p) => p.id === 202)!;
      const ipad = DISPOSITIVOS_DESEADOS.find((p) => p.id === 208)!;
      const macbook = DISPOSITIVOS_DESEADOS.find((p) => p.id === 209)!;
      const oneplusVendidos = DISPOSITIVOS_VENDIDOS.find((p) => p.id === 108)!;
      const sony = DISPOSITIVOS_VENDIDOS.find((p) => p.id === 109)!;
      const s24Ofertas = ULTIMAS_OFERTAS.find((p) => p.id === 300)!;
      const oneplusOfertas = ULTIMAS_OFERTAS.find((p) => p.id === 303)!;

      expect(obtenerFichaTecnicaV3Piloto({ id: s24.id, nombre: s24.nombre })?.categoria).toBe("celulares");
      expect(obtenerFichaTecnicaV3Piloto({ id: ipad.id, nombre: ipad.nombre })?.categoria).toBe("tablets");
      expect(obtenerFichaTecnicaV3Piloto({ id: macbook.id, nombre: macbook.nombre })?.categoria).toBe("portatiles");
      expect(obtenerFichaTecnicaV3Piloto({ id: oneplusVendidos.id, nombre: oneplusVendidos.nombre })?.categoria).toBe("tablets");
      expect(obtenerFichaTecnicaV3Piloto({ id: sony.id, nombre: sony.nombre })?.categoria).toBe("auriculares");
      expect(obtenerFichaTecnicaV3Piloto({ id: s24Ofertas.id, nombre: s24Ofertas.nombre })?.categoria).toBe("celulares");
      expect(obtenerFichaTecnicaV3Piloto({ id: oneplusOfertas.id, nombre: oneplusOfertas.nombre })?.categoria).toBe("tablets");
    });
  });

  describe("3. Integración en view models y comparador de la aplicación", () => {
    it("asigna ficha V3 válida al generar view models para los 8 productos piloto", () => {
      const p1 = crearProductoViewModel(PRODUCTOS_MOCK.find((p) => p.idProducto === 1)!);
      const p3 = crearProductoViewModel(PRODUCTOS_MOCK.find((p) => p.idProducto === 3)!);
      const p5 = crearProductoViewModel(PRODUCTOS_MOCK.find((p) => p.idProducto === 5)!);
      const p6 = crearProductoViewModel(PRODUCTOS_MOCK.find((p) => p.idProducto === 6)!);

      const k202 = convertirKimovilAViewModel(DISPOSITIVOS_DESEADOS.find((p) => p.id === 202)!);
      const k208 = convertirKimovilAViewModel(DISPOSITIVOS_DESEADOS.find((p) => p.id === 208)!);
      const k209 = convertirKimovilAViewModel(DISPOSITIVOS_DESEADOS.find((p) => p.id === 209)!);
      const k109 = convertirKimovilAViewModel(DISPOSITIVOS_VENDIDOS.find((p) => p.id === 109)!);

      for (const vm of [p1, p3, p5, p6, k202, k208, k209, k109]) {
        expect(vm.fichaTecnica?.version).toBe("v3");
        expect(vm.fichaTecnica?.estado).toBe("valida");
        if (vm.fichaTecnica?.version === "v3" && vm.fichaTecnica?.estado === "valida") {
          expect(vm.fichaTecnica.ficha.especificaciones.length).toBeGreaterThan(0);
          expect(vm.fichaTecnica.ficha.fuentes.length).toBeGreaterThan(0);
        }
      }
    });

    it("compara correctamente en las 4 categorías con las fichas V3 integradas", () => {
      // 1. Celulares: Nothing Phone (2a) vs Galaxy S24 Ultra
      const cel1 = crearProductoViewModel(PRODUCTOS_MOCK.find((p) => p.idProducto === 1)!);
      const cel2 = convertirKimovilAViewModel(DISPOSITIVOS_DESEADOS.find((p) => p.id === 202)!);
      const filasCel = construirFilasComparacion([cel1, cel2]);
      const filasV3Cel = filasCel.filter((f) => f.clave.startsWith("tecnica:v3:"));
      expect(filasV3Cel.length).toBeGreaterThan(0);

      // 2. Tablets: OnePlus Pad 2 vs Apple iPad Pro 11 M4
      const tab1 = crearProductoViewModel(PRODUCTOS_MOCK.find((p) => p.idProducto === 5)!);
      const tab2 = convertirKimovilAViewModel(DISPOSITIVOS_DESEADOS.find((p) => p.id === 208)!);
      const filasTab = construirFilasComparacion([tab1, tab2]);
      const filasV3Tab = filasTab.filter((f) => f.clave.startsWith("tecnica:v3:"));
      expect(filasV3Tab.length).toBeGreaterThan(0);

      // 3. Portátiles: ThinkPad E14 Gen 5 vs MacBook Pro 16 M3 Max
      const lap1 = crearProductoViewModel(PRODUCTOS_MOCK.find((p) => p.idProducto === 6)!);
      const lap2 = convertirKimovilAViewModel(DISPOSITIVOS_DESEADOS.find((p) => p.id === 209)!);
      const filasLap = construirFilasComparacion([lap1, lap2]);
      const filasV3Lap = filasLap.filter((f) => f.clave.startsWith("tecnica:v3:"));
      expect(filasV3Lap.length).toBeGreaterThan(0);

      // 4. Auriculares: Nothing Ear (2) vs Sony WH-1000XM5
      const aur1 = crearProductoViewModel(PRODUCTOS_MOCK.find((p) => p.idProducto === 3)!);
      const aur2 = convertirKimovilAViewModel(DISPOSITIVOS_VENDIDOS.find((p) => p.id === 109)!);
      const filasAur = construirFilasComparacion([aur1, aur2]);
      const filasV3Aur = filasAur.filter((f) => f.clave.startsWith("tecnica:v3:"));
      expect(filasV3Aur.length).toBeGreaterThan(0);
    });
  });
});
