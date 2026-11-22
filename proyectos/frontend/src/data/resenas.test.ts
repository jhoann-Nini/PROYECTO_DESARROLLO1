import { describe, expect, it } from "vitest";
import {
  MAX_RESENAS_POR_HORA,
  REGLAS_RESENAS,
  agregarResenaCreada,
  aplicarResenaEditada,
  contieneLenguajeNoPermitido,
  esResenaPublica,
  obtenerPalabrasDetectadas,
  type ReglaResenas,
} from "./resenas";
import type { EstadoModeracionResena } from "@/types/moderacion";

describe("REGLAS_RESENAS", () => {
  it("fija un máximo de 5 reseñas por hora", () => {
    expect(MAX_RESENAS_POR_HORA).toBe(5);
    expect(REGLAS_RESENAS.maxPorHora).toBe(5);
  });

  it("expone el mensaje oficial para 409 (duplicado)", () => {
    expect(REGLAS_RESENAS.mensajes.duplicada).toBe(
      "Ya has valorado este producto. Puedes editar tu reseña existente."
    );
  });

  it("expone el mensaje oficial para 429 (límite por hora)", () => {
    expect(REGLAS_RESENAS.mensajes.limite).toBe(
      "Has alcanzado el límite de 5 reseñas por hora. Intenta de nuevo más tarde."
    );
  });

  it("cumple el contrato exportado", () => {
    const regla: ReglaResenas = REGLAS_RESENAS;
    expect(regla.mensajes.duplicada).toBeTruthy();
    expect(regla.mensajes.limite).toBeTruthy();
  });
});

describe("obtenerPalabrasDetectadas", () => {
  it("detecta palabras prohibidas ignorando mayúsculas y tildes", () => {
    expect(obtenerPalabrasDetectadas("Esto es una BASURA")).toEqual(["basura"]);
    expect(obtenerPalabrasDetectadas("qué estúpida frase")).toEqual([
      "estupida",
    ]);
  });

  it("detecta evasiones con símbolos y espacios", () => {
    expect(obtenerPalabrasDetectadas("Es una b@sura total")).toEqual([
      "basura",
    ]);
    expect(obtenerPalabrasDetectadas("es una m i e r d a lo sé")).toEqual([
      "mierda",
    ]);
    expect(obtenerPalabrasDetectadas("qué ESTU-PIDO eres")).toEqual([
      "estupido",
    ]);
  });

  it("no marca texto limpio ni falsos positivos por subcadena", () => {
    expect(obtenerPalabrasDetectadas("operación bien hecha")).toEqual([]);
    expect(obtenerPalabrasDetectadas("excelente producto")).toEqual([]);
    expect(obtenerPalabrasDetectadas("buen rendimiento y batería")).toEqual([]);
    expect(obtenerPalabrasDetectadas("computadora")).toEqual([]);
    expect(obtenerPalabrasDetectadas("computadoras")).toEqual([]);
    expect(obtenerPalabrasDetectadas("último")).toEqual([]);
    expect(obtenerPalabrasDetectadas("últimos")).toEqual([]);
    expect(obtenerPalabrasDetectadas("sodio")).toEqual([]);
    expect(obtenerPalabrasDetectadas("estimulante")).toEqual([]);
  });

  it("detecta palabras bloqueadas dentro de texto válido sin marcar el resto", () => {
    expect(
      obtenerPalabrasDetectadas("La computadora es una basura, no compren ahí")
    ).toEqual(["basura"]);
    expect(obtenerPalabrasDetectadas("El último pedido fue un timo")).toEqual([
      "timo",
    ]);
  });

  it("detecta evasiones con leet, símbolos y espacios", () => {
    expect(obtenerPalabrasDetectadas("es un 1diota")).toEqual(["idiota"]);
    expect(obtenerPalabrasDetectadas("qué t1mo de tienda")).toEqual(["timo"]);
    expect(obtenerPalabrasDetectadas("p.u.t.a experiencia")).toEqual(["puta"]);
    expect(obtenerPalabrasDetectadas("m13rda de servicio")).toEqual(["mierda"]);
    expect(obtenerPalabrasDetectadas("b a s u r a")).toEqual(["basura"]);
  });

  it("detecta plurales simples, incluidos los que llevan tilde", () => {
    expect(
      obtenerPalabrasDetectadas("no quiero timos ni basuras")
    ).toEqual(["timo", "basura"]);
    expect(obtenerPalabrasDetectadas("son unos idiotas")).toEqual(["idiota"]);
    expect(obtenerPalabrasDetectadas("comentarios inútiles")).toEqual([
      "inutil",
    ]);
    expect(obtenerPalabrasDetectadas("varios insultos")).toEqual(["insulto"]);
  });

  it("devuelve cada término canónico una sola vez", () => {
    expect(obtenerPalabrasDetectadas("basura basura BASURA")).toEqual([
      "basura",
    ]);
  });

  it("mantiene contieneLenguajeNoPermitido alineado con el detector", () => {
    expect(contieneLenguajeNoPermitido("computadora")).toBe(false);
    expect(contieneLenguajeNoPermitido("último")).toBe(false);
    // Caso 6: una palabra ambigua sobre el producto no impide publicar;
    // un insulto o la misma palabra dirigida a una persona, sí.
    expect(contieneLenguajeNoPermitido("esto es una basura")).toBe(false);
    expect(contieneLenguajeNoPermitido("eres una basura")).toBe(true);
    expect(contieneLenguajeNoPermitido("esto es una mierda")).toBe(true);
  });
});

describe("alineación con el backend (Fase 1)", () => {
  it("detecta palabras seguidas de signos aunque '!' sea sustitución leet", () => {
    expect(obtenerPalabrasDetectadas("mierda!")).toEqual(["mierda"]);
    expect(obtenerPalabrasDetectadas("¡idiota!")).toEqual(["idiota"]);
  });

  it("no retiene críticas legítimas de compra", () => {
    expect(obtenerPalabrasDetectadas("La tienda fue una estafa, nunca llegó")).toEqual([]);
    expect(obtenerPalabrasDetectadas("Me parece un fraude el precio")).toEqual([]);
    expect(obtenerPalabrasDetectadas("Recibo mucho spam de la marca")).toEqual([]);
  });

  it("no confunde números de especificaciones con evasiones leet", () => {
    expect(obtenerPalabrasDetectadas("Tiene 4 GB y 128 GB, carga en 30 min")).toEqual([]);
  });
});

describe("listas públicas de reseñas y estado de moderación", () => {
  type ResenaPrueba = {
    idResena: number;
    comentario: string;
    estadoModeracion?: EstadoModeracionResena | null;
  };
  const base: ResenaPrueba = { idResena: 1, comentario: "Buen producto" };

  it("solo considera públicas las reseñas PUBLICADA o sin estado", () => {
    expect(esResenaPublica({ estadoModeracion: "PUBLICADA" })).toBe(true);
    expect(esResenaPublica({})).toBe(true);
    expect(esResenaPublica({ estadoModeracion: null })).toBe(true);
    expect(esResenaPublica({ estadoModeracion: "PENDIENTE" })).toBe(false);
    expect(esResenaPublica({ estadoModeracion: "RECHAZADA" })).toBe(false);
  });

  it("no agrega a la lista pública una reseña recién creada que quedó en revisión", () => {
    const lista = [{ ...base, idResena: 2 }];
    expect(agregarResenaCreada(lista, { ...base, estadoModeracion: "PENDIENTE" })).toEqual(lista);
    expect(
      agregarResenaCreada(lista, { ...base, estadoModeracion: "PUBLICADA" }).map((r) => r.idResena),
    ).toEqual([1, 2]);
  });

  it("retira de la lista una reseña editada que volvió a revisión", () => {
    const lista = [{ ...base }, { ...base, idResena: 2 }];
    expect(
      aplicarResenaEditada(lista, { ...base, comentario: "editada", estadoModeracion: "PENDIENTE" })
        .map((r) => r.idResena),
    ).toEqual([2]);
    expect(
      aplicarResenaEditada(lista, { ...base, comentario: "editada", estadoModeracion: "PUBLICADA" })[0].comentario,
    ).toBe("editada");
  });
});
