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
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/1/14/OnePlus_13_back.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:OnePlus_13_back.jpg",
    autor: "Maksdroider",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
    nota: "Fotografía de la parte trasera del OnePlus 13 en acabado Black Eclipse; el registro del catálogo no especifica color.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/9/99/IPhone_15_Pro_Max.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:IPhone_15_Pro_Max.jpg",
    autor: "Kyu3",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
    nota: "Fotografía frontal de un iPhone 15 Pro Max en exhibición; el registro identifica la capacidad de 256 GB.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/1/1e/Samsung_Galaxy_S25_Ultra_2025.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_S25_Ultra_2025.jpg",
    autor: "Captainmorlypogi1959",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
    nota: "Fotografía de la parte trasera de un Galaxy S25 Ultra en exhibición; el registro del catálogo indica Titanium Black.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/e/e8/HK_%E4%B8%AD%E7%92%B0_Central_%E7%9A%87%E5%90%8E%E5%A4%A7%E9%81%93%E4%B8%AD_33_Queen%27s_Road_Central_shop_%E8%B1%90%E6%BE%A4%E9%9B%BB%E5%99%A8_Fortress_Store_%E6%89%8B%E6%A9%9F_smartphone_XiaoMi_14_Ultra_watch_May_2024_R12S_01.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:HK_%E4%B8%AD%E7%92%B0_Central_%E7%9A%87%E5%90%8E%E5%A4%A7%E9%81%93%E4%B8%AD_33_Queen%27s_Road_Central_shop_%E8%B1%90%E6%BE%A4%E9%9B%BB%E5%99%A8_Fortress_Store_%E6%89%8B%E6%A9%9F_smartphone_XiaoMi_14_Ultra_watch_May_2024_R12S_01.jpg",
    autor: "DUSOAM 68 HNWUA",
    fuente: "Wikimedia Commons",
    licencia: "CC0 1.0",
    urlLicencia: "https://creativecommons.org/publicdomain/zero/1.0/",
    cambios: "Sin modificaciones.",
    nota: "Fotografía CC0 de un Xiaomi 14 Ultra en exhibición; la etiqueta de tienda muestra la configuración 16GB + 512GB.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/4/41/Nothing-Tokyo-2024-04-18_151.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:Nothing-Tokyo-2024-04-18_151.jpg",
    autor: "RuinDig/Yuki Uchida",
    fuente: "Wikimedia Commons",
    licencia: "CC BY 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by/4.0/",
    cambios: "Sin modificaciones.",
    nota: "Fotografía de exhibición del Nothing Ear (a) negro; corresponde al acabado Black Edition del registro.",
  },
  {
    urlImagen: "https://upload.wikimedia.org/wikipedia/commons/4/48/Xiaomi_14T_Pro.jpg",
    paginaOrigen: "https://commons.wikimedia.org/wiki/File:Xiaomi_14T_Pro.jpg",
    autor: "Petar Milošević",
    fuente: "Wikimedia Commons",
    licencia: "CC BY-SA 4.0",
    urlLicencia: "https://creativecommons.org/licenses/by-sa/4.0/",
    cambios: "Sin modificaciones.",
    nota: "Fotografía del Xiaomi 14T Pro en acabado Titan Blue; el registro del catálogo no especifica color.",
  },
] as const;

export function obtenerAtribucionImagen(
  urlImagen: string | null | undefined,
): AtribucionImagenProducto | null {
  if (!urlImagen) return null;
  return ATRIBUCIONES_IMAGENES.find((imagen) => imagen.urlImagen === urlImagen) ?? null;
}
