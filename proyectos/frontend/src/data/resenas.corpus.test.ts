import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analizarComentario, contieneLenguajeNoPermitido } from "./resenas";

/**
 * Caso 6: el filtro del frontend clasifica igual que el corpus compartido con
 * el backend (proyectos/fixtures/moderacion/corpus-moderacion.json), que
 * también comprueba ResenaModerationServiceCorpusTest.
 */
interface CasoCorpus {
  texto: string;
  riesgo: "ninguno" | "bajo" | "medio" | "alto";
  soloBackend?: boolean;
}

const corpus = JSON.parse(
  readFileSync(resolve(process.cwd(), "../fixtures/moderacion/corpus-moderacion.json"), "utf8"),
) as { casos: CasoCorpus[] };

const casosFrontend = corpus.casos.filter((caso) => !caso.soloBackend);

describe("filtro de moderación: corpus compartido con el backend", () => {
  it("incluye casos de todos los niveles", () => {
    const niveles = new Set(casosFrontend.map((caso) => caso.riesgo));
    expect([...niveles].sort()).toEqual(["alto", "bajo", "medio", "ninguno"]);
  });

  it.each(casosFrontend.map((caso) => [caso.riesgo, caso.texto] as const))(
    "[%s] %s",
    (riesgo, texto) => {
      expect(analizarComentario(texto).riesgo).toBe(riesgo);
      // Solo medio y alto impiden publicar desde el formulario.
      expect(contieneLenguajeNoPermitido(texto)).toBe(riesgo === "medio" || riesgo === "alto");
    },
  );
});
