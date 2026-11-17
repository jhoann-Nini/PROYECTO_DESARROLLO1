export interface CreditoImagenProducto {
  autor: string;
  paginaFuente: string;
  licencia: string;
  urlLicencia: string;
  cambios: string;
}

/**
 * Créditos comprobados de imágenes concretas. No se infiere una licencia
 * por el dominio del archivo: cada URL debe tener su propia ficha de origen.
 */
const CREDITOS_POR_URL: Record<string, CreditoImagenProducto> = {
  "https://upload.wikimedia.org/wikipedia/commons/e/e7/SAMSUNG_Galaxy_S24_Ultra.jpg": {
    autor: "Dinkun Chen",
    paginaFuente: "https://commons.wikimedia.org/wiki/File:SAMSUNG_Galaxy_S24_Ultra.jpg",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
  },
  "https://upload.wikimedia.org/wikipedia/commons/8/87/About_iPad_Pro_11-inch_%28M4%29.jpg": {
    autor: "メイド理世",
    paginaFuente: "https://commons.wikimedia.org/wiki/File:About_iPad_Pro_11-inch_(M4).jpg",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
  },
  "https://upload.wikimedia.org/wikipedia/commons/3/34/OnePlusPad2.jpg": {
    autor: "Dajimoxia",
    paginaFuente: "https://commons.wikimedia.org/wiki/File:OnePlusPad2.jpg",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
  },
};

export function obtenerCreditoImagenProducto(
  url: string | null | undefined,
): CreditoImagenProducto | null {
  if (!url) return null;
  return CREDITOS_POR_URL[url] ?? null;
}
