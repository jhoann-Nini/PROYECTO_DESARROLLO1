export interface AtribucionImagenProducto {
  urlImagen: string;
  paginaOrigen: string;
  autor: string;
  licencia: string;
  urlLicencia: string;
  cambios: string;
  nota?: string;
}

/**
 * Registro explícito de imágenes con licencia y autoría verificadas.
 * No añadir una imagen aquí sin revisar la página de origen y sus términos.
 */
export const ATRIBUCIONES_IMAGENES: readonly AtribucionImagenProducto[] = [
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/e/e7/SAMSUNG_Galaxy_S24_Ultra.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:SAMSUNG_Galaxy_S24_Ultra.jpg",
    autor: "Dinkun Chen",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/3/34/OnePlusPad2.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:OnePlusPad2.jpg",
    autor: "Dajimoxia",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/8/87/About_iPad_Pro_11-inch_%28M4%29.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:About_iPad_Pro_11-inch_(M4).jpg",
    autor: "メイド理世",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/8/84/Nothing_ear2_%28cropped%29.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:Nothing_ear2_(cropped).jpg",
    autor: "Ganesh Mohan T",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Se utiliza el archivo recortado publicado por el autor, sin modificaciones adicionales.",
    nota: "La fotografía representa el modelo Nothing Ear (2); no acredita por sí sola la variante comercial de color.",
  },
] as const;

export function obtenerAtribucionImagen(
  urlImagen: string | null | undefined,
): AtribucionImagenProducto | null {
  if (!urlImagen) return null;
  return ATRIBUCIONES_IMAGENES.find((imagen) => imagen.urlImagen === urlImagen) ?? null;
}
