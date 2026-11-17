import { describe, expect, it } from "vitest";
import { UNIDADES_CANONICAS } from "@/types/fichaTecnica";
import {
  DEFINICIONES_UNIDAD,
  convertirCargaAEnergiaWh,
  convertirUnidad,
  definicionDeUnidad,
  esUnidadAmbigua,
  esUnidadReconocida,
  normalizarUnidad,
  parsearDatoConUnidad,
  sonUnidadesComparables,
  unidadCanonicaDe,
} from "./unidades";

describe("registro de unidades", () => {
  it("reconoce GB como unidad decimal", () => {
    const resultado = normalizarUnidad("GB");
    expect(resultado.estado).toBe("reconocida");
    if (resultado.estado !== "reconocida") return;
    expect(resultado.unidad).toBe("GB");
    expect(resultado.definicion.dimension).toBe("almacenamiento");
    expect(resultado.definicion.sistema).toBe("decimal");
    expect(resultado.definicion.factorBase).toBe(1_000_000_000);
  });

  it("reconoce GiB como unidad binaria distinta", () => {
    const gb = normalizarUnidad("GB");
    const gib = normalizarUnidad("GiB");
    expect(gb.estado).toBe("reconocida");
    expect(gib.estado).toBe("reconocida");
    if (gb.estado !== "reconocida" || gib.estado !== "reconocida") return;
    expect(gib.unidad).toBe("GiB");
    expect(gib.definicion.sistema).toBe("binario");
    expect(gib.definicion.factorBase).toBe(1_073_741_824);
    expect(gb.definicion.factorBase).not.toBe(gib.definicion.factorBase);
  });

  it("no registra definiciones duplicadas", () => {
    const unidades = DEFINICIONES_UNIDAD.map((definicion) => definicion.unidad);
    expect(new Set(unidades).size).toBe(unidades.length);
  });

  it("reconoce todas las unidades canónicas", () => {
    for (const unidad of UNIDADES_CANONICAS) {
      expect(normalizarUnidad(unidad).estado).toBe("reconocida");
      expect(unidadCanonicaDe(unidad)).toBe(unidad);
    }
  });

  it("no registra alias duplicados entre unidades distintas", () => {
    const propietarios = new Map<string, string>();
    const colisiones: string[] = [];
    for (const definicion of DEFINICIONES_UNIDAD) {
      for (const alias of [definicion.simbolo, ...definicion.alias]) {
        const propietario = propietarios.get(alias);
        if (propietario && propietario !== definicion.unidad) {
          colisiones.push(`${alias}: ${propietario} / ${definicion.unidad}`);
        } else {
          propietarios.set(alias, definicion.unidad);
        }
      }
    }
    expect(colisiones).toEqual([]);
  });

  it("congela el registro y sus alias", () => {
    expect(Object.isFrozen(DEFINICIONES_UNIDAD)).toBe(true);
    expect(Object.isFrozen(DEFINICIONES_UNIDAD[0])).toBe(true);
    expect(Object.isFrozen(DEFINICIONES_UNIDAD[0].alias)).toBe(true);
  });

  it("distingue g de G y no adivina variantes de mayúsculas", () => {
    expect(normalizarUnidad("g").estado).toBe("reconocida");
    expect(unidadCanonicaDe("g")).toBe("g");
    expect(normalizarUnidad("G").estado).toBe("ambigua");
    expect(normalizarUnidad("gb").estado).toBe("desconocida");
  });

  it("acepta las variantes lingüísticas registradas", () => {
    expect(unidadCanonicaDe("milímetros")).toBe("mm");
    expect(unidadCanonicaDe("centímetros")).toBe("cm");
    expect(unidadCanonicaDe("megapíxeles")).toBe("mpx");
  });

  it("conserva el texto original al normalizar", () => {
    const resultado = normalizarUnidad("  GB  ");
    expect(resultado.textoOriginal).toBe("  GB  ");
    expect(resultado.estado).toBe("reconocida");
  });

  it("no lanza excepciones con una unidad desconocida", () => {
    expect(() => normalizarUnidad("furlongs")).not.toThrow();
    const resultado = normalizarUnidad("furlongs");
    expect(resultado.estado).toBe("desconocida");
    expect(resultado.unidad).toBeNull();
    expect(esUnidadReconocida("furlongs")).toBe(false);
  });

  it("no lanza excepciones con entradas nulas o no textuales", () => {
    expect(() => normalizarUnidad(null)).not.toThrow();
    expect(normalizarUnidad(null).estado).toBe("desconocida");
    expect(normalizarUnidad(undefined).estado).toBe("desconocida");
    expect(normalizarUnidad(42).estado).toBe("desconocida");
    expect(() => normalizarUnidad(Object.create(null))).not.toThrow();
    expect(normalizarUnidad(Object.create(null)).estado).toBe("desconocida");
  });

  it("marca las unidades ambiguas sin adivinar su significado", () => {
    expect(esUnidadAmbigua("G")).toBe(true);
    expect(esUnidadAmbigua("Gbps")).toBe(true);
    const resultado = normalizarUnidad("G");
    expect(resultado.estado).toBe("ambigua");
    expect(resultado.unidad).toBeNull();
    expect(unidadCanonicaDe("G")).toBeNull();
  });

  it("expone la definición de una unidad reconocida", () => {
    expect(definicionDeUnidad("GHz")?.unidad).toBe("GHz");
    expect(unidadCanonicaDe("in")).toBe("in");
    expect(unidadCanonicaDe("G")).toBeNull();
  });
});

describe("convertirUnidad", () => {
  it("convierte 1 GB a 1.000.000.000 B", () => {
    const resultado = convertirUnidad(1, "GB", "B");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor).toBe(1_000_000_000);
    expect(resultado.unidadOrigen).toBe("GB");
    expect(resultado.unidadDestino).toBe("B");
  });

  it("convierte 1 GiB a 1.073.741.824 B", () => {
    const resultado = convertirUnidad(1, "GiB", "B");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor).toBe(1_073_741_824);
  });

  it("conserva exactamente un valor entero al convertir a la misma unidad", () => {
    const resultado = convertirUnidad(1_234_567_890_123, "B", "B");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor).toBe(1_234_567_890_123);
  });

  it("conserva la precisión de un valor no entero sin redondearlo de más", () => {
    const resultado = convertirUnidad(1.23456789012345, "B", "B");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor).toBe(1.23456789012345);
  });

  it("convierte 1 TiB a 1.099.511.627.776 B sin perder bytes", () => {
    const resultado = convertirUnidad(1, "TiB", "B");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor).toBe(1_099_511_627_776);
  });

  it("no considera GB y GiB equivalentes", () => {
    const resultado = convertirUnidad(1, "GB", "GiB");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor).not.toBe(1);
    expect(resultado.valor).toBeCloseTo(0.931322574615, 10);
  });

  it("convierte 6.8 in a 172.72 mm", () => {
    const resultado = convertirUnidad(6.8, "in", "mm");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor).toBe(172.72);
  });

  it("convierte 1 GHz a 1000 MHz", () => {
    const resultado = convertirUnidad(1, "GHz", "MHz");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor).toBe(1_000);
  });

  it("conserva el texto original del dato convertido", () => {
    const resultado = convertirUnidad(6.8, "in", "mm");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.textoOriginal).toBe("6.8 in -> mm");
    expect(resultado.valorOriginal).toBe(6.8);
  });

  it("no convierte mAh a Wh sin voltaje", () => {
    const resultado = convertirUnidad(5_000, "mAh", "Wh");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivo).toBe("dimensiones_incompatibles");
    expect(convertirCargaAEnergiaWh(5_000, null)).toBeNull();
    expect(convertirCargaAEnergiaWh(5_000, undefined)).toBeNull();
  });

  it("convierte carga a energía cuando se conoce el voltaje", () => {
    expect(convertirCargaAEnergiaWh(5_000, 3.7)).toBe(18.5);
  });

  it("rechaza carga eléctrica negativa en convertirCargaAEnergiaWh", () => {
    expect(convertirCargaAEnergiaWh(-5_000, 3.7)).toBeNull();
  });

  it("conserva cero en convertirCargaAEnergiaWh cuando el voltaje es válido", () => {
    expect(convertirCargaAEnergiaWh(0, 3.7)).toBe(0);
  });

  it("rechaza valores negativos en magnitudes físicas que no los admiten", () => {
    const resultado = convertirUnidad(-5, "GB", "MB");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivo).toBe("valor_invalido");
  });

  it("conserva el valor cero en conversiones válidas", () => {
    const resultado = convertirUnidad(0, "GB", "MB");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor).toBe(0);
  });

  it("convierte gramos a kilogramos sin confundir g con G", () => {
    const resultado = convertirUnidad(1, "g", "kg");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor).toBe(0.001);
  });

  it("rechaza resultados no finitos en lugar de devolver éxito", () => {
    const resultado = convertirUnidad(Number.MAX_VALUE, "GB", "B");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivo).toBe("valor_invalido");
    expect(convertirCargaAEnergiaWh(Number.MAX_VALUE, 3.7)).toBeNull();
  });

  it("rechaza dimensiones diferentes", () => {
    const resultado = convertirUnidad(8, "GB", "mm");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivo).toBe("dimensiones_incompatibles");
  });

  it("no convierte unidades ambiguas", () => {
    const resultado = convertirUnidad(1, "G", "GB");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivo).toBe("unidad_ambigua");
  });

  it("no convierte unidades desconocidas", () => {
    const resultado = convertirUnidad(1, "GB", "furlongs");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivo).toBe("unidad_desconocida");
  });

  it("rechaza valores no finitos", () => {
    const resultado = convertirUnidad(Number.NaN, "GB", "B");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivo).toBe("valor_invalido");
  });
});

describe("parsearDatoConUnidad", () => {
  it("extrae valor y unidad conservando el texto original", () => {
    const resultado = parsearDatoConUnidad("  6.8 in ");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.dato.valor).toBe(6.8);
    expect(resultado.dato.unidad).toBe("in");
    expect(resultado.dato.dimension).toBe("longitud");
    expect(resultado.dato.textoOriginal).toBe("  6.8 in ");
  });

  it("acepta coma decimal", () => {
    const resultado = parsearDatoConUnidad("6,8 in");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.dato.valor).toBe(6.8);
  });

  it("rechaza separadores de miles ambiguos", () => {
    for (const texto of [
      "1.000 GB",
      "1,000 MB",
      "-1.000 GB",
      "42.000 mAh",
    ]) {
      const resultado = parsearDatoConUnidad(texto);
      expect(resultado.ok).toBe(false);
      if (resultado.ok) continue;
      expect(resultado.motivo).toBe("formato_invalido");
      expect(resultado.textoOriginal).toBe(texto);
    }
  });

  it("acepta decimales legítimos con tres cifras no ambiguas", () => {
    const casos = [
      { texto: "1.234 kg", valor: 1.234, unidad: "kg" },
      { texto: "2.500 GHz", valor: 2.5, unidad: "GHz" },
      { texto: "3.750 Wh", valor: 3.75, unidad: "Wh" },
      { texto: "6.875 mm", valor: 6.875, unidad: "mm" },
    ];

    for (const { texto, valor, unidad } of casos) {
      const resultado = parsearDatoConUnidad(texto);
      expect(resultado.ok).toBe(true);
      if (!resultado.ok) continue;
      expect(resultado.dato.valor).toBe(valor);
      expect(resultado.dato.unidad).toBe(unidad);
    }
  });

  it("acepta la comilla ASCII estándar como alias de pulgadas", () => {
    const resultado = parsearDatoConUnidad('6.8"');
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.dato.valor).toBe(6.8);
    expect(resultado.dato.unidad).toBe("in");
    expect(resultado.dato.dimension).toBe("longitud");
  });

  it("rechaza magnitudes físicas con valores negativos", () => {
    for (const texto of ["-8 GB", "-5000 mAh", "-6.8 in", "-120 Hz"]) {
      const resultado = parsearDatoConUnidad(texto);
      expect(resultado.ok).toBe(false);
      if (resultado.ok) continue;
      expect(resultado.motivo).toBe("formato_invalido");
    }
  });

  it("conserva valores cero en magnitudes físicas válidas", () => {
    for (const { texto, unidad } of [
      { texto: "0 mm", unidad: "mm" },
      { texto: "0 ms", unidad: "ms" },
      { texto: "0 Wh", unidad: "Wh" },
      { texto: "0 %", unidad: "%" },
    ]) {
      const resultado = parsearDatoConUnidad(texto);
      expect(resultado.ok).toBe(true);
      if (!resultado.ok) continue;
      expect(resultado.dato.valor).toBe(0);
      expect(resultado.dato.unidad).toBe(unidad);
    }
  });

  it("acepta decimales inequívocos con tres cifras", () => {
    const punto = parsearDatoConUnidad("0.001 GB");
    const coma = parsearDatoConUnidad("0,001 GB");
    expect(punto.ok).toBe(true);
    expect(coma.ok).toBe(true);
    if (!punto.ok || !coma.ok) return;
    expect(punto.dato.valor).toBe(0.001);
    expect(coma.dato.valor).toBe(0.001);
  });

  it("no lanza excepciones con objetos sin conversión primitiva", () => {
    expect(() => parsearDatoConUnidad(Object.create(null))).not.toThrow();
    expect(parsearDatoConUnidad(Object.create(null)).ok).toBe(false);
  });

  it("rechaza unidades ambiguas", () => {
    expect(parsearDatoConUnidad("5000 mAh").ok).toBe(true);
    const ambiguo = parsearDatoConUnidad("8 G");
    expect(ambiguo.ok).toBe(false);
    if (ambiguo.ok) return;
    expect(ambiguo.motivo).toBe("unidad_ambigua");
  });

  it("rechaza textos vacíos o sin unidad", () => {
    expect(parsearDatoConUnidad("").ok).toBe(false);
    expect(parsearDatoConUnidad("6.8").ok).toBe(false);
    expect(parsearDatoConUnidad(null).ok).toBe(false);
  });
});

describe("sonUnidadesComparables", () => {
  it("permite comparar unidades de la misma dimensión y sistema", () => {
    expect(sonUnidadesComparables("GHz", "MHz")).toBe(true);
    expect(sonUnidadesComparables("GB", "TB")).toBe(true);
    expect(sonUnidadesComparables("g", "kg")).toBe(true);
  });

  it("no compara GB con GiB porque son sistemas distintos", () => {
    expect(sonUnidadesComparables("GB", "GiB")).toBe(false);
  });

  it("no compara unidades ambiguas ni desconocidas", () => {
    expect(sonUnidadesComparables("G", "GB")).toBe(false);
    expect(sonUnidadesComparables("GB", "furlongs")).toBe(false);
  });

  it("no compara dimensiones diferentes", () => {
    expect(sonUnidadesComparables("GB", "mm")).toBe(false);
  });
});
