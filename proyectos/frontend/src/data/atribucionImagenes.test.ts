import { describe, expect, it } from "vitest";
import {
  ATRIBUCIONES_IMAGENES,
  obtenerAtribucionImagen,
} from "./atribucionImagenes";

describe("atribuciones de imágenes del catálogo", () => {
  it("registra cuatro fotografías con procedencia y licencia CC BY-SA 4.0", () => {
    expect(ATRIBUCIONES_IMAGENES).toHaveLength(4);
    for (const imagen of ATRIBUCIONES_IMAGENES) {
      expect(imagen.urlImagen).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
      expect(imagen.paginaOrigen).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(imagen.autor.trim()).not.toBe("");
      expect(imagen.licencia).toBe("CC BY-SA 4.0");
      expect(imagen.urlLicencia).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
      expect(imagen.cambios.trim()).not.toBe("");
    }
  });

  it("solo devuelve atribución para una URL registrada exactamente", () => {
    expect(obtenerAtribucionImagen(ATRIBUCIONES_IMAGENES[0].urlImagen)?.autor).toBe("Dinkun Chen");
    expect(obtenerAtribucionImagen("https://images.unsplash.com/foto-generica")).toBeNull();
    expect(obtenerAtribucionImagen(null)).toBeNull();
  });

  it("advierte que la fotografía de Ear (2) no confirma la variante de color", () => {
    const ear = ATRIBUCIONES_IMAGENES.find((imagen) => imagen.autor === "Ganesh Mohan T");
    expect(ear?.nota).toContain("no acredita");
  });
});
