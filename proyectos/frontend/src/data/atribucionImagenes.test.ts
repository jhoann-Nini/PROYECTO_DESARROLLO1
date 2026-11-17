import { describe, expect, it } from "vitest";
import {
  ATRIBUCIONES_IMAGENES,
  obtenerAtribucionImagen,
} from "./atribucionImagenes";

describe("atribuciones de imágenes del catálogo", () => {
  it("registra doce fotografías con procedencia, autoría y licencia identificadas", () => {
    expect(ATRIBUCIONES_IMAGENES).toHaveLength(12);
    for (const imagen of ATRIBUCIONES_IMAGENES) {
      expect(imagen.urlImagen).toMatch(/^https:\/\//);
      expect(imagen.paginaOrigen).toMatch(/^https:\/\//);
      expect(imagen.fuente.trim()).not.toBe("");
      expect(imagen.autor.trim()).not.toBe("");
      expect(["CC BY-SA 4.0", "CC BY 4.0", "CC BY-ND 2.0"]).toContain(imagen.licencia);
      expect(imagen.urlLicencia).toMatch(/^https:\/\/creativecommons\.org\/licenses\//);
      expect(imagen.cambios.trim()).not.toBe("");
    }
  });

  it("solo devuelve atribución para una URL registrada exactamente", () => {
    expect(obtenerAtribucionImagen(ATRIBUCIONES_IMAGENES[0].urlImagen)?.autor).toBe("Dinkun Chen");
    expect(obtenerAtribucionImagen("https://images.unsplash.com/foto-generica")).toBeNull();
    expect(obtenerAtribucionImagen(null)).toBeNull();
  });

  it("registra Nothing Phone (2a) Special Edition con CC BY 4.0", () => {
    const special = ATRIBUCIONES_IMAGENES.find((imagen) => imagen.autor === "RuinDig/Yuki Uchida");
    expect(special?.licencia).toBe("CC BY 4.0");
    expect(special?.nota).toContain("no acredita");
  });

  it("mantiene intacta la fotografía Sony bajo CC BY-ND 2.0", () => {
    const sony = ATRIBUCIONES_IMAGENES.find((imagen) => imagen.fuente === "Flickr");
    expect(sony?.licencia).toBe("CC BY-ND 2.0");
    expect(sony?.titulo).toBe("SONY Noise Canceling Headphone WH-1000XM5");
    expect(sony?.cambios).toContain("sin modificaciones");
  });

  it("registra Samsung Galaxy A55 5G con CC BY-SA 4.0", () => {
    const a55 = ATRIBUCIONES_IMAGENES.find((imagen) => imagen.autor === "Captainmorlypogi1959");
    expect(a55?.licencia).toBe("CC BY-SA 4.0");
    expect(a55?.paginaOrigen).toContain("Samsung_Galaxy_A55_5G_2024");
  });

  it("registra iPhone 13 con CC BY-SA 4.0", () => {
    const iphone = ATRIBUCIONES_IMAGENES.find((imagen) => imagen.autor === "Kskhh");
    expect(iphone?.licencia).toBe("CC BY-SA 4.0");
    expect(iphone?.nota).toContain("128 GB");
  });

  it("registra iPhone 15 Pro Max con CC BY-SA 4.0", () => {
    const iphone = ATRIBUCIONES_IMAGENES.find((imagen) => imagen.autor === "Kyu3");
    expect(iphone?.licencia).toBe("CC BY-SA 4.0");
    expect(iphone?.paginaOrigen).toContain("IPhone_15_Pro_Max");
  });

  it("registra Galaxy S25 Ultra con CC BY-SA 4.0", () => {
    const s25 = ATRIBUCIONES_IMAGENES.find((imagen) => imagen.paginaOrigen.includes("Samsung_Galaxy_S25_Ultra_2025"));
    expect(s25?.autor).toBe("Captainmorlypogi1959");
    expect(s25?.licencia).toBe("CC BY-SA 4.0");
  });

  it("registra OnePlus 13 con CC BY-SA 4.0", () => {
    const oneplus = ATRIBUCIONES_IMAGENES.find((imagen) => imagen.autor === "Maksdroider" && imagen.paginaOrigen.includes("OnePlus_13_back"));
    expect(oneplus?.licencia).toBe("CC BY-SA 4.0");
    expect(oneplus?.nota).toContain("Black Eclipse");
  });

  it("registra Redmi Note 14 Pro+ con CC BY-SA 4.0", () => {
    const redmi = ATRIBUCIONES_IMAGENES.find((imagen) => imagen.autor === "Maksdroider");
    expect(redmi?.licencia).toBe("CC BY-SA 4.0");
    expect(redmi?.paginaOrigen).toContain("Redmi_Note_14_ProPlus");
    expect(redmi?.nota).toContain("no especifica color");
  });

  it("advierte que la fotografía de Ear (2) no confirma la variante de color", () => {
    const ear = ATRIBUCIONES_IMAGENES.find((imagen) => imagen.autor === "Ganesh Mohan T");
    expect(ear?.nota).toContain("no acredita");
  });
});
