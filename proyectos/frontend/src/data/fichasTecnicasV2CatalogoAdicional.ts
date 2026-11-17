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
    return {
      clave,
      nombre,
      grupo,
      valor,
      unidad,
      valorOriginal: unidad ? `${valor} ${unidad}` : String(valor),
      fuenteId,
    };
  }
  return {
    clave,
    nombre,
    grupo,
    valor,
    unidad: null,
    valorOriginal: String(valor),
    fuenteId,
  };
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
  varianteId: string,
  observaciones: string,
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

const samsungA55Fuente = "samsung-galaxy-a55-colombia";
const samsungA55ChipsetFuente = "samsung-galaxy-a55-chipset";
const samsungA55Variante = "8gb-256gb";
const galaxyA55 = crearFicha(
  "moviles",
  "verificado",
  [{
    id: samsungA55Variante,
    modelo: "Samsung Galaxy A55 5G",
    ram: "8 GB",
    almacenamiento: "256 GB",
    mercado: "Colombia",
  }],
  [
    atributo("procesador", "Procesador", "rendimiento", "Samsung Exynos 1480", samsungA55ChipsetFuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "Super AMOLED · Vision Booster", samsungA55Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.6, samsungA55Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "FHD+", samsungA55Fuente),
    atributo("tasa_refresco", "Tasa de refresco", "pantalla", 120, samsungA55Fuente, "Hz"),
    atributo("ram", "Memoria RAM", "memoria", 8, samsungA55Fuente, "GB"),
    atributo("almacenamiento", "Almacenamiento interno", "almacenamiento", 256, samsungA55Fuente, "GB"),
    atributo("camara_principal", "Cámara principal", "camaras", "50 MP · f/1.8 · AF · OIS", samsungA55Fuente),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", "12 MP · f/2.2", samsungA55Fuente),
    atributo("camara_macro", "Cámara macro", "camaras", "5 MP · f/2.4", samsungA55Fuente),
    atributo("camara_frontal", "Cámara frontal", "camaras", "32 MP · f/2.2", samsungA55Fuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, samsungA55Fuente, "mAh"),
    atributo("proteccion", "Resistencia al agua y polvo", "diseno", "IP67", samsungA55Fuente),
    atributo("dimensiones", "Dimensiones (alto × ancho × grosor)", "diseno", "161,1 × 77,4 × 8,2 mm", samsungA55Fuente),
    atributo("peso", "Peso", "diseno", 213, samsungA55Fuente, "g"),
    atributo("micro_sd", "Expansión de almacenamiento", "almacenamiento", "microSD hasta 1 TB (ranura híbrida)", samsungA55Fuente),
    atributo("conectividad_celular", "Conectividad celular", "conectividad", "5G", samsungA55Fuente),
    atributo("sistema_operativo_lanzamiento", "Sistema operativo de lanzamiento", "software", "Android 14 · One UI 6.1", samsungA55Fuente),
    atributo("marco", "Material del marco", "diseno", "Metal", samsungA55Fuente),
    atributo("actualizaciones", "Política de actualizaciones anunciada", "software", "Hasta 4 generaciones de Android/One UI y 5 años de seguridad", samsungA55Fuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.6, "in", samsungA55Fuente),
    metrica("tasa_refresco", "Tasa de refresco", "pantalla", 120, "Hz", samsungA55Fuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 5000, "mAh", samsungA55Fuente),
  ],
  [
    fuente(
      samsungA55Fuente,
      "Samsung Newsroom Colombia — Galaxy A55 5G, especificaciones regionales",
      "https://news.samsung.com/co/galaxy-a55-5g-y-a35-5g-los-nuevos-equipos-de-la-serie-a-con-innovaciones-al-alcance-de-todos",
      samsungA55Variante,
      "La fuente regional confirma la configuración 8 GB + 256 GB, pantalla, cámaras, batería, dimensiones, peso, IP67, microSD y sistema de lanzamiento. Samsung indica que las especificaciones pueden variar por mercado.",
    ),
    fuente(
      "samsung-galaxy-a55-chipset",
      "Samsung Support Ireland — comparación Galaxy S25 y Galaxy A55",
      "https://www.samsung.com/ie/support/mobile-devices/what-are-the-differences-between-the-galaxy-s25-series-and-a-series/",
      samsungA55Variante,
      "Fuente oficial Samsung que identifica Exynos 1480 y memoria de 8 GB para Galaxy A55.",
    ),
  ],
);

const iphone13Fuente = "apple-iphone-13";
const iphone13Variante = "128gb";
const iphone13 = crearFicha(
  "moviles",
  "verificado",
  [{
    id: iphone13Variante,
    modelo: "Apple iPhone 13",
    almacenamiento: "128 GB",
  }],
  [
    atributo("procesador", "Chip", "rendimiento", "Apple A15 Bionic", iphone13Fuente),
    atributo("cpu", "CPU", "rendimiento", "6 núcleos: 2 de rendimiento y 4 de eficiencia", iphone13Fuente),
    atributo("gpu", "GPU", "rendimiento", "4 núcleos", iphone13Fuente),
    atributo("neural_engine", "Neural Engine", "rendimiento", "16 núcleos", iphone13Fuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "OLED Super Retina XDR", iphone13Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.1, iphone13Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "2532 × 1170 píxeles", iphone13Fuente),
    atributo("densidad_pixeles", "Densidad de píxeles", "pantalla", "460 ppi", iphone13Fuente),
    atributo("brillo", "Brillo máximo", "pantalla", "800 nits típico · 1200 nits HDR", iphone13Fuente),
    atributo("camara_principal", "Cámara gran angular", "camaras", "12 MP · f/1.6 · estabilización óptica por desplazamiento del sensor", iphone13Fuente),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", "12 MP · f/2.4 · campo de visión de 120°", iphone13Fuente),
    atributo("camara_frontal", "Cámara TrueDepth frontal", "camaras", "12 MP · f/2.2", iphone13Fuente),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 128, iphone13Fuente, "GB"),
    atributo("proteccion", "Resistencia al agua y polvo", "diseno", "IP68 · hasta 6 m durante 30 minutos (IEC 60529)", iphone13Fuente),
    atributo("dimensiones", "Dimensiones (alto × ancho × grosor)", "diseno", "146,7 × 71,5 × 7,65 mm", iphone13Fuente),
    atributo("peso", "Peso", "diseno", 173, iphone13Fuente, "g"),
    atributo("conectividad_celular", "Conectividad celular", "conectividad", "5G sub-6 GHz", iphone13Fuente),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 6 (802.11ax) · MIMO 2×2", iphone13Fuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.0", iphone13Fuente),
    atributo("nfc", "NFC", "conectividad", true, iphone13Fuente),
    atributo("uwb", "Banda ultraancha", "conectividad", true, iphone13Fuente),
    atributo("conector", "Conector físico", "conectividad", "Lightning", iphone13Fuente),
    atributo("autonomia_video", "Reproducción de video (máximo declarado)", "bateria", 19, iphone13Fuente, "h"),
    atributo("autonomia_streaming", "Reproducción de video en streaming (máximo declarado)", "bateria", 15, iphone13Fuente, "h"),
    atributo("carga_magsafe", "Carga inalámbrica MagSafe", "bateria", 15, iphone13Fuente, "W"),
    atributo("carga_qi", "Carga inalámbrica Qi", "bateria", 7.5, iphone13Fuente, "W"),
    atributo("carga_rapida", "Carga rápida", "bateria", "Hasta 50% en 30 minutos con adaptador de 20 W o superior (se vende por separado)", iphone13Fuente),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.1, "in", iphone13Fuente),
    metrica("almacenamiento", "Almacenamiento", "almacenamiento", 128, "GB", iphone13Fuente),
  ],
  [
    fuente(
      iphone13Fuente,
      "Apple Support Colombia — iPhone 13, especificaciones técnicas",
      "https://support.apple.com/es-co/111872",
      iphone13Variante,
      "Fuente primaria para la variante de 128 GB, pantalla, cámaras, A15 Bionic, resistencia, dimensiones, peso, conectividad y batería.",
    ),
  ],
);

const oneplus13Fuente = "oneplus-13-global";
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
    atributo("procesador", "Plataforma móvil", "rendimiento", "Qualcomm Snapdragon 8 Elite", oneplus13Fuente),
    atributo("cpu", "CPU", "rendimiento", "Qualcomm Oryon hasta 4,32 GHz", oneplus13Fuente),
    atributo("gpu", "GPU", "rendimiento", "Adreno 830", oneplus13Fuente),
    atributo("pantalla", "Tecnología de pantalla", "pantalla", "120Hz ProXDR · LTPO 4.1", oneplus13Fuente),
    atributo("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.82, oneplus13Fuente, "in"),
    atributo("resolucion", "Resolución", "pantalla", "3168 × 1440 píxeles (QHD+)", oneplus13Fuente),
    atributo("densidad_pixeles", "Densidad de píxeles", "pantalla", "510 ppi", oneplus13Fuente),
    atributo("tasa_refresco", "Tasa de refresco dinámica", "pantalla", "1–120 Hz", oneplus13Fuente),
    atributo("brillo", "Brillo HBM / pico", "pantalla", "1600 / 4500 nits", oneplus13Fuente),
    atributo("proteccion_pantalla", "Cristal de protección", "pantalla", "Ceramic Guard", oneplus13Fuente),
    atributo("ram", "Memoria RAM", "memoria", 16, oneplus13Fuente, "GB"),
    atributo("tipo_ram", "Tecnología de RAM", "memoria", "LPDDR5X", oneplus13Fuente),
    atributo("almacenamiento", "Almacenamiento", "almacenamiento", 512, oneplus13Fuente, "GB"),
    atributo("tipo_almacenamiento", "Tecnología de almacenamiento", "almacenamiento", "UFS 4.0", oneplus13Fuente),
    atributo("camara_principal", "Cámara gran angular principal", "camaras", "50 MP · Sony LYT-808 · OIS · f/1.6", oneplus13Fuente),
    atributo("camara_teleobjetivo", "Cámara teleobjetivo", "camaras", "50 MP · Sony LYT-600 · zoom óptico 3× · OIS · f/2.6", oneplus13Fuente),
    atributo("camara_ultra_gran_angular", "Cámara ultra gran angular", "camaras", "50 MP · Samsung S5KJN5 · campo de visión 120° · f/2.0", oneplus13Fuente),
    atributo("camara_frontal", "Cámara frontal", "camaras", "32 MP · Sony IMX615 · f/2.4", oneplus13Fuente),
    atributo("video", "Grabación de video trasera", "camaras", "Hasta 8K a 30 fps; 4K hasta 60 fps", oneplus13Fuente),
    atributo("capacidad_bateria", "Capacidad típica de batería", "bateria", 6000, oneplus13Fuente, "mAh"),
    atributo("carga_rapida", "Carga por cable", "bateria", 100, oneplus13Fuente, "W"),
    atributo("carga_inalambrica", "Carga inalámbrica", "bateria", 50, oneplus13Fuente, "W"),
    atributo("sistema_operativo_lanzamiento", "Sistema operativo de lanzamiento", "software", "OxygenOS 15 basado en Android 15", oneplus13Fuente),
    atributo("conectividad_celular", "Conectividad celular", "conectividad", "5G", oneplus13Fuente),
    atributo("wifi", "Wi-Fi", "conectividad", "Wi-Fi 7 · 2×2 MIMO", oneplus13Fuente),
    atributo("bluetooth", "Bluetooth", "conectividad", "Bluetooth 5.4", oneplus13Fuente),
    atributo("nfc", "NFC", "conectividad", true, oneplus13Fuente),
    atributo("usb", "Puerto USB", "conectividad", "USB Type-C 3.2 Gen 1", oneplus13Fuente),
    atributo("sim", "Tarjetas SIM", "conectividad", "Doble Nano-SIM", oneplus13Fuente),
    atributo("dimensiones", "Dimensiones (alto × ancho × grosor)", "diseno", "162,9 × 76,5 × 8,5 mm (Black Eclipse)", oneplus13Fuente),
    atributo("peso", "Peso", "diseno", 213, oneplus13Fuente, "g"),
  ],
  [
    metrica("tamano_pantalla", "Diagonal de pantalla", "pantalla", 6.82, "in", oneplus13Fuente),
    metrica("tasa_refresco_maxima", "Tasa de refresco máxima", "pantalla", 120, "Hz", oneplus13Fuente),
    metrica("ram", "Memoria RAM", "memoria", 16, "GB", oneplus13Fuente),
    metrica("almacenamiento", "Almacenamiento", "almacenamiento", 512, "GB", oneplus13Fuente),
    metrica("capacidad_bateria", "Capacidad típica de batería", "bateria", 6000, "mAh", oneplus13Fuente),
  ],
  [
    fuente(
      oneplus13Fuente,
      "OnePlus Global — OnePlus 13 specifications",
      "https://www.oneplus.com/global/13/specs",
      oneplus13Variante,
      "Fuente oficial global para la configuración 16 GB + 512 GB, pantalla, plataforma, cámaras, batería, carga, dimensiones y conectividad. El peso y grosor indicados corresponden al acabado Black Eclipse.",
    ),
  ],
);

export const FICHAS_TECNICAS_V2_CATALOGO_ADICIONAL = {
  samsungGalaxyA55: galaxyA55,
  appleIphone13: iphone13,
  oneplus13: oneplus13,
} satisfies Record<string, FichaTecnicaV2>;

export function obtenerFichaTecnicaV2CatalogoParaKimovil(
  id: number,
  nombre: string,
): FichaTecnicaV2 | null {
  switch (id) {
    case 102:
      return galaxyA55;
    case 104:
      return iphone13;
    case 207:
      return oneplus13;
    default: {
      const n = nombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      if (n.includes("galaxy a55 5g")) return galaxyA55;
      if (n.includes("iphone 13") && n.includes("128")) return iphone13;
      if (n.includes("oneplus 13") && !n.includes("pro")) return oneplus13;
      return null;
    }
  }
}
