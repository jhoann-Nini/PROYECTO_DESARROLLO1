import { describe, expect, it } from "vitest";
import {
  CLAVE_FAVORITOS,
  MAX_FAVORITOS,
  alternarIdFavorito,
  guardarIdsFavoritos,
  leerIdsFavoritos,
  normalizarIdsFavoritos,
  quitarIdFavorito,
} from "./favoritos";

function crearStorage(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor);
    },
    removeItem: (clave: string) => {
      datos.delete(clave);
    },
  };
}

describe("favoritos", () => {
  it("normaliza ids positivos, enteros y sin duplicados", () => {
    expect(
      normalizarIdsFavoritos([3, "2", 3, -1, 0, 1.5, "abc", "4"]),
    ).toEqual([3, 2, 4]);
  });

  it("ignora valores que no son listas", () => {
    expect(normalizarIdsFavoritos(null)).toEqual([]);
    expect(normalizarIdsFavoritos({ ids: [1] })).toEqual([]);
  });

  it("lee y guarda la lista en el almacenamiento", () => {
    const storage = crearStorage();

    guardarIdsFavoritos(storage, [7, 8]);
    expect(storage.getItem(CLAVE_FAVORITOS)).toBe("[7,8]");
    expect(leerIdsFavoritos(storage)).toEqual([7, 8]);

    guardarIdsFavoritos(storage, []);
    expect(storage.getItem(CLAVE_FAVORITOS)).toBeNull();
    expect(leerIdsFavoritos(storage)).toEqual([]);
  });

  it("devuelve una lista vacía si el JSON es inválido", () => {
    const storage = crearStorage({ [CLAVE_FAVORITOS]: "{no-json" });
    expect(leerIdsFavoritos(storage)).toEqual([]);
  });

  it("alterna un id: agrega, quita y rechaza ids inválidos", () => {
    const agregado = alternarIdFavorito([1], 2);
    expect(agregado).toMatchObject({
      ids: [1, 2],
      agregado: true,
      motivo: "agregado",
    });

    const quitado = alternarIdFavorito([1, 2], 1);
    expect(quitado).toMatchObject({
      ids: [2],
      agregado: false,
      motivo: "quitado",
    });

    expect(alternarIdFavorito([1], 0).motivo).toBe("invalido");
  });

  it("respeta el límite defensivo de favoritos", () => {
    const llenos = Array.from({ length: MAX_FAVORITOS }, (_, indice) => indice + 1);
    const resultado = alternarIdFavorito(llenos, MAX_FAVORITOS + 1);

    expect(resultado.motivo).toBe("lleno");
    expect(resultado.ids).toHaveLength(MAX_FAVORITOS);
  });

  it("quita un id sin modificar la lista original", () => {
    const original = [1, 2, 3];
    expect(quitarIdFavorito(original, 2)).toEqual([1, 3]);
    expect(original).toEqual([1, 2, 3]);
  });
});
