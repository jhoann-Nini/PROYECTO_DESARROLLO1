import { describe, expect, it } from "vitest";
import type { Producto } from "@/types/producto";
import { obtenerEspecificacionesComparador } from "./especificacionesComparador";
import { crearFichaVacia } from "./normalizadorFicha";

function producto(
  caracteristicas: Producto["caracteristicas"],
  nombreCategoria = "Auriculares",
): Producto {
  return {
    idProducto: 1,
    nombre: "Producto registrado",
    idCategoria: 82,
    nombreCategoria,
    idMarca: 1,
    descripcion: null,
    imagen: null,
    precioReferencia: null,
    estado: true,
    caracteristicas,
  };
}

describe("obtenerEspecificacionesComparador", () => {
  it.each([
    ["versión desconocida", { version_esquema: 99, ram: "8 GB", pantalla: "OLED", camaras: "50 MP" }],
    ["V3 etiquetada como V1", { version_esquema: 1, categoria: "celulares", variantes: [], especificaciones: [], fuentes: [], evidencias: [], benchmarks: [], ram: "8 GB" }],
    ["V3 sin versión", { categoria: "celulares", variantes: [], especificaciones: [], fuentes: [], evidencias: [], benchmarks: [], ram: "8 GB" }],
    ["V3 válida", { version_esquema: 3, categoria: "celulares", variantes: [], especificaciones: [], fuentes: [], evidencias: [], benchmarks: [], ram: "8 GB" }],
  ])("falla cerrado para %s", (_caso, caracteristicas) => {
    expect(obtenerEspecificacionesComparador(producto(caracteristicas))).toEqual([]);
  });

  it("conserva la ruta de comparación de V1 y V2 válidas", () => {
    const v1 = { version_esquema: 1, categoria: "moviles", secciones: [], metricas: [], ram: "8 GB" };
    expect(obtenerEspecificacionesComparador(producto(v1, "Celulares")).some((item) => item.clave === "ram")).toBe(true);
    const v2 = { ...crearFichaVacia("moviles"), ram: "12 GB" };
    expect(obtenerEspecificacionesComparador(producto(v2, "Celulares")).some((item) => item.clave === "ram")).toBe(true);
  });

  it("excluye de audio los aliases heredados de memoria y chipset en todos los formatos", () => {
    expect(obtenerEspecificacionesComparador(producto({
      memoria: "8 GB",
      secciones: [{ titulo: "CHIPSET & ARQUITECTURA", descripcion: "Snapdragon" }],
      metricasComparables: [
        { clave: "memoria", nombre: "Memoria", grupo: "rendimiento", valor: 12, unidad: "GB", comparable: true },
      ],
    }))).toEqual([]);
  });

  it("conserva conexiones físicas registradas en auriculares", () => {
    expect(obtenerEspecificacionesComparador(producto({
      transductores: "40 mm",
      secciones: [{ titulo: "PUERTOS & CONECTIVIDAD", descripcion: "Jack 3.5 mm, USB-C" }],
    }))).toEqual([
      { clave: "transductores", etiqueta: "Transductores / drivers", valor: "40 mm" },
      { clave: "puertos", etiqueta: "Puertos", valor: "Jack 3.5 mm, USB-C" },
    ]);
  });

  it("muestra los campos de audio registrados y excluye hardware ajeno", () => {
    const resultado = obtenerEspecificacionesComparador(producto({
      transductores: "40 mm",
      cancelacion_ruido: "ANC adaptativa",
      microfonos: "4 micrófonos",
      bateria: "30 horas",
      codecs: "LDAC, AAC",
      software: "Ecualizador",
      pantalla: "AMOLED",
      procesador: "Chip de móvil",
      ram: "8 GB",
      almacenamiento: "128 GB",
      camaras: "50 MP",
      resolucion: "1080p",
    }));
    expect(resultado.map((campo) => campo.clave)).toEqual([
      "transductores", "cancelacion_ruido", "microfonos", "bateria", "codecs", "software",
    ]);
    expect(resultado.map((campo) => campo.valor)).toEqual([
      "40 mm", "ANC adaptativa", "4 micrófonos", "30 horas", "LDAC, AAC", "Ecualizador",
    ]);
  });

  it("normaliza aliases y conserva booleanos falsos y ceros", () => {
    const resultado = obtenerEspecificacionesComparador(producto({
      Drivers: "11 mm",
      ANC: false,
      autonomía: 0,
      "Códecs": ["AAC", "SBC"],
      bluetooth: "5.3",
    }));
    expect(resultado).toEqual([
      { clave: "transductores", etiqueta: "Transductores / drivers", valor: "11 mm" },
      { clave: "cancelacion_ruido", etiqueta: "Cancelación de ruido (ANC)", valor: "No" },
      { clave: "autonomia", etiqueta: "Autonomía", valor: "0" },
      { clave: "codecs", etiqueta: "Códecs / conectividad", valor: "AAC, SBC" },
      { clave: "bluetooth", etiqueta: "Bluetooth", valor: "5.3" },
    ]);
  });

  it.each(["Celulares", "Tablets"])("conserva datos móviles pertinentes de %s", (categoria) => {
    const resultado = obtenerEspecificacionesComparador(producto({
      pantalla: "6.7 pulgadas",
      procesador: "Chip registrado",
      ram_almacenamiento: "8 GB + 256 GB",
      camaras: "50 MP",
      bateria: "5000 mAh",
      conectividad: "Wi-Fi 6",
      transductores: "Dato residual",
      cancelacion_ruido: true,
    }, categoria));
    expect(resultado.map((campo) => campo.clave)).toEqual([
      "pantalla", "procesador", "ram_almacenamiento", "camaras", "bateria", "conectividad",
    ]);
  });

  it("muestra GPU, puertos y webcam en portátiles, no cámaras de teléfono", () => {
    const resultado = obtenerEspecificacionesComparador(producto({
      pantalla: "IPS",
      cpu: "Ryzen 7",
      gpu: "GPU registrada",
      ram: "16 GB",
      disco: "512 GB",
      camaras: "50 MP",
      webcam: "1080p",
      puertos: "HDMI, USB-C",
    }, "Portátiles"));
    expect(resultado.map((campo) => campo.clave)).toEqual([
      "pantalla", "procesador", "grafica", "ram", "almacenamiento", "webcam", "puertos",
    ]);
  });

  it("lee secciones explícitas y agrupa los títulos conocidos sin duplicarlos", () => {
    expect(obtenerEspecificacionesComparador(producto({
      drivers: "Dato plano",
      secciones: [
        { titulo: "TRANSDUCTORES / DRIVERS", descripcion: "40 mm", detalleExtra: "Diafragma registrado" },
        { titulo: "CANCELACIÓN DE RUIDO (ANC)", descripcion: "ANC adaptativa" },
        { titulo: "PANTALLA & RENDIMIENTO VISUAL", descripcion: "Dato ajeno" },
        { titulo: "Sin descripción" },
      ],
    }))).toEqual([
      { clave: "transductores", etiqueta: "Transductores / drivers", valor: "40 mm · Diafragma registrado" },
      { clave: "cancelacion_ruido", etiqueta: "Cancelación de ruido (ANC)", valor: "ANC adaptativa" },
    ]);
  });

  it("respeta las métricas comparables y sus unidades, con prioridad sobre campos planos", () => {
    expect(obtenerEspecificacionesComparador(producto({
      autonomia: "Dato antiguo",
      metricasComparables: [
        { clave: "autonomia", nombre: "Autonomía", grupo: "audio", valor: 28, unidad: "h", comparable: true },
        { clave: "impedancia", nombre: "Impedancia", grupo: "audio", valor: 32, unidad: "Ω", comparable: true },
        { clave: "anc", nombre: "ANC", grupo: "audio", valor: false, comparable: true },
        { clave: "pantalla", nombre: "Pantalla", grupo: "pantalla", valor: "OLED", comparable: true },
        { clave: "no_comparable", nombre: "No comparar", grupo: "audio", valor: 99, comparable: false },
      ],
    }))).toEqual([
      { clave: "cancelacion_ruido", etiqueta: "Cancelación de ruido (ANC)", valor: "No" },
      { clave: "autonomia", etiqueta: "Autonomía", valor: "28 h" },
      { clave: "impedancia", etiqueta: "Impedancia", valor: "32 Ω" },
    ]);
  });

  it("no convierte metadatos, puntuaciones, objetos o vacíos en datos técnicos", () => {
    expect(obtenerEspecificacionesComparador(producto({
      transductores: " ",
      bateria: null,
      codecs: [],
      bluetooth: { version: "5.3" },
      peso: Number.NaN,
      sensibilidad: Infinity,
      tiendas: [{ nombre: "Tienda", precio: 100000 }],
      version_esquema: 1,
      variante: { modelo: "Modelo" },
      metricas: [{ nombre: "Calidad de audio", puntos: 9 }],
      benchmarks: [{ nombre: "Prueba", valor: 100 }],
      fuentes: [{ nombre: "Fabricante" }],
      estado_verificacion: "parcial",
      puntuacionGlobal: 9,
    }))).toEqual([]);
    expect(obtenerEspecificacionesComparador(producto(null))).toEqual([]);
  });

  it("no infiere móviles para categorías desconocidas y conserva características personalizadas", () => {
    const datos = producto({ material_carcasa: "Aluminio", longitud_cable: "2 m" }, "Accesorios");
    datos.idCategoria = 1; // Este ID no implica móviles.
    datos.nombre = "Samsung Galaxy S25";
    expect(obtenerEspecificacionesComparador(datos)).toEqual([
      { clave: "longitud_cable", etiqueta: "Longitud cable", valor: "2 m" },
      { clave: "material_carcasa", etiqueta: "Material carcasa", valor: "Aluminio" },
    ]);
  });
});
