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
 * Fichas técnicas estructuradas del catálogo: piloto y lotes de ampliación.
 *
 * Solo incluye datos publicados por fuentes identificables. Los precios,
 * disponibilidad y puntuaciones comerciales permanecen fuera de estas fichas.
 * Las métricas se conservan como informativas hasta que exista una metodología
 * homogénea y explícita para compararlas.
 */
const CONSULTA = "2026-11-17";

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
): FuenteFichaV2 {
  return {
    id,
    tipo: "fabricante",
    nombre,
    url,
    fecha_consulta: CONSULTA,
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


const iphone15Fuente = "apple-iphone-15-pro-max";
const iphone15Variante = "256gb";
const iphone15ProMax = crearFicha(
  "moviles",
  "verificado",
  [{
    id: iphone15Variante,
    modelo: "iPhone 15 Pro Max",
    almacenamiento: "256 GB",
    mercado: "Colombia",
  }],
  [
    atributo("procesador", "Chip", "rendimiento", "Apple A17 Pro · CPU de 6 núcleos · GPU de 6 núcleos · Neural Engine de 16 núcleos", iphone15Fuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "Super Retina XDR OLED · Dynamic Island · pantalla siempre activa", iphone15Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.7, iphone15Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "2796 × 1290 píxeles", iphone15Fuente),
    atributo("densidad_pixeles", "Densidad de píxeles", "pantalla", "460 ppi", iphone15Fuente),
    atributo("tasa_refresco", "Frecuencia de actualización", "pantalla", "ProMotion adaptativo hasta 120 Hz", iphone15Fuente),
    atributo("brillo", "Brillo máximo", "pantalla", "1000 nits típico · 1600 nits HDR · 2000 nits en exteriores", iphone15Fuente),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 256, iphone15Fuente, "GB"),
    atributo("camara_principal", "Cámara principal", "camaras", "48 MP · 24 mm · apertura ƒ/1.78 · estabilización óptica por desplazamiento de sensor", iphone15Fuente),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", "12 MP · 13 mm · campo de visión 120°", iphone15Fuente),
    atributo("teleobjetivo", "Teleobjetivo", "camaras", "12 MP · tetraprisma · zoom óptico 5x", iphone15Fuente),
    atributo("camara_frontal", "Cámara frontal", "camaras", "TrueDepth 12 MP · ƒ/1.9", iphone15Fuente),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP68 · hasta 6 m durante 30 minutos en condiciones de laboratorio", iphone15Fuente),
    atributo("conectividad", "Conectividad inalámbrica", "conectividad", "5G · Wi-Fi 6E · Bluetooth 5.3 · NFC", iphone15Fuente),
    atributo("puertos", "Puerto", "conectividad", "USB-C · USB 3 hasta 10 Gb/s · DisplayPort", iphone15Fuente),
    atributo("energia_bateria", "Autonomía de reproducción de vídeo", "bateria", 29, iphone15Fuente, "h"),
    atributo("autonomia_streaming", "Autonomía de vídeo en streaming", "bateria", 25, iphone15Fuente, "h"),
    atributo("carga_inalambrica", "Carga inalámbrica", "bateria", "MagSafe hasta 15 W · Qi2 hasta 15 W", iphone15Fuente),
    atributo("dimensiones", "Dimensiones", "dimensiones", "159,9 × 76,7 × 8,25 mm", iphone15Fuente),
    atributo("peso", "Peso", "dimensiones", 221, iphone15Fuente, "g"),
    atributo("sistema_operativo", "Sistema operativo", "software", "iOS", iphone15Fuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.7, "in", iphone15Fuente),
    metrica("autonomia_video", "Reproducción de vídeo", "bateria", 29, "h", iphone15Fuente),
  ],
  [
    fuente("apple-iphone-15-pro-max", "Apple Support Colombia — iPhone 15 Pro Max, especificaciones técnicas", "https://support.apple.com/es-co/111828", iphone15Variante, "La página oficial enumera 256 GB como capacidad comercial y respalda pantalla, chip, cámaras, conectividad, batería, dimensiones y peso."),
  ],
);

const s25UltraFuente = "samsung-galaxy-s25-ultra";
const s25UltraVariante = "12gb-1tb";
const samsungGalaxyS25Ultra = crearFicha(
  "moviles",
  "verificado",
  [{
    id: s25UltraVariante,
    modelo: "Samsung Galaxy S25 Ultra · Titanio negro",
    ram: "12 GB",
    almacenamiento: "1 TB",
    mercado: "Colombia",
  }],
  [
    atributo("procesador", "Procesador", "rendimiento", "Qualcomm Snapdragon 8 Elite for Galaxy", s25UltraFuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "Dynamic AMOLED 2X · QHD+ · Vision Booster", s25UltraFuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.9, s25UltraFuente, "in"),
    atributo("tasa_refresco", "Frecuencia de actualización", "pantalla", "Adaptativa de 1 a 120 Hz", s25UltraFuente),
    atributo("ram", "Memoria RAM", "memoria", 12, s25UltraFuente, "GB"),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 1, s25UltraFuente, "TB"),
    atributo("camara_principal", "Cámara gran angular", "camaras", "200 MP · OIS · F1.7", s25UltraFuente),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", "50 MP · F1.9 · campo de visión 120°", s25UltraFuente),
    atributo("teleobjetivo", "Cámaras teleobjetivo", "camaras", "50 MP con zoom óptico 5x y OIS · 10 MP con zoom óptico 3x y OIS", s25UltraFuente),
    atributo("camara_frontal", "Cámara frontal", "camaras", "12 MP · F2.2", s25UltraFuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, s25UltraFuente, "mAh"),
    atributo("carga_rapida", "Carga por cable", "bateria", "Hasta 65% en unos 30 minutos con adaptador de 45 W", s25UltraFuente),
    atributo("conectividad", "Conectividad", "conectividad", "5G · Wi-Fi 7 · Bluetooth 5.4", s25UltraFuente),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP68 · inmersión hasta 1,5 m durante 30 minutos en condiciones de laboratorio", s25UltraFuente),
    atributo("sistema_operativo", "Sistema operativo de lanzamiento", "software", "Android 15 · One UI 7", s25UltraFuente),
    atributo("actualizaciones", "Soporte de software anunciado", "software", "7 generaciones de actualizaciones del sistema operativo y 7 años de seguridad", s25UltraFuente),
    atributo("dimensiones", "Dimensiones", "dimensiones", "162,8 × 77,6 × 8,2 mm", s25UltraFuente),
    atributo("peso", "Peso", "dimensiones", 218, s25UltraFuente, "g"),
    atributo("materiales", "Materiales del marco", "diseno", "Titanio", s25UltraFuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.9, "in", s25UltraFuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, "mAh", s25UltraFuente),
  ],
  [
    fuente("samsung-galaxy-s25-ultra-co", "Samsung Newsroom Colombia — Galaxy S25 Ultra, especificaciones", "https://news.samsung.com/co/la-serie-samsung-galaxy-s25-establece-el-estandar-del-smartphone-con-ia-convirtiendolo-en-un-verdadero-companero-de-ia", s25UltraVariante, "La tabla oficial confirma 12 GB + 1 TB para la variante, además de pantalla, cámaras, batería, dimensiones, peso, conectividad, IP68 y soporte de software."),
  ],
);

const oneplus13Fuente = "oneplus-13";
const oneplus13Variante = "16gb-512gb";
const oneplus13 = crearFicha(
  "moviles",
  "verificado",
  [{
    id: oneplus13Variante,
    modelo: "OnePlus 13",
    ram: "16 GB LPDDR5X",
    almacenamiento: "512 GB UFS 4.0",
  }],
  [
    atributo("procesador", "Procesador", "rendimiento", "Qualcomm Snapdragon 8 Elite · CPU Oryon hasta 4,32 GHz · GPU Adreno 830", oneplus13Fuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "ProXDR LTPO 4.1 · Ceramic Guard · 10 bits", oneplus13Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.82, oneplus13Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "3168 × 1440 píxeles (QHD+)", oneplus13Fuente),
    atributo("densidad_pixeles", "Densidad de píxeles", "pantalla", "510 ppi", oneplus13Fuente),
    atributo("tasa_refresco", "Frecuencia de actualización", "pantalla", "LTPO dinámico de 1 a 120 Hz", oneplus13Fuente),
    atributo("brillo", "Brillo HBM / máximo", "pantalla", "1600 / 4500 nits", oneplus13Fuente),
    atributo("ram", "Memoria RAM", "memoria", 16, oneplus13Fuente, "GB"),
    atributo("tipo_ram", "Tecnología de RAM", "memoria", "LPDDR5X", oneplus13Fuente),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 512, oneplus13Fuente, "GB"),
    atributo("tipo_almacenamiento", "Tecnología de almacenamiento", "almacenamiento", "UFS 4.0", oneplus13Fuente),
    atributo("camara_principal", "Cámara principal", "camaras", "50 MP Sony LYT-808 · OIS · ƒ/1.6", oneplus13Fuente),
    atributo("teleobjetivo", "Teleobjetivo", "camaras", "50 MP Sony LYT-600 · zoom óptico 3x · OIS", oneplus13Fuente),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", "50 MP · campo de visión 120°", oneplus13Fuente),
    atributo("camara_frontal", "Cámara frontal", "camaras", "32 MP Sony IMX615", oneplus13Fuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 6000, oneplus13Fuente, "mAh"),
    atributo("carga_rapida", "Carga por cable e inalámbrica", "bateria", "100 W SUPERVOOC · 50 W AIRVOOC (especificación regional de México)", oneplus13Fuente),
    atributo("conectividad", "Conectividad", "conectividad", "5G · Wi-Fi 7 · Bluetooth 5.4 · NFC", oneplus13Fuente),
    atributo("puertos", "Puerto USB", "conectividad", "USB Type-C · USB 3.2 Gen 1", oneplus13Fuente),
    atributo("sistema_operativo", "Sistema operativo de lanzamiento", "software", "OxygenOS 15 basado en Android 15", oneplus13Fuente),
    atributo("dimensiones", "Dimensiones (Black Eclipse)", "dimensiones", "162,9 × 76,5 × 8,5 mm", oneplus13Fuente),
    atributo("peso", "Peso (Black Eclipse)", "dimensiones", 213, oneplus13Fuente, "g"),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.82, "in", oneplus13Fuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 6000, "mAh", oneplus13Fuente),
  ],
  [
    fuente("oneplus-13-mx", "OnePlus México — OnePlus 13, especificaciones oficiales", "https://www.oneplus.com/mx/13/specs", oneplus13Variante, "La página regional confirma 16 GB + 512 GB, cámara, pantalla, conectividad y carga de 100 W/50 W. Las potencias pueden variar por mercado."),
  ],
);

const redmi14Fuente = "redmi-note-14-pro-plus";
const redmi14Variante = "8gb-256gb";
const redmiNote14ProPlus = crearFicha(
  "moviles",
  "verificado",
  [{
    id: redmi14Variante,
    modelo: "REDMI Note 14 Pro+ 5G",
    ram: "8 GB LPDDR4X",
    almacenamiento: "256 GB UFS 2.2",
    mercado: "Colombia",
  }],
  [
    atributo("procesador", "Procesador", "rendimiento", "Qualcomm Snapdragon 7s Gen 3 · 4 nm · CPU octa-core hasta 2,5 GHz · GPU Adreno", redmi14Fuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "CrystalRes AMOLED · Dolby Vision · HDR10+", redmi14Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.67, redmi14Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "2712 × 1220 píxeles (1.5K)", redmi14Fuente),
    atributo("tasa_refresco", "Frecuencia de actualización", "pantalla", 120, redmi14Fuente, "Hz"),
    atributo("brillo", "Brillo máximo", "pantalla", 3000, redmi14Fuente, "nits"),
    atributo("proteccion_pantalla", "Protección de pantalla", "pantalla", "Corning Gorilla Glass Victus 2", redmi14Fuente),
    atributo("ram", "Memoria RAM", "memoria", 8, redmi14Fuente, "GB"),
    atributo("tipo_ram", "Tecnología de RAM", "memoria", "LPDDR4X", redmi14Fuente),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 256, redmi14Fuente, "GB"),
    atributo("tipo_almacenamiento", "Tecnología de almacenamiento", "almacenamiento", "UFS 2.2", redmi14Fuente),
    atributo("camara_principal", "Cámara principal", "camaras", "200 MP · OIS · ƒ/1.65 · sensor de 1/1,4 pulgadas", redmi14Fuente),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", "8 MP · ƒ/2.2", redmi14Fuente),
    atributo("camara_macro", "Cámara macro", "camaras", "2 MP · ƒ/2.4", redmi14Fuente),
    atributo("camara_frontal", "Cámara frontal", "camaras", "20 MP · ƒ/2.2", redmi14Fuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 5110, redmi14Fuente, "mAh"),
    atributo("carga_rapida", "Carga rápida", "bateria", 120, redmi14Fuente, "W"),
    atributo("conectividad", "Conectividad", "conectividad", "5G · Wi-Fi 6/6E · Bluetooth 5.4 · NFC · Dual SIM", redmi14Fuente),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP68", redmi14Fuente),
    atributo("dimensiones", "Dimensiones", "dimensiones", "162,53 × 74,67 × 8,75–8,85 mm según color", redmi14Fuente),
    atributo("peso", "Peso", "dimensiones", "205,13–210,14 g según color", redmi14Fuente),
    atributo("sistema_operativo", "Sistema operativo", "software", "Xiaomi HyperOS", redmi14Fuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.67, "in", redmi14Fuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 5110, "mAh", redmi14Fuente),
  ],
  [
    fuente("redmi-note-14-pro-plus-co", "Xiaomi Colombia — REDMI Note 14 Pro+ 5G, especificaciones oficiales", "https://www.mi.com/co/product/redmi-note-14-pro-plus-5g/specs/", redmi14Variante, "La página regional confirma la variante 8 GB + 256 GB y las especificaciones de pantalla, cámaras, batería, conectividad y resistencia."),
  ],
);

const xiaomi14tFuente = "xiaomi-14t-pro";
const xiaomi14tVariante = "12gb-512gb";
const xiaomi14TPro = crearFicha(
  "moviles",
  "verificado",
  [{
    id: xiaomi14tVariante,
    modelo: "Xiaomi 14T Pro",
    ram: "12 GB LPDDR5X",
    almacenamiento: "512 GB UFS 4.0",
    mercado: "Colombia",
  }],
  [
    atributo("procesador", "Procesador", "rendimiento", "MediaTek Dimensity 9300+ · 4 nm · GPU Immortalis-G720 MC12", xiaomi14tFuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "AMOLED · Dolby Vision · HDR10+", xiaomi14tFuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.67, xiaomi14tFuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "2712 × 1220 píxeles", xiaomi14tFuente),
    atributo("densidad_pixeles", "Densidad de píxeles", "pantalla", "446 ppi", xiaomi14tFuente),
    atributo("tasa_refresco", "Frecuencia de actualización máxima", "pantalla", 144, xiaomi14tFuente, "Hz"),
    atributo("brillo", "Brillo máximo", "pantalla", 4000, xiaomi14tFuente, "nits"),
    atributo("ram", "Memoria RAM", "memoria", 12, xiaomi14tFuente, "GB"),
    atributo("tipo_ram", "Tecnología de RAM", "memoria", "LPDDR5X", xiaomi14tFuente),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 512, xiaomi14tFuente, "GB"),
    atributo("tipo_almacenamiento", "Tecnología de almacenamiento", "almacenamiento", "UFS 4.0", xiaomi14tFuente),
    atributo("camara_principal", "Cámara principal", "camaras", "50 MP Leica · sensor Light Fusion 900 · OIS · ƒ/1.6", xiaomi14tFuente),
    atributo("teleobjetivo", "Teleobjetivo", "camaras", "50 MP Leica · equivalente a 60 mm", xiaomi14tFuente),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", "12 MP Leica · campo de visión 120°", xiaomi14tFuente),
    atributo("camara_frontal", "Cámara frontal", "camaras", "32 MP · ƒ/2.0", xiaomi14tFuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, xiaomi14tFuente, "mAh"),
    atributo("carga_rapida", "Carga por cable e inalámbrica", "bateria", "120 W HyperCharge · 50 W inalámbrica", xiaomi14tFuente),
    atributo("conectividad", "Conectividad", "conectividad", "5G · Wi-Fi 6 · Bluetooth 5.4 · NFC", xiaomi14tFuente),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP68", xiaomi14tFuente),
    atributo("dimensiones", "Dimensiones", "dimensiones", "160,4 × 75,1 × 8,39 mm", xiaomi14tFuente),
    atributo("peso", "Peso", "dimensiones", 209, xiaomi14tFuente, "g"),
    atributo("sistema_operativo", "Sistema operativo", "software", "Xiaomi HyperOS", xiaomi14tFuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.67, "in", xiaomi14tFuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, "mAh", xiaomi14tFuente),
  ],
  [
    fuente("xiaomi-14t-pro-co", "Xiaomi Colombia — Xiaomi 14T Pro, especificaciones oficiales", "https://www.mi.com/co/product/xiaomi-14t-pro/specs/", xiaomi14tVariante, "La página regional confirma variantes 12 GB/512 GB, Dimensity 9300+, pantalla, cámaras, batería, conectividad, IP68 y dimensiones."),
  ],
);


const nothingEarAFuente = "nothing-ear-a-black";
const nothingEarAVariante = "black";
const nothingEarABlack = crearFicha(
  "auriculares",
  "verificado",
  [{
    id: nothingEarAVariante,
    modelo: "Nothing Ear (a) · Black",
  }],
  [
    atributo("tipo", "Tipo de auricular", "audio", "Intraauricular inalámbrico true wireless", nothingEarAFuente),
    atributo("driver", "Transductor", "audio", "Dinámico de 11 mm · diafragma PMI + TPU", nothingEarAFuente),
    atributo("certificacion_audio", "Audio de alta resolución", "audio", "Hi-Res Audio · LDAC", nothingEarAFuente),
    atributo("codecs", "Códecs Bluetooth", "audio", "AAC · SBC · LDAC", nothingEarAFuente),
    atributo("cancelacion_ruido", "Cancelación activa de ruido", "audio", "Smart ANC adaptativa hasta 45 dB · modo transparencia", nothingEarAFuente),
    atributo("microfonos", "Micrófonos", "audio", "3 por auricular · Clear Voice Technology", nothingEarAFuente),
    atributo("bluetooth", "Versión Bluetooth", "conectividad", "Bluetooth 5.3 · conexión dual", nothingEarAFuente),
    atributo("autonomia_sin_anc", "Reproducción sin ANC", "bateria", "Hasta 9,5 h los auriculares · 42,5 h con estuche", nothingEarAFuente),
    atributo("autonomia_anc", "Reproducción con ANC", "bateria", "Hasta 5,5 h los auriculares · 24,5 h con estuche", nothingEarAFuente),
    atributo("carga_rapida", "Carga rápida", "bateria", "10 minutos de carga para hasta 10 horas de reproducción (ANC desactivado)", nothingEarAFuente),
    atributo("bateria_auricular", "Capacidad de batería por auricular", "bateria", 46, nothingEarAFuente, "mAh"),
    atributo("bateria_estuche", "Capacidad de batería del estuche", "bateria", 500, nothingEarAFuente, "mAh"),
    atributo("puerto_carga", "Puerto de carga", "conectividad", "USB Type-C · sin carga inalámbrica", nothingEarAFuente),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP54 auriculares · IPX2 estuche", nothingEarAFuente),
    atributo("peso_auricular", "Peso por auricular", "dimensiones", 4.8, nothingEarAFuente, "g"),
    atributo("peso_estuche", "Peso del estuche", "dimensiones", 39.6, nothingEarAFuente, "g"),
    atributo("dimensiones_auricular", "Dimensiones de cada auricular", "dimensiones", "30,9 × 21,7 × 24,3 mm", nothingEarAFuente),
    atributo("dimensiones_estuche", "Dimensiones del estuche", "dimensiones", "47,6 × 63,3 × 22,7 mm", nothingEarAFuente),
    atributo("aplicacion", "Aplicación y funciones", "software", "Nothing X · ecualizador personalizable · Bass Enhance · modo baja latencia · ChatGPT en teléfonos Nothing compatibles", nothingEarAFuente),
  ],
  [
    metrica("autonomia_sin_anc", "Reproducción sin ANC con estuche", "bateria", 42.5, "h", nothingEarAFuente),
    metrica("autonomia_anc", "Reproducción con ANC con estuche", "bateria", 24.5, "h", nothingEarAFuente),
  ],
  [
    fuente("nothing-ear-a-black", "Nothing — Ear (a), variante Black y especificaciones oficiales", "https://nothing.tech/products/ear-a?Colour=Black", nothingEarAVariante, "La página oficial permite seleccionar el acabado Black y publica transductor, códecs, ANC, autonomía, Bluetooth, micrófonos, resistencia, dimensiones y pesos."),
  ],
);


const a55Fuente = "samsung-galaxy-a55-co";
const a55Variante = "8gb-256gb";
const samsungGalaxyA55 = crearFicha(
  "moviles",
  "verificado",
  [{
    id: a55Variante,
    modelo: "Samsung Galaxy A55 5G",
    ram: "8 GB",
    almacenamiento: "256 GB",
    mercado: "Colombia",
  }],
  [
    atributo("procesador", "Procesador", "rendimiento", "Samsung Exynos 1480 · CPU octa-core hasta 2,75 GHz", a55Fuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "Super AMOLED · FHD+ · Vision Booster", a55Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", "6,6 pulgadas en rectángulo completo · 6,4 pulgadas en esquinas redondeadas", a55Fuente),
    atributo("resolucion", "Resolución", "pantalla", "1080 × 2340 píxeles", a55Fuente),
    atributo("tasa_refresco", "Frecuencia de actualización", "pantalla", 120, a55Fuente, "Hz"),
    atributo("brillo", "Brillo HBM", "pantalla", 1000, a55Fuente, "nits"),
    atributo("proteccion_pantalla", "Protección de pantalla", "pantalla", "Corning Gorilla Glass Victus+", a55Fuente),
    atributo("ram", "Memoria RAM", "memoria", 8, a55Fuente, "GB"),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 256, a55Fuente, "GB"),
    atributo("expansion", "Expansión de almacenamiento", "almacenamiento", "microSD hasta 1 TB · ranura híbrida", a55Fuente),
    atributo("camara_principal", "Cámara principal", "camaras", "50 MP · OIS · ƒ/1.8", a55Fuente),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", "12 MP · ƒ/2.2", a55Fuente),
    atributo("camara_macro", "Cámara macro", "camaras", "5 MP · ƒ/2.4", a55Fuente),
    atributo("camara_frontal", "Cámara frontal", "camaras", "32 MP · ƒ/2.2", a55Fuente),
    atributo("video", "Grabación de vídeo", "camaras", "UHD 4K (3840 × 2160) a 30 fps", a55Fuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, a55Fuente, "mAh"),
    atributo("carga_rapida", "Carga por cable", "bateria", "Carga superrápida de hasta 25 W · cargador se vende por separado", a55Fuente),
    atributo("autonomia_video", "Reproducción de vídeo (máximo declarado)", "bateria", 28, a55Fuente, "h"),
    atributo("conectividad", "Conectividad", "conectividad", "5G · Wi-Fi 6 · Bluetooth 5.3 · NFC · USB-C 2.0", a55Fuente),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP67", a55Fuente),
    atributo("dimensiones", "Dimensiones", "dimensiones", "161,1 × 77,4 × 8,2 mm", a55Fuente),
    atributo("peso", "Peso", "dimensiones", 213, a55Fuente, "g"),
    atributo("seguridad", "Seguridad", "seguridad", "Samsung Knox Vault", a55Fuente),
    atributo("actualizaciones", "Soporte de software anunciado", "software", "Hasta 4 generaciones de actualizaciones de sistema operativo y hasta 5 años de seguridad", a55Fuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.6, "in", a55Fuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, "mAh", a55Fuente),
  ],
  [
    fuente("samsung-galaxy-a55-colombia", "Samsung Colombia — Galaxy A55 5G 256 GB, especificaciones", "https://www.samsung.com/co/smartphones/galaxy-a/galaxy-a55-5g-awesome-navy-256gb-sm-a556ezkmltc/", a55Variante, "La página regional confirma 8 GB de RAM y 256 GB, además de pantalla, cámaras, batería, IP67, Wi-Fi 6, Bluetooth 5.3, dimensiones y peso."),
    fuente("samsung-a55-newsroom-co", "Samsung Newsroom Colombia — Galaxy A55 5G", "https://news.samsung.com/co/galaxy-a55-5g-y-a35-5g-los-nuevos-equipos-de-la-serie-a-con-innovaciones-al-alcance-de-todos", a55Variante, "Confirma la variante 8 GB + 256 GB, batería, cámaras, IP67, cuatro generaciones de Android/One UI y cinco años de seguridad."),
    fuente("samsung-a55-newsroom-in", "Samsung Newsroom India — Galaxy A55 5G, especificaciones y variantes", "https://news.samsung.com/in/samsung-launches-galaxy-a55-5g-and-galaxy-a35-5g-with-flagship-like-camera-innovations-and-samsung-knox-vault-protection", a55Variante, "Confirma Exynos 1480, batería 5000 mAh, carga 25 W, cámaras, IP67, 8 GB + 256 GB y política de actualizaciones."),
  ],
);

const iphone13Fuente = "apple-iphone-13";
const iphone13Variante = "128gb";
const appleIphone13 = crearFicha(
  "moviles",
  "verificado",
  [{
    id: iphone13Variante,
    modelo: "iPhone 13",
    almacenamiento: "128 GB",
    mercado: "Colombia",
  }],
  [
    atributo("procesador", "Chip", "rendimiento", "Apple A15 Bionic · CPU de 6 núcleos · GPU de 4 núcleos · Neural Engine de 16 núcleos", iphone13Fuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "Super Retina XDR OLED · HDR · True Tone", iphone13Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.1, iphone13Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "2532 × 1170 píxeles", iphone13Fuente),
    atributo("densidad_pixeles", "Densidad de píxeles", "pantalla", "460 ppi", iphone13Fuente),
    atributo("brillo", "Brillo típico / HDR", "pantalla", "800 / 1200 nits", iphone13Fuente),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 128, iphone13Fuente, "GB"),
    atributo("camara_principal", "Cámara gran angular", "camaras", "12 MP · ƒ/1.6 · estabilización óptica por desplazamiento de sensor", iphone13Fuente),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", "12 MP · ƒ/2.4 · campo de visión 120°", iphone13Fuente),
    atributo("camara_frontal", "Cámara frontal TrueDepth", "camaras", "12 MP · ƒ/2.2", iphone13Fuente),
    atributo("video", "Grabación de vídeo", "camaras", "4K hasta 60 fps · HDR Dolby Vision hasta 4K a 60 fps · modo Cine 1080p a 30 fps", iphone13Fuente),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP68 · hasta 6 m durante 30 minutos en condiciones de laboratorio", iphone13Fuente),
    atributo("conectividad", "Conectividad inalámbrica", "conectividad", "5G · Wi-Fi 6 · Bluetooth 5.0 · NFC", iphone13Fuente),
    atributo("puertos", "Conector", "conectividad", "Lightning", iphone13Fuente),
    atributo("carga_inalambrica", "Carga inalámbrica", "bateria", "MagSafe hasta 15 W · Qi hasta 7,5 W", iphone13Fuente),
    atributo("autonomia_video", "Reproducción de vídeo (máximo declarado)", "bateria", 19, iphone13Fuente, "h"),
    atributo("autonomia_streaming", "Vídeo en streaming (máximo declarado)", "bateria", 15, iphone13Fuente, "h"),
    atributo("autonomia_audio", "Reproducción de audio (máximo declarado)", "bateria", 75, iphone13Fuente, "h"),
    atributo("dimensiones", "Dimensiones", "dimensiones", "146,7 × 71,5 × 7,65 mm", iphone13Fuente),
    atributo("peso", "Peso", "dimensiones", 173, iphone13Fuente, "g"),
    atributo("sistema_operativo", "Sistema operativo", "software", "iOS", iphone13Fuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.1, "in", iphone13Fuente),
    metrica("autonomia_video", "Reproducción de vídeo", "bateria", 19, "h", iphone13Fuente),
  ],
  [
    fuente("apple-iphone-13-co", "Apple Support Colombia — iPhone 13, especificaciones técnicas", "https://support.apple.com/es-co/111872", iphone13Variante, "La página oficial confirma 128 GB y detalla chip, pantalla, cámaras, conectividad, batería, dimensiones y peso."),
  ],
);


const xiaomi14UltraFuente = "xiaomi-14-ultra";
const xiaomi14UltraVariante = "16gb-512gb";
const xiaomi14Ultra = crearFicha(
  "moviles",
  "verificado",
  [{
    id: xiaomi14UltraVariante,
    modelo: "Xiaomi 14 Ultra",
    ram: "16 GB LPDDR5X",
    almacenamiento: "512 GB UFS 4.0",
  }],
  [
    atributo("procesador", "Procesador", "rendimiento", "Qualcomm Snapdragon 8 Gen 3 · 4 nm · CPU hasta 3,3 GHz · GPU Adreno", xiaomi14UltraFuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "AMOLED WQHD+ LTPO · Dolby Vision · HDR10+", xiaomi14UltraFuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.73, xiaomi14UltraFuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "3200 × 1440 píxeles", xiaomi14UltraFuente),
    atributo("densidad_pixeles", "Densidad de píxeles", "pantalla", "522 ppi", xiaomi14UltraFuente),
    atributo("tasa_refresco", "Frecuencia de actualización", "pantalla", "LTPO adaptativa de 1 a 120 Hz", xiaomi14UltraFuente),
    atributo("brillo", "Brillo HBM / máximo", "pantalla", "1000 / 3000 nits", xiaomi14UltraFuente),
    atributo("ram", "Memoria RAM", "memoria", 16, xiaomi14UltraFuente, "GB"),
    atributo("tipo_ram", "Tecnología de RAM", "memoria", "LPDDR5X", xiaomi14UltraFuente),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 512, xiaomi14UltraFuente, "GB"),
    atributo("tipo_almacenamiento", "Tecnología de almacenamiento", "almacenamiento", "UFS 4.0", xiaomi14UltraFuente),
    atributo("camara_principal", "Cámara principal Leica", "camaras", "50 MP Sony LYT-900 · sensor de 1 pulgada · apertura variable ƒ/1.63–ƒ/4.0 · OIS", xiaomi14UltraFuente),
    atributo("teleobjetivo", "Teleobjetivo Leica", "camaras", "50 MP · equivalente a 75 mm · OIS", xiaomi14UltraFuente),
    atributo("periscopio", "Teleobjetivo periscópico Leica", "camaras", "50 MP · equivalente a 120 mm · OIS", xiaomi14UltraFuente),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular Leica", "camaras", "50 MP · campo de visión 122°", xiaomi14UltraFuente),
    atributo("camara_frontal", "Cámara frontal", "camaras", "32 MP · ƒ/2.0", xiaomi14UltraFuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, xiaomi14UltraFuente, "mAh"),
    atributo("carga_rapida", "Carga por cable e inalámbrica", "bateria", "90 W HyperCharge · 80 W inalámbrica", xiaomi14UltraFuente),
    atributo("conectividad", "Conectividad", "conectividad", "5G · Wi-Fi 7 · Bluetooth 5.4 · NFC", xiaomi14UltraFuente),
    atributo("puertos", "Puerto USB", "conectividad", "USB-C 3.2 Gen 2", xiaomi14UltraFuente),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP68", xiaomi14UltraFuente),
    atributo("dimensiones", "Dimensiones", "dimensiones", "161,4 × 75,3 × 9,2 mm", xiaomi14UltraFuente),
    atributo("peso", "Peso", "dimensiones", 219.8, xiaomi14UltraFuente, "g"),
    atributo("sistema_operativo", "Sistema operativo", "software", "Xiaomi HyperOS", xiaomi14UltraFuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.73, "in", xiaomi14UltraFuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, "mAh", xiaomi14UltraFuente),
  ],
  [
    fuente("xiaomi-14-ultra-global", "Xiaomi Global — Xiaomi 14 Ultra, especificaciones oficiales", "https://www.mi.com/global/product/xiaomi-14-ultra/specs/", xiaomi14UltraVariante, "La ficha global confirma 16 GB LPDDR5X/512 GB UFS 4.0 y las especificaciones de procesador, pantalla, cámaras, batería, carga, conectividad, dimensiones y peso."),
    fuente("xiaomi-14-ultra-co-faq", "Xiaomi Colombia — Preguntas frecuentes Xiaomi 14 Ultra", "https://www.mi.com/co/support/faq/details/KA-110997/", xiaomi14UltraVariante, "La página regional confirma la configuración de 16 GB/512 GB, batería de 5000 mAh, carga 90 W/80 W, dimensiones, peso y colores disponibles."),
  ],
);


const redmi13Fuente = "redmi-note-13-pro-plus";
const redmi13Variante = "12gb-512gb";
const redmiNote13ProPlus = crearFicha(
  "moviles",
  "verificado",
  [{
    id: redmi13Variante,
    modelo: "Redmi Note 13 Pro+ 5G",
    ram: "12 GB LPDDR5",
    almacenamiento: "512 GB UFS 3.1",
    mercado: "Colombia",
  }],
  [
    atributo("procesador", "Procesador", "rendimiento", "MediaTek Dimensity 7200-Ultra · 4 nm · CPU octa-core hasta 2,8 GHz · GPU Mali-G610", redmi13Fuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "CrystalRes Curved AMOLED · Dolby Vision · HDR10+", redmi13Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.67, redmi13Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "2712 × 1220 píxeles", redmi13Fuente),
    atributo("densidad_pixeles", "Densidad de píxeles", "pantalla", "446 ppi", redmi13Fuente),
    atributo("tasa_refresco", "Frecuencia de actualización", "pantalla", 120, redmi13Fuente, "Hz"),
    atributo("brillo", "Brillo máximo", "pantalla", 1800, redmi13Fuente, "nits"),
    atributo("proteccion_pantalla", "Protección de pantalla", "pantalla", "Corning Gorilla Glass Victus", redmi13Fuente),
    atributo("ram", "Memoria RAM", "memoria", 12, redmi13Fuente, "GB"),
    atributo("tipo_ram", "Tecnología de RAM", "memoria", "LPDDR5", redmi13Fuente),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 512, redmi13Fuente, "GB"),
    atributo("tipo_almacenamiento", "Tecnología de almacenamiento", "almacenamiento", "UFS 3.1", redmi13Fuente),
    atributo("camara_principal", "Cámara principal", "camaras", "200 MP · OIS · ƒ/1.65 · sensor de 1/1,4 pulgadas", redmi13Fuente),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", "8 MP · ƒ/2.2", redmi13Fuente),
    atributo("camara_macro", "Cámara macro", "camaras", "2 MP · ƒ/2.4", redmi13Fuente),
    atributo("camara_frontal", "Cámara frontal", "camaras", "16 MP · ƒ/2.4", redmi13Fuente),
    atributo("video", "Grabación de vídeo trasera", "camaras", "4K a 24/30 fps · 1080p hasta 60 fps", redmi13Fuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, redmi13Fuente, "mAh"),
    atributo("carga_rapida", "Carga rápida", "bateria", 120, redmi13Fuente, "W"),
    atributo("autonomia_video", "Reproducción de vídeo (máximo declarado)", "bateria", 19, redmi13Fuente, "h"),
    atributo("conectividad", "Conectividad", "conectividad", "5G · Wi-Fi 6 · Bluetooth 5.3 · NFC · Dual SIM/eSIM según mercado", redmi13Fuente),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP68", redmi13Fuente),
    atributo("dimensiones", "Dimensiones", "dimensiones", "161,4 × 74,2 × 8,9 mm", redmi13Fuente),
    atributo("peso", "Peso", "dimensiones", 204.5, redmi13Fuente, "g"),
    atributo("sistema_operativo_lanzamiento", "Sistema operativo de lanzamiento", "software", "MIUI 14", redmi13Fuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.67, "in", redmi13Fuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, "mAh", redmi13Fuente),
  ],
  [
    fuente("redmi-note-13-pro-plus-co-specs", "Xiaomi Colombia — REDMI Note 13 Pro+ 5G, especificaciones", "https://www.mi.com/co/product/redmi-note-13-pro-plus-5g/specs/", redmi13Variante, "La ficha oficial confirma procesador, pantalla, cámaras, batería, conectividad, IP68 y dimensiones."),
    fuente("redmi-note-13-pro-plus-co-buy", "Xiaomi Colombia — REDMI Note 13 Pro+ 5G, variante 12 GB + 512 GB", "https://www.mi.com/co/product/redmi-note-13-pro-plus-5g/buy/?gid=4223706821&ml=3472&mr=m", redmi13Variante, "La página de compra confirma la variante colombiana 12 GB + 512 GB y sus colores disponibles."),
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
  appleIphone15ProMax: iphone15ProMax,
  samsungGalaxyS25Ultra: samsungGalaxyS25Ultra,
  oneplus13: oneplus13,
  redmiNote14ProPlus: redmiNote14ProPlus,
  xiaomi14TPro: xiaomi14TPro,
  nothingEarABlack: nothingEarABlack,
  samsungGalaxyA55: samsungGalaxyA55,
  appleIphone13: appleIphone13,
  xiaomi14Ultra: xiaomi14Ultra,
  redmiNote13ProPlus: redmiNote13ProPlus,
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
    case 201:
      return iphone15ProMax;
    case 206:
      return samsungGalaxyS25Ultra;
    case 207:
      return oneplus13;
    case 107:
      return redmiNote14ProPlus;
    case 306:
      return xiaomi14TPro;
    case 301:
      return nothingEarABlack;
    case 102:
      return samsungGalaxyA55;
    case 104:
      return appleIphone13;
    case 204:
      return xiaomi14Ultra;
    case 101:
      return redmiNote13ProPlus;
    default: {
      const n = normalizarNombre(nombre);
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
