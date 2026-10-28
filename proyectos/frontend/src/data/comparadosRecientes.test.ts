import { describe, expect, it } from "vitest";
import {
  CLAVE_COMPARADOS_RECIENTES,
  MAX_COMPARADOS_RECIENTES,
  guardarComparadosRecientes,
  leerComparadosRecientes,
  normalizarComparadosRecientes,
  registrarComparado,
} from "./comparadosRecientes";

function crearStorage() {
  const datos = new Map<string, string>();

  return {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor);
    },
  };
}

describe("comparadosRecientes", () => {
  it("normaliza ids inválidos, duplicados y recorta al máximo", () => {
    expect(
      normalizarComparadosRecientes([1, "2", 2, -1, 0, 3.5, "x"]),
    ).toEqual([1, 2]);
    expect(
      normalizarComparadosRecientes([1, 2, 3, 4, 5, 6, 7]),
    ).toEqual([1, 2, 3, 4, 5]);
    expect(normalizarComparadosRecientes("no-es-una-lista")).toEqual([]);
  });

  it("registra el más reciente primero, sin duplicados", () => {
    expect(registrarComparado([], 3)).toEqual([3]);
    expect(registrarComparado([3], 5)).toEqual([5, 3]);
    expect(registrarComparado([5, 3], 3)).toEqual([3, 5]);
  });

  it("mantiene solo los cinco más recientes", () => {
    let recientes: number[] = [];

    for (const id of [1, 2, 3, 4, 5, 6]) {
      recientes = registrarComparado(recientes, id);
    }

    expect(recientes).toHaveLength(MAX_COMPARADOS_RECIENTES);
    expect(recientes).toEqual([6, 5, 4, 3, 2]);
  });

  it("persiste y recupera la lista desde el almacenamiento", () => {
    const storage = crearStorage();

    guardarComparadosRecientes(storage, [7, 8, 7]);

    expect(storage.getItem(CLAVE_COMPARADOS_RECIENTES)).toBe("[7,8]");
    expect(leerComparadosRecientes(storage)).toEqual([7, 8]);
  });

  it("tolera JSON corrupto y almacenamiento no disponible", () => {
    const storage = crearStorage();
    storage.setItem(CLAVE_COMPARADOS_RECIENTES, "{roto");

    expect(leerComparadosRecientes(storage)).toEqual([]);
    expect(leerComparadosRecientes(null)).toEqual([]);
    expect(() => guardarComparadosRecientes(null, [1])).not.toThrow();
  });
});
