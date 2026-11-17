import type {
  AtributoFichaV2,
  CategoriaFichaTecnica,
  EstadoVerificacionFichaV2,
  FichaTecnicaV2,
  FuenteFichaV2,
  MetricaFichaV2,
  UnidadCanonica,
  VarianteFichaV2,
} from "@/types/fichaTecnica";

/**
 * Fichas técnicas estructuradas del piloto de ocho productos.
 *
 * Solo incluye datos publicados por fuentes identificables. Los precios,
 * disponibilidad y puntuaciones comerciales permanecen fuera de estas fichas.
 * Las métricas se conservan como informativas hasta que exista una metodología
 * homogénea y explícita para compararlas.
 */
const CONSULTA = "2026-11-16";

function atributo(
  clave: string,
  nombre: string,
  grupo: string,
  valor: string | number | boolean,
  fuenteId: string,
  unidad: UnidadCanonica | null = null,
): AtributoFichaV2 {
  if (typeof valor === "number") {
    return { clave, nombre, grupo, valor, unidad, valorOriginal: unidad ? `${valor} ${unidad}` : String(valor), fuenteId };
  }
  return { clave, nombre, grupo, valor, unidad: null, valorOriginal: String(valor), fuenteId };
}

function metrica(
  clave: string,
  nombre: string,
  grupo: string,
  valor: number,
  unidad: UnidadCanonica,
  fuenteId: string,
): MetricaFichaV2 {
  return {
    clave,
    nombre,
    grupo,
    valor,
    unidad,
    unidadOriginal: unidad,
    comparable: false,
    fuenteId,
  };
}

function fuente(
  id: string,
  nombre: string,
  url: string,
  varianteId: string | null = null,
  observaciones: string | null = null,
  fechaConsulta: string = CONSULTA,
): FuenteFichaV2 {
  return {
    id,
    tipo: "fabricante",
    nombre,
    url,
    fecha_consulta: fechaConsulta,
    varianteId,
    observaciones,
  };
}

function crearFicha(
  categoria: CategoriaFichaTecnica,
  estado_verificacion: EstadoVerificacionFichaV2,
  variantes: VarianteFichaV2[],
  atributos: AtributoFichaV2[],
  metricasComparables: MetricaFichaV2[],
  fuentes: FuenteFichaV2[],
): FichaTecnicaV2 {
  return {
    version_esquema: 2,
    categoria,
    estado_verificacion,
    variantes,
    atributos,
    metricasComparables,
    benchmarks: [],
    fuentes,
  };
}

const nothingPhoneFuente = "nothing-phone-2a";
const nothingPhoneVariante = "12gb-256gb";
const nothingPhone = crearFicha(
  "moviles",
  "verificado",
  [{
    id: nothingPhoneVariante,
    modelo: "Nothing Phone (2a) Special Edition",
    ram: "12 GB",
    almacenamiento: "256 GB",
    mercado: null,
  }],
  [
    atributo("procesador", "Procesador", "rendimiento", "MediaTek Dimensity 7200 Pro", nothingPhoneFuente),
    atributo("pantalla", "Pantalla", "pantalla", "Flexible AMOLED", nothingPhoneFuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.7, nothingPhoneFuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "1084 × 2412 píxeles", nothingPhoneFuente),
    atributo("tasa_refresco", "Tasa de refresco", "pantalla", 120, nothingPhoneFuente, "Hz"),
    atributo("ram", "Memoria RAM", "memoria", 12, nothingPhoneFuente, "GB"),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 256, nothingPhoneFuente, "GB"),
    atributo("camara_principal", "Cámara principal", "camaras", 50, nothingPhoneFuente, "mpx"),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", 50, nothingPhoneFuente, "mpx"),
    atributo("camara_frontal", "Cámara frontal", "camaras", 32, nothingPhoneFuente, "mpx"),
    atributo("capacidad_bateria", "Capacidad de batería", "bateria", 5000, nothingPhoneFuente, "mAh"),
    atributo("carga_rapida", "Carga por cable", "bateria", 45, nothingPhoneFuente, "W"),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.7, "in", nothingPhoneFuente),
    metrica("tasa_refresco", "Tasa de refresco", "pantalla", 120, "Hz", nothingPhoneFuente),
    metrica("capacidad_bateria", "Capacidad de batería", "bateria", 5000, "mAh", nothingPhoneFuente),
  ],
  [
    fuente("nothing-phone-2a", "Nothing — Phone (2a) Special Edition, especificaciones oficiales", "https://checkout.nothing.tech/pages/phone-2a", nothingPhoneVariante, "La página oficial identifica la Special Edition y publica sus especificaciones; el anuncio oficial confirma la configuración 12 GB RAM + 256 GB."),
    fuente("nothing-phone-2a-se", "Nothing Community — Phone (2a) Special Edition", "https://nothing.community/en/d/10897-introducing-phone-2a-special-edition", nothingPhoneVariante, "Anuncio oficial de la edición especial y de la configuración 12 GB RAM + 256 GB."),
  ],
);

const samsungFuente = "samsung-s24-ultra";
function crearSamsung(almacenamiento: "256" | "512"): FichaTecnicaV2 {
  const varianteId = `${almacenamiento}gb`;
  return crearFicha(
    "moviles",
    "verificado",
    [{
      id: varianteId,
      modelo: "Samsung Galaxy S24 Ultra",
      ram: "12 GB",
      almacenamiento: `${almacenamiento} GB`,
      mercado: null,
    }],
    [
      atributo("procesador", "Procesador", "rendimiento", "Qualcomm Snapdragon 8 Gen 3 for Galaxy", samsungFuente),
      atributo("pantalla", "Tecnología de pantalla", "pantalla", "Dynamic AMOLED 2X", samsungFuente),
      atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.8, samsungFuente, "in"),
      atributo("tasa_refresco", "Tasa de refresco", "pantalla", 120, samsungFuente, "Hz"),
      atributo("ram", "Memoria RAM", "memoria", 12, samsungFuente, "GB"),
      atributo("almacenamiento", "Almacenamiento", "almacenamiento", Number(almacenamiento), samsungFuente, "GB"),
      atributo("camara_principal", "Cámara principal", "camaras", 200, samsungFuente, "mpx"),
      atributo("capacidad_bateria", "Capacidad de batería", "bateria", 5000, samsungFuente, "mAh"),
    ],
    [
      metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.8, "in", samsungFuente),
      metrica("tasa_refresco", "Tasa de refresco", "pantalla", 120, "Hz", samsungFuente),
      metrica("capacidad_bateria", "Capacidad de batería", "bateria", 5000, "mAh", samsungFuente),
    ],
    [
      fuente("samsung-s24-ultra-specs", "Samsung — Galaxy S24 Series B2B Specification Sheet", "https://images.samsung.com/is/content/samsung/assets/us/2401/business/mobile/phones/galaxy/Galaxy_S24_Series_B2B_Spec_Sheet.pdf", varianteId, "La hoja oficial enumera 12 GB RAM y opciones de 256 GB, 512 GB y 1 TB para S24 Ultra."),
      fuente("samsung-s24-ultra-co", "Samsung Colombia — Galaxy S24 Ultra", "https://www.samsung.com/co/smartphones/galaxy-s24-ultra/specs/", varianteId, "Página oficial regional de especificaciones; la disponibilidad de colores y opciones puede variar por mercado."),
    ],
  );
}
const samsung256 = crearSamsung("256");
const samsung512 = crearSamsung("512");

const oneplusFuente = "oneplus-pad-2";
const oneplusVariante = "12gb-256gb";
const oneplusPad2 = crearFicha(
  "tablets",
  "verificado",
  [{
    id: oneplusVariante,
    modelo: "OnePlus Pad 2",
    ram: "12 GB",
    almacenamiento: "256 GB UFS 3.1",
    mercado: "Estados Unidos",
  }],
  [
    atributo("procesador", "Procesador", "rendimiento", "Qualcomm Snapdragon 8 Gen 3", oneplusFuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "LCD 7:5 ReadFit", oneplusFuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 12.1, oneplusFuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "3000 × 2120 píxeles", oneplusFuente),
    atributo("tasa_refresco", "Tasa de refresco máxima", "pantalla", 144, oneplusFuente, "Hz"),
    atributo("ram", "Memoria RAM", "memoria", 12, oneplusFuente, "GB"),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 256, oneplusFuente, "GB"),
    atributo("tipo_almacenamiento", "Tecnología de almacenamiento", "almacenamiento", "UFS 3.1", oneplusFuente),
    atributo("capacidad_bateria", "Capacidad de batería", "bateria", 9510, oneplusFuente, "mAh"),
    atributo("energia_bateria", "Energía de batería", "bateria", 36.99, oneplusFuente, "Wh"),
    atributo("carga_rapida", "Carga rápida", "bateria", 67, oneplusFuente, "W"),
    atributo("camara_trasera", "Cámara trasera", "camaras", 13, oneplusFuente, "mpx"),
    atributo("camara_frontal", "Cámara frontal", "camaras", 8, oneplusFuente, "mpx"),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 7", oneplusFuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.4", oneplusFuente),
    atributo("dimensiones", "Dimensiones", "diseno", "268,66 × 195,06 × 6,49 mm", oneplusFuente),
    atributo("peso", "Peso", "diseno", 584, oneplusFuente, "g"),
    atributo("sistema_operativo", "Sistema operativo", "software", "OxygenOS 14.1", oneplusFuente),
    atributo("densidad_pixeles", "Densidad de píxeles", "pantalla", 303, oneplusFuente),
    atributo("brillo", "Brillo", "pantalla", "600 nits (HBM 900 nits)", oneplusFuente),
    atributo("puerto_usb", "Puerto USB", "conectividad", "USB Type-C 3.2 Gen 1, hasta 5 Gbps", oneplusFuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 12.1, "in", oneplusFuente),
    metrica("tasa_refresco", "Tasa de refresco máxima", "pantalla", 144, "Hz", oneplusFuente),
    metrica("capacidad_bateria", "Capacidad de batería", "bateria", 9510, "mAh", oneplusFuente),
    metrica("energia_bateria", "Energía de batería", "bateria", 36.99, "Wh", oneplusFuente),
  ],
  [
    fuente("oneplus-pad-2", "OnePlus — Pad 2 specifications (US)", "https://www.oneplus.com/us/oneplus-pad-2/specs", oneplusVariante, "La ficha oficial estadounidense respalda la variante comercial de 12 GB RAM y 256 GB UFS 3.1."),
    fuente("oneplus-pad-2-cl", "OnePlus Chile — Pad 2, especificaciones", "https://www.oneplus.com/cl/oneplus-pad-2/specs", oneplusVariante, "Fuente oficial regional en español para pantalla, dimensiones, peso, sistema, batería, cámaras, conectividad y puerto USB. Se usa como referencia técnica y no como prueba del mercado de venta de la variante."),
  ],
);

const ipadFuente = "apple-ipad-pro-m4";
const ipadVariante = "16gb-1tb";
const ipadPro11M4 = crearFicha(
  "tablets",
  "verificado",
  [{
    id: ipadVariante,
    modelo: "Apple iPad Pro de 11 pulgadas (M4)",
    ram: "16 GB",
    almacenamiento: "1 TB",
    conectividad: null,
  }],
  [
    atributo("procesador", "Chip", "rendimiento", "Apple M4 · CPU de 10 núcleos · GPU de 10 núcleos", ipadFuente),
    atributo("pantalla", "Pantalla", "pantalla", "Ultra Retina XDR · Tandem OLED", ipadFuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 11, ipadFuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "2420 × 1668 píxeles", ipadFuente),
    atributo("tasa_refresco", "Tasa de refresco adaptativa máxima", "pantalla", 120, ipadFuente, "Hz"),
    atributo("ram", "Memoria RAM", "memoria", 16, ipadFuente, "GB"),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 1, ipadFuente, "TB"),
    atributo("brillo_hdr", "Brillo máximo HDR", "pantalla", 1600, ipadFuente, "nits"),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 11, "in", ipadFuente),
    metrica("tasa_refresco", "Tasa de refresco máxima", "pantalla", 120, "Hz", ipadFuente),
    metrica("brillo_hdr", "Brillo máximo HDR", "pantalla", 1600, "nits", ipadFuente),
  ],
  [
    fuente("apple-ipad-pro-m4", "Apple Support — iPad Pro de 11 pulgadas (M4), especificaciones técnicas", "https://support.apple.com/es-la/119892", ipadVariante, "Apple especifica que las configuraciones de 1 TB y 2 TB incluyen 16 GB de RAM y chip M4 con CPU de 10 núcleos y GPU de 10 núcleos."),
  ],
);

const lenovoFuente = "lenovo-psref-21jk0005ri";
const lenovoVariante = "16gb-512gb";
const thinkpadE14Gen5 = crearFicha(
  "laptops",
  "verificado",
  [{
    id: lenovoVariante,
    modelo: "ThinkPad E14 Gen 5 Intel",
    sku: "21JK0005RI",
    identificador: "21JK0005RI",
    mercado: "Rumania (región EET)",
    ram: "16 GB DDR4-3200 (8 GB soldados + 8 GB SO-DIMM)",
    almacenamiento: "512 GB SSD M.2 2242 PCIe 4.0 NVMe",
  }],
  [
    atributo("procesador", "Procesador", "rendimiento", "Intel Core i5-1335U · 10 núcleos · 12 hilos", lenovoFuente),
    atributo("ram", "Memoria RAM", "memoria", 16, lenovoFuente, "GB"),
    atributo("tipo_ram", "Tipo de memoria", "memoria", "DDR4-3200 · 8 GB soldados + 8 GB SO-DIMM", lenovoFuente),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 512, lenovoFuente, "GB"),
    atributo("tipo_almacenamiento", "Unidad", "almacenamiento", "SSD M.2 2242 PCIe 4.0 NVMe", lenovoFuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 14, lenovoFuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "1920 × 1200 (WUXGA)", lenovoFuente),
    atributo("brillo", "Brillo", "pantalla", 300, lenovoFuente, "nits"),
    atributo("cobertura_color", "Cobertura de color", "pantalla", "45% NTSC", lenovoFuente),
    atributo("energia_bateria", "Energía de batería", "bateria", 57, lenovoFuente, "Wh"),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 6 (802.11ax)", lenovoFuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.1", lenovoFuente),
    atributo("peso", "Peso inicial", "dimensiones", 1.43, lenovoFuente, "kg"),
  ],
  [
    metrica("ram", "Memoria RAM", "memoria", 16, "GB", lenovoFuente),
    metrica("almacenamiento", "Almacenamiento", "almacenamiento", 512, "GB", lenovoFuente),
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 14, "in", lenovoFuente),
    metrica("energia_bateria", "Energía de batería", "bateria", 57, "Wh", lenovoFuente),
  ],
  [
    fuente("lenovo-psref-21jk0005ri", "Lenovo PSREF — ThinkPad E14 Gen 5 (Intel), MTM 21JK0005RI", "https://psref.lenovo.com/Detail/ThinkPad/ThinkPad_E14_Gen_5_Intel?M=21JK0005RI", lenovoVariante, "PSREF identifica el MTM exacto 21JK0005RI, país/región Rumania (EET), y detalla CPU, memoria, SSD, pantalla y batería."),
  ],
);

const macFuente = "apple-macbook-pro-m3-max";
const macVariante = "48gb-1tb";
const macbookPro16M3Max = crearFicha(
  "laptops",
  "verificado",
  [{
    id: macVariante,
    modelo: "MacBook Pro de 16 pulgadas (noviembre de 2023)",
    ram: "48 GB de memoria unificada",
    almacenamiento: "1 TB SSD",
    identificador: "M3 Max · CPU 16 núcleos · GPU 40 núcleos",
  }],
  [
    atributo("procesador", "Chip", "rendimiento", "Apple M3 Max · CPU de 16 núcleos · GPU de 40 núcleos", macFuente),
    atributo("ram", "Memoria unificada", "memoria", 48, macFuente, "GB"),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 1, macFuente, "TB"),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 16.2, macFuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "3456 × 2234 píxeles", macFuente),
    atributo("tasa_refresco", "Tasa de refresco máxima", "pantalla", 120, macFuente, "Hz"),
    atributo("energia_bateria", "Energía de batería", "bateria", 100, macFuente, "Wh"),
    atributo("autonomia_video", "Reproducción de vídeo (máximo declarado)", "bateria", 22, macFuente, "h"),
    atributo("ancho_banda_memoria", "Ancho de banda de memoria", "memoria", "400 GB/s", macFuente),
  ],
  [
    metrica("ram", "Memoria unificada", "memoria", 48, "GB", macFuente),
    metrica("almacenamiento", "Almacenamiento", "almacenamiento", 1, "TB", macFuente),
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 16.2, "in", macFuente),
    metrica("energia_bateria", "Energía de batería", "bateria", 100, "Wh", macFuente),
  ],
  [
    fuente("apple-macbook-pro-m3-max", "Apple Support — MacBook Pro de 16 pulgadas (noviembre de 2023)", "https://support.apple.com/es-la/117737", macVariante, "La ficha oficial incluye la configuración probada M3 Max CPU 16/GPU 40, memoria unificada de 48 GB y SSD de 1 TB."),
  ],
);

const earFuente = "nothing-ear-2";
const earVariante = "transparent-white";
const nothingEar2 = crearFicha(
  "auriculares",
  "parcial",
  [{
    id: earVariante,
    modelo: "Nothing Ear (2)",
    identificador: "Transparent White",
  }],
  [
    atributo("transductores", "Transductor", "audio", 11.6, earFuente, "mm"),
    atributo("diafragma", "Diafragma", "audio", "Graphene + PU (poliuretano)", earFuente),
    atributo("cancelacion_ruido", "Cancelación activa de ruido máxima declarada", "audio", "Hasta 40 dB", earFuente),
    atributo("codecs", "Códecs Bluetooth", "conectividad", "AAC, SBC, LHDC 5.0", earFuente),
    atributo("bluetooth", "Versión Bluetooth", "conectividad", "Bluetooth 5.3", earFuente),
    atributo("bateria_auriculares", "Autonomía de auriculares (ANC desactivado)", "bateria", "Hasta 6.3 h", earFuente),
    atributo("bateria_estuche", "Autonomía total con estuche (ANC desactivado)", "bateria", "Hasta 36 h", earFuente),
    atributo("capacidad_bateria_auriculares", "Capacidad batería por auricular", "bateria", 33, earFuente, "mAh"),
    atributo("capacidad_bateria_estuche", "Capacidad batería del estuche", "bateria", 485, earFuente, "mAh"),
  ],
  [
    metrica("tamano_transductor", "Diámetro del transductor", "audio", 11.6, "mm", earFuente),
    
  ],
  [
    fuente("nothing-ear-2", "Nothing España — Ear (2), especificaciones técnicas", "https://checkout-es.nothing.tech/products/ear-2", earVariante, "La página oficial respalda las especificaciones técnicas, incluidos LHDC 5.0 y Bluetooth 5.3. Describe el diseño transparente, pero no identifica textualmente el acabado como Transparent White; la variante permanece parcial."),
  ],
);

const sonyFuente = "sony-wh-1000xm5";
const sonyWh1000Xm5 = crearFicha(
  "auriculares",
  "verificado",
  [{ id: "wh-1000xm5", modelo: "Sony WH-1000XM5" }],
  [
    atributo("tipo", "Tipo de auricular", "audio", "Cerrado, dinámico, circumaural", sonyFuente),
    atributo("bluetooth", "Versión Bluetooth", "conectividad", "Bluetooth 5.2", sonyFuente),
    atributo("codecs", "Códecs compatibles", "audio", "SBC, AAC, LDAC", sonyFuente),
    atributo("respuesta_frecuencia", "Respuesta de frecuencia", "audio", "4 Hz – 40 000 Hz (operación activa)", sonyFuente),
    atributo("autonomia_anc", "Autonomía con cancelación de ruido", "bateria", 30, sonyFuente, "h"),
    atributo("autonomia_sin_anc", "Autonomía sin cancelación de ruido", "bateria", 40, sonyFuente, "h"),
  ],
  [
    metrica("autonomia_anc", "Autonomía con cancelación de ruido", "bateria", 30, "h", sonyFuente),
    metrica("autonomia_sin_anc", "Autonomía sin cancelación de ruido", "bateria", 40, "h", sonyFuente),
  ],
  [
    fuente("sony-wh-1000xm5", "Sony Support — WH-1000XM5 specifications", "https://www.sony.com/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm5/specifications", null, "Ficha oficial de especificaciones del modelo."),
  ],
);


const galaxyA55Fuente = "samsung-a55-newsroom-co";
const galaxyA55SpecsFuente = "samsung-a55-specs-co";
const galaxyA55ExynosFuente = "samsung-a55-exynos";
const galaxyA55 = crearFicha(
  "moviles",
  "parcial",
  [
    { id: "8gb-128gb", modelo: "Samsung Galaxy A55 5G", ram: "8 GB", almacenamiento: "128 GB", mercado: "Colombia · SKU SM-A556ELBLLTC" },
    { id: "8gb-256gb", modelo: "Samsung Galaxy A55 5G", ram: "8 GB", almacenamiento: "256 GB", mercado: "Colombia · configuración de lanzamiento" },
  ],
  [
    atributo("procesador", "Procesador", "rendimiento", "Samsung Exynos 1480 · CPU de ocho núcleos", galaxyA55ExynosFuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "Super AMOLED FHD+", galaxyA55Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.6, galaxyA55Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "2340 × 1080 píxeles", galaxyA55Fuente),
    atributo("tasa_refresco", "Tasa de refresco máxima", "pantalla", 120, galaxyA55Fuente, "Hz"),
    atributo("ram", "Memoria RAM", "memoria", 8, galaxyA55Fuente, "GB"),
    atributo("almacenamiento", "Capacidades documentadas", "almacenamiento", "128 GB o 256 GB según SKU/mercado; el registro del catálogo no identifica cuál", galaxyA55Fuente),
    atributo("almacenamiento_expandible", "Expansión por microSD", "almacenamiento", "Hasta 1 TB", galaxyA55Fuente),
    atributo("camara_principal", "Cámara principal", "camaras", 50, galaxyA55Fuente, "mpx"),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", 12, galaxyA55Fuente, "mpx"),
    atributo("camara_macro", "Cámara macro", "camaras", 5, galaxyA55Fuente, "mpx"),
    atributo("camara_frontal", "Cámara frontal", "camaras", 32, galaxyA55Fuente, "mpx"),
    atributo("estabilizacion", "Estabilización de cámara principal", "camaras", "Óptica (OIS)", galaxyA55Fuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, galaxyA55Fuente, "mAh"),
    atributo("carga_rapida", "Carga por cable", "bateria", 25, galaxyA55Fuente, "W"),
    atributo("dimensiones", "Dimensiones", "diseno", "161,1 × 77,4 × 8,2 mm", galaxyA55Fuente),
    atributo("peso", "Peso", "diseno", 213, galaxyA55Fuente, "g"),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP67", galaxyA55Fuente),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 6 (802.11ax)", galaxyA55Fuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.3", galaxyA55Fuente),
    atributo("nfc", "NFC", "conectividad", true, galaxyA55Fuente),
    atributo("usb", "Interfaz USB", "conectividad", "USB Type-C 2.0", galaxyA55Fuente),
    atributo("sistema_operativo_lanzamiento", "Sistema operativo de lanzamiento", "software", "Android 14 · One UI 6.1", galaxyA55Fuente),
    atributo("seguridad", "Seguridad", "software", "Samsung Knox Vault", galaxyA55Fuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.6, "in", galaxyA55Fuente),
    metrica("tasa_refresco", "Tasa de refresco máxima", "pantalla", 120, "Hz", galaxyA55Fuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, "mAh", galaxyA55Fuente),
    metrica("peso", "Peso", "diseno", 213, "g", galaxyA55Fuente),
  ],
  [
    fuente("samsung-a55-newsroom-co", "Samsung Newsroom Colombia — Galaxy A55 5G, lanzamiento y especificaciones", "https://news.samsung.com/co/galaxy-a55-5g-y-a35-5g-los-nuevos-equipos-de-la-serie-a-con-innovaciones-al-alcance-de-todos", "8gb-256gb", "Fuente regional oficial: variante de lanzamiento 8 GB + 256 GB, pantalla, cámaras, batería, Android 14/One UI 6.1 e IP67.", "2026-11-17"),
    fuente("samsung-a55-specs-co", "Samsung Colombia — Galaxy A55 5G, especificaciones del modelo SM-A556", "https://www.samsung.com/co/smartphones/galaxy-a/galaxy-a55-5g-awesome-iceblue-128gb-sm-a556elblltc/", "8gb-128gb", "Fuente oficial para dimensiones, peso, pantalla, cámaras, conectividad, batería y USB. La página de producto enlazada corresponde a una variante 8 GB/128 GB; no se usa para determinar la capacidad de la variante de catálogo.", "2026-11-17"),
    fuente("samsung-a55-exynos", "Samsung Electronics — 2024 Half-year Business Report", "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/2024_Half_Interim_Report.pdf", null, "Documento corporativo identifica Exynos 1480 y plataforma Android 14/One UI 6.1.", "2026-11-17"),
  ],
);

const iphone13Fuente = "apple-iphone-13-tech-specs";
const iphone13Variante = "128gb";
const iphone13 = crearFicha(
  "moviles",
  "verificado",
  [{
    id: iphone13Variante,
    modelo: "Apple iPhone 13",
    almacenamiento: "128 GB",
    mercado: null,
  }],
  [
    atributo("procesador", "Chip", "rendimiento", "Apple A15 Bionic · CPU de 6 núcleos · GPU de 4 núcleos · Neural Engine de 16 núcleos", iphone13Fuente),
    atributo("pantalla", "Pantalla", "pantalla", "Super Retina XDR · OLED", iphone13Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.1, iphone13Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "2532 × 1170 píxeles", iphone13Fuente),
    atributo("densidad_pixeles", "Densidad de píxeles", "pantalla", 460, iphone13Fuente),
    atributo("brillo_tipico", "Brillo máximo típico", "pantalla", 800, iphone13Fuente, "nits"),
    atributo("brillo_hdr", "Brillo máximo HDR", "pantalla", 1200, iphone13Fuente, "nits"),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 128, iphone13Fuente, "GB"),
    atributo("camara_principal", "Cámara principal", "camaras", 12, iphone13Fuente, "mpx"),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", 12, iphone13Fuente, "mpx"),
    atributo("camara_frontal", "Cámara frontal TrueDepth", "camaras", 12, iphone13Fuente, "mpx"),
    atributo("estabilizacion", "Estabilización de cámara principal", "camaras", "Óptica por desplazamiento del sensor", iphone13Fuente),
    atributo("capacidad_video", "Grabación de vídeo", "camaras", "4K hasta 60 fps · Dolby Vision HDR hasta 4K a 60 fps", iphone13Fuente),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP68 · hasta 6 m durante 30 minutos en condiciones de laboratorio", iphone13Fuente),
    atributo("dimensiones", "Dimensiones", "diseno", "146,7 × 71,5 × 7,65 mm", iphone13Fuente),
    atributo("peso", "Peso", "diseno", 174, iphone13Fuente, "g"),
    atributo("red_movil", "Red móvil", "conectividad", "5G sub-6 GHz", iphone13Fuente),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 6 (802.11ax)", iphone13Fuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.0", iphone13Fuente),
    atributo("nfc", "NFC", "conectividad", true, iphone13Fuente),
    atributo("conector", "Conector", "conectividad", "Lightning", iphone13Fuente),
    atributo("autonomia_video", "Reproducción de vídeo (máximo declarado)", "bateria", 19, iphone13Fuente, "h"),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.1, "in", iphone13Fuente),
    metrica("peso", "Peso", "diseno", 174, "g", iphone13Fuente),
    metrica("autonomia_video", "Reproducción de vídeo (máximo declarado)", "bateria", 19, "h", iphone13Fuente),
  ],
  [
    fuente("apple-iphone-13-tech-specs", "Apple Support — iPhone 13, especificaciones técnicas", "https://support.apple.com/es-la/111872", iphone13Variante, "La fuente oficial enumera capacidad de 128 GB, chip, pantalla, cámaras, resistencia, dimensiones, peso y conectividad.", "2026-11-17"),
  ],
);

export const FICHAS_TECNICAS_V2_PILOTO = {
  nothingPhone2aSpecialEdition: nothingPhone,
  samsungGalaxyS24Ultra256: samsung256,
  samsungGalaxyS24Ultra512: samsung512,
  oneplusPad2: oneplusPad2,
  appleIpadPro11M4: ipadPro11M4,
  lenovoThinkpadE14Gen5: thinkpadE14Gen5,
  appleMacbookPro16M3Max: macbookPro16M3Max,
  nothingEar2: nothingEar2,
  sonyWh1000Xm5: sonyWh1000Xm5,
  samsungGalaxyA55: galaxyA55,
  appleIphone13_128: iphone13,
} satisfies Record<string, FichaTecnicaV2>;

function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Resuelve la ficha piloto para registros de Producto API o mock. */
export function obtenerFichaTecnicaV2PilotoParaProducto(
  nombre: string,
): FichaTecnicaV2 | null {
  const n = normalizarNombre(nombre);
  if (n.includes("nothing phone 2a special edition")) return nothingPhone;
  if (n.includes("galaxy a55")) return galaxyA55;
  if (n.includes("iphone 13") && n.includes("128")) return iphone13;
  if (n.includes("nothing ear 2")) return nothingEar2;
  if (n.includes("oneplus pad 2")) return oneplusPad2;
  if (n.includes("thinkpad e14 gen 5")) return thinkpadE14Gen5;
  if (n.includes("s24 ultra") && n.includes("512")) return samsung512;
  if (n.includes("s24 ultra") && n.includes("256")) return samsung256;
  if (n.includes("ipad pro") && n.includes("m4")) return ipadPro11M4;
  if (n.includes("macbook pro") && n.includes("m3 max")) return macbookPro16M3Max;
  if (n.includes("sony wh 1000xm5")) return sonyWh1000Xm5;
  return null;
}

/** Resuelve por identidad de origen para conservar variantes distintas. */
export function obtenerFichaTecnicaV2PilotoParaKimovil(
  id: number,
  nombre: string,
): FichaTecnicaV2 | null {
  switch (id) {
    case 102:
      return galaxyA55;
    case 104:
      return iphone13;
    case 202:
      return samsung256;
    case 300:
      return samsung512;
    case 108:
    case 303:
      return oneplusPad2;
    case 208:
      return ipadPro11M4;
    case 209:
      return macbookPro16M3Max;
    case 109:
      return sonyWh1000Xm5;
    default: {
      const n = normalizarNombre(nombre);
      if (n.includes("galaxy a55")) return galaxyA55;
      if (n.includes("iphone 13") && n.includes("128")) return iphone13;
      if (n.includes("s24 ultra") && n.includes("512gb")) return samsung512;
      if (n.includes("s24 ultra")) return samsung256;
      if (n.includes("oneplus pad 2")) return oneplusPad2;
      if (n.includes("ipad pro") && n.includes("m4")) return ipadPro11M4;
      if (n.includes("macbook pro") && n.includes("m3 max")) return macbookPro16M3Max;
      if (n.includes("sony wh 1000xm5")) return sonyWh1000Xm5;
      return null;
    }
  }
}
