import { describe, expect, it } from "vitest";
import { esFichaTecnicaV2Valida } from "@/data/normalizadorFicha";
import {
  FICHAS_TECNICAS_V2_PILOTO,
} from "@/data/fichasTecnicasV2Piloto";
import {
  DISPOSITIVOS_DESEADOS,
  DISPOSITIVOS_VENDIDOS,
  PRODUCTOS_MOCK,
  ULTIMAS_OFERTAS,
} from "@/data/mockProductos";
import {
  normalizarDesdeKimovil,
  normalizarDesdeProducto,
} from "@/data/normalizadorFicha";

describe("fichas técnicas V2 del catálogo", () => {
  it("mantiene fichas V2 válidas, con fuentes y sin benchmarks no respaldados", () => {
    const fichas = Object.values(FICHAS_TECNICAS_V2_PILOTO);
    expect(fichas).toHaveLength(18); // S24 Ultra mantiene dos fichas de variante; otros modelos agrupan configuraciones.
    for (const ficha of fichas) {
      expect(esFichaTecnicaV2Valida(ficha)).toBe(true);
      expect(ficha.fuentes.length).toBeGreaterThan(0);
      expect(ficha.benchmarks).toEqual([]);
      expect(ficha.metricasComparables.every((metrica) => metrica.comparable === false)).toBe(true);
    }
  });

  it("solo marca verificadas las configuraciones respaldadas por fuentes oficiales", () => {
    expect(FICHAS_TECNICAS_V2_PILOTO.nothingPhone2aSpecialEdition.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.samsungGalaxyS24Ultra256.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.samsungGalaxyS24Ultra512.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.oneplusPad2.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.appleIpadPro11M4.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.lenovoThinkpadE14Gen5.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.appleMacbookPro16M3Max.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.nothingEar2.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.sonyWh1000Xm5.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.samsungGalaxyA55.estado_verificacion).toBe("parcial");
    expect(FICHAS_TECNICAS_V2_PILOTO.appleIphone13_128.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.xiaomiRedmiNote14ProPlus12_512.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.oneplus13_16_512.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.appleIphone15ProMax256.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.samsungGalaxyS25Ultra12_1tb.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.xiaomi14Ultra16_512.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.nothingEarABlack.estado_verificacion).toBe("verificado");
    expect(FICHAS_TECNICAS_V2_PILOTO.xiaomi14tPro12_512.estado_verificacion).toBe("verificado");
  });

  it("documenta Galaxy A55 5G y conserva la ambigüedad entre variantes oficiales", () => {
    const a55 = FICHAS_TECNICAS_V2_PILOTO.samsungGalaxyA55;
    expect(a55.variantes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "8gb-128gb", ram: "8 GB", almacenamiento: "128 GB" }),
      expect.objectContaining({ id: "8gb-256gb", ram: "8 GB", almacenamiento: "256 GB" }),
    ]));
    expect(a55.estado_verificacion).toBe("parcial");
    expect(a55.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "almacenamiento_128gb", valor: 128, fuenteId: "samsung-a55-specs-co" }),
      expect.objectContaining({ clave: "almacenamiento_256gb", valor: 256, fuenteId: "samsung-a55-newsroom-co" }),
    ]));
    expect(a55.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "procesador", valor: "Samsung Exynos 1480 · CPU de ocho núcleos" }),
      expect.objectContaining({ clave: "camara_principal", valor: 50, unidad: "mpx" }),
      expect.objectContaining({ clave: "capacidad_bateria", valor: 5000, unidad: "mAh" }),
      expect.objectContaining({ clave: "resistencia", valor: "IP67" }),
    ]));
    expect(a55.fuentes.map((f) => f.url)).toContain("https://news.samsung.com/co/galaxy-a55-5g-y-a35-5g-los-nuevos-equipos-de-la-serie-a-con-innovaciones-al-alcance-de-todos");
  });

  it("completa iPhone 13 de 128GB con especificaciones técnicas de Apple", () => {
    const iphone = FICHAS_TECNICAS_V2_PILOTO.appleIphone13_128;
    expect(iphone.variantes[0]).toMatchObject({ id: "128gb", almacenamiento: "128 GB" });
    expect(iphone.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "procesador", valor: expect.stringContaining("A15 Bionic") }),
      expect.objectContaining({ clave: "resolucion", valor: "2532 × 1170 píxeles" }),
      expect.objectContaining({ clave: "almacenamiento", valor: 128, unidad: "GB" }),
      expect.objectContaining({ clave: "resistencia", valor: expect.stringContaining("IP68") }),
    ]));
    expect(iphone.fuentes[0]?.url).toBe("https://support.apple.com/es-la/111872");
  });

  it("verifica Xiaomi 14T Pro 12GB/512GB con especificaciones oficiales Xiaomi Colombia", () => {
    const xiaomi = FICHAS_TECNICAS_V2_PILOTO.xiaomi14tPro12_512;
    expect(xiaomi.variantes[0]).toMatchObject({ id: "12gb-512gb-co", ram: "12 GB LPDDR5X", almacenamiento: "512 GB UFS 4.0", mercado: "Colombia" });
    expect(xiaomi.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "procesador", valor: expect.stringContaining("Dimensity 9300+") }),
      expect.objectContaining({ clave: "tasa_refresco", valor: 144 }),
      expect.objectContaining({ clave: "camara_principal", valor: 50 }),
      expect.objectContaining({ clave: "camara_teleobjetivo", valor: 50 }),
      expect.objectContaining({ clave: "capacidad_bateria", valor: 5000 }),
      expect.objectContaining({ clave: "carga_inalambrica", valor: 50 }),
      expect.objectContaining({ clave: "wifi", valor: "Wi-Fi 6" }),
    ]));
    expect(xiaomi.fuentes[0]?.url).toBe("https://www.mi.com/co/product/xiaomi-14t-pro/specs/");
  });

  it("verifica Nothing Ear (a) Black Edition con especificaciones oficiales Nothing", () => {
    const earA = FICHAS_TECNICAS_V2_PILOTO.nothingEarABlack;
    expect(earA.variantes[0]).toMatchObject({ id: "black", modelo: "Nothing Ear (a) Black Edition" });
    expect(earA.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "driver", valor: 11, unidad: "mm" }),
      expect.objectContaining({ clave: "anc", valor: expect.stringContaining("45 dB") }),
      expect.objectContaining({ clave: "autonomia_total_anc_off", valor: 42.5 }),
      expect.objectContaining({ clave: "autonomia_total_anc_on", valor: 24.5 }),
      expect.objectContaining({ clave: "resistencia_auriculares", valor: "IP54" }),
    ]));
    expect(earA.fuentes[0]?.url).toContain("Colour=Black");
  });

  it("verifica Xiaomi 14 Ultra 16GB/512GB con ficha oficial Xiaomi", () => {
    const xiaomi = FICHAS_TECNICAS_V2_PILOTO.xiaomi14Ultra16_512;
    expect(xiaomi.variantes[0]).toMatchObject({ id: "16gb-512gb", ram: "16 GB LPDDR5X", almacenamiento: "512 GB UFS 4.0" });
    expect(xiaomi.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "procesador", valor: expect.stringContaining("Snapdragon 8 Gen 3") }),
      expect.objectContaining({ clave: "camara_principal", valor: 50 }),
      expect.objectContaining({ clave: "camara_periscopio", valor: 50 }),
      expect.objectContaining({ clave: "capacidad_bateria", valor: 5000 }),
      expect.objectContaining({ clave: "carga_inalambrica", valor: 80 }),
      expect.objectContaining({ clave: "resistencia", valor: "IP68" }),
    ]));
    expect(xiaomi.fuentes[0]?.url).toBe("https://www.mi.com/global/product/xiaomi-14-ultra/specs/");
  });

  it("verifica iPhone 15 Pro Max 256GB con ficha oficial Apple Colombia", () => {
    const iphone = FICHAS_TECNICAS_V2_PILOTO.appleIphone15ProMax256;
    expect(iphone.variantes[0]).toMatchObject({ id: "256gb", almacenamiento: "256 GB" });
    expect(iphone.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "procesador", valor: expect.stringContaining("A17 Pro") }),
      expect.objectContaining({ clave: "camara_principal", valor: 48 }),
      expect.objectContaining({ clave: "teleobjetivo_5x", valor: 12 }),
      expect.objectContaining({ clave: "capacidad_bateria", valor: 29 }),
      expect.objectContaining({ clave: "resistencia", valor: expect.stringContaining("IP68") }),
    ]));
    expect(iphone.fuentes[0]?.url).toBe("https://support.apple.com/es-co/111828");
  });

  it("verifica Galaxy S25 Ultra 12GB/1TB con Samsung Colombia", () => {
    const s25 = FICHAS_TECNICAS_V2_PILOTO.samsungGalaxyS25Ultra12_1tb;
    expect(s25.variantes[0]).toMatchObject({ id: "12gb-1tb", ram: "12 GB", almacenamiento: "1 TB" });
    expect(s25.variantes).toHaveLength(3);
    expect(s25.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "procesador", valor: expect.stringContaining("Snapdragon 8 Elite") }),
      expect.objectContaining({ clave: "ram", valor: 12 }),
      expect.objectContaining({ clave: "almacenamiento", valor: 1 }),
      expect.objectContaining({ clave: "camara_principal", valor: 200 }),
      expect.objectContaining({ clave: "capacidad_bateria", valor: 5000 }),
      expect.objectContaining({ clave: "resistencia", valor: "IP68" }),
    ]));
    expect(s25.fuentes.map((f) => f.url)).toContain("https://www.samsung.com/co/smartphones/galaxy-s25-ultra/buy/?modelCode=SM-S938BZTULTC");
  });

  it("verifica OnePlus 13 16GB/512GB con especificaciones oficiales", () => {
    const oneplus = FICHAS_TECNICAS_V2_PILOTO.oneplus13_16_512;
    expect(oneplus.variantes[0]).toMatchObject({ id: "16gb-512gb", ram: "16 GB LPDDR5X", almacenamiento: "512 GB UFS 4.0" });
    expect(oneplus.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "procesador", valor: expect.stringContaining("Snapdragon 8 Elite") }),
      expect.objectContaining({ clave: "camara_teleobjetivo", valor: 50 }),
      expect.objectContaining({ clave: "camara_ultra_gran_angular", valor: 50 }),
      expect.objectContaining({ clave: "camara_frontal", valor: 32 }),
      expect.objectContaining({ clave: "capacidad_bateria", valor: 6000 }),
      expect.objectContaining({ clave: "carga_inalambrica", valor: 50 }),
      expect.objectContaining({ clave: "resistencia", valor: "IP68 e IP69" }),
    ]));
    expect(oneplus.fuentes[0]?.url).toBe("https://www.oneplus.com/mx/13/specs");
  });

  it("verifica Redmi Note 14 Pro+ 12GB/512GB con Xiaomi Colombia y distingue RAM virtual", () => {
    const redmi = FICHAS_TECNICAS_V2_PILOTO.xiaomiRedmiNote14ProPlus12_512;
    expect(redmi.variantes[0]).toMatchObject({ id: "12gb-512gb-co", ram: "12 GB LPDDR4X", almacenamiento: "512 GB UFS 2.2" });
    expect(redmi.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "procesador", valor: expect.stringContaining("Snapdragon 7s Gen 3") }),
      expect.objectContaining({ clave: "ram", valor: 12 }),
      expect.objectContaining({ clave: "almacenamiento", valor: 512 }),
      expect.objectContaining({ clave: "camara_frontal", valor: 20 }),
      expect.objectContaining({ clave: "capacidad_bateria", valor: 5110 }),
      expect.objectContaining({ clave: "carga_rapida", valor: 120 }),
      expect.objectContaining({ clave: "resistencia", valor: "IP68" }),
    ]));
    expect(redmi.fuentes.map((f) => f.url)).toEqual(expect.arrayContaining([
      "https://www.mi.com/co/support/terms/tc-para-cupones-202509/",
      "https://www.mi.com/global/product/redmi-note-14-pro-plus-5g/specs/",
    ]));
  });

  it("completa OnePlus Pad 2 con datos técnicos respaldados por OnePlus Chile", () => {
    const pad = FICHAS_TECNICAS_V2_PILOTO.oneplusPad2;
    expect(pad.estado_verificacion).toBe("verificado");
    expect(pad.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "dimensiones", valor: "268,66 × 195,06 × 6,49 mm" }),
      expect.objectContaining({ clave: "peso", valor: 584, unidad: "g" }),
      expect.objectContaining({ clave: "sistema_operativo", valor: "OxygenOS 14.1" }),
      expect.objectContaining({ clave: "densidad_pixeles", valor: 303 }),
      expect.objectContaining({ clave: "puerto_usb", valor: "USB Type-C 3.2 Gen 1, hasta 5 Gbps" }),
    ]));
    expect(pad.fuentes.map((fuente) => fuente.url)).toContain("https://www.oneplus.com/cl/oneplus-pad-2/specs");
  });

  it("verifica Nothing Ear (2) Transparent White con ficha oficial y evidencia de variante", () => {
    const ear = FICHAS_TECNICAS_V2_PILOTO.nothingEar2;
    expect(ear.estado_verificacion).toBe("verificado");
    expect(ear.variantes[0]).toMatchObject({ id: "transparent-white", identificador: "Transparent White" });
    expect(ear.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "codecs", valor: "AAC, SBC, LHDC 5.0" }),
      expect.objectContaining({ clave: "bluetooth", valor: "Bluetooth 5.3" }),
      expect.objectContaining({ clave: "bateria_auriculares_anc_on", valor: "Hasta 4 h" }),
      expect.objectContaining({ clave: "bateria_estuche_anc_on", valor: "Hasta 22,5 h" }),
      expect.objectContaining({ clave: "resistencia_estuche", valor: "IP55" }),
      expect.objectContaining({ clave: "carga_inalambrica", valor: "Qi hasta 2,5 W" }),
    ]));
    expect(ear.fuentes.map((fuente) => fuente.url)).toContain("https://checkout-us.nothing.tech/pages/store-locator");
  });

  it("conserva el país real del MTM Lenovo y no confunde EET con un país", () => {
    expect(FICHAS_TECNICAS_V2_PILOTO.lenovoThinkpadE14Gen5.variantes[0]).toMatchObject({
      sku: "21JK0005RI",
      mercado: "Rumania (región EET)",
    });
  });

  it("asocia las fichas V2 a los cuatro productos mock", () => {
    const ids = [1, 3, 5, 6];
    const productos = PRODUCTOS_MOCK.filter((producto) => ids.includes(producto.idProducto));
    expect(productos).toHaveLength(4);

    for (const producto of productos) {
      const ficha = normalizarDesdeProducto(producto);
      expect(esFichaTecnicaV2Valida(ficha)).toBe(true);
      expect(ficha.fuentes.length).toBeGreaterThan(0);
      expect(["pendiente", "parcial", "verificado", "requiere_revision"]).toContain(ficha.estado_verificacion);
    }
  });

  it("resuelve también productos API por nombre sin inferir una variante ambigua", () => {
    const base = {
      descripcion: null,
      idCategoria: 1,
      idMarca: 1,
      imagen: null,
      precioReferencia: null,
      estado: true,
    };
    const s24 = normalizarDesdeProducto({
      ...base,
      idProducto: 901,
      nombre: "Samsung Galaxy S24 Ultra 512GB",
    });
    const ipad = normalizarDesdeProducto({
      ...base,
      idProducto: 902,
      nombre: "Apple iPad Pro 11 pulgadas M4",
    });
    const mac = normalizarDesdeProducto({
      ...base,
      idProducto: 903,
      nombre: "Apple MacBook Pro 16 pulgadas M3 Max",
    });
    const sony = normalizarDesdeProducto({
      ...base,
      idProducto: 904,
      nombre: "Sony WH-1000XM5",
    });
    const a55 = normalizarDesdeProducto({ ...base, idProducto: 906, nombre: "Samsung Galaxy A55 5G" });
    const iphone = normalizarDesdeProducto({ ...base, idProducto: 907, nombre: "Apple iPhone 13 (128GB)" });
    const redmi = normalizarDesdeProducto({ ...base, idProducto: 908, nombre: "Xiaomi Redmi Note 14 Pro+ 5G" });
    const oneplus = normalizarDesdeProducto({ ...base, idProducto: 909, nombre: "OnePlus 13 5G" });
    const iphone15 = normalizarDesdeProducto({ ...base, idProducto: 910, nombre: "iPhone 15 Pro Max (256GB)" });
    const s25 = normalizarDesdeProducto({ ...base, idProducto: 911, nombre: "Samsung Galaxy S25 Ultra" });
    const xiaomi14 = normalizarDesdeProducto({ ...base, idProducto: 912, nombre: "Xiaomi 14 Ultra (512GB)" });
    const earA = normalizarDesdeProducto({ ...base, idProducto: 913, nombre: "Nothing Ear (a) Black Edition" });
    const xiaomi14t = normalizarDesdeProducto({ ...base, idProducto: 914, nombre: "Xiaomi 14T Pro 5G Leica" });
    const samsungAmbiguo = normalizarDesdeProducto({
      ...base,
      idProducto: 905,
      nombre: "Samsung Galaxy S24 Ultra",
    });

    expect(s24.variantes[0]?.id).toBe("512gb");
    expect(ipad.variantes[0]?.id).toBe("16gb-1tb");
    expect(mac.variantes[0]?.id).toBe("48gb-1tb");
    expect(sony.fuentes[0]?.url).toContain("sony.com");
    expect(a55.variantes.map((v) => v.id)).toEqual(["8gb-128gb", "8gb-256gb"]);
    expect(iphone.variantes[0]?.id).toBe("128gb");
    expect(redmi.variantes[0]?.id).toBe("12gb-512gb-co");
    expect(oneplus.variantes[0]?.id).toBe("16gb-512gb");
    expect(iphone15.variantes[0]?.id).toBe("256gb");
    expect(s25.variantes[0]?.id).toBe("12gb-1tb");
    expect(xiaomi14.variantes[0]?.id).toBe("16gb-512gb");
    expect(earA.variantes[0]?.id).toBe("black");
    expect(xiaomi14t.variantes[0]?.id).toBe("12gb-512gb-co");
    expect(samsungAmbiguo.variantes).toEqual([]);
    expect(samsungAmbiguo.fuentes).toEqual([]);
  });

  it("distingue las variantes de 256 GB y 512 GB del Galaxy S24 Ultra", () => {
    const s24_256 = DISPOSITIVOS_DESEADOS.find((producto) => producto.id === 202);
    const s24_512 = ULTIMAS_OFERTAS.find((producto) => producto.id === 300);
    expect(s24_256).toBeDefined();
    expect(s24_512).toBeDefined();

    expect(normalizarDesdeKimovil(s24_256!).variantes[0]?.id).toBe("256gb");
    expect(normalizarDesdeKimovil(s24_512!).variantes[0]?.id).toBe("512gb");
  });

  it("asocia OnePlus Pad 2 a su variante 12 GB/256 GB en vendidos, ofertas y mock", () => {
    const vendido = DISPOSITIVOS_VENDIDOS.find((producto) => producto.id === 108);
    const oferta = ULTIMAS_OFERTAS.find((producto) => producto.id === 303);
    const mock = PRODUCTOS_MOCK.find((producto) => producto.idProducto === 5);

    expect(normalizarDesdeKimovil(vendido!).variantes[0]?.id).toBe("12gb-256gb");
    expect(normalizarDesdeKimovil(oferta!).variantes[0]?.id).toBe("12gb-256gb");
    expect(normalizarDesdeProducto(mock!).variantes[0]?.id).toBe("12gb-256gb");
  });

  it("conserva el SKU exacto del ThinkPad y la configuración del MacBook", () => {
    const thinkpad = PRODUCTOS_MOCK.find((producto) => producto.idProducto === 6);
    const macbook = DISPOSITIVOS_DESEADOS.find((producto) => producto.id === 209);

    expect(normalizarDesdeProducto(thinkpad!).variantes[0]).toMatchObject({
      id: "16gb-512gb",
      sku: "21JK0005RI",
    });
    expect(normalizarDesdeKimovil(macbook!).variantes[0]).toMatchObject({
      id: "48gb-1tb",
      identificador: "M3 Max · CPU 16 núcleos · GPU 40 núcleos",
    });
  });

  it("asocia las fichas oficiales de iPad Pro M4, Nothing Ear (2) y Sony WH-1000XM5", () => {
    const ipad = DISPOSITIVOS_DESEADOS.find((producto) => producto.id === 208);
    const sony = DISPOSITIVOS_VENDIDOS.find((producto) => producto.id === 109);
    const a55 = DISPOSITIVOS_VENDIDOS.find((producto) => producto.id === 102);
    const iphone = DISPOSITIVOS_VENDIDOS.find((producto) => producto.id === 104);
    const redmi = DISPOSITIVOS_VENDIDOS.find((producto) => producto.id === 107);
    const oneplus = DISPOSITIVOS_DESEADOS.find((producto) => producto.id === 207);
    const iphone15 = DISPOSITIVOS_DESEADOS.find((producto) => producto.id === 201);
    const s25 = DISPOSITIVOS_DESEADOS.find((producto) => producto.id === 206);
    const xiaomi14 = DISPOSITIVOS_DESEADOS.find((producto) => producto.id === 204);
    const earA = ULTIMAS_OFERTAS.find((producto) => producto.id === 301);
    const xiaomi14t = ULTIMAS_OFERTAS.find((producto) => producto.id === 306);
    const ear = PRODUCTOS_MOCK.find((producto) => producto.idProducto === 3);

    expect(normalizarDesdeKimovil(ipad!).variantes[0]?.id).toBe("16gb-1tb");
    expect(normalizarDesdeProducto(ear!).variantes[0]?.id).toBe("transparent-white");
    expect(normalizarDesdeKimovil(sony!).fuentes[0]?.url).toContain("sony.com");
    expect(normalizarDesdeKimovil(a55!).variantes.map((v) => v.id)).toEqual(["8gb-128gb", "8gb-256gb"]);
    expect(normalizarDesdeKimovil(iphone!).variantes[0]?.id).toBe("128gb");
    expect(normalizarDesdeKimovil(redmi!).variantes[0]?.id).toBe("12gb-512gb-co");
    expect(normalizarDesdeKimovil(oneplus!).variantes[0]?.id).toBe("16gb-512gb");
    expect(normalizarDesdeKimovil(iphone15!).variantes[0]?.id).toBe("256gb");
    expect(normalizarDesdeKimovil(s25!).variantes[0]?.id).toBe("12gb-1tb");
    expect(normalizarDesdeKimovil(xiaomi14!).variantes[0]?.id).toBe("16gb-512gb");
    expect(normalizarDesdeKimovil(earA!).variantes[0]?.id).toBe("black");
    expect(normalizarDesdeKimovil(xiaomi14t!).variantes[0]?.id).toBe("12gb-512gb-co");
  });
});
