import { describe, expect, it } from "vitest";
import {
  detectarCategoria,
  mapearCaracteristicasASecciones,
  normalizarFichaProducto,
  formatearCOP,
} from "./specsHelper";
import { Producto } from "@/types/producto";
import { DISPOSITIVOS_VENDIDOS } from "./mockProductos";

describe("specsHelper — Detección de Categorías", () => {
  it("detecta auriculares por idCategoria = 4", () => {
    const producto: Producto = {
      idProducto: 10,
      nombre: "Accesorio Audio Pro",
      descripcion: "Sonido envolvente",
      idCategoria: 4,
      idMarca: 1,
      imagen: null,
      precioReferencia: 250000,
      estado: true,
    };
    expect(detectarCategoria(producto)).toBe("auriculares");
  });

  it("detecta auriculares por nombreCategoria", () => {
    const producto: Producto = {
      idProducto: 11,
      nombre: "Studio X",
      descripcion: "Diadema inalámbrica",
      idCategoria: 99,
      idMarca: 1,
      nombreCategoria: "Audífonos Bluetooth",
      imagen: null,
      precioReferencia: 300000,
      estado: true,
    };
    expect(detectarCategoria(producto)).toBe("auriculares");
  });

  it("detecta portátiles por idCategoria = 3 o nombreCategoria", () => {
    const prodId: Producto = {
      idProducto: 20,
      nombre: "Workstation",
      descripcion: "Equipo para oficina",
      idCategoria: 3,
      idMarca: 2,
      imagen: null,
      precioReferencia: 4500000,
      estado: true,
    };
    expect(detectarCategoria(prodId)).toBe("laptops");

    const prodNombre: Producto = {
      idProducto: 21,
      nombre: "Slim Pro",
      descripcion: "Diseño ultraligero",
      idCategoria: 99,
      idMarca: 2,
      nombreCategoria: "Portátiles",
      imagen: null,
      precioReferencia: 3500000,
      estado: true,
    };
    expect(detectarCategoria(prodNombre)).toBe("laptops");
  });

  it("detecta tablets por idCategoria = 2 o nombreCategoria", () => {
    const prod: Producto = {
      idProducto: 30,
      nombre: "Media Tab",
      descripcion: "Pantalla táctil grande",
      idCategoria: 2,
      idMarca: 3,
      imagen: null,
      precioReferencia: 1800000,
      estado: true,
    };
    expect(detectarCategoria(prod)).toBe("tablets");
  });

  it("detecta monitores por idCategoria = 5 o nombreCategoria", () => {
    const prodId: Producto = {
      idProducto: 40,
      nombre: "UltraGear Gaming",
      descripcion: "Frecuencia alta",
      idCategoria: 5,
      idMarca: 4,
      imagen: null,
      precioReferencia: 1200000,
      estado: true,
    };
    expect(detectarCategoria(prodId)).toBe("monitores");

    const prodNom: Producto = {
      idProducto: 41,
      nombre: "ProDisplay 27",
      descripcion: "Calibración sRGB",
      idCategoria: 99,
      idMarca: 4,
      nombreCategoria: "Monitores y Pantallas",
      imagen: null,
      precioReferencia: 1500000,
      estado: true,
    };
    expect(detectarCategoria(prodNom)).toBe("monitores");
  });

  it("detecta móviles por idCategoria = 1 o nombreCategoria", () => {
    const prod: Producto = {
      idProducto: 50,
      nombre: "Ultra Phone",
      descripcion: "Cámara avanzada",
      idCategoria: 1,
      idMarca: 5,
      imagen: null,
      precioReferencia: 2200000,
      estado: true,
    };
    expect(detectarCategoria(prod)).toBe("moviles");
  });

  it("evita clasificar erróneamente un móvil cuya descripción menciona 'monitor cardíaco'", () => {
    const movilConSensor: Producto = {
      idProducto: 51,
      nombre: "Xiaomi 14 Ultra Pro",
      descripcion: "Sensor óptico en pantalla con monitor cardíaco integrado y lector de huellas",
      idCategoria: 1,
      idMarca: 5,
      nombreCategoria: "Móviles",
      imagen: null,
      precioReferencia: 4200000,
      estado: true,
    };
    // No debe clasificar como monitor a pesar de la palabra 'monitor' en su descripción
    expect(detectarCategoria(movilConSensor)).toBe("moviles");
  });
});

describe("specsHelper — Mapeo de características de backend (Fase 4.1)", () => {
  it("mapea un diccionario de características reales en secciones de hardware con iconos y títulos", () => {
    const caracteristicas = {
      panel: "Fast IPS 27'' QHD (2560x1440)",
      tasa_refresco: "180 Hz con FreeSync Premium",
      tiempo_respuesta: "1ms GtG",
      puertos: "2x HDMI 2.0, 1x DisplayPort 1.4",
    };

    const secciones = mapearCaracteristicasASecciones(caracteristicas, "monitores");
    expect(secciones).toHaveLength(4);
    expect(secciones[0].titulo).toBe("TECNOLOGÍA DE PANEL");
    expect(secciones[0].descripcion).toContain("Fast IPS 27''");
    expect(secciones[1].titulo).toBe("TASA DE REFRESCO");
    expect(secciones[1].descripcion).toContain("180 Hz");
    expect(secciones[2].titulo).toBe("TIEMPO DE RESPUESTA");
    expect(secciones[3].titulo).toBe("PUERTOS & CONECTIVIDAD");
  });

  it("filtra claves de metadatos internos y campos vacíos al mapear", () => {
    const caracteristicas = {
      procesador: "Intel Core i7-13700H",
      benchmark: { etiqueta: "Geekbench", valor: "18500 pts" },
      metricas: [{ nombre: "Rendimiento", puntos: 9.5 }],
      puntuacion: 9.4,
      campo_vacio: "",
      campo_nulo: null,
    };

    const secciones = mapearCaracteristicasASecciones(caracteristicas, "laptops");
    expect(secciones).toHaveLength(1);
    expect(secciones[0].titulo).toBe("PROCESADOR & RENDIMIENTO");
  });

  it("respeta secciones pre-estructuradas si vienen como arreglo en el JSONB", () => {
    const caracteristicas = {
      secciones: [
        {
          icono: "🎧",
          titulo: "TRANSDUCTORES PLANAR",
          descripcion: "Diafragmas magnéticos planares de 50mm",
        },
      ],
    };

    const secciones = mapearCaracteristicasASecciones(caracteristicas, "auriculares");
    expect(secciones).toHaveLength(1);
    expect(secciones[0].titulo).toBe("TRANSDUCTORES PLANAR");
    expect(secciones[0].icono).toBe("🎧");
  });
});

describe("specsHelper — Normalización y no invención de datos ficticios", () => {
  it("un producto de backend sin características retorna secciones vacías y puntuación nula", () => {
    const prodSinSpecs: Producto = {
      idProducto: 99,
      nombre: "Producto Genérico",
      descripcion: null,
      idCategoria: 1,
      idMarca: 1,
      imagen: null,
      precioReferencia: 500000,
      estado: true,
      caracteristicas: null,
    };

    const ficha = normalizarFichaProducto(prodSinSpecs);
    expect(ficha.secciones).toEqual([]);
    expect(ficha.metricas).toEqual([]);
    expect(ficha.benchmark).toBeNull();
    expect(ficha.puntuacionGlobal).toBeNull();
    expect(ficha.tieneEspecificacionesReales).toBe(false);
  });

  it("un producto de backend con características vacías {} no inventa valores de benchmark ni puntuación", () => {
    const prodVacio: Producto = {
      idProducto: 100,
      nombre: "Producto Sin Características",
      descripcion: "Descripción básica",
      idCategoria: 4,
      idMarca: 2,
      imagen: null,
      precioReferencia: 120000,
      estado: true,
      caracteristicas: {},
    };

    const ficha = normalizarFichaProducto(prodVacio);
    expect(ficha.secciones).toEqual([]);
    expect(ficha.benchmark).toBeNull();
    expect(ficha.puntuacionGlobal).toBeNull();
    expect(ficha.tieneEspecificacionesReales).toBe(false);
  });

  it("un producto de backend con características reales las expone correctamente en la ficha", () => {
    const prodConSpecs: Producto = {
      idProducto: 101,
      nombre: "Sony WH-1000XM5 Backend",
      descripcion: "Auriculares premium con ANC",
      idCategoria: 4,
      idMarca: 3,
      nombreCategoria: "Auriculares",
      nombreMarca: "Sony",
      imagen: "https://example.com/sony.jpg",
      precioReferencia: 1400000,
      estado: true,
      caracteristicas: {
        transductores: "Drivers de 30mm de fibra de carbono",
        cancelacion_ruido: "Procesador integrado V1 + HD QN1",
        bateria: "Hasta 30 horas con ANC",
      },
    };

    const ficha = normalizarFichaProducto(prodConSpecs);
    expect(ficha.categoriaTipo).toBe("auriculares");
    expect(ficha.categoriaIcono).toBe("🎧");
    expect(ficha.secciones).toHaveLength(3);
    expect(ficha.secciones.some((s) => s.titulo === "ACÚSTICA & TRANSDUCTORES")).toBe(true);
    expect(ficha.secciones.some((s) => s.titulo === "CANCELACIÓN DE RUIDO (ANC)")).toBe(true);
    expect(ficha.secciones.some((s) => s.titulo === "BATERÍA & AUTONOMÍA")).toBe(true);
    // No debe haber ninguna sección de pantalla
    expect(ficha.secciones.some((s) => s.titulo.includes("PANTALLA"))).toBe(false);
    expect(ficha.tieneEspecificacionesReales).toBe(true);
  });

  it("los productos antiguos de los rankings siguen siendo compatibles", () => {
    const demo = DISPOSITIVOS_VENDIDOS[0];
    const ficha = normalizarFichaProducto(demo);

    expect(ficha.nombre).toBe(demo.nombre);
    expect(ficha.puntuacionGlobal).toBe(demo.puntuacion);
    expect(ficha.secciones.length).toBeGreaterThan(0);
    expect(ficha.tieneEspecificacionesReales).toBe(true);
  });

  it("formatea precios en COP adecuadamente", () => {
    expect(formatearCOP(null)).toBe("Consultar disponibilidad");
    expect(formatearCOP(undefined)).toBe("Consultar disponibilidad");
    expect(formatearCOP(350)).toContain("COP");
    expect(formatearCOP(1500000)).toContain("COP");
  });
});
