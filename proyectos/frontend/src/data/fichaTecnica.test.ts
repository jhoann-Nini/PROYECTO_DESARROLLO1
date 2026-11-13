import { describe, expect, it } from "vitest";
import { normalizarDatosFichaTecnica } from "./fichaTecnica";

describe("normalizarDatosFichaTecnica", () => {
  it("devuelve una estructura segura para características ausentes", () => {
    expect(normalizarDatosFichaTecnica(null)).toEqual({
      version_esquema: 1,
      variante: null,
      metricasComparables: [],
      benchmarks: [],
      fuentes: [],
      estado_verificacion: "pendiente",
    });
  });

  it("normaliza variante, métricas, benchmarks, fuentes y estado", () => {
    const resultado = normalizarDatosFichaTecnica({
      variante: {
        modelo: "SM-S928B",
        mercado: "Colombia",
        ram: "12 GB",
        campoDesconocido: "ignorar",
      },
      metricasComparables: [
        {
          clave: "ram",
          nombre: "Memoria RAM",
          grupo: "rendimiento",
          valor: 12,
          unidad: "GB",
          comparable: true,
        },
        {
          clave: "metrica_invalida",
          nombre: "Inválida",
          grupo: "prueba",
          valor: Number.NaN,
          comparable: true,
        },
      ],
      benchmarks: [
        { nombre: "Geekbench 6", valor: 7200, unidad: "puntos", version: "6" },
      ],
      fuentes: [
        {
          tipo: "fabricante",
          nombre: "Samsung Colombia",
          url: "https://www.samsung.com/co/",
        },
      ],
      estado_verificacion: "parcial",
    });

    expect(resultado.variante?.modelo).toBe("SM-S928B");
    expect(resultado.variante?.mercado).toBe("Colombia");
    expect(resultado.metricasComparables).toHaveLength(1);
    expect(resultado.metricasComparables[0].valor).toBe(12);
    expect(resultado.benchmarks[0].nombre).toBe("Geekbench 6");
    expect(resultado.fuentes[0].tipo).toBe("fabricante");
    expect(resultado.estado_verificacion).toBe("parcial");
  });

  it("descarta registros incompletos y estados no permitidos", () => {
    const resultado = normalizarDatosFichaTecnica({
      metricasComparables: [
        { clave: "sin_nombre", grupo: "pantalla", valor: 6.8, comparable: true },
        { clave: "valor_invalido", nombre: "Valor", grupo: "pantalla", valor: null },
      ],
      benchmarks: [{ nombre: "Sin resultado", valor: null }],
      fuentes: [{ tipo: "desconocido", nombre: "Fuente inválida" }],
      estado_verificacion: "aprobado",
    });

    expect(resultado.metricasComparables).toEqual([]);
    expect(resultado.benchmarks).toEqual([]);
    expect(resultado.fuentes).toEqual([]);
    expect(resultado.estado_verificacion).toBe("pendiente");
  });

  it("acepta solo métricas primitivas finitas", () => {
    const resultado = normalizarDatosFichaTecnica({
      metricasComparables: [
        { clave: "pantalla", nombre: "Pantalla", grupo: "pantalla", valor: "AMOLED", comparable: true },
        { clave: "nfc", nombre: "NFC", grupo: "conectividad", valor: true, comparable: true },
        { clave: "nan", nombre: "No válido", grupo: "prueba", valor: Infinity, comparable: true },
      ],
    });

    expect(resultado.metricasComparables).toHaveLength(2);
  });
});
