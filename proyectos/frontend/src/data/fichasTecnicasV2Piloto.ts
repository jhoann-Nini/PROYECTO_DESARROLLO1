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
    atributo("procesador", "Procesador", "rendimiento", "Intel Core i5-1335U · 10 núcleos (2P + 8E) · 12 hilos · hasta 4,6 GHz P-core / 3,4 GHz E-core", lenovoFuente),
    atributo("graficos", "Gráficos", "rendimiento", "Intel Iris Xe Graphics integrada", lenovoFuente),
    atributo("ram", "Memoria RAM", "memoria", 16, lenovoFuente, "GB"),
    atributo("tipo_ram", "Tipo y distribución de memoria", "memoria", "DDR4-3200 · 8 GB soldados + 8 GB SO-DIMM · ampliable hasta 40 GB", lenovoFuente),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 512, lenovoFuente, "GB"),
    atributo("tipo_almacenamiento", "Unidad", "almacenamiento", "SSD M.2 2242 PCIe 4.0 x4 NVMe Opal 2.0", lenovoFuente),
    atributo("ranuras_almacenamiento", "Ranuras de almacenamiento", "almacenamiento", "2 × M.2 2242: una PCIe 3.0 x4 y una PCIe 4.0 x4", lenovoFuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 14, lenovoFuente, "in"),
    atributo("tipo_pantalla", "Panel", "pantalla", "IPS WUXGA · 1920 × 1200 · relación 16:10 · antirreflejo", lenovoFuente),
    atributo("brillo", "Brillo", "pantalla", 300, lenovoFuente, "nits"),
    atributo("contraste", "Relación de contraste", "pantalla", "700:1", lenovoFuente),
    atributo("cobertura_color", "Cobertura de color", "pantalla", "45% NTSC", lenovoFuente),
    atributo("pantalla_tactil", "Pantalla táctil", "pantalla", false, lenovoFuente),
    atributo("camara", "Cámara", "audio_video", "FHD 1080p + IR híbrida con obturador de privacidad", lenovoFuente),
    atributo("audio", "Altavoces y micrófonos", "audio_video", "2 altavoces estéreo de 2 W con Dolby Atmos · 2 micrófonos en matriz", lenovoFuente),
    atributo("energia_bateria", "Capacidad de batería", "bateria", 57, lenovoFuente, "Wh"),
    atributo("adaptador", "Adaptador de corriente", "energia", "65 W USB-C · Power Delivery 3.0", lenovoFuente),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 6 (802.11ax) 2×2", lenovoFuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.1", lenovoFuente),
    atributo("ethernet", "Ethernet", "conectividad", "Gigabit Ethernet RJ-45", lenovoFuente),
    atributo("puertos", "Puertos", "conectividad", "1 × USB 2.0 · 1 × USB-A 3.2 Gen 1 Always On · 1 × USB-C 3.2 Gen 2 · 1 × Thunderbolt 4 / USB4 40 Gbps · HDMI 2.1 · combo audio 3,5 mm · RJ-45", lenovoFuente),
    atributo("seguridad", "Seguridad", "seguridad", "TPM 2.0 · lector de huellas integrado en botón de encendido · ThinkShield · obturador de cámara · cámara IR para Windows Hello", lenovoFuente),
    atributo("teclado", "Teclado", "diseno", "Retroiluminado · distribución English (EU)", lenovoFuente),
    atributo("dimensiones", "Dimensiones (ancho × fondo × alto)", "diseno", "313 × 219,3 × 17,99 mm", lenovoFuente),
    atributo("peso", "Peso inicial", "diseno", 1.43, lenovoFuente, "kg"),
    atributo("sistema_operativo", "Sistema operativo de fábrica", "software", "Sin sistema operativo preinstalado (según PSREF del MTM)", lenovoFuente),
    atributo("color", "Color del chasis", "diseno", "Graphite Black", lenovoFuente),
    atributo("material_chasis", "Material del chasis", "diseno", "Aluminio en cubierta y base", lenovoFuente),
  ],
  [
    metrica("ram", "Memoria RAM", "memoria", 16, "GB", lenovoFuente),
    metrica("almacenamiento", "Almacenamiento", "almacenamiento", 512, "GB", lenovoFuente),
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 14, "in", lenovoFuente),
    metrica("energia_bateria", "Capacidad de batería", "bateria", 57, "Wh", lenovoFuente),
    metrica("peso", "Peso inicial", "diseno", 1.43, "kg", lenovoFuente),
  ],
  [
    fuente("lenovo-psref-21jk0005ri", "Lenovo PSREF — ThinkPad E14 Gen 5 (Intel), MTM 21JK0005RI", "https://psref.lenovo.com/Detail/ThinkPad/ThinkPad_E14_Gen_5_Intel?M=21JK0005RI", lenovoVariante, "Fuente primaria del MTM exacto 21JK0005RI. Identifica región EET/Rumania y confirma CPU, gráficos, RAM, SSD, pantalla, batería de 57 Wh, cámara, puertos, conectividad, seguridad, dimensiones y peso. La ficha de PSREF indica que el equipo se comercializó sin sistema operativo preinstalado."),
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
    identificador: "M3 Max · CPU 16 núcleos (12 de rendimiento + 4 de eficiencia) · GPU 40 núcleos",
  }],
  [
    atributo("procesador", "Chip", "rendimiento", "Apple M3 Max · CPU de 16 núcleos · GPU de 40 núcleos · Neural Engine de 16 núcleos", macFuente),
    atributo("ancho_banda_memoria", "Ancho de banda de memoria", "memoria", "400 GB/s", macFuente),
    atributo("ram", "Memoria unificada", "memoria", 48, macFuente, "GB"),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 1, macFuente, "TB"),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 16.2, macFuente, "in"),
    atributo("tipo_pantalla", "Pantalla", "pantalla", "Liquid Retina XDR", macFuente),
    atributo("resolucion", "Resolución", "pantalla", "3456 × 2234 píxeles · 254 ppp", macFuente),
    atributo("contraste", "Relación de contraste", "pantalla", "1 000 000:1", macFuente),
    atributo("brillo_sdr", "Brillo SDR", "pantalla", 600, macFuente, "nits"),
    atributo("brillo_xdr", "Brillo XDR sostenido", "pantalla", 1000, macFuente, "nits"),
    atributo("brillo_hdr", "Brillo máximo HDR", "pantalla", 1600, macFuente, "nits"),
    atributo("gama_color", "Gama de color", "pantalla", "P3 · True Tone · mil millones de colores", macFuente),
    atributo("tasa_refresco", "Tasa de refresco", "pantalla", 120, macFuente, "Hz"),
    atributo("energia_bateria", "Capacidad nominal de batería", "bateria", 100, macFuente, "Wh"),
    atributo("capacidad_bateria_real", "Capacidad real indicada en nota técnica", "bateria", 99.6, macFuente, "Wh"),
    atributo("autonomia_video", "Reproducción de vídeo (máximo declarado)", "bateria", 22, macFuente, "h"),
    atributo("autonomia_web", "Navegación web inalámbrica (máximo declarado)", "bateria", 15, macFuente, "h"),
    atributo("adaptador", "Adaptador de corriente incluido", "energia", "USB-C de 140 W · carga rápida", macFuente),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 6E (802.11ax)", macFuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.3", macFuente),
    atributo("puertos", "Puertos y expansión", "conectividad", "3 × Thunderbolt 4 / USB-C (hasta 40 Gb/s) · HDMI · lector SDXC · MagSafe 3 · jack 3,5 mm", macFuente),
    atributo("monitores_externos", "Compatibilidad de monitores externos", "video", "Hasta 4 monitores externos: hasta 3 × 6K a 60 Hz por Thunderbolt y 1 × 4K a 144 Hz por HDMI; o hasta 2 × 6K a 60 Hz y 1 × 8K a 60 Hz / 4K a 240 Hz por HDMI", macFuente),
    atributo("camara", "Cámara", "audio_video", "FaceTime HD 1080p", macFuente),
    atributo("audio", "Sistema de audio", "audio_video", "6 altavoces de alta fidelidad con woofers de cancelación de fuerza · 3 micrófonos de calidad de estudio · audio espacial y Dolby Atmos", macFuente),
    atributo("teclado", "Teclado y trackpad", "entrada", "Magic Keyboard retroiluminado con Touch ID · trackpad Force Touch", macFuente),
    atributo("sistema_operativo", "Sistema operativo", "software", "macOS (versión no fijada en esta ficha)", macFuente),
    atributo("dimensiones", "Dimensiones (alto × ancho × fondo)", "diseno", "1,68 × 35,57 × 24,81 cm", macFuente),
    atributo("peso", "Peso", "diseno", 2.16, macFuente, "kg"),
  ],
  [
    metrica("ram", "Memoria unificada", "memoria", 48, "GB", macFuente),
    metrica("almacenamiento", "Almacenamiento", "almacenamiento", 1, "TB", macFuente),
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 16.2, "in", macFuente),
    metrica("energia_bateria", "Capacidad nominal de batería", "bateria", 100, "Wh", macFuente),
    metrica("peso", "Peso", "diseno", 2.16, "kg", macFuente),
  ],
  [
    fuente("apple-macbook-pro-m3-max", "Apple Support Colombia — MacBook Pro de 16 pulgadas (noviembre de 2023), especificaciones técnicas", "https://support.apple.com/es-co/117737", macVariante, "La página oficial confirma específicamente la configuración M3 Max CPU 16/GPU 40, 48 GB de memoria unificada y SSD de 1 TB. Los datos compartidos por la familia de 16 pulgadas se identifican como tales; las opciones de pantalla, puertos, conectividad, batería, cámara, audio, dimensiones y peso se documentan desde la misma fuente."),
  ],
);

const earFuente = "nothing-ear-2";
const earVariante = "transparent-white";
const nothingEar2 = crearFicha(
  "auriculares",
  "verificado",
  [{
    id: earVariante,
    modelo: "Nothing Ear (2)",
    identificador: "Transparent White",
  }],
  [
    atributo("transductores", "Transductor", "audio", 11.6, earFuente, "mm"),
    atributo("diafragma", "Diafragma", "audio", "Graphene + PU (poliuretano)", earFuente),
    atributo("cancelacion_ruido", "Cancelación activa de ruido", "audio", "Hasta 40 dB · ANC adaptativa y personalizada", earFuente),
    atributo("codecs", "Códecs Bluetooth", "conectividad", "AAC, SBC, LHDC 5.0", earFuente),
    atributo("bluetooth", "Versión Bluetooth", "conectividad", "Bluetooth 5.3", earFuente),
    atributo("bateria_auriculares", "Autonomía de auriculares (ANC desactivado)", "bateria", "Hasta 6.3 h", earFuente),
    atributo("bateria_estuche", "Autonomía total con estuche (ANC desactivado)", "bateria", "Hasta 36 h", earFuente),
    atributo("bateria_auriculares_anc_on", "Autonomía de auriculares (ANC activada)", "bateria", "Hasta 4 h", earFuente),
    atributo("bateria_estuche_anc_on", "Autonomía total con estuche (ANC activada)", "bateria", "Hasta 22,5 h", earFuente),
    atributo("conversacion_anc_off", "Tiempo de conversación (ANC desactivada)", "bateria", "3,5 h auriculares · 20,5 h con estuche", earFuente),
    atributo("conversacion_anc_on", "Tiempo de conversación (ANC activada)", "bateria", "3 h auriculares · 17,5 h con estuche", earFuente),
    atributo("carga_rapida", "Carga rápida", "bateria", "10 minutos para hasta 8 horas de reproducción con estuche (ANC apagada)", earFuente),
    atributo("carga_inalambrica", "Carga inalámbrica", "bateria", "Qi hasta 2,5 W", earFuente),
    atributo("microfonos", "Micrófonos", "audio", "3 por auricular · Clear Voice Technology", earFuente),
    atributo("rango_anc", "Rango de frecuencia ANC", "audio", 5000, earFuente, "Hz"),
    atributo("audio_hi_res", "Audio de alta resolución", "audio", "24 bits / 192 kHz · LHDC 5.0", earFuente),
    atributo("resistencia_auriculares", "Resistencia de auriculares", "diseno", "IP54", earFuente),
    atributo("resistencia_estuche", "Resistencia del estuche", "diseno", "IP55", earFuente),
    atributo("doble_conexion", "Conexión dual", "conectividad", true, earFuente),
    atributo("google_fast_pair", "Google Fast Pair", "conectividad", true, earFuente),
    atributo("dimensiones_auricular", "Dimensiones auricular", "diseno", "29,4 × 21,5 × 23,5 mm", earFuente),
    atributo("dimensiones_estuche", "Dimensiones estuche", "diseno", "55,5 × 55,5 × 22 mm", earFuente),
    atributo("peso_auricular", "Peso por auricular", "diseno", 4.5, earFuente, "g"),
    atributo("peso_estuche", "Peso estuche", "diseno", 51.9, earFuente, "g"),
    atributo("capacidad_bateria_auriculares", "Capacidad batería por auricular", "bateria", 33, earFuente, "mAh"),
    atributo("capacidad_bateria_estuche", "Capacidad batería del estuche", "bateria", 485, earFuente, "mAh"),
  ],
  [
    metrica("tamano_transductor", "Diámetro del transductor", "audio", 11.6, "mm", earFuente),
    metrica("autonomia_anc_off", "Autonomía total con ANC desactivada", "bateria", 36, "h", earFuente),
    metrica("autonomia_anc_on", "Autonomía total con ANC activada", "bateria", 22.5, "h", earFuente),
  ],
  [
    fuente("nothing-ear-2", "Nothing España — Ear (2), especificaciones técnicas", "https://checkout-es.nothing.tech/products/ear-2", earVariante, "La página oficial respalda las especificaciones completas: audio, ANC, batería, dimensiones, resistencia y conectividad."),
    fuente("nothing-ear-2-white-variant", "Nothing — Store Locator, Ear (2) White", "https://checkout-us.nothing.tech/pages/store-locator", earVariante, "Nothing identifica Ear (2) White como variante oficial; la fotografía CC BY-SA muestra visualmente la carcasa transparente y auriculares blancos del acabado Transparent White."),
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
    atributo("peso", "Peso aproximado", "diseno", 250, sonyFuente, "g"),
    atributo("respuesta_frecuencia_bluetooth", "Respuesta de frecuencia Bluetooth", "audio", "20 Hz–20 kHz (44,1 kHz); 20 Hz–40 kHz (LDAC 96 kHz/990 kbps)", sonyFuente),
    atributo("impedancia", "Impedancia por cable", "audio", "48 Ω (encendido) / 16 Ω (apagado), a 1 kHz", sonyFuente),
    atributo("sensibilidad", "Sensibilidad por cable", "audio", "102 dB/mW (encendido) / 100 dB/mW (apagado), a 1 kHz", sonyFuente),
    atributo("conector", "Entrada analógica", "conectividad", "Minijack estéreo de 3,5 mm", sonyFuente),
    atributo("cable", "Cable de audio", "accesorios", "Desmontable, conexión unilateral; minijack estéreo", sonyFuente),
    atributo("carga", "Tiempo de carga", "bateria", 3.5, sonyFuente, "h"),
    atributo("autonomia_llamadas", "Autonomía en comunicación", "bateria", "Hasta 24 h (NC ON) / 32 h (NC OFF)", sonyFuente),
    atributo("dsee", "DSEE Extreme", "audio", true, sonyFuente),
    atributo("modo_ambiente", "Modo de sonido ambiente", "audio", true, sonyFuente),
    atributo("nc_optimizer", "Optimizador automático de cancelación", "audio", true, sonyFuente),
    atributo("operacion_pasiva", "Funcionamiento pasivo por cable", "audio", true, sonyFuente),
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
    atributo("resolucion", "Resolución", "pantalla", "2340 × 1080 píxeles", galaxyA55SpecsFuente),
    atributo("tasa_refresco", "Tasa de refresco máxima", "pantalla", 120, galaxyA55Fuente, "Hz"),
    atributo("ram", "Memoria RAM", "memoria", 8, galaxyA55Fuente, "GB"),
    atributo("almacenamiento_128gb", "Almacenamiento de variante 8/128 GB", "almacenamiento", 128, galaxyA55SpecsFuente, "GB"),
    atributo("almacenamiento_256gb", "Almacenamiento de variante 8/256 GB", "almacenamiento", 256, galaxyA55Fuente, "GB"),
    atributo("almacenamiento_expandible", "Expansión por microSD", "almacenamiento", "Hasta 1 TB", galaxyA55Fuente),
    atributo("camara_principal", "Cámara principal", "camaras", 50, galaxyA55Fuente, "mpx"),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", 12, galaxyA55Fuente, "mpx"),
    atributo("camara_macro", "Cámara macro", "camaras", 5, galaxyA55Fuente, "mpx"),
    atributo("camara_frontal", "Cámara frontal", "camaras", 32, galaxyA55Fuente, "mpx"),
    atributo("estabilizacion", "Estabilización de cámara principal", "camaras", "Óptica (OIS)", galaxyA55Fuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, galaxyA55Fuente, "mAh"),
    atributo("carga_rapida", "Carga por cable", "bateria", 25, galaxyA55SpecsFuente, "W"),
    atributo("dimensiones", "Dimensiones", "diseno", "161,1 × 77,4 × 8,2 mm", galaxyA55Fuente),
    atributo("peso", "Peso", "diseno", 213, galaxyA55Fuente, "g"),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP67", galaxyA55Fuente),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 6 (802.11ax)", galaxyA55SpecsFuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.3", galaxyA55SpecsFuente),
    atributo("nfc", "NFC", "conectividad", true, galaxyA55SpecsFuente),
    atributo("usb", "Interfaz USB", "conectividad", "USB Type-C 2.0", galaxyA55SpecsFuente),
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


const redmiNote14Fuente = "xiaomi-redmi-note14proplus-global-specs";
const redmiNote14NoMicrosdFuente = "xiaomi-redmi-note14proplus-storage";
const redmiNote14Variante = "12gb-512gb-co";
const redmiNote14ProPlus = crearFicha(
  "moviles",
  "verificado",
  [{
    id: redmiNote14Variante,
    modelo: "Xiaomi Redmi Note 14 Pro+ 5G",
    ram: "12 GB LPDDR4X",
    almacenamiento: "512 GB UFS 2.2",
    mercado: "Colombia",
  }],
  [
    atributo("procesador", "Procesador", "rendimiento", "Qualcomm Snapdragon 7s Gen 3 · 4 nm · CPU octa-core hasta 2,5 GHz · GPU Adreno", redmiNote14Fuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "CrystalRes AMOLED · Dolby Vision · HDR10+", redmiNote14Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.67, redmiNote14Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "2712 × 1220 píxeles (1.5K)", redmiNote14Fuente),
    atributo("tasa_refresco", "Tasa de refresco máxima", "pantalla", 120, redmiNote14Fuente, "Hz"),
    atributo("brillo_maximo", "Brillo máximo de pico", "pantalla", 3000, redmiNote14Fuente, "nits"),
    atributo("profundidad_color", "Profundidad de color", "pantalla", "12 bits", redmiNote14Fuente),
    atributo("proteccion_pantalla", "Protección de pantalla", "pantalla", "Corning Gorilla Glass Victus 2", redmiNote14Fuente),
    atributo("ram", "Memoria RAM física", "memoria", 12, redmiNote14Fuente, "GB"),
    atributo("tipo_ram", "Tecnología de RAM", "memoria", "LPDDR4X", redmiNote14Fuente),
    atributo("almacenamiento", "Almacenamiento interno", "almacenamiento", 512, redmiNote14Fuente, "GB"),
    atributo("tipo_almacenamiento", "Tecnología de almacenamiento", "almacenamiento", "UFS 2.2", redmiNote14Fuente),
    atributo("extension_ram", "Extensión de memoria", "memoria", "Admite extensión de RAM virtual usando espacio de almacenamiento; no equivale a RAM física", redmiNote14Fuente),
    atributo("camara_principal", "Cámara principal", "camaras", 200, redmiNote14Fuente, "mpx"),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", 8, redmiNote14Fuente, "mpx"),
    atributo("camara_macro", "Cámara macro", "camaras", 2, redmiNote14Fuente, "mpx"),
    atributo("camara_frontal", "Cámara frontal", "camaras", 20, redmiNote14Fuente, "mpx"),
    atributo("estabilizacion", "Estabilización cámara principal", "camaras", "Óptica (OIS)", redmiNote14Fuente),
    atributo("apertura_principal", "Apertura cámara principal", "camaras", "f/1.65", redmiNote14Fuente),
    atributo("video", "Grabación de vídeo trasera", "camaras", "4K a 24/30 fps", redmiNote14Fuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 5110, redmiNote14Fuente, "mAh"),
    atributo("carga_rapida", "Carga HyperCharge", "bateria", 120, redmiNote14Fuente, "W"),
    atributo("dimensiones", "Dimensiones según acabado", "diseno", "162,53 × 74,67 mm; grosor 8,75 mm (otros acabados) o 8,85 mm (Lavender Purple)", redmiNote14Fuente),
    atributo("peso", "Peso según acabado", "diseno", "210,14 g (otros acabados) o 205,13 g (Lavender Purple)", redmiNote14Fuente),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP68", redmiNote14Fuente),
    atributo("red_movil", "Red móvil", "conectividad", "5G", redmiNote14Fuente),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 6/6E; disponibilidad 6E según región", redmiNote14Fuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.4", redmiNote14Fuente),
    atributo("nfc", "NFC", "conectividad", true, redmiNote14Fuente),
    atributo("sim", "Configuración SIM", "conectividad", "Dual nano-SIM o nano-SIM + eSIM, según región/operador", redmiNote14Fuente),
    atributo("sistema_operativo", "Sistema operativo", "software", "Xiaomi HyperOS", redmiNote14Fuente),
    atributo("almacenamiento_expandible", "Expansión microSD", "almacenamiento", false, redmiNote14NoMicrosdFuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.67, "in", redmiNote14Fuente),
    metrica("tasa_refresco", "Tasa de refresco máxima", "pantalla", 120, "Hz", redmiNote14Fuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 5110, "mAh", redmiNote14Fuente),
    metrica("carga_rapida", "Carga HyperCharge", "bateria", 120, "W", redmiNote14Fuente),
  ],
  [
    fuente("xiaomi-redmi-note14proplus-co-terms", "Xiaomi Colombia — términos promocionales que identifican Redmi Note 14 Pro+ 5G 12 GB + 512 GB", "https://www.mi.com/co/support/terms/tc-para-cupones-202509/", redmiNote14Variante, "Documento oficial regional que incluye expresamente Redmi Note 14 Pro+ 5G 12 GB + 512 GB entre las variantes colombianas.", "2026-11-17"),
    fuente(redmiNote14Fuente, "Xiaomi Global — Redmi Note 14 Pro+ 5G, especificaciones", "https://www.mi.com/global/product/redmi-note-14-pro-plus-5g/specs/", redmiNote14Variante, "Ficha oficial enumera 8+256, 12+256 y 12+512 GB LPDDR4X/UFS 2.2, además de chipset, pantalla, cámaras, batería, resistencia y conectividad.", "2026-11-17"),
    fuente("xiaomi-redmi-note14proplus-memory-extension", "Xiaomi Support — Redmi Note 14 Pro+ 5G, extensión de memoria", "https://www.mi.com/es/support/faq/details/KA-757974/", null, "Confirma que la extensión crea RAM adicional utilizando espacio del almacenamiento interno; no debe confundirse con RAM física.", "2026-11-17"),
    fuente(redmiNote14NoMicrosdFuente, "Xiaomi Support — Redmi Note 14 Pro+ 5G, almacenamiento expandible", "https://www.mi.com/global/support/faq/details/KA-524687/", null, "Xiaomi confirma que el modelo no admite expansión mediante tarjeta microSD.", "2026-11-17"),
  ],
);


const oneplus13Fuente = "oneplus-13-latam-specs";
const oneplus13IpFuente = "oneplus-13-ip-rating";
const oneplus13 = crearFicha(
  "moviles",
  "verificado",
  [
    { id: "16gb-512gb", modelo: "OnePlus 13", ram: "16 GB LPDDR5X", almacenamiento: "512 GB UFS 4.0" },
    { id: "12gb-256gb", modelo: "OnePlus 13", ram: "12 GB LPDDR5X", almacenamiento: "256 GB UFS 4.0" },
  ],
  [
    atributo("procesador", "Plataforma móvil", "rendimiento", "Qualcomm Snapdragon 8 Elite · CPU Qualcomm Oryon hasta 4,32 GHz", oneplus13Fuente),
    atributo("gpu", "GPU", "rendimiento", "Adreno 830", oneplus13Fuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "ProXDR LTPO 4.1 · Ceramic Guard", oneplus13Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.82, oneplus13Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "3168 × 1440 píxeles (QHD+)", oneplus13Fuente),
    atributo("densidad_pixeles", "Densidad de píxeles", "pantalla", "510 ppi", oneplus13Fuente),
    atributo("tasa_refresco", "Tasa de refresco", "pantalla", "Dinámica de 1 a 120 Hz", oneplus13Fuente),
    atributo("brillo_hbm", "Brillo HBM", "pantalla", 1600, oneplus13Fuente, "nits"),
    atributo("brillo_maximo", "Brillo pico", "pantalla", 4500, oneplus13Fuente, "nits"),
    atributo("profundidad_color", "Profundidad de color", "pantalla", "10 bits", oneplus13Fuente),
    atributo("ram", "Memoria RAM", "memoria", 16, oneplus13Fuente, "GB"),
    atributo("tipo_ram", "Tecnología de RAM", "memoria", "LPDDR5X", oneplus13Fuente),
    atributo("almacenamiento", "Almacenamiento interno", "almacenamiento", 512, oneplus13Fuente, "GB"),
    atributo("tipo_almacenamiento", "Tecnología de almacenamiento", "almacenamiento", "UFS 4.0", oneplus13Fuente),
    atributo("camara_principal", "Cámara principal", "camaras", 50, oneplus13Fuente, "mpx"),
    atributo("sensor_principal", "Sensor principal", "camaras", "Sony LYT-808 · OIS · f/1.6", oneplus13Fuente),
    atributo("camara_teleobjetivo", "Teleobjetivo", "camaras", 50, oneplus13Fuente, "mpx"),
    atributo("zoom_optico", "Zoom óptico", "camaras", "3×", oneplus13Fuente),
    atributo("sensor_teleobjetivo", "Sensor teleobjetivo", "camaras", "Sony LYT-600 · OIS · f/2.6", oneplus13Fuente),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", 50, oneplus13Fuente, "mpx"),
    atributo("camara_frontal", "Cámara frontal", "camaras", 32, oneplus13Fuente, "mpx"),
    atributo("video_trasero", "Grabación de vídeo trasera", "camaras", "Hasta 8K a 30 fps · 4K hasta 60 fps · Dolby Vision", oneplus13Fuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 6000, oneplus13Fuente, "mAh"),
    atributo("carga_cable", "Carga por cable", "bateria", 100, oneplus13Fuente, "W"),
    atributo("carga_inalambrica", "Carga inalámbrica", "bateria", 50, oneplus13Fuente, "W"),
    atributo("dimensiones", "Dimensiones según acabado", "diseno", "162,9 × 76,5 mm; grosor 8,5 mm (Arctic Dawn/Black Eclipse) o 8,9 mm (Midnight Ocean)", oneplus13Fuente),
    atributo("peso", "Peso según acabado", "diseno", "213 g (Arctic Dawn/Black Eclipse) o 210 g (Midnight Ocean)", oneplus13Fuente),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP68 e IP69", oneplus13IpFuente),
    atributo("red_movil", "Red móvil", "conectividad", "5G", oneplus13Fuente),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 7", oneplus13Fuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.4", oneplus13Fuente),
    atributo("nfc", "NFC", "conectividad", true, oneplus13Fuente),
    atributo("usb", "Interfaz USB", "conectividad", "USB Type-C 3.2 Gen 1", oneplus13Fuente),
    atributo("sim", "SIM", "conectividad", "Doble nano-SIM; eSIM depende del operador/región", oneplus13Fuente),
    atributo("sistema_operativo", "Sistema operativo de lanzamiento", "software", "OxygenOS 15 basado en Android 15", oneplus13Fuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.82, "in", oneplus13Fuente),
    metrica("tasa_refresco", "Tasa de refresco máxima", "pantalla", 120, "Hz", oneplus13Fuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 6000, "mAh", oneplus13Fuente),
    metrica("carga_cable", "Carga por cable", "bateria", 100, "W", oneplus13Fuente),
  ],
  [
    fuente(oneplus13Fuente, "OnePlus México — OnePlus 13, especificaciones oficiales", "https://www.oneplus.com/mx/13/specs", "16gb-512gb", "Fuente oficial regional: configuraciones 12/256 y 16/512, plataforma, pantalla, cámaras, batería, carga y conectividad.", "2026-11-17"),
    fuente(oneplus13IpFuente, "OnePlus — lanzamiento global de OnePlus 13 y OnePlus 13R", "https://www.oneplus.com/global/press/press-release/oneplus-launches-new-flagship-series-oneplus-13-and-oneplus-13r", null, "Comunicado oficial confirma clasificación IP68 e IP69.", "2026-11-17"),
  ],
);


const iphone15Fuente = "apple-iphone-15-pro-max-co";
const iphone15ProMax = crearFicha(
  "moviles",
  "verificado",
  [{ id: "256gb", modelo: "Apple iPhone 15 Pro Max", almacenamiento: "256 GB", mercado: "Colombia" }],
  [
    atributo("procesador", "Chip", "rendimiento", "Apple A17 Pro · CPU de 6 núcleos · GPU de 6 núcleos · Neural Engine de 16 núcleos", iphone15Fuente),
    atributo("pantalla", "Pantalla", "pantalla", "Super Retina XDR · OLED · Dynamic Island", iphone15Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.7, iphone15Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "2796 × 1290 píxeles", iphone15Fuente),
    atributo("densidad_pixeles", "Densidad de píxeles", "pantalla", "460 ppi", iphone15Fuente),
    atributo("tasa_refresco", "Tasa de refresco", "pantalla", "ProMotion adaptativo hasta 120 Hz", iphone15Fuente),
    atributo("brillo_tipico", "Brillo máximo típico", "pantalla", 1000, iphone15Fuente, "nits"),
    atributo("brillo_hdr", "Brillo pico HDR", "pantalla", 1600, iphone15Fuente, "nits"),
    atributo("brillo_exterior", "Brillo pico exterior", "pantalla", 2000, iphone15Fuente, "nits"),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 256, iphone15Fuente, "GB"),
    atributo("camara_principal", "Cámara principal", "camaras", 48, iphone15Fuente, "mpx"),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", 12, iphone15Fuente, "mpx"),
    atributo("teleobjetivo_2x", "Teleobjetivo 2x", "camaras", 12, iphone15Fuente, "mpx"),
    atributo("teleobjetivo_5x", "Teleobjetivo 5x tetraprisma", "camaras", 12, iphone15Fuente, "mpx"),
    atributo("camara_frontal", "Cámara frontal TrueDepth", "camaras", 12, iphone15Fuente, "mpx"),
    atributo("estabilizacion", "Estabilización cámara principal", "camaras", "Óptica por desplazamiento del sensor de segunda generación", iphone15Fuente),
    atributo("video", "Grabación de vídeo", "camaras", "4K hasta 60 fps · Dolby Vision HDR · ProRes", iphone15Fuente),
    atributo("capacidad_bateria", "Reproducción de vídeo (máximo declarado)", "bateria", 29, iphone15Fuente, "h"),
    atributo("streaming_video", "Streaming de vídeo (máximo declarado)", "bateria", 25, iphone15Fuente, "h"),
    atributo("dimensiones", "Dimensiones", "diseno", "159,9 × 76,7 × 8,25 mm", iphone15Fuente),
    atributo("peso", "Peso", "diseno", 221, iphone15Fuente, "g"),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP68 · hasta 6 m durante 30 minutos", iphone15Fuente),
    atributo("red_movil", "Red móvil", "conectividad", "5G sub-6 GHz", iphone15Fuente),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 6E", iphone15Fuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.3", iphone15Fuente),
    atributo("nfc", "NFC", "conectividad", true, iphone15Fuente),
    atributo("usb", "USB-C", "conectividad", "USB 3 hasta 10 Gb/s · DisplayPort", iphone15Fuente),
    atributo("sim", "SIM", "conectividad", "Nano-SIM + eSIM en modelos internacionales compatibles", iphone15Fuente),
    atributo("sistema_operativo_lanzamiento", "Sistema operativo de lanzamiento", "software", "iOS 17", iphone15Fuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.7, "in", iphone15Fuente),
    metrica("tasa_refresco", "Tasa de refresco máxima", "pantalla", 120, "Hz", iphone15Fuente),
    metrica("capacidad_bateria", "Reproducción de vídeo (máximo declarado)", "bateria", 29, "h", iphone15Fuente),
    metrica("peso", "Peso", "diseno", 221, "g", iphone15Fuente),
  ],
  [
    fuente(iphone15Fuente, "Apple Support Colombia — iPhone 15 Pro Max, especificaciones técnicas", "https://support.apple.com/es-co/111828", "256gb", "Fuente primaria oficial para variante, chip, pantalla, cámaras, batería, dimensiones, peso, resistencia y conectividad.", "2026-11-17"),
  ],
);

const samsungS25Fuente = "samsung-s25-ultra-co-specs";
const samsungS25BuyFuente = "samsung-s25-ultra-co-buy";
const samsungS25Ultra = crearFicha(
  "moviles",
  "verificado",
  [
    { id: "12gb-1tb", modelo: "Samsung Galaxy S25 Ultra", ram: "12 GB", almacenamiento: "1 TB", mercado: "Colombia" },
    { id: "12gb-512gb", modelo: "Samsung Galaxy S25 Ultra", ram: "12 GB", almacenamiento: "512 GB", mercado: "Colombia" },
    { id: "12gb-256gb", modelo: "Samsung Galaxy S25 Ultra", ram: "12 GB", almacenamiento: "256 GB", mercado: "Colombia" },
  ],
  [
    atributo("procesador", "Procesador", "rendimiento", "Qualcomm Snapdragon 8 Elite for Galaxy", samsungS25Fuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "Dynamic AMOLED 2X · Gorilla Armor 2 antirreflejo", samsungS25Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.9, samsungS25Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "3120 × 1440 píxeles (QHD+)", samsungS25Fuente),
    atributo("tasa_refresco", "Tasa de refresco", "pantalla", "Adaptativa de 1 a 120 Hz", samsungS25Fuente),
    atributo("ram", "Memoria RAM", "memoria", 12, samsungS25Fuente, "GB"),
    atributo("almacenamiento", "Almacenamiento de la variante del catálogo", "almacenamiento", 1, samsungS25Fuente, "TB"),
    atributo("camara_principal", "Cámara principal", "camaras", 200, samsungS25Fuente, "mpx"),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", 50, samsungS25Fuente, "mpx"),
    atributo("teleobjetivo_5x", "Teleobjetivo 5x", "camaras", 50, samsungS25Fuente, "mpx"),
    atributo("teleobjetivo_3x", "Teleobjetivo 3x", "camaras", 10, samsungS25Fuente, "mpx"),
    atributo("camara_frontal", "Cámara frontal", "camaras", 12, samsungS25Fuente, "mpx"),
    atributo("estabilizacion", "Estabilización óptica", "camaras", "OIS en cámara principal y teleobjetivos", samsungS25Fuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, samsungS25Fuente, "mAh"),
    atributo("carga_cable", "Carga por cable", "bateria", 45, samsungS25Fuente, "W"),
    atributo("dimensiones", "Dimensiones", "diseno", "162,8 × 77,6 × 8,2 mm", samsungS25Fuente),
    atributo("peso", "Peso", "diseno", 218, samsungS25Fuente, "g"),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP68", samsungS25Fuente),
    atributo("red_movil", "Red móvil", "conectividad", "5G", samsungS25Fuente),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 7", samsungS25Fuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.4", samsungS25Fuente),
    atributo("nfc", "NFC", "conectividad", true, samsungS25Fuente),
    atributo("usb", "USB-C", "conectividad", "USB 3.2 Gen 1", samsungS25Fuente),
    atributo("s_pen", "S Pen", "diseno", "Integrado en el dispositivo", samsungS25Fuente),
    atributo("sistema_operativo_lanzamiento", "Sistema operativo de lanzamiento", "software", "Android 15 · One UI 7", samsungS25Fuente),
    atributo("soporte_actualizaciones", "Soporte de actualizaciones", "software", "Siete generaciones de actualizaciones del sistema operativo y siete años de seguridad", samsungS25Fuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.9, "in", samsungS25Fuente),
    metrica("tasa_refresco", "Tasa de refresco máxima", "pantalla", 120, "Hz", samsungS25Fuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, "mAh", samsungS25Fuente),
    metrica("peso", "Peso", "diseno", 218, "g", samsungS25Fuente),
  ],
  [
    fuente(samsungS25BuyFuente, "Samsung Colombia — Galaxy S25 Ultra, variantes 12 GB y almacenamiento", "https://www.samsung.com/co/smartphones/galaxy-s25-ultra/buy/?modelCode=SM-S938BZTULTC", "12gb-1tb", "La tienda oficial colombiana lista 256/512 GB/1 TB, todas con 12 GB de RAM; el registro deseado:206 corresponde a 1 TB.", "2026-11-17"),
    fuente(samsungS25Fuente, "Samsung Colombia — Galaxy S25 Ultra, especificaciones y tabla técnica", "https://www.samsung.com/co/smartphones/galaxy-s25-ultra/specs/", "12gb-1tb", "Fuente primaria para pantalla, cámaras, dimensiones, peso, batería, conectividad, S Pen y software.", "2026-11-17"),
    fuente("samsung-s25-ultra-newsroom-co", "Samsung Newsroom Colombia — serie Galaxy S25, tabla de especificaciones", "https://news.samsung.com/co/la-serie-samsung-galaxy-s25-establece-el-estandar-del-smartphone-con-ia-convirtiendolo-en-un-verdadero-companero-de-ia", "12gb-1tb", "Confirma cámara, pantalla, memoria 12GB + 1TB, batería y carga.", "2026-11-17"),
  ],
);


const xiaomi14Fuente = "xiaomi-14-ultra-global-specs";
const xiaomi14Ultra = crearFicha(
  "moviles",
  "verificado",
  [{ id: "16gb-512gb", modelo: "Xiaomi 14 Ultra", ram: "16 GB LPDDR5X", almacenamiento: "512 GB UFS 4.0" }],
  [
    atributo("procesador", "Procesador", "rendimiento", "Qualcomm Snapdragon 8 Gen 3 · 4 nm · CPU hasta 3,3 GHz", xiaomi14Fuente),
    atributo("gpu", "GPU", "rendimiento", "Qualcomm Adreno", xiaomi14Fuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "AMOLED WQHD+ LTPO · Dolby Vision · HDR10+", xiaomi14Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.73, xiaomi14Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "3200 × 1440 píxeles", xiaomi14Fuente),
    atributo("densidad_pixeles", "Densidad de píxeles", "pantalla", "522 ppi", xiaomi14Fuente),
    atributo("tasa_refresco", "Tasa de refresco", "pantalla", "Dinámica de 1 a 120 Hz", xiaomi14Fuente),
    atributo("brillo_hbm", "Brillo HBM típico", "pantalla", 1000, xiaomi14Fuente, "nits"),
    atributo("brillo_maximo", "Brillo pico", "pantalla", 3000, xiaomi14Fuente, "nits"),
    atributo("profundidad_color", "Profundidad de color", "pantalla", "12 bits", xiaomi14Fuente),
    atributo("ram", "Memoria RAM", "memoria", 16, xiaomi14Fuente, "GB"),
    atributo("tipo_ram", "Tecnología de RAM", "memoria", "LPDDR5X · 8533 Mbps", xiaomi14Fuente),
    atributo("almacenamiento", "Almacenamiento interno", "almacenamiento", 512, xiaomi14Fuente, "GB"),
    atributo("tipo_almacenamiento", "Tecnología de almacenamiento", "almacenamiento", "UFS 4.0", xiaomi14Fuente),
    atributo("camara_principal", "Cámara principal Leica", "camaras", 50, xiaomi14Fuente, "mpx"),
    atributo("sensor_principal", "Sensor principal", "camaras", "Sony LYT-900 · sensor de 1 pulgada · OIS · apertura variable f/1.63–f/4.0", xiaomi14Fuente),
    atributo("camara_teleobjetivo", "Teleobjetivo flotante Leica 75 mm", "camaras", 50, xiaomi14Fuente, "mpx"),
    atributo("camara_periscopio", "Periscopio Leica 120 mm", "camaras", 50, xiaomi14Fuente, "mpx"),
    atributo("camara_ultra_gran_angular", "Ultra gran angular Leica 12 mm", "camaras", 50, xiaomi14Fuente, "mpx"),
    atributo("camara_frontal", "Cámara frontal", "camaras", 32, xiaomi14Fuente, "mpx"),
    atributo("video", "Grabación de vídeo", "camaras", "8K a 30 fps · 4K hasta 120 fps · Dolby Vision 4K a 60 fps", xiaomi14Fuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, xiaomi14Fuente, "mAh"),
    atributo("carga_cable", "Carga por cable", "bateria", 90, xiaomi14Fuente, "W"),
    atributo("carga_inalambrica", "Carga inalámbrica", "bateria", 80, xiaomi14Fuente, "W"),
    atributo("dimensiones", "Dimensiones", "diseno", "161,4 × 75,3 × 9,20 mm", xiaomi14Fuente),
    atributo("peso", "Peso", "diseno", 219.8, xiaomi14Fuente, "g"),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP68", xiaomi14Fuente),
    atributo("red_movil", "Red móvil", "conectividad", "5G", xiaomi14Fuente),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 7", xiaomi14Fuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.4", xiaomi14Fuente),
    atributo("nfc", "NFC", "conectividad", true, xiaomi14Fuente),
    atributo("sim", "SIM", "conectividad", "Doble nano-SIM; disponibilidad regional", xiaomi14Fuente),
    atributo("sistema_operativo", "Sistema operativo", "software", "Xiaomi HyperOS", xiaomi14Fuente),
    atributo("almacenamiento_expandible", "Expansión microSD", "almacenamiento", false, xiaomi14Fuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.73, "in", xiaomi14Fuente),
    metrica("tasa_refresco", "Tasa de refresco máxima", "pantalla", 120, "Hz", xiaomi14Fuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, "mAh", xiaomi14Fuente),
    metrica("carga_cable", "Carga por cable", "bateria", 90, "W", xiaomi14Fuente),
  ],
  [
    fuente(xiaomi14Fuente, "Xiaomi Global — Xiaomi 14 Ultra, especificaciones oficiales", "https://www.mi.com/global/product/xiaomi-14-ultra/specs/", "16gb-512gb", "Fuente oficial para configuración 16/512, Snapdragon 8 Gen 3, pantalla, cámaras Leica, batería, carga y conectividad.", "2026-11-17"),
    fuente("xiaomi-14-ultra-co-faq", "Xiaomi Colombia — Xiaomi 14 Ultra, preguntas frecuentes", "https://www.mi.com/co/support/faq/details/KA-110997/", "16gb-512gb", "Fuente regional confirma 16 GB RAM LPDDR5X, 512 GB UFS 4.0, batería 5000mAh, carga 90W/80W, dimensiones, peso e IP68.", "2026-11-17"),
  ],
);


const nothingEarAFuente = "nothing-ear-a-black-official";
const nothingEarABlack = crearFicha(
  "auriculares",
  "verificado",
  [{ id: "black", modelo: "Nothing Ear (a) Black Edition" }],
  [
    atributo("driver", "Transductor dinámico", "audio", 11, nothingEarAFuente, "mm"),
    atributo("diafragma", "Material del diafragma", "audio", "PMI + TPU", nothingEarAFuente),
    atributo("hi_res", "Certificación de audio", "audio", "Hi-Res Audio", nothingEarAFuente),
    atributo("codecs", "Códecs Bluetooth", "audio", "AAC · SBC · LDAC", nothingEarAFuente),
    atributo("anc", "Cancelación activa de ruido", "audio", "Smart ANC adaptativa hasta 45 dB", nothingEarAFuente),
    atributo("rango_anc", "Frecuencia de referencia ANC", "audio", 5000, nothingEarAFuente, "Hz"),
    atributo("microfonos", "Micrófonos", "audio", "3 por auricular · Clear Voice Technology", nothingEarAFuente),
    atributo("bateria_auricular", "Capacidad de batería por auricular", "bateria", 46, nothingEarAFuente, "mAh"),
    atributo("bateria_estuche", "Capacidad de batería del estuche", "bateria", 500, nothingEarAFuente, "mAh"),
    atributo("autonomia_auriculares_anc_off", "Autonomía auriculares (ANC apagada)", "bateria", 9.5, nothingEarAFuente, "h"),
    atributo("autonomia_total_anc_off", "Autonomía total con estuche (ANC apagada)", "bateria", 42.5, nothingEarAFuente, "h"),
    atributo("autonomia_auriculares_anc_on", "Autonomía auriculares (ANC activada)", "bateria", 5.5, nothingEarAFuente, "h"),
    atributo("autonomia_total_anc_on", "Autonomía total con estuche (ANC activada)", "bateria", 24.5, nothingEarAFuente, "h"),
    atributo("carga_rapida", "Carga rápida", "bateria", "10 minutos para hasta 10 horas de reproducción con ANC apagada", nothingEarAFuente),
    atributo("carga_inalambrica", "Carga inalámbrica", "bateria", false, nothingEarAFuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.3", nothingEarAFuente),
    atributo("conexion_dual", "Conexión multipunto", "conectividad", true, nothingEarAFuente),
    atributo("fast_pair", "Google Fast Pair", "conectividad", true, nothingEarAFuente),
    atributo("resistencia_auriculares", "Resistencia auriculares", "diseno", "IP54", nothingEarAFuente),
    atributo("resistencia_estuche", "Resistencia estuche", "diseno", "IPX2", nothingEarAFuente),
    atributo("peso_auricular", "Peso por auricular", "diseno", 4.8, nothingEarAFuente, "g"),
    atributo("peso_estuche", "Peso estuche", "diseno", 39.6, nothingEarAFuente, "g"),
    atributo("dimensiones_auricular", "Dimensiones auricular", "diseno", "30,9 × 21,7 × 24,3 mm", nothingEarAFuente),
    atributo("dimensiones_estuche", "Dimensiones estuche", "diseno", "47,6 × 63,3 × 22,7 mm", nothingEarAFuente),
    atributo("aplicacion", "Aplicación", "software", "Nothing X · EQ personalizado · Bass Enhance · actualizaciones firmware", nothingEarAFuente),
  ],
  [
    metrica("autonomia_total_anc_off", "Autonomía total (ANC apagada)", "bateria", 42.5, "h", nothingEarAFuente),
    metrica("autonomia_total_anc_on", "Autonomía total (ANC activada)", "bateria", 24.5, "h", nothingEarAFuente),
  ],
  [
    fuente(nothingEarAFuente, "Nothing — Ear (a), especificaciones oficiales y variante Black", "https://nothing.tech/products/ear-a?Colour=Black", "black", "Fuente oficial para color negro, transductor, ANC, códecs, conectividad, micrófonos, batería, dimensiones, peso y resistencia.", "2026-11-17"),
    fuente("nothing-ear-a-battery-support", "Nothing Support — autonomía de Ear (a)", "https://support.nothing.tech/hc/es-es/articles/23726182764305--Cu%C3%A1nto-dura-la-bater%C3%ADa-de-Ear-a", "black", "Distingue autonomía máxima con ANC apagada y activada, con y sin estuche.", "2026-11-17"),
  ],
);


const xiaomi14tFuente = "xiaomi-14t-pro-co-specs";
const xiaomi14tNoMicrosdFuente = "xiaomi-14t-pro-no-microsd";
const xiaomi14tPro = crearFicha(
  "moviles",
  "verificado",
  [{ id: "12gb-512gb-co", modelo: "Xiaomi 14T Pro", ram: "12 GB LPDDR5X", almacenamiento: "512 GB UFS 4.0", mercado: "Colombia" }],
  [
    atributo("procesador", "Procesador", "rendimiento", "MediaTek Dimensity 9300+ · 4 nm · CPU hasta 3,4 GHz", xiaomi14tFuente),
    atributo("gpu", "GPU", "rendimiento", "Immortalis-G720 MC12", xiaomi14tFuente),
    atributo("npu", "NPU", "rendimiento", "MediaTek NPU 790", xiaomi14tFuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "AMOLED · Dolby Vision · HDR10+", xiaomi14tFuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.67, xiaomi14tFuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "2712 × 1220 píxeles", xiaomi14tFuente),
    atributo("densidad_pixeles", "Densidad de píxeles", "pantalla", "446 ppi", xiaomi14tFuente),
    atributo("tasa_refresco", "Tasa de refresco", "pantalla", 144, xiaomi14tFuente, "Hz"),
    atributo("brillo_maximo", "Brillo máximo", "pantalla", 4000, xiaomi14tFuente, "nits"),
    atributo("profundidad_color", "Profundidad de color", "pantalla", "12 bits", xiaomi14tFuente),
    atributo("ram", "Memoria RAM física", "memoria", 12, xiaomi14tFuente, "GB"),
    atributo("tipo_ram", "Tecnología RAM", "memoria", "LPDDR5X · 8533 Mbps", xiaomi14tFuente),
    atributo("almacenamiento", "Almacenamiento interno", "almacenamiento", 512, xiaomi14tFuente, "GB"),
    atributo("tipo_almacenamiento", "Tecnología de almacenamiento", "almacenamiento", "UFS 4.0", xiaomi14tFuente),
    atributo("extension_almacenamiento", "Ultra Space", "almacenamiento", "16 GB de expansión de almacenamiento; no es RAM física", xiaomi14tFuente),
    atributo("camara_principal", "Cámara principal Leica", "camaras", 50, xiaomi14tFuente, "mpx"),
    atributo("sensor_principal", "Sensor principal", "camaras", "Light Fusion 900 · OIS · f/1.6 · equivalente 23 mm", xiaomi14tFuente),
    atributo("camara_teleobjetivo", "Telefoto Leica", "camaras", 50, xiaomi14tFuente, "mpx"),
    atributo("teleobjetivo_equivalente", "Distancia focal equivalente telefoto", "camaras", "60 mm · f/2.0", xiaomi14tFuente),
    atributo("camara_ultra_gran_angular", "Ultra gran angular Leica", "camaras", 12, xiaomi14tFuente, "mpx"),
    atributo("ultra_gran_angular_equivalente", "Distancia focal equivalente ultra gran angular", "camaras", "15 mm · f/2.2 · 120°", xiaomi14tFuente),
    atributo("camara_frontal", "Cámara frontal", "camaras", 32, xiaomi14tFuente, "mpx"),
    atributo("video", "Grabación de vídeo trasera", "camaras", "8K a 24/30 fps · 4K a 24/30/60 fps", xiaomi14tFuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, xiaomi14tFuente, "mAh"),
    atributo("carga_cable", "HyperCharge por cable", "bateria", 120, xiaomi14tFuente, "W"),
    atributo("carga_inalambrica", "HyperCharge inalámbrica", "bateria", 50, xiaomi14tFuente, "W"),
    atributo("dimensiones", "Dimensiones", "diseno", "160,4 × 75,1 × 8,39 mm", xiaomi14tFuente),
    atributo("peso", "Peso", "diseno", 209, xiaomi14tFuente, "g"),
    atributo("resistencia", "Resistencia al agua y polvo", "diseno", "IP68", xiaomi14tFuente),
    atributo("red_movil", "Red móvil", "conectividad", "5G", xiaomi14tFuente),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 6", xiaomi14tFuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.4", xiaomi14tFuente),
    atributo("nfc", "NFC", "conectividad", true, xiaomi14tFuente),
    atributo("sim", "SIM", "conectividad", "Dual nano-SIM, nano-SIM + eSIM o eSIM + eSIM según región", xiaomi14tFuente),
    atributo("sistema_operativo", "Sistema operativo", "software", "Xiaomi HyperOS", xiaomi14tFuente),
    atributo("almacenamiento_expandible", "Tarjeta microSD", "almacenamiento", false, xiaomi14tNoMicrosdFuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.67, "in", xiaomi14tFuente),
    metrica("tasa_refresco", "Tasa de refresco máxima", "pantalla", 144, "Hz", xiaomi14tFuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, "mAh", xiaomi14tFuente),
    metrica("carga_cable", "HyperCharge por cable", "bateria", 120, "W", xiaomi14tFuente),
  ],
  [
    fuente(xiaomi14tFuente, "Xiaomi Colombia — Xiaomi 14T Pro, especificaciones oficiales", "https://www.mi.com/co/product/xiaomi-14t-pro/specs/", "12gb-512gb-co", "Fuente primaria regional para 12GB/512GB, Dimensity 9300+, pantalla, cámaras Leica, batería, carga, IP68 y conectividad.", "2026-11-17"),
    fuente("xiaomi-14t-pro-co-faq", "Xiaomi Colombia — Xiaomi 14T Pro, memoria y almacenamiento", "https://www.mi.com/co/support/faq/details/KA-697571/", "12gb-512gb-co", "Confirma 12GB LPDDR5X, 512GB UFS 4.0 y que Ultra Space es expansión de almacenamiento, no memoria RAM física.", "2026-11-17"),
    fuente(xiaomi14tNoMicrosdFuente, "Xiaomi Colombia — Xiaomi 14T Pro, almacenamiento externo", "https://www.mi.com/co/support/faq/details/KA-719446/", null, "La FAQ oficial confirma que no admite almacenamiento externo; distingue Ultra Space de una tarjeta microSD.", "2026-11-17"),
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
  xiaomiRedmiNote14ProPlus12_512: redmiNote14ProPlus,
  oneplus13_16_512: oneplus13,
  appleIphone15ProMax256: iphone15ProMax,
  samsungGalaxyS25Ultra12_1tb: samsungS25Ultra,
  xiaomi14Ultra16_512: xiaomi14Ultra,
  nothingEarABlack: nothingEarABlack,
  xiaomi14tPro12_512: xiaomi14tPro,
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
  if (n.includes("redmi note 14 pro")) return redmiNote14ProPlus;
  if (n.includes("xiaomi 14t pro")) return xiaomi14tPro;
  if (n.includes("nothing ear a") && n.includes("black")) return nothingEarABlack;
  if (n.includes("xiaomi 14 ultra")) return xiaomi14Ultra;
  if (n.includes("iphone 15 pro max") && n.includes("256")) return iphone15ProMax;
  if (n.includes("samsung galaxy s25 ultra")) return samsungS25Ultra;
  if (n.includes("oneplus 13 5g") || n === "oneplus 13") return oneplus13;
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
    case 201:
      return iphone15ProMax;
    case 306:
      return xiaomi14tPro;
    case 301:
      return nothingEarABlack;
    case 204:
      return xiaomi14Ultra;
    case 206:
      return samsungS25Ultra;
    case 207:
      return oneplus13;
    case 107:
      return redmiNote14ProPlus;
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
      if (n.includes("redmi note 14 pro")) return redmiNote14ProPlus;
      if (n.includes("xiaomi 14t pro")) return xiaomi14tPro;
      if (n.includes("nothing ear a") && n.includes("black")) return nothingEarABlack;
      if (n.includes("xiaomi 14 ultra")) return xiaomi14Ultra;
      if (n.includes("iphone 15 pro max") && n.includes("256")) return iphone15ProMax;
      if (n.includes("samsung galaxy s25 ultra")) return samsungS25Ultra;
      if (n.includes("oneplus 13 5g") || n === "oneplus 13") return oneplus13;
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
