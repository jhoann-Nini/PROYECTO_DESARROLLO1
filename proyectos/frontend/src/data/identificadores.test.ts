import { describe, expect, expectTypeOf, it } from "vitest";
import {
  claveMockDe,
  esIdApi,
  esIdGlobal,
  esIdMock,
  idGlobalApi,
  idGlobalMock,
  idProductoApiDe,
  parsearIdGlobal,
  type IdProductoGlobal,
} from "./identificadores";

describe("idGlobalApi", () => {
  it("construye identificadores api para IDs positivos", () => {
    expect(idGlobalApi(1)).toBe("api:1");
    expect(idGlobalApi(42)).toBe("api:42");
  });

  it("rechaza api:0, negativos, decimales y valores no numéricos", () => {
    expect(idGlobalApi(0)).toBeNull();
    expect(idGlobalApi(-1)).toBeNull();
    expect(idGlobalApi(1.5)).toBeNull();
    expect(idGlobalApi(Number.NaN)).toBeNull();
    expect(idGlobalApi(Number.POSITIVE_INFINITY)).toBeNull();
    expect(idGlobalApi(Number.MAX_SAFE_INTEGER + 1)).toBeNull();
    expect(idGlobalApi("1" as unknown as number)).toBeNull();
  });
});

describe("idGlobalMock", () => {
  it("construye identificadores mock con claves estables", () => {
    expect(idGlobalMock("1")).toBe("mock:1");
    expect(idGlobalMock("oneplus-pad-2")).toBe("mock:oneplus-pad-2");
    expect(idGlobalMock("samsung_s24.ultra")).toBe("mock:samsung_s24.ultra");
    expect(idGlobalMock("a-b_c.d")).toBe("mock:a-b_c.d");
  });

  it("rechaza claves vacías o malformadas", () => {
    expect(idGlobalMock("")).toBeNull();
    expect(idGlobalMock("   ")).toBeNull();
    expect(idGlobalMock(" con espacio")).toBeNull();
    expect(idGlobalMock("con espacio")).toBeNull();
    expect(idGlobalMock("clave:con:dos:puntos")).toBeNull();
    expect(idGlobalMock("-empieza-con-guion")).toBeNull();
    expect(idGlobalMock("a".repeat(129))).toBeNull();
  });

  it("rechaza separadores consecutivos o finales en claves mock", () => {
    expect(idGlobalMock("a..b")).toBeNull();
    expect(idGlobalMock("a--b")).toBeNull();
    expect(idGlobalMock("a__b")).toBeNull();
    expect(idGlobalMock("a-")).toBeNull();
    expect(idGlobalMock("a.")).toBeNull();
    expect(idGlobalMock("a_")).toBeNull();
  });
});

describe("parsearIdGlobal", () => {
  it("descompone un identificador api", () => {
    const resultado = parsearIdGlobal("api:7");
    expect(resultado).toEqual({
      id: "api:7",
      origen: "api",
      idApi: 7,
      claveMock: null,
    });
  });

  it("descompone un identificador mock sin tratarlo como número", () => {
    const resultado = parsearIdGlobal("mock:1");
    expect(resultado).toEqual({
      id: "mock:1",
      origen: "mock",
      idApi: null,
      claveMock: "1",
    });
  });

  it("rechaza números sueltos y cadenas numéricas", () => {
    expect(parsearIdGlobal(1)).toBeNull();
    expect(parsearIdGlobal("1")).toBeNull();
    expect(parsearIdGlobal("  api:1")).toBeNull();
    expect(parsearIdGlobal("api:1 ")).toBeNull();
  });

  it("rechaza api:0, IDs negativos y formas no canónicas", () => {
    expect(parsearIdGlobal("api:0")).toBeNull();
    expect(parsearIdGlobal("api:-1")).toBeNull();
    expect(parsearIdGlobal("api:01")).toBeNull();
    expect(parsearIdGlobal("api:1.0")).toBeNull();
    expect(parsearIdGlobal("api:1e3")).toBeNull();
    expect(parsearIdGlobal("api:")).toBeNull();
    expect(parsearIdGlobal("API:1")).toBeNull();
  });

  it("rechaza identificadores mock vacíos o malformados", () => {
    expect(parsearIdGlobal("mock:")).toBeNull();
    expect(parsearIdGlobal("mock:con espacio")).toBeNull();
    expect(parsearIdGlobal("mock:-inicio")).toBeNull();
    expect(parsearIdGlobal("mock:a..b")).toBeNull();
    expect(parsearIdGlobal("mock:a-")).toBeNull();
    expect(parsearIdGlobal("mock:a.")).toBeNull();
    expect(parsearIdGlobal("MOCK:1")).toBeNull();
  });

  it("rechaza valores no textuales", () => {
    expect(parsearIdGlobal(null)).toBeNull();
    expect(parsearIdGlobal(undefined)).toBeNull();
    expect(parsearIdGlobal({})).toBeNull();
  });

  it("trata api:1 y mock:1 como identificadores diferentes", () => {
    const api = parsearIdGlobal("api:1");
    const mock = parsearIdGlobal("mock:1");
    expect(api).not.toBeNull();
    expect(mock).not.toBeNull();
    expect(api?.id).not.toBe(mock?.id);
    expect(esIdApi("api:1")).toBe(true);
    expect(esIdApi("mock:1")).toBe(false);
  });
});

describe("esIdApi / esIdMock / idProductoApiDe", () => {
  it("identifica correctamente el origen", () => {
    expect(esIdApi("api:1")).toBe(true);
    expect(esIdApi("mock:1")).toBe(false);
    expect(esIdMock("mock:1")).toBe(true);
    expect(esIdMock("api:1")).toBe(false);
    expect(esIdApi(1)).toBe(false);
    expect(esIdApi("api:0")).toBe(false);
  });

  it("solo extrae IDs numéricos de identificadores api", () => {
    expect(idProductoApiDe("api:15")).toBe(15);
    expect(idProductoApiDe("mock:15")).toBeNull();
    expect(idProductoApiDe("15")).toBeNull();
    expect(idProductoApiDe("api:0")).toBeNull();
    expect(idProductoApiDe(null)).toBeNull();
  });

  it("discrimina correctamente la unión parseada", () => {
    const api = parsearIdGlobal("api:7");
    const mock = parsearIdGlobal("mock:7");

    expect(api).not.toBeNull();
    expect(mock).not.toBeNull();
    if (!api || !mock) return;

    if (api.origen === "api") {
      expectTypeOf(api.idApi).toEqualTypeOf<number>();
      expectTypeOf(api.claveMock).toEqualTypeOf<null>();
    }
    if (mock.origen === "mock") {
      expectTypeOf(mock.idApi).toEqualTypeOf<null>();
      expectTypeOf(mock.claveMock).toEqualTypeOf<string>();
    }
  });

  it("reconoce identificadores globales válidos e inválidos con esIdGlobal", () => {
    expect(esIdGlobal("api:1")).toBe(true);
    expect(esIdGlobal("api:42")).toBe(true);
    expect(esIdGlobal("mock:1")).toBe(true);
    expect(esIdGlobal("mock:oneplus-pad-2")).toBe(true);

    expect(esIdGlobal("api:0")).toBe(false);
    expect(esIdGlobal("api:01")).toBe(false);
    expect(esIdGlobal("mock:")).toBe(false);
    expect(esIdGlobal("mock:a..b")).toBe(false);
    expect(esIdGlobal("1")).toBe(false);
    expect(esIdGlobal(1)).toBe(false);
    expect(esIdGlobal(null)).toBe(false);
    expect(esIdGlobal(undefined)).toBe(false);

    const idCandidato: unknown = "api:99";
    if (esIdGlobal(idCandidato)) {
      expectTypeOf(idCandidato).toEqualTypeOf<IdProductoGlobal>();
    }
  });

  it("extrae la clave mock solo de identificadores mock con claveMockDe", () => {
    expect(claveMockDe("mock:oneplus-pad-2")).toBe("oneplus-pad-2");
    expect(claveMockDe("mock:s24-ultra")).toBe("s24-ultra");
    expect(claveMockDe("api:15")).toBeNull();
    expect(claveMockDe("oneplus-pad-2")).toBeNull();
    expect(claveMockDe("mock:")).toBeNull();
    expect(claveMockDe(null)).toBeNull();
    expect(claveMockDe(42)).toBeNull();
  });
});
