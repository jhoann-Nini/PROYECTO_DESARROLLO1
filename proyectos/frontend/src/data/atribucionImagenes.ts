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
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/4/40/Redmi_Note_14_ProPlus.jpg?utm_campaign=index&utm_content=original&utm_source=commons.wikimedia.org",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:Redmi_Note_14_ProPlus.jpg",
    autor: "Maksdroider",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
    nota: "Fotografía del Redmi Note 14 Pro+ 5G en acabado Lavender Purple; la capacidad 8 GB/256 GB se verifica por separado con la ficha de Xiaomi Colombia.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/f/fa/IPhone_15_Pro_Max_2024.jpg?utm_campaign=index&utm_content=original&utm_source=commons.wikimedia.org",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:IPhone_15_Pro_Max_2024.jpg",
    autor: "Captainmorlypogi1959",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
    nota: "Fotografía frontal identificada como iPhone 15 Pro Max; no acredita por sí sola la capacidad de 256 GB.",
  },
  {
    urlImagen: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/Samsung_Galaxy_S25_Ultra_2025_%282%29.jpg/960px-Samsung_Galaxy_S25_Ultra_2025_%282%29.jpg?utm_campaign=index&utm_content=thumbnail&utm_source=commons.wikimedia.org",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_S25_Ultra_2025_(2).jpg",
    autor: "Captainmorlypogi1959",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Se utiliza la miniatura de 960 px generada por Wikimedia Commons; sin otras modificaciones.",
    nota: "Fotografía frontal del Galaxy S25 Ultra; la configuración colombiana 12 GB/1 TB se verifica por separado con Samsung.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/1/14/OnePlus_13_back.jpg?utm_campaign=index&utm_content=original&utm_source=commons.wikimedia.org",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:OnePlus_13_back.jpg",
    autor: "Maksdroider",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
    nota: "Fotografía de la parte trasera del OnePlus 13 en acabado Black Eclipse; la ficha corresponde a la variante 16 GB/512 GB.",
  },
  {
    urlImagen: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Xiaomi_14T_Pro.jpg/960px-Xiaomi_14T_Pro.jpg?utm_campaign=index&utm_content=thumbnail&utm_source=commons.wikimedia.org",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:Xiaomi_14T_Pro.jpg",
    autor: "Petar Milošević",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Se utiliza la miniatura de 960 px generada por Wikimedia Commons; sin otras modificaciones.",
    nota: "Fotografía del Xiaomi 14T Pro en acabado Titan Blue; la configuración 12 GB/512 GB se verifica por separado con Xiaomi Colombia.",
  },

  {
    urlImagen: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/Nothing-Tokyo-2024-04-18_151.jpg/960px-Nothing-Tokyo-2024-04-18_151.jpg?utm_campaign=index&utm_content=thumbnail&utm_source=commons.wikimedia.org",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:Nothing-Tokyo-2024-04-18_151.jpg",
    autor: "RuinDig/Yuki Uchida",
    fuente: "Wikimedia Commons",
    licencia: "CC BY 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by/4.0/",
    cambios: "Se utiliza la miniatura de 960 px generada por Wikimedia Commons; sin otras modificaciones.",
    nota: "Fotografía de exhibición del estuche negro de Nothing Ear (a); el acabado Black también se confirma en el selector oficial de Nothing.",
  },

  {
    urlImagen: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Shibuya-Tokyo---2024-08-28_066.jpg/960px-Shibuya-Tokyo---2024-08-28_066.jpg?utm_campaign=index&utm_content=thumbnail&utm_source=commons.wikimedia.org",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:Shibuya-Tokyo---2024-08-28_066.jpg",
    autor: "RuinDig/Yuki Uchida",
    fuente: "Wikimedia Commons",
    licencia: "CC BY 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by/4.0/",
    cambios: "Se utiliza la miniatura de 960 px generada por Wikimedia Commons; sin otras modificaciones.",
    nota: "Fotografía del Xiaomi 14 Ultra negro expuesto en una tienda Xiaomi; el registro del catálogo no fija el color.",
  },

  {
    urlImagen: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/Shibuya-Tokyo---2024-08-28_059.jpg/960px-Shibuya-Tokyo---2024-08-28_059.jpg?utm_campaign=index&utm_content=thumbnail&utm_source=commons.wikimedia.org",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:Shibuya-Tokyo---2024-08-28_059.jpg",
    autor: "RuinDig/Yuki Uchida",
    fuente: "Wikimedia Commons",
    licencia: "CC BY 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by/4.0/",
    cambios: "Se utiliza la miniatura de 960 px generada por Wikimedia Commons; sin otras modificaciones.",
    nota: "Fotografía de un Redmi Note 13 Pro+ 5G expuesto en una tienda Xiaomi; el dispositivo mostrado es blanco, pero el registro del catálogo no fija color.",
  },
] as const;

export function obtenerAtribucionImagen(
  urlImagen: string | null | undefined,
): AtribucionImagenProducto | null {
  if (!urlImagen) return null;
  return ATRIBUCIONES_IMAGENES.find((imagen) => imagen.urlImagen === urlImagen) ?? null;
}
