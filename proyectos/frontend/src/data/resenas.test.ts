import { describe, expect, it } from "vitest";
import {
  MAX_RESENAS_POR_HORA,
  REGLAS_RESENAS,
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
