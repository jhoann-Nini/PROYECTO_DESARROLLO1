import { describe, expect, it } from "vitest";
import {
  MAX_RESENAS_POR_HORA,
  REGLAS_RESENAS,
  contieneLenguajeNoPermitido,
  obtenerPalabrasDetectadas,
  type ReglaResenas,
} from "./resenas";

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
    expect(obtenerPalabrasDetectadas("Esto es una ESTAFA")).toEqual(["estafa"]);
    expect(obtenerPalabrasDetectadas("qué estúpida frase")).toEqual([
      "estupida",
    ]);
  });

  it("detecta evasiones con símbolos y espacios", () => {
    expect(obtenerPalabrasDetectadas("Es una est@fa total")).toEqual([
      "estafa",
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
      obtenerPalabrasDetectadas("La computadora es una estafa, no compren ahí")
    ).toEqual(["estafa"]);
    expect(obtenerPalabrasDetectadas("El último pedido fue un timo")).toEqual([
      "timo",
    ]);
  });

  it("detecta evasiones con leet, símbolos y espacios", () => {
    expect(obtenerPalabrasDetectadas("es un sp4m")).toEqual(["spam"]);
    expect(obtenerPalabrasDetectadas("qué t1mo de tienda")).toEqual(["timo"]);
    expect(obtenerPalabrasDetectadas("p.u.t.a experiencia")).toEqual(["puta"]);
    expect(obtenerPalabrasDetectadas("m13rda de servicio")).toEqual(["mierda"]);
    expect(obtenerPalabrasDetectadas("e s t a f a")).toEqual(["estafa"]);
  });

  it("detecta plurales simples, incluidos los que llevan tilde", () => {
    expect(
      obtenerPalabrasDetectadas("no quiero estafas ni timos")
    ).toEqual(["estafa", "timo"]);
    expect(obtenerPalabrasDetectadas("son unos idiotas")).toEqual(["idiota"]);
    expect(obtenerPalabrasDetectadas("comentarios inútiles")).toEqual([
      "inutil",
    ]);
    expect(obtenerPalabrasDetectadas("varias estafas")).toEqual(["estafa"]);
  });

  it("devuelve cada término canónico una sola vez", () => {
    expect(obtenerPalabrasDetectadas("estafa estafa ESTAFA")).toEqual([
      "estafa",
    ]);
  });

  it("mantiene contieneLenguajeNoPermitido alineado con el detector", () => {
    expect(contieneLenguajeNoPermitido("computadora")).toBe(false);
    expect(contieneLenguajeNoPermitido("último")).toBe(false);
    expect(contieneLenguajeNoPermitido("esto es una estafa")).toBe(true);
  });
});
