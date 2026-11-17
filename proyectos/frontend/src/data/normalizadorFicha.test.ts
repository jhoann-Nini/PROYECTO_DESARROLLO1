import { describe, expect, it } from "vitest";
import type { DispositivoKimovil, Producto } from "@/types/producto";
import type { DatosFichaTecnica } from "./fichaTecnica";
import {
  ErrorFichaTecnicaInvalida,
  crearFichaVacia,
  esAtributoFichaV2Valido,
  esBenchmarkComparableAutomaticamente,
  esBenchmarkFichaV2Valido,
  esFichaTecnicaV2Valida,
  esFuenteFichaV2Valida,
  esMetricaComparableAutomaticamente,
  esMetricaFichaV2Valida,
  esVarianteFichaV2Valida,
  normalizarDesdeKimovil,
  normalizarDesdeLegacyV1,
  normalizarDesdeMapaCaracteristicas,
  normalizarDesdeProducto,
  normalizarFichaTecnicaV2,
} from "./normalizadorFicha";
import { idGlobalApi } from "./identificadores";

describe("normalizadorFicha — Bloque 2", () => {
  describe("crearFichaVacia", () => {
    it("crea una ficha canónica v2 con estructura válida y estado pendiente", () => {
      const ficha = crearFichaVacia("moviles");
      expect(ficha.version_esquema).toBe(2);
      expect(ficha.categoria).toBe("moviles");
      expect(ficha.estado_verificacion).toBe("pendiente");
      expect(ficha.atributos).toEqual([]);
      expect(ficha.metricasComparables).toEqual([]);
      expect(ficha.fuentes).toEqual([]);
    });

    it("asigna la categoría por defecto 'moviles' si se omite", () => {
      const ficha = crearFichaVacia();
      expect(ficha.categoria).toBe("moviles");
    });
  });

  describe("normalizarDesdeLegacyV1", () => {
    it("transforma DatosFichaTecnica v1 a FichaTecnicaV2 preservando secciones y métricas", () => {
      const legacy = {
        categoria: "moviles",
        secciones: [
          {
            nombre: "Pantalla",
            items: [
              {
                clave: "tamano",
                etiqueta: "Diagonal",
                valor: "6.7 pulgadas",
                unidad: "pulgadas",
                comparable: true,
              },
            ],
          },
        ],
        metricas: [
          {
            clave: "bateria_mah",
            nombre: "Batería",
            valor: 5000,
            unidad: "mAh",
            mejorDireccion: "mayor",
          },
        ],
      } as unknown as DatosFichaTecnica;

      const ficha = normalizarDesdeLegacyV1(legacy, {
        idGlobal: idGlobalApi(10) ?? undefined,
      });

      expect(ficha.version_esquema).toBe(2);
      expect(ficha.categoria).toBe("moviles");
      expect(ficha.estado_verificacion).toBe("pendiente");

      // Atributos mapeados desde secciones legacy
      const attrPantalla = ficha.atributos.find((a) => a.clave === "tamano");
      expect(attrPantalla).toBeDefined();
      expect(attrPantalla?.valor).toBe("6.7 pulgadas");
      expect(attrPantalla?.grupo).toBe("pantalla");

      // Métricas mapeadas desde métricas legacy
      const metricaBateria = ficha.metricasComparables.find(
        (m) => m.clave === "bateria_mah"
      );
      expect(metricaBateria).toBeDefined();
      expect(metricaBateria?.valor).toBe(5000);
      expect(metricaBateria?.unidad).toBe("mAh");
      expect(metricaBateria?.comparable).toBe(true);
    });
  });

  describe("normalizarDesdeProducto", () => {
    it("transforma un Producto del backend con caracteristicas planas a FichaTecnicaV2", () => {
      const producto: Producto = {
        idProducto: 42,
        nombre: "Google Pixel 8 Pro",
        descripcion: "Smartphone de gama alta con chip Google Tensor G3.",
        idCategoria: 1,
        idMarca: 3,
        nombreCategoria: "Móviles",
        nombreMarca: "Google",
        imagen: "https://example.com/pixel8pro.png",
        precioReferencia: 3_899_000,
        estado: true,
        caracteristicas: {
          pantalla: "6.7 pulgadas OLED 120Hz",
          procesador: "Google Tensor G3",
          ram: "12 GB",
          almacenamiento: "128 GB",
          camaras: "50 MP + 48 MP + 48 MP",
          bateria: "5050 mAh con carga rápida",
          peso: "213 g",
        },
      };

      const ficha = normalizarDesdeProducto(producto);

      expect(ficha.version_esquema).toBe(2);
      expect(ficha.categoria).toBe("moviles");
      expect(ficha.atributos.length).toBeGreaterThan(0);
      expect(ficha.metricasComparables.length).toBeGreaterThan(0);

      // Verificación de extracción de RAM
      const ramMetrica = ficha.metricasComparables.find((m) => m.clave === "ram");
      expect(ramMetrica).toBeDefined();
      expect(ramMetrica?.valor).toBe(12);
      expect(ramMetrica?.unidad).toBe("GB");

      // Verificación de extracción de almacenamiento
      const almMetrica = ficha.metricasComparables.find(
        (m) => m.clave === "almacenamiento"
      );
      expect(almMetrica).toBeDefined();
      expect(almMetrica?.valor).toBe(128);
      expect(almMetrica?.unidad).toBe("GB");

      // Verificación de extracción de batería
      const batMetrica = ficha.metricasComparables.find(
        (m) => m.clave === "capacidad_bateria"
      );
      expect(batMetrica).toBeDefined();
      expect(batMetrica?.valor).toBe(5050);
      expect(batMetrica?.unidad).toBe("mAh");

      // Verificación de cámara principal
      const camMetrica = ficha.metricasComparables.find(
        (m) => m.clave === "resolucion_camara_principal"
      );
      expect(camMetrica).toBeDefined();
      expect(camMetrica?.valor).toBe(50);
      expect(camMetrica?.unidad).toBe("mpx");
    });
  });

  describe("normalizarDesdeKimovil", () => {
    it("transforma un DispositivoKimovil asignando espacio de nombres mock:<clave>", () => {
      const kimovil: DispositivoKimovil = {
        id: 7,
        ranking: 1,
        nombre: "Xiaomi 14 Ultra",
        marca: "Xiaomi",
        especificaciones: "6.73 pulgadas AMOLED 120Hz, Snapdragon 8 Gen 3, 16GB RAM, 5000 mAh",
        puntuacion: 9.4,
        precio: 4_200_000,
        tendencia: "sube",
        cambioRanking: 0,
        imagen: "https://example.com/xiaomi14ultra.jpg",
        tipo: "vendido",
        categoria: "moviles",
        chipInfo: "Snapdragon 8 Gen 3",
        detalleSpecs: {
          antutuScore: "2.100.000",
          benchmarkEtiqueta: "AnTuTu v10",
          benchmarkValor: "2.100.000",
          secciones: [
            {
              icono: "pantalla",
              titulo: "Pantalla",
              descripcion: "6.73 pulgadas AMOLED 120Hz",
            },
          ],
        },
      };

      const ficha = normalizarDesdeKimovil(kimovil);

      expect(ficha.version_esquema).toBe(2);
      expect(ficha.categoria).toBe("moviles");
      expect(ficha.fuentes.length).toBeGreaterThan(0);
      expect(ficha.fuentes[0].id).toContain("mock-7");

      // Benchmark debe ubicarse en benchmarks y no ser comparable automáticamente
      const bench = ficha.benchmarks.find((b) => b.nombre.includes("AnTuTu"));
      expect(bench).toBeDefined();
      expect(bench?.metodo).toBeNull();
      expect(esBenchmarkComparableAutomaticamente(bench!)).toBe(false);
    });
  });

  describe("manejo de unidades y conversiones estrictas", () => {
    it("batería en mAh sin voltaje NO se convierte a Wh", () => {
      const ficha = normalizarDesdeMapaCaracteristicas(
        { bateria: "5000 mAh" },
        { categoriaPorDefecto: "moviles" }
      );

      const mah = ficha.metricasComparables.find(
        (m) => m.clave === "capacidad_bateria"
      );
      const wh = ficha.metricasComparables.find(
        (m) => m.clave === "energia_bateria"
      );

      expect(mah).toBeDefined();
      expect(mah?.valor).toBe(5000);
      expect(mah?.unidad).toBe("mAh");
      expect(mah?.comparable).toBe(true);

      // NO debe inventar conversión a Wh
      expect(wh).toBeUndefined();
    });

    it("batería con Wh directamente se almacena en Wh", () => {
      const ficha = normalizarDesdeMapaCaracteristicas(
        { bateria: "54 Wh" },
        { categoriaPorDefecto: "laptops" }
      );

      const wh = ficha.metricasComparables.find(
        (m) => m.clave === "energia_bateria"
      );
      expect(wh).toBeDefined();
      expect(wh?.valor).toBe(54);
      expect(wh?.unidad).toBe("Wh");
      expect(wh?.comparable).toBe(true);
    });

    it("batería en mAh con voltaje explícito sí genera conversión a Wh", () => {
      const ficha = normalizarDesdeMapaCaracteristicas(
        {
          bateria: "5000 mAh",
          voltaje_bateria: "3.85 V",
        },
        { categoriaPorDefecto: "moviles" }
      );

      const wh = ficha.metricasComparables.find(
        (m) => m.clave === "energia_bateria"
      );
      expect(wh).toBeDefined();
      expect(wh?.valor).toBeCloseTo(19.25, 2);
      expect(wh?.unidad).toBe("Wh");
    });

    it("GB y GiB se tratan en sistemas numéricos diferenciados y no se mezclan automáticamente", () => {
      const fichaDecimal = normalizarDesdeMapaCaracteristicas(
        { almacenamiento: "512 GB" },
        { categoriaPorDefecto: "laptops" }
      );
      const fichaBinario = normalizarDesdeMapaCaracteristicas(
        { almacenamiento: "512 GiB" },
        { categoriaPorDefecto: "laptops" }
      );

      const mDecimal = fichaDecimal.metricasComparables.find(
        (m) => m.clave === "almacenamiento"
      );
      const mBinario = fichaBinario.metricasComparables.find(
        (m) => m.clave === "almacenamiento"
      );

      expect(mDecimal?.unidad).toBe("GB");
      expect(mBinario?.unidad).toBe("GiB");
      expect(mDecimal?.unidad).not.toBe(mBinario?.unidad);
    });

    it("unidades desconocidas o con sufijos raros se preservan como no comparables", () => {
      const ficha = normalizarDesdeMapaCaracteristicas(
        { brillo: "2000 nits_peak_hdr" },
        { categoriaPorDefecto: "moviles" }
      );

      const attrBrillo = ficha.atributos.find((a) => a.clave === "brillo");
      expect(attrBrillo).toBeDefined();
      expect(attrBrillo?.valorOriginal).toBe("2000 nits_peak_hdr");
    });
  });

  describe("distinción entre cero, falso, cadenas vacías y ausencia", () => {
    it("retiene 0 numérico y false booleano, y descarta cadenas vacías y nulos", () => {
      const ficha = normalizarDesdeMapaCaracteristicas(
        {
          latencia_ms: 0,
          resistente_agua: false,
          campo_vacio: "   ",
          campo_nulo: null,
          campo_undefined: undefined,
        },
        { categoriaPorDefecto: "auriculares" }
      );

      const clavesAtributos = ficha.atributos.map((a) => a.clave);
      expect(clavesAtributos).toContain("latencia_ms");
      expect(clavesAtributos).toContain("resistente_agua");
      expect(clavesAtributos).not.toContain("campo_vacio");
      expect(clavesAtributos).not.toContain("campo_nulo");
      expect(clavesAtributos).not.toContain("campo_undefined");

      const attrLatencia = ficha.atributos.find((a) => a.clave === "latencia_ms");
      expect(attrLatencia?.valor).toBe(0);

      const attrAgua = ficha.atributos.find((a) => a.clave === "resistente_agua");
      expect(attrAgua?.valor).toBe(false);
    });
  });

  describe("robustez y manejo de datos malformados", () => {
    it("no lanza excepciones ante entradas null, undefined o tipos primitivos", () => {
      expect(() => normalizarFichaTecnicaV2(null)).not.toThrow();
      expect(() => normalizarFichaTecnicaV2(undefined)).not.toThrow();
      expect(() => normalizarFichaTecnicaV2("cadena invalida")).not.toThrow();
      expect(() => normalizarFichaTecnicaV2(12345)).not.toThrow();
      expect(() => normalizarFichaTecnicaV2([1, 2, 3])).not.toThrow();

      const fichaNull = normalizarFichaTecnicaV2(null);
      expect(fichaNull.version_esquema).toBe(2);
      expect(fichaNull.estado_verificacion).toBe("pendiente");
    });

    it("es puramente determinista: llamadas idénticas producen resultados profundamente iguales", () => {
      const producto: Producto = {
        idProducto: 99,
        nombre: "Laptop Pro",
        descripcion: "Laptop profesional",
        imagen: null,
        idCategoria: 2,
        idMarca: 1,
        precioReferencia: 2_000_000,
        estado: true,
        caracteristicas: {
          pantalla: "15.6 pulgadas",
          procesador: "Intel Core i7",
          ram: "16 GB",
          bateria: "70 Wh",
        },
      };

      const resultado1 = normalizarDesdeProducto(producto);
      const resultado2 = normalizarDesdeProducto(producto);

      expect(resultado1).toEqual(resultado2);
    });
  });

  describe("esMetricaComparableAutomaticamente y esBenchmarkComparableAutomaticamente", () => {
    it("rechaza métricas sin método o con comparable=false", () => {
      expect(
        esMetricaComparableAutomaticamente({
          clave: "test",
          nombre: "Test",
          grupo: "general",
          valor: 10,
          unidad: "GB",
          sistema_unidades: "decimal",
          comparable: true,
          metodo: null,
          version_metodo: null,
          plataforma: null,
          fuenteId: "f1",
        })
      ).toBe(false);
    });

    it("rechaza benchmarks sin metodología explícita", () => {
      expect(
        esBenchmarkComparableAutomaticamente({
          id: "bm-1",
          nombre: "AnTuTu",
          prueba: "AnTuTu",
          version: "v10",
          valor: 1000000,
          unidad: "puntos",
          metodo: null,
          plataforma: null,
          fuenteId: "f1",
        })
      ).toBe(false);
    });
  });

  describe("HC-01: validación estricta y rechazo de fichas v2 corruptas o inválidas", () => {
    it("acepta una FichaTecnicaV2 completa y válida", () => {
      const fichaV2Valida = {
        version_esquema: 2,
        categoria: "moviles",
        estado_verificacion: "verificado",
        variantes: [],
        atributos: [
          {
            clave: "color",
            etiqueta: "Color",
            seccion: "Diseno",
            valor: "Negro",
            fuenteId: "f1",
          },
        ],
        metricasComparables: [],
        benchmarks: [],
        fuentes: [
          {
            id: "f1",
            tipo: "fabricante",
            nombre: "Web oficial",
            url: "https://example.com",
            fecha_consulta: "2026-01-01",
          },
        ],
      };

      expect(esFichaTecnicaV2Valida(fichaV2Valida)).toBe(true);
      const resultado = normalizarFichaTecnicaV2(fichaV2Valida);
      expect(resultado).toEqual(fichaV2Valida);
    });

    it("acepta una FichaTecnicaV2 incompleta pero estructuralmente válida", () => {
      const fichaIncompletaValida = {
        version_esquema: 2,
        categoria: "tablets",
        estado_verificacion: "pendiente",
        variantes: [],
        atributos: [],
        metricasComparables: [],
        benchmarks: [],
        fuentes: [],
      };

      expect(esFichaTecnicaV2Valida(fichaIncompletaValida)).toBe(true);
      const resultado = normalizarFichaTecnicaV2(fichaIncompletaValida);
      expect(resultado).toEqual(fichaIncompletaValida);
    });

    it("rechaza y lanza ErrorFichaTecnicaInvalida si version_esquema: 2 tiene arreglos obligatorios con tipos incorrectos", () => {
      const conAtributosNoArreglo = {
        version_esquema: 2,
        categoria: "moviles",
        estado_verificacion: "pendiente",
        variantes: [],
        atributos: "cadena-invalida",
        metricasComparables: [],
        benchmarks: [],
        fuentes: [],
      };

      expect(() => normalizarFichaTecnicaV2(conAtributosNoArreglo)).toThrow(
        ErrorFichaTecnicaInvalida
      );

      const conFuentesNoArreglo = {
        version_esquema: 2,
        categoria: "moviles",
        estado_verificacion: "pendiente",
        variantes: [],
        atributos: [],
        metricasComparables: [],
        benchmarks: [],
        fuentes: 12345,
      };

      expect(() => normalizarFichaTecnicaV2(conFuentesNoArreglo)).toThrow(
        ErrorFichaTecnicaInvalida
      );
    });

    it("rechaza y lanza ErrorFichaTecnicaInvalida si version_esquema: 2 carece de propiedades obligatorias", () => {
      const sinFuentes = {
        version_esquema: 2,
        categoria: "moviles",
        estado_verificacion: "pendiente",
        variantes: [],
        atributos: [],
        metricasComparables: [],
        benchmarks: [],
      };

      expect(() => normalizarFichaTecnicaV2(sinFuentes)).toThrow(
        ErrorFichaTecnicaInvalida
      );

      const sinCategoria = {
        version_esquema: 2,
        estado_verificacion: "pendiente",
        variantes: [],
        atributos: [],
        metricasComparables: [],
        benchmarks: [],
        fuentes: [],
      };

      expect(() => normalizarFichaTecnicaV2(sinCategoria)).toThrow(
        ErrorFichaTecnicaInvalida
      );

      const soloVersion = {
        version_esquema: 2,
      };

      expect(() => normalizarFichaTecnicaV2(soloVersion)).toThrow(
        ErrorFichaTecnicaInvalida
      );
    });

    it("rechaza y lanza ErrorFichaTecnicaInvalida si version_esquema: 2 tiene tipos de datos incorrectos", () => {
      const categoriaInvalida = {
        version_esquema: 2,
        categoria: "electrodomestico_inexistente",
        estado_verificacion: "pendiente",
        variantes: [],
        atributos: [],
        metricasComparables: [],
        benchmarks: [],
        fuentes: [],
      };

      expect(() => normalizarFichaTecnicaV2(categoriaInvalida)).toThrow(
        ErrorFichaTecnicaInvalida
      );

      const estadoInvalido = {
        version_esquema: 2,
        categoria: "auriculares",
        estado_verificacion: "aprobado_por_admin",
        variantes: [],
        atributos: [],
        metricasComparables: [],
        benchmarks: [],
        fuentes: [],
      };

      expect(() => normalizarFichaTecnicaV2(estadoInvalido)).toThrow(
        ErrorFichaTecnicaInvalida
      );
    });

    it("rechaza y lanza ErrorFichaTecnicaInvalida si un Producto backend tiene caracteristicas v2 corruptas", () => {
      const productoCorrupto: Producto = {
        idProducto: 42,
        nombre: "Teléfono Invalido",
        descripcion: "Desc",
        idCategoria: 1,
        idMarca: 1,
        nombreCategoria: "Móviles",
        imagen: null,
        precioReferencia: 1000000,
        estado: true,
        caracteristicas: {
          version_esquema: 2,
          // faltan categoria, fuentes, variantes, etc.
          atributos: "invalido",
        },
      };

      expect(() => normalizarDesdeProducto(productoCorrupto)).toThrow(
        ErrorFichaTecnicaInvalida
      );
      expect(() => normalizarFichaTecnicaV2(productoCorrupto)).toThrow(
        ErrorFichaTecnicaInvalida
      );
    });

    it("rechaza versiones de esquema no soportadas (distintas de 1 y 2)", () => {
      const versionNoSoportada = {
        version_esquema: 99,
        categoria: "moviles",
      };

      expect(() => normalizarFichaTecnicaV2(versionNoSoportada)).toThrow(
        ErrorFichaTecnicaInvalida
      );
    });

    it("continúa aceptando fichas legacy v1 válidas sin lanzar excepción", () => {
      const legacyV1 = {
        version_esquema: 1,
        categoria: "moviles",
        secciones: [],
        metricasComparables: [],
      };

      expect(() => normalizarFichaTecnicaV2(legacyV1)).not.toThrow();
      const resultado = normalizarFichaTecnicaV2(legacyV1);
      expect(resultado.version_esquema).toBe(2);
      expect(resultado.categoria).toBe("moviles");
    });

    it("continúa aceptando mapas genéricos sin version_esquema sin lanzar excepción", () => {
      const mapaGenerico = {
        pantalla: '6.7"',
        bateria: "5000 mAh",
        peso: "190 g",
      };

      expect(() => normalizarFichaTecnicaV2(mapaGenerico)).not.toThrow();
      const resultado = normalizarFichaTecnicaV2(mapaGenerico);
      expect(resultado.version_esquema).toBe(2);
      expect(resultado.atributos.length).toBeGreaterThan(0);
    });

    it("continúa aceptando entradas null, undefined y primitivas devolviendo ficha vacía", () => {
      const resNull = normalizarFichaTecnicaV2(null);
      expect(resNull.version_esquema).toBe(2);
      expect(resNull.estado_verificacion).toBe("pendiente");

      const resUndef = normalizarFichaTecnicaV2(undefined);
      expect(resUndef.version_esquema).toBe(2);

      const resStr = normalizarFichaTecnicaV2("texto plano");
      expect(resStr.version_esquema).toBe(2);

      const resNum = normalizarFichaTecnicaV2(42);
      expect(resNum.version_esquema).toBe(2);
    });
  });

  describe("HC-02: Validación estructural profunda de colecciones FichaTecnicaV2", () => {
    it("valida profundamente la colección de variantes (rechaza no-objetos, ids vacíos)", () => {
      expect(esVarianteFichaV2Valida({ id: "var-1", modelo: "SM-S928B" })).toBe(true);
      expect(esVarianteFichaV2Valida(null)).toBe(false);
      expect(esVarianteFichaV2Valida("no-objeto")).toBe(false);
      expect(esVarianteFichaV2Valida({ id: "" })).toBe(false);
      expect(esVarianteFichaV2Valida({ id: "   " })).toBe(false);
      expect(esVarianteFichaV2Valida({ id: "var-1", modelo: 12345 })).toBe(false);

      const fichaConVarianteInvalida = {
        version_esquema: 2,
        categoria: "moviles",
        estado_verificacion: "pendiente",
        variantes: [{ id: "" }],
        atributos: [],
        metricasComparables: [],
        benchmarks: [],
        fuentes: [],
      };
      expect(() => normalizarFichaTecnicaV2(fichaConVarianteInvalida)).toThrow(
        ErrorFichaTecnicaInvalida
      );
    });

    it("valida profundamente la colección de atributos (rechaza valores inválidos o unidades no canónicas)", () => {
      expect(
        esAtributoFichaV2Valido({
          clave: "peso",
          nombre: "Peso",
          grupo: "dimensiones",
          valor: 190,
          unidad: "g",
        })
      ).toBe(true);
      expect(
        esAtributoFichaV2Valido({
          clave: "color",
          nombre: "Color",
          grupo: "diseno",
          valor: "Negro",
          unidad: null,
        })
      ).toBe(true);
      expect(esAtributoFichaV2Valido(null)).toBe(false);
      expect(
        esAtributoFichaV2Valido({
          clave: "peso",
          nombre: "Peso",
          grupo: "dimensiones",
          valor: NaN,
          unidad: "g",
        })
      ).toBe(false);
      expect(
        esAtributoFichaV2Valido({
          clave: "color",
          nombre: "Color",
          grupo: "diseno",
          valor: "Negro",
          unidad: "kg", // texto con unidad física está prohibido
        })
      ).toBe(false);

      const fichaConAtributoInvalido = {
        version_esquema: 2,
        categoria: "moviles",
        estado_verificacion: "pendiente",
        variantes: [],
        atributos: [null],
        metricasComparables: [],
        benchmarks: [],
        fuentes: [],
      };
      expect(() => normalizarFichaTecnicaV2(fichaConAtributoInvalido)).toThrow(
        ErrorFichaTecnicaInvalida
      );
    });

    it("valida profundamente la colección de métricas (distingue comparables de informativas)", () => {
      expect(
        esMetricaFichaV2Valida({
          clave: "bateria_capacidad",
          nombre: "Capacidad de batería",
          grupo: "bateria",
          comparable: true,
          valor: 5000,
          unidad: "mAh",
          sistema_unidades: "decimal",
          metodo: "Laboratorio",
          version_metodo: "1.0",
          plataforma: "Android",
        })
      ).toBe(true);
      expect(
        esMetricaFichaV2Valida({
          clave: "soporte_nfc",
          nombre: "Soporte NFC",
          grupo: "conectividad",
          comparable: false,
          valor: true,
          unidad: null,
          sistema_unidades: null,
        })
      ).toBe(true);
      expect(
        esMetricaFichaV2Valida({
          clave: "bateria",
          nombre: "Batería",
          grupo: "bateria",
          comparable: true,
          valor: "5000 mAh", // comparable exige valor numérico
          unidad: "mAh",
          sistema_unidades: "decimal",
          metodo: null,
          version_metodo: null,
          plataforma: null,
        })
      ).toBe(false);

      const fichaConMetricaInvalida = {
        version_esquema: 2,
        categoria: "moviles",
        estado_verificacion: "pendiente",
        variantes: [],
        atributos: [],
        metricasComparables: ["cadena-en-vez-de-objeto"],
        benchmarks: [],
        fuentes: [],
      };
      expect(() => normalizarFichaTecnicaV2(fichaConMetricaInvalida)).toThrow(
        ErrorFichaTecnicaInvalida
      );
    });

    it("valida profundamente la colección de benchmarks (requiere unidad canónica y valor finito)", () => {
      expect(
        esBenchmarkFichaV2Valido({
          id: "bm-1",
          nombre: "Geekbench 6 Single Core",
          prueba: "Geekbench",
          version: "6.0",
          valor: 2150,
          unidad: "puntos",
          metodo: null,
          plataforma: "Android",
          fuenteId: "fuente-1",
        })
      ).toBe(true);
      expect(
        esBenchmarkFichaV2Valido({
          id: "bm-2",
          nombre: "Invalido",
          prueba: "Prueba",
          version: "1.0",
          valor: 100,
          unidad: "unidad_falsa",
          metodo: null,
          plataforma: null,
          fuenteId: "fuente-1",
        })
      ).toBe(false);

      const fichaConBenchmarkInvalido = {
        version_esquema: 2,
        categoria: "moviles",
        estado_verificacion: "pendiente",
        variantes: [],
        atributos: [],
        metricasComparables: [],
        benchmarks: [{ id: "bm-x" }], // faltan campos obligatorios
        fuentes: [],
      };
      expect(() => normalizarFichaTecnicaV2(fichaConBenchmarkInvalido)).toThrow(
        ErrorFichaTecnicaInvalida
      );
    });

    it("valida profundamente la colección de fuentes (requiere tipo válido e id)", () => {
      expect(
        esFuenteFichaV2Valida({
          id: "src-1",
          tipo: "fabricante",
          nombre: "Ficha oficial Samsung",
          url: "https://example.com",
          fecha_consulta: "2026-01-01",
        })
      ).toBe(true);
      expect(
        esFuenteFichaV2Valida({
          id: "src-2",
          tipo: "tipo_inexistente",
          nombre: "Fuente",
          url: null,
          fecha_consulta: null,
        })
      ).toBe(false);

      const fichaConFuenteInvalida = {
        version_esquema: 2,
        categoria: "moviles",
        estado_verificacion: "pendiente",
        variantes: [],
        atributos: [],
        metricasComparables: [],
        benchmarks: [],
        fuentes: [{ id: "src-1", tipo: "fabricante" }], // falta nombre
      };
      expect(() => normalizarFichaTecnicaV2(fichaConFuenteInvalida)).toThrow(
        ErrorFichaTecnicaInvalida
      );
    });
  });
});
