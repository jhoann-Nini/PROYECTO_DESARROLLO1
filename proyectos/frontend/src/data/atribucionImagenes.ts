export interface AtribucionImagenProducto {
  urlImagen: string;
  paginaOrigen: string;
  autor: string;
  fuente: string;
  titulo?: string;
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
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/3/34/OnePlusPad2.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:OnePlusPad2.jpg",
    autor: "Dajimoxia",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/8/87/About_iPad_Pro_11-inch_%28M4%29.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:About_iPad_Pro_11-inch_(M4).jpg",
    autor: "メイド理世",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/8/84/Nothing_ear2_%28cropped%29.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:Nothing_ear2_(cropped).jpg",
    autor: "Ganesh Mohan T",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Se utiliza el archivo recortado publicado por el autor, sin modificaciones adicionales.",
    nota: "La fotografía representa el modelo Nothing Ear (2); no acredita por sí sola la variante comercial de color.",
  },

  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/3/37/Nothing-Design-Event-Tokyo-2024-07-05_028.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:Nothing-Design-Event-Tokyo-2024-07-05_028.jpg",
    autor: "RuinDig/Yuki Uchida",
    fuente: "Wikimedia Commons",
    licencia: "CC BY 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by/4.0/",
    cambios: "Sin modificaciones.",
    nota: "Fotografía de la edición especial en exhibición; no acredita por sí sola la variante de memoria y almacenamiento del registro.",
  },
  {
    urlImagen: "https://thehelpfulbuyer.com/assets/products/xm5.jpg",
    paginaOrigen: "https://www.flickr.com/photos/thebetterday4u/52436931175/",
    autor: "HS You",
    fuente: "Flickr",
    titulo: "SONY Noise Canceling Headphone WH-1000XM5",
    licencia: "CC BY-ND 2.0",
    urlLicencia: "https://creativecommons.org/licenses/by-nd/2.0/",
    cambios: "Archivo original sin modificaciones; se presenta a menor tamaño en la interfaz.",
    nota: "La fotografía muestra el acabado Silver; el registro del catálogo no especifica el color.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/8/8b/Samsung_Galaxy_A55_5G_2024.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_A55_5G_2024.jpg",
    autor: "Captainmorlypogi1959",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
    nota: "Fotografía del Galaxy A55 5G en exhibición; no se usa para inferir una variante de memoria o color.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/3/3c/IPhone_13.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:IPhone_13.jpg",
    autor: "Kskhh",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
    nota: "Fotografía de un iPhone 13 blanco; no verifica por sí sola la capacidad de 128 GB.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/4/40/Redmi_Note_14_ProPlus.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:Redmi_Note_14_ProPlus.jpg",
    autor: "Maksdroider",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
    nota: "Fotografía del Redmi Note 14 Pro+ 5G en acabado Lavender Purple; el registro del catálogo no especifica color.",
  },
] as const;

export function obtenerAtribucionImagen(
  urlImagen: string | null | undefined,
): AtribucionImagenProducto | null {
  if (!urlImagen) return null;
  return ATRIBUCIONES_IMAGENES.find((imagen) => imagen.urlImagen === urlImagen) ?? null;
}
