import { describe, expect, it } from "vitest";
import { obtenerCreditoImagenProducto } from "./creditosImagenes";

describe("créditos de imágenes del catálogo", () => {
  it("devuelve atribución y licencia para cada imagen incorporada", () => {
    const urls = [
      "https://upload.wikimedia.org/wikipedia/commons/e/e7/SAMSUNG_Galaxy_S24_Ultra.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/8/87/About_iPad_Pro_11-inch_%28M4%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/3/34/OnePlusPad2.jpg",
    ];

    for (const url of urls) {
      const credito = obtenerCreditoImagenProducto(url);
      expect(credito).not.toBeNull();
      expect(credito?.autor).toBeTruthy();
      expect(credito?.paginaFuente).toMatch(/^https:\/\//);
      expect(credito?.licencia).toBe("CC BY-SA 4.0");
      expect(credito?.urlLicencia).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
      expect(credito?.cambios).toBe("Sin modificaciones.");
    }
  });

  it("no inventa licencia para URLs sin metadatos", () => {
    expect(obtenerCreditoImagenProducto("https://images.unsplash.com/example")).toBeNull();
    expect(obtenerCreditoImagenProducto(null)).toBeNull();
  });
});
