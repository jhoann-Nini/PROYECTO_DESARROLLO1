/**
 * Fichas técnicas documentadas del piloto TecReview.
 *
 * Criterios:
 * - Solo se incluyen atributos respaldados por las fuentes enlazadas.
 * - Las configuraciones heredadas se identifican como variantes, no como
 *   especificaciones universales de toda la familia.
 * - No se incorporan precios, puntuaciones editoriales ni benchmarks mock.
 * - El estado "parcial" indica que existe respaldo oficial del modelo y de
 *   parte de sus especificaciones, pero no que todos los SKU/mercados estén
 *   identificados y verificados.
 */
import type { AtributoFichaV2, FichaTecnicaV2 } from "@/types/fichaTecnica";

const CONSULTA = "2026-11-18";

function atributo(
  clave: string,
  nombre: string,
  grupo: string,
  valor: string,
  fuenteId: string,
): AtributoFichaV2 {
  return {
    clave,
    nombre,
    grupo,
    valor,
    unidad: null,
    valorOriginal: valor,
    fuenteId,
  };
}

function ficha(
  categoria: FichaTecnicaV2["categoria"],
  variantes: FichaTecnicaV2["variantes"],
  fuente: FichaTecnicaV2["fuentes"][number],
  atributos: AtributoFichaV2[],
): FichaTecnicaV2 {
  return {
    version_esquema: 2,
    categoria,
    estado_verificacion: "parcial",
    variantes,
    atributos,
    metricasComparables: [],
    benchmarks: [],
    fuentes: [fuente],
  };
}

const nothingPhoneFuente = {
  id: "nothing-phone-2a-se-fabricante",
  tipo: "fabricante",
  nombre: "Nothing — Phone (2a) Special Edition / documentación del fabricante",
  url: "https://checkout.nothing.tech/pages/phone-2a",
  fecha_consulta: CONSULTA,
  observaciones:
    "La página respalda la familia Phone (2a) y la edición especial. La configuración 12 GB/256 GB se conserva como variante del registro local; falta cotejar el SKU/mercado exacto.",
} as const;

const samsungFuente = {
  id: "galaxy-s24-ultra-fabricante",
  tipo: "fabricante",
  nombre: "Samsung Newsroom — Galaxy S24 Ultra",
  url: "https://news.samsung.com/us/enter-new-era-of-mobile-ai-samsung-galaxy-s24-series",
  fecha_consulta: CONSULTA,
  observaciones:
    "Fuente oficial para la familia, plataforma, pantalla y capacidades comerciales. Se conservan por separado las variantes locales de 256 GB y 512 GB.",
} as const;

const onePlusFuente = {
  id: "oneplus-pad-2-fabricante",
  tipo: "fabricante",
  nombre: "OnePlus — Pad 2 specifications",
  url: "https://www.oneplus.com/us/oneplus-pad-2/specs",
  fecha_consulta: CONSULTA,
  observaciones:
    "Ficha oficial del mercado estadounidense. La variante 12 GB/256 GB coincide con los registros piloto; la disponibilidad y el SKU colombiano no quedan acreditados por esta fuente.",
} as const;

const ipadFuente = {
  id: "ipad-pro-m4-fabricante",
  tipo: "fabricante",
  nombre: "Apple — iPad Pro (M4), especificaciones técnicas",
  url: "https://support.apple.com/en-am/119892",
  fecha_consulta: CONSULTA,
  observaciones:
    "La configuración de 1 TB corresponde a 16 GB de memoria unificada. No se infiere conectividad Wi-Fi o Wi-Fi + Cellular porque el registro de origen no identifica esa opción.",
} as const;

const thinkPadFuente = {
  id: "thinkpad-e14-gen5-psref",
  tipo: "fabricante",
  nombre: "Lenovo PSREF — ThinkPad E14 Gen 5, MTM 21JK0005RI",
  url: "https://psref.lenovo.com/Detail/ThinkPad/ThinkPad_E14_Gen_5_Intel?M=21JK0005RI",
  fecha_consulta: CONSULTA,
  observaciones:
    "La referencia PSREF identifica el MTM regional y la configuración Intel i5-1335U, 16 GB y SSD de 512 GB. No sustituir por anuncios de otros MTM o del procesador i5-1355U.",
} as const;

const macbookFuente = {
  id: "macbook-pro-m3-max-fabricante",
  tipo: "fabricante",
  nombre: "Apple — MacBook Pro de 16 pulgadas (M3 Pro/M3 Max), especificaciones",
  url: "https://support.apple.com/es-la/117737",
  fecha_consulta: CONSULTA,
  observaciones:
    "Se documenta la configuración M3 Max de 16 núcleos CPU, 40 núcleos GPU, 48 GB de memoria unificada y SSD de 1 TB indicada por el registro piloto. La configuración 36 GB se descarta para esta variante.",
} as const;

const nothingEarFuente = {
  id: "nothing-ear-2-fabricante",
  tipo: "fabricante",
  nombre: "Nothing — Ear (2)",
  url: "https://checkout-us.nothing.tech/products/ear-2",
  fecha_consulta: CONSULTA,
  observaciones:
    "Fuente oficial de características de Ear (2). El color Transparent White se mantiene como dato de variante del registro local.",
} as const;

const sonyFuente = {
  id: "sony-wh1000xm5-fabricante",
  tipo: "fabricante",
  nombre: "Sony — WH-1000XM5 specifications",
  url: "https://www.sony.com/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm5/specifications",
  fecha_consulta: CONSULTA,
  observaciones:
    "Ficha oficial de soporte del modelo WH-1000XM5. No se incorporan puntuaciones ni resultados de pruebas editoriales.",
} as const;

export const FICHAS_TECNICAS_PILOTO: Readonly<Record<string, FichaTecnicaV2>> = {
  "nothing-phone-2a-special-edition": ficha(
    "moviles",
    [{
      id: "12gb-256gb",
      modelo: "Nothing Phone (2a) Special Edition",
      mercado: null,
      ram: "12 GB",
      almacenamiento: "256 GB",
    }],
    nothingPhoneFuente,
    [
      atributo("pantalla", "Pantalla", "pantalla", "6,7 pulgadas Flexible AMOLED; FHD+ 2412 × 1084; hasta 120 Hz", nothingPhoneFuente.id),
      atributo("procesador", "Procesador", "rendimiento", "MediaTek Dimensity 7200 Pro (4 nm)", nothingPhoneFuente.id),
      atributo("memoria", "Memoria y almacenamiento", "memoria", "12 GB RAM LPDDR4X y 256 GB de almacenamiento UFS 2.2 (variante de origen)", nothingPhoneFuente.id),
      atributo("camara_trasera", "Cámaras traseras", "camaras", "Principal de 50 MP con OIS y ultra gran angular de 50 MP", nothingPhoneFuente.id),
      atributo("camara_frontal", "Cámara frontal", "camaras", "32 MP", nothingPhoneFuente.id),
      atributo("bateria", "Batería y carga", "bateria", "5000 mAh; carga por cable de hasta 45 W", nothingPhoneFuente.id),
      atributo("conectividad", "Conectividad", "conectividad", "5G; Wi-Fi 6; Bluetooth 5.3; NFC (según mercado)", nothingPhoneFuente.id),
      atributo("diseno", "Diseño", "diseno", "Edición especial con acabado multicolor y sistema Glyph", nothingPhoneFuente.id),
    ],
  ),

  "samsung-galaxy-s24-ultra": ficha(
    "moviles",
    [
      { id: "256gb", modelo: "Samsung Galaxy S24 Ultra", ram: "12 GB", almacenamiento: "256 GB" },
      { id: "512gb", modelo: "Samsung Galaxy S24 Ultra", ram: "12 GB", almacenamiento: "512 GB" },
    ],
    samsungFuente,
    [
      atributo("pantalla", "Pantalla", "pantalla", "6,8 pulgadas Dynamic AMOLED 2X; QHD+; tasa adaptativa de hasta 120 Hz", samsungFuente.id),
      atributo("procesador", "Procesador", "rendimiento", "Qualcomm Snapdragon 8 Gen 3 for Galaxy", samsungFuente.id),
      atributo("memoria", "Memoria RAM", "memoria", "12 GB RAM", samsungFuente.id),
      atributo("camara_principal", "Cámara principal", "camaras", "200 MP", samsungFuente.id),
      atributo("teleobjetivos", "Teleobjetivos", "camaras", "50 MP con zoom óptico 5× y 10 MP con zoom óptico 3×", samsungFuente.id),
      atributo("ultra_gran_angular", "Ultra gran angular", "camaras", "12 MP", samsungFuente.id),
      atributo("bateria", "Batería", "bateria", "5000 mAh", samsungFuente.id),
      atributo("carga", "Carga por cable", "bateria", "Hasta 45 W", samsungFuente.id),
      atributo("resistencia", "Resistencia", "construccion", "Certificación IP68", samsungFuente.id),
      atributo("accesorios", "Accesorios integrados", "otros", "S Pen integrado", samsungFuente.id),
    ],
  ),

  "oneplus-pad-2": ficha(
    "tablets",
    [{
      id: "12gb-256gb",
      modelo: "OnePlus Pad 2",
      ram: "12 GB",
      almacenamiento: "256 GB",
      conectividad: "Wi-Fi",
    }],
    onePlusFuente,
    [
      atributo("pantalla", "Pantalla", "pantalla", "12,1 pulgadas LCD; 3000 × 2120 (3K); hasta 144 Hz; formato 7:5", onePlusFuente.id),
      atributo("procesador", "Procesador", "rendimiento", "Qualcomm Snapdragon 8 Gen 3; GPU Adreno 750", onePlusFuente.id),
      atributo("memoria", "Memoria y almacenamiento", "memoria", "12 GB RAM LPDDR5X y 256 GB UFS 3.1 (variante piloto)", onePlusFuente.id),
      atributo("camara_trasera", "Cámara trasera", "camaras", "13 MP", onePlusFuente.id),
      atributo("camara_frontal", "Cámara frontal", "camaras", "8 MP", onePlusFuente.id),
      atributo("audio", "Audio", "audio", "Sistema de seis altavoces", onePlusFuente.id),
      atributo("bateria", "Batería", "bateria", "9510 mAh", onePlusFuente.id),
      atributo("carga", "Carga", "bateria", "67 W SUPERVOOC", onePlusFuente.id),
      atributo("conectividad", "Conectividad", "conectividad", "Wi-Fi 7 y Bluetooth 5.4; versión Wi-Fi", onePlusFuente.id),
      atributo("software", "Sistema operativo", "software", "OxygenOS 14.1 basado en Android 14 (versión de lanzamiento)", onePlusFuente.id),
    ],
  ),

  "apple-ipad-pro-11-m4": ficha(
    "tablets",
    [{
      id: "16gb-1tb",
      modelo: "iPad Pro de 11 pulgadas (M4)",
      ram: "16 GB de memoria unificada",
      almacenamiento: "1 TB",
      conectividad: null,
    }],
    ipadFuente,
    [
      atributo("pantalla", "Pantalla", "pantalla", "11 pulgadas Ultra Retina XDR OLED; 2420 × 1668; ProMotion hasta 120 Hz", ipadFuente.id),
      atributo("procesador", "Procesador", "rendimiento", "Apple M4: CPU de 10 núcleos y GPU de 10 núcleos en la configuración de 1 TB", ipadFuente.id),
      atributo("memoria", "Memoria unificada", "memoria", "16 GB para la configuración de 1 TB", ipadFuente.id),
      atributo("almacenamiento", "Almacenamiento", "almacenamiento", "1 TB", ipadFuente.id),
      atributo("camara_trasera", "Cámara trasera", "camaras", "Cámara gran angular de 12 MP con escáner LiDAR", ipadFuente.id),
      atributo("camara_frontal", "Cámara frontal", "camaras", "Cámara TrueDepth de 12 MP en orientación horizontal", ipadFuente.id),
      atributo("audio", "Audio", "audio", "Cuatro altavoces y cuatro micrófonos", ipadFuente.id),
      atributo("conector", "Conector", "conectividad", "Thunderbolt / USB 4 por USB-C", ipadFuente.id),
      atributo("biometria", "Autenticación", "seguridad", "Face ID", ipadFuente.id),
    ],
  ),

  "lenovo-thinkpad-e14-gen-5": ficha(
    "laptops",
    [{
      id: "21jk0005ri-16gb-512gb",
      modelo: "ThinkPad E14 Gen 5 Intel",
      sku: "21JK0005RI",
      mercado: "SKU regional indicado por Lenovo PSREF",
      ram: "16 GB DDR4",
      almacenamiento: "512 GB SSD",
    }],
    thinkPadFuente,
    [
      atributo("sku", "Número de modelo (MTM)", "identificacion", "21JK0005RI", thinkPadFuente.id),
      atributo("pantalla", "Pantalla", "pantalla", "14 pulgadas IPS WUXGA (1920 × 1200), antirreflejo; 300 nits y 45 % NTSC en la configuración documentada", thinkPadFuente.id),
      atributo("procesador", "Procesador", "rendimiento", "Intel Core i5-1335U de 13.ª generación; 10 núcleos y 12 hilos", thinkPadFuente.id),
      atributo("graficos", "Gráficos", "rendimiento", "Intel Iris Xe (según configuración de memoria)", thinkPadFuente.id),
      atributo("memoria", "Memoria RAM", "memoria", "16 GB DDR4-3200 (8 GB soldados + 8 GB SO-DIMM, según MTM)", thinkPadFuente.id),
      atributo("almacenamiento", "Almacenamiento", "almacenamiento", "512 GB SSD M.2 2242 PCIe 4.0 NVMe", thinkPadFuente.id),
      atributo("puertos", "Puertos e interfaces", "conectividad", "USB-C, USB-A, HDMI y RJ-45; confirmar distribución exacta en el MTM", thinkPadFuente.id),
    ],
  ),

  "apple-macbook-pro-16-m3-max": ficha(
    "laptops",
    [{
      id: "48gb-1tb",
      modelo: "MacBook Pro de 16 pulgadas (M3 Max)",
      ram: "48 GB de memoria unificada",
      almacenamiento: "1 TB SSD",
    }],
    macbookFuente,
    [
      atributo("pantalla", "Pantalla", "pantalla", "16,2 pulgadas Liquid Retina XDR; 3456 × 2234; ProMotion hasta 120 Hz", macbookFuente.id),
      atributo("procesador", "Procesador", "rendimiento", "Apple M3 Max con CPU de 16 núcleos y GPU de 40 núcleos", macbookFuente.id),
      atributo("memoria", "Memoria unificada", "memoria", "48 GB", macbookFuente.id),
      atributo("almacenamiento", "Almacenamiento", "almacenamiento", "SSD de 1 TB", macbookFuente.id),
      atributo("camara", "Cámara", "multimedia", "Cámara FaceTime HD de 1080p", macbookFuente.id),
      atributo("audio", "Audio", "audio", "Sistema de seis altavoces de alta fidelidad con audio espacial", macbookFuente.id),
      atributo("conectividad", "Puertos y conectividad", "conectividad", "MagSafe 3, HDMI, ranura SDXC, conector de auriculares y puertos Thunderbolt 4", macbookFuente.id),
    ],
  ),

  "nothing-ear-2": ficha(
    "auriculares",
    [{
      id: "transparent-white",
      modelo: "Nothing Ear (2)",
      mercado: null,
      identificador: "Transparent White",
    }],
    nothingEarFuente,
    [
      atributo("transductores", "Transductores", "audio", "Drivers dinámicos de 11,6 mm", nothingEarFuente.id),
      atributo("audio_certificado", "Audio de alta resolución", "audio", "Certificación Hi-Res Audio; códec LHDC 5.0", nothingEarFuente.id),
      atributo("anc", "Cancelación activa de ruido", "audio", "ANC adaptativa con reducción anunciada de hasta 40 dB", nothingEarFuente.id),
      atributo("microfonos", "Micrófonos", "audio", "Tres micrófonos por auricular", nothingEarFuente.id),
      atributo("conectividad", "Conectividad", "conectividad", "Bluetooth 5.3; conexión multipunto", nothingEarFuente.id),
      atributo("bateria", "Autonomía", "bateria", "Hasta 6,3 horas en auriculares y hasta 36 horas con estuche, con ANC desactivada (condiciones de prueba del fabricante)", nothingEarFuente.id),
      atributo("carga", "Carga", "bateria", "USB-C e inalámbrica Qi", nothingEarFuente.id),
      atributo("color", "Color", "diseno", "Transparent White (variante del registro local)", nothingEarFuente.id),
    ],
  ),

  "sony-wh-1000xm5": ficha(
    "auriculares",
    [],
    sonyFuente,
    [
      atributo("transductores", "Transductores", "audio", "Drivers de 30 mm", sonyFuente.id),
      atributo("procesamiento_anc", "Procesamiento de cancelación de ruido", "audio", "Procesador integrado V1 y procesador HD Noise Cancelling QN1", sonyFuente.id),
      atributo("microfonos", "Micrófonos", "audio", "Ocho micrófonos para captación de voz y control de ruido", sonyFuente.id),
      atributo("anc", "Cancelación activa de ruido", "audio", "Cancelación activa con optimizador automático de ruido", sonyFuente.id),
      atributo("bateria", "Autonomía", "bateria", "Hasta 30 horas con cancelación activa y hasta 40 horas con ANC desactivada (condiciones de prueba del fabricante)", sonyFuente.id),
      atributo("conectividad", "Conectividad", "conectividad", "Bluetooth 5.2; LDAC, AAC y SBC; conexión multipunto", sonyFuente.id),
      atributo("carga", "Carga", "bateria", "USB-C; carga rápida", sonyFuente.id),
    ],
  ),
};

export function obtenerFichaTecnicaPiloto(idCanonico: string): FichaTecnicaV2 | null {
  return FICHAS_TECNICAS_PILOTO[idCanonico] ?? null;
}
