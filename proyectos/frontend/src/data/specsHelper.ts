import {
  Producto,
  DispositivoKimovil,
  CategoriaDispositivo,
  SeccionHardware,
  MetricaPuntuacion,
  TiendaPrecio,
} from "@/types/producto";

export interface FichaNormalizada {
  categoriaTipo: CategoriaDispositivo;
  categoriaEtiqueta: string;
  categoriaIcono: string;
  marca: string;
  nombre: string;
  precio: number;
  imagen: string;
  puntuacionGlobal: number | null;
  resumen: string;
  secciones: SeccionHardware[];
  metricas: MetricaPuntuacion[];
  benchmark: {
    etiqueta: string;
    valor: string;
  } | null;
  tiendas: TiendaPrecio[];
  tieneEspecificacionesReales: boolean;
}

export const INFO_CATEGORIAS: Record<
  CategoriaDispositivo,
  { etiqueta: string; icono: string; benchmarkDefault: string }
> = {
  moviles: {
    etiqueta: "Móviles & Smartphones",
    icono: "📱",
    benchmarkDefault: "AnTuTu Benchmark v10",
  },
  auriculares: {
    etiqueta: "Auriculares & Audio",
    icono: "🎧",
    benchmarkDefault: "Aislamiento Acústico ANC",
  },
  laptops: {
    etiqueta: "Portátiles & Laptops",
    icono: "💻",
    benchmarkDefault: "Geekbench / PC Benchmark",
  },
  tablets: {
    etiqueta: "Tablets & Pantallas",
    icono: "📱",
    benchmarkDefault: "Rendimiento Global Tablet",
  },
  monitores: {
    etiqueta: "Monitores & Pantallas",
    icono: "🖥️",
    benchmarkDefault: "Frecuencia & Calibración de Color",
  },
};

export function formatearCOP(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "Consultar disponibilidad";
  const monto = valor < 10000 ? Math.round(valor * 4000) : Math.round(valor);
  const formateado = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(monto);
  return formateado.includes("COP") ? formateado : `${formateado} COP`;
}

/**
 * Detecta la categoría de un dispositivo de forma robusta y jerárquica:
 * 1. Propiedad explícita 'categoria' (DispositivoKimovil)
 * 2. Propiedad 'nombreCategoria' del backend (Producto)
 * 3. Identificador 'idCategoria' (1: móviles, 2: tablets, 3: laptops, 4: auriculares, 5: monitores)
 * 4. Inferencia por nombre con límites de palabra para evitar clasificaciones erróneas
 *    por coincidencias parciales (ej. "monitor cardíaco" en descripción de un móvil).
 */
export function detectarCategoria(
  producto:
    | DispositivoKimovil
    | Producto
    | {
        nombre?: string;
        idCategoria?: number;
        nombreCategoria?: string;
        categoria?: string;
      }
): CategoriaDispositivo {
  // 1. Verificación directa de propiedad categoria (e.g. DispositivoKimovil)
  if ("categoria" in producto && producto.categoria) {
    const cat = producto.categoria.toLowerCase().trim();
    if (cat === "monitores" || cat === "monitor" || cat === "monitors") return "monitores";
    if (cat === "auriculares" || cat === "audio" || cat.includes("headphone") || cat.includes("auricular") || cat.includes("audifono")) return "auriculares";
    if (cat === "laptops" || cat === "laptop" || cat.includes("portatil") || cat.includes("portátil") || cat.includes("notebook")) return "laptops";
    if (cat === "tablets" || cat === "tablet" || cat.includes("ipad")) return "tablets";
    if (cat === "moviles" || cat === "móviles" || cat.includes("movil") || cat.includes("móvil") || cat.includes("celular") || cat.includes("phone")) return "moviles";
  }

  // 2. Verificación por nombreCategoria proveniente del backend
  if ("nombreCategoria" in producto && producto.nombreCategoria) {
    const nomCat = producto.nombreCategoria.toLowerCase().trim();
    if (nomCat.includes("monitor") || nomCat.includes("pantalla")) return "monitores";
    if (nomCat.includes("auricular") || nomCat.includes("audífono") || nomCat.includes("audifono") || nomCat.includes("audio") || nomCat.includes("headphone")) return "auriculares";
    if (nomCat.includes("laptop") || nomCat.includes("portátil") || nomCat.includes("portatil") || nomCat.includes("computador") || nomCat.includes("notebook") || nomCat.includes("pc")) return "laptops";
    if (nomCat.includes("tablet") || nomCat.includes("ipad")) return "tablets";
    if (nomCat.includes("móvil") || nomCat.includes("movil") || nomCat.includes("celular") || nomCat.includes("smartphone") || nomCat.includes("teléfono") || nomCat.includes("telefono")) return "moviles";
  }

  // 3. Verificación por idCategoria del backend
  if ("idCategoria" in producto && typeof producto.idCategoria === "number") {
    if (producto.idCategoria === 5) return "monitores";
    if (producto.idCategoria === 4) return "auriculares";
    if (producto.idCategoria === 3) return "laptops";
    if (producto.idCategoria === 2) return "tablets";
    if (producto.idCategoria === 1) return "moviles";
  }

  // 4. Inferencia por nombre con límites de palabra (\b)
  const nombre = (producto.nombre || "").toLowerCase();
  if (/\b(monitor|monitores|ultrawide|oled display)\b/i.test(nombre)) {
    return "monitores";
  }
  if (/\b(auricular|auriculares|audifono|audifonos|audífono|audífonos|headphone|headphones|earbuds|airpods|buds|freebuds|wh-1000|quietcomfort)\b/i.test(nombre)) {
    return "auriculares";
  }
  if (/\b(laptop|laptops|portatil|portátil|portatiles|portátiles|notebook|thinkpad|macbook|zephyrus|zenbook|ideapad|legion|yoga)\b/i.test(nombre)) {
    return "laptops";
  }
  if (/\b(tablet|tablets|ipad|galaxy tab)\b/i.test(nombre)) {
    return "tablets";
  }
  if (/\b(phone|smartphone|movil|móvil|celular|galaxy s|galaxy a|galaxy z|redmi|poco|pixel|iphone)\b/i.test(nombre)) {
    return "moviles";
  }

  return "moviles";
}

const DICCIONARIO_CARACTERISTICAS: Record<string, { titulo: string; icono: string }> = {
  // Pantalla / Visual
  pantalla: { titulo: "PANTALLA & RENDIMIENTO VISUAL", icono: "🖥️" },
  panel: { titulo: "TECNOLOGÍA DE PANEL", icono: "🖥️" },
  resolucion: { titulo: "RESOLUCIÓN & DENSIDAD", icono: "📐" },
  tasa_refresco: { titulo: "TASA DE REFRESCO", icono: "⚡" },
  frecuencia: { titulo: "FRECUENCIA DE ACTUALIZACIÓN", icono: "⚡" },
  tiempo_respuesta: { titulo: "TIEMPO DE RESPUESTA", icono: "⚡" },
  brillo: { titulo: "BRILLO & CONTRASTE", icono: "☀️" },
  color_hdr: { titulo: "GAMUT DE COLOR & HDR", icono: "🎨" },
  hdr: { titulo: "SOPORTE HDR", icono: "🎨" },

  // Audio / Auriculares
  transductores: { titulo: "ACÚSTICA & TRANSDUCTORES", icono: "🎧" },
  audio: { titulo: "CALIDAD DE AUDIO", icono: "🎧" },
  sonido: { titulo: "PERFIL ACÚSTICO", icono: "🎧" },
  drivers: { titulo: "TRANSDUCTORES / DRIVERS", icono: "🎧" },
  cancelacion_ruido: { titulo: "CANCELACIÓN DE RUIDO (ANC)", icono: "🔇" },
  anc: { titulo: "CANCELACIÓN ACTIVA DE RUIDO", icono: "🔇" },
  microfonos: { titulo: "MICRÓFONOS & LLAMADAS", icono: "🎙️" },
  codecs: { titulo: "CONECTIVIDAD & CÓDECS", icono: "📡" },

  // Rendimiento / Hardware
  procesador: { titulo: "PROCESADOR & RENDIMIENTO", icono: "⚡" },
  cpu: { titulo: "PROCESADOR (CPU)", icono: "⚡" },
  chipset: { titulo: "CHIPSET & ARQUITECTURA", icono: "⚡" },
  grafica: { titulo: "GRÁFICOS DEDICADOS (GPU)", icono: "🎮" },
  gpu: { titulo: "TARJETA GRÁFICA (GPU)", icono: "🎮" },
  ram: { titulo: "MEMORIA RAM", icono: "💾" },
  almacenamiento: { titulo: "ALMACENAMIENTO NVMe / FLASH", icono: "💿" },
  ram_almacenamiento: { titulo: "MEMORIA Y ALMACENAMIENTO", icono: "💾" },
  disco: { titulo: "UNIDAD DE ALMACENAMIENTO", icono: "💿" },

  // Cámaras & Imagen
  camara: { titulo: "SISTEMA DE CÁMARAS", icono: "📸" },
  camaras: { titulo: "SISTEMA DE CÁMARAS", icono: "📸" },
  camara_trasera: { titulo: "CÁMARA PRINCIPAL TRASERA", icono: "📸" },
  camara_frontal: { titulo: "CÁMARA FRONTAL / SELFIE", icono: "🤳" },
  webcam: { titulo: "WEBCAM & MULTIMEDIA", icono: "📹" },

  // Batería & Carga
  bateria: { titulo: "BATERÍA & AUTONOMÍA", icono: "🔋" },
  autonomia: { titulo: "AUTONOMÍA DE BATERÍA", icono: "🔋" },
  bateria_carga: { titulo: "BATERÍA Y CARGA RÁPIDA", icono: "🔋" },
  carga: { titulo: "TECNOLOGÍA DE CARGA", icono: "⚡" },
  carga_rapida: { titulo: "CARGA RÁPIDA", icono: "⚡" },

  // Conectividad & Puertos
  conectividad: { titulo: "CONECTIVIDAD & SISTEMA", icono: "🌐" },
  bluetooth: { titulo: "CONECTIVIDAD & BLUETOOTH", icono: "📡" },
  puertos: { titulo: "PUERTOS & CONECTIVIDAD", icono: "🔌" },
  entradas: { titulo: "ENTRADAS DE VÍDEO & AUDIO", icono: "🔌" },
  red: { titulo: "CONEXIONES DE RED & WI-FI", icono: "🌐" },

  // Ergonomía, Dimensiones, Construcción
  ergonomia: { titulo: "ERGONOMÍA & AJUSTES", icono: "📐" },
  dimensiones: { titulo: "DIMENSIONES & PESO", icono: "⚖️" },
  peso: { titulo: "PESO Y PORTABILIDAD", icono: "⚖️" },
  materiales: { titulo: "MATERIALES & CONSTRUCCIÓN", icono: "🛡️" },
  resistencia: { titulo: "PROTECCIÓN & RESISTENCIA", icono: "💧" },

  // Software & Productividad
  sistema_operativo: { titulo: "SISTEMA OPERATIVO & SOFTWARE", icono: "⚙️" },
  so: { titulo: "SISTEMA OPERATIVO", icono: "⚙️" },
  software: { titulo: "SOFTWARE & ECUALIZACIÓN", icono: "⚙️" },
  productividad: { titulo: "PRODUCTIVIDAD & STYLUS", icono: "✏️" },
};

/**
 * Convierte un objeto de características de backend en secciones de hardware estructuradas.
 * No genera secciones vacías ni inventa datos ausentes.
 */
export function mapearCaracteristicasASecciones(
  caracteristicas: Record<string, unknown>,
  categoria: CategoriaDispositivo
): SeccionHardware[] {
  // Si viene un array explícito de secciones (ej. guardado de forma estructurada en JSONB)
  if (Array.isArray(caracteristicas.secciones) && caracteristicas.secciones.length > 0) {
    const validas: SeccionHardware[] = [];
    for (const item of caracteristicas.secciones) {
      if (item && typeof item === "object" && "titulo" in item && "descripcion" in item) {
        validas.push({
          icono: (item as SeccionHardware).icono || INFO_CATEGORIAS[categoria].icono,
          titulo: String((item as SeccionHardware).titulo),
          descripcion: String((item as SeccionHardware).descripcion),
          detalleExtra: (item as SeccionHardware).detalleExtra ? String((item as SeccionHardware).detalleExtra) : undefined,
        });
      }
    }
    if (validas.length > 0) return validas;
  }

  const secciones: SeccionHardware[] = [];
  const omitirClaves = new Set([
    "secciones",
    "metricas",
    "benchmark",
    "benchmark_etiqueta",
    "benchmark_valor",
    "benchmarkEtiqueta",
    "benchmarkValor",
    "puntuacion",
    "puntuacionGlobal",
    "tiendas",
  ]);

  for (const [clave, valor] of Object.entries(caracteristicas)) {
    if (omitirClaves.has(clave)) continue;
    if (valor === null || valor === undefined || valor === "") continue;

    const claveNormalizada = clave.toLowerCase().trim().replace(/[-\s]/g, "_");
    const meta = DICCIONARIO_CARACTERISTICAS[claveNormalizada] || {
      titulo: clave.replace(/_/g, " ").toUpperCase(),
      icono: INFO_CATEGORIAS[categoria].icono,
    };

    const descripcion = typeof valor === "object" ? JSON.stringify(valor) : String(valor);

    secciones.push({
      icono: meta.icono,
      titulo: meta.titulo,
      descripcion,
    });
  }

  return secciones;
}

/**
 * Normaliza cualquier entidad producto (DispositivoKimovil o Producto de backend)
 * en una estructura coherente para su presentación en FichaTecnicaModal.
 */
export function normalizarFichaProducto(
  producto: DispositivoKimovil | Producto
): FichaNormalizada {
  const esKimovil = "ranking" in producto;
  const categoria = detectarCategoria(producto);
  const infoCat = INFO_CATEGORIAS[categoria];

  const nombre = producto.nombre;
  const marca = esKimovil
    ? (producto as DispositivoKimovil).marca
    : (producto as Producto).nombreMarca || `Marca #${(producto as Producto).idMarca}`;
  const precio = esKimovil
    ? (producto as DispositivoKimovil).precio
    : (producto as Producto).precioReferencia ?? 0;
  const imagen =
    producto.imagen ||
    "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80";

  const detalle = esKimovil ? (producto as DispositivoKimovil).detalleSpecs : undefined;

  // 1. Caso DispositivoKimovil con secciones detalladas ya presentes
  if (detalle?.secciones && detalle.secciones.length > 0) {
    return {
      categoriaTipo: categoria,
      categoriaEtiqueta: infoCat.etiqueta,
      categoriaIcono: infoCat.icono,
      marca,
      nombre,
      precio,
      imagen,
      puntuacionGlobal: (producto as DispositivoKimovil).puntuacion ?? null,
      resumen: (producto as DispositivoKimovil).especificaciones || "",
      secciones: detalle.secciones,
      metricas: detalle.metricas || [],
      benchmark: {
        etiqueta: detalle.benchmarkEtiqueta || infoCat.benchmarkDefault,
        valor: detalle.benchmarkValor || detalle.antutuScore || "N/A",
      },
      tiendas: detalle.tiendas || [],
      tieneEspecificacionesReales: true,
    };
  }

  // 2. Caso Producto del backend con columna 'caracteristicas' (Fase 4.1)
  const caracteristicasBackend = (producto as Producto).caracteristicas;
  const tieneCaracteristicasBackend =
    Boolean(caracteristicasBackend) &&
    typeof caracteristicasBackend === "object" &&
    Object.keys(caracteristicasBackend as Record<string, unknown>).length > 0;

  if (tieneCaracteristicasBackend) {
    const rawSpecs = caracteristicasBackend as Record<string, unknown>;
    const secciones = mapearCaracteristicasASecciones(rawSpecs, categoria);

    let benchmark: { etiqueta: string; valor: string } | null = null;
    if (rawSpecs.benchmark && typeof rawSpecs.benchmark === "object") {
      const b = rawSpecs.benchmark as { etiqueta?: string; valor?: string };
      if (b.etiqueta && b.valor) {
        benchmark = { etiqueta: String(b.etiqueta), valor: String(b.valor) };
      }
    } else if (rawSpecs.benchmark_etiqueta && rawSpecs.benchmark_valor) {
      benchmark = {
        etiqueta: String(rawSpecs.benchmark_etiqueta),
        valor: String(rawSpecs.benchmark_valor),
      };
    } else if (rawSpecs.benchmarkEtiqueta && rawSpecs.benchmarkValor) {
      benchmark = {
        etiqueta: String(rawSpecs.benchmarkEtiqueta),
        valor: String(rawSpecs.benchmarkValor),
      };
    }

    let metricas: MetricaPuntuacion[] = [];
    if (Array.isArray(rawSpecs.metricas) && rawSpecs.metricas.length > 0) {
      metricas = rawSpecs.metricas as MetricaPuntuacion[];
    }

    const puntuacionGlobal =
      typeof rawSpecs.puntuacion === "number"
        ? rawSpecs.puntuacion
        : typeof rawSpecs.puntuacionGlobal === "number"
        ? rawSpecs.puntuacionGlobal
        : null;

    return {
      categoriaTipo: categoria,
      categoriaEtiqueta: infoCat.etiqueta,
      categoriaIcono: infoCat.icono,
      marca,
      nombre,
      precio,
      imagen,
      puntuacionGlobal,
      resumen: (producto as Producto).descripcion || "Dispositivo registrado en catálogo.",
      secciones,
      metricas,
      benchmark,
      tiendas: [],
      tieneEspecificacionesReales: secciones.length > 0,
    };
  }

  // 3. Caso DispositivoKimovil de rankings sin secciones personalizadas pero con plantilla de categoría
  if (esKimovil) {
    let secciones: SeccionHardware[] = [];
    let metricas: MetricaPuntuacion[] = [];
    let benchmark: { etiqueta: string; valor: string } | null = null;

    if (categoria === "auriculares") {
      benchmark = {
        etiqueta: detalle?.benchmarkEtiqueta || "Aislamiento Acústico ANC",
        valor: detalle?.benchmarkValor || "Certificación Hi-Res Audio · LDAC 990kbps",
      };
      secciones = [
        {
          icono: "🎧",
          titulo: "ACÚSTICA & TRANSDUCTORES",
          descripcion:
            detalle?.pantalla && !detalle.pantalla.includes("AMOLED") && !detalle.pantalla.includes("OLED")
              ? detalle.pantalla
              : "Drivers dinámicos de alta excursión con diafragma de polímero compuesto y respuesta 4Hz - 40.000Hz.",
        },
        {
          icono: "🔇",
          titulo: "CANCELACIÓN DE RUIDO (ANC)",
          descripcion:
            detalle?.procesador && detalle.procesador.toLowerCase().includes("ruido")
              ? detalle.procesador
              : "Cancelación activa de ruido inteligente con procesador digital y modo transparencia ambiental adaptativo.",
        },
        {
          icono: "🎙️",
          titulo: "MICRÓFONOS & LLAMADAS",
          descripcion:
            detalle?.camaras && !detalle.camaras.includes("MP")
              ? detalle.camaras
              : "Matriz de micrófonos con formación de haces (beamforming) y procesamiento de voz nítida con IA.",
        },
        {
          icono: "🔋",
          titulo: "BATERÍA & AUTONOMÍA",
          descripcion:
            detalle?.bateriaCarga ||
            "Hasta 30 horas con cancelación activa (ANC) · Carga ultrarrápida (10 min = 5 horas de música).",
        },
        {
          icono: "📡",
          titulo: "CONECTIVIDAD & CÓDECS",
          descripcion:
            detalle?.conectividad ||
            "Bluetooth 5.2 / 5.3 · Códecs Hi-Res LDAC / AAC / SBC · Conexión multipunto simultánea a 2 equipos.",
        },
        {
          icono: "⚙️",
          titulo: "SOFTWARE & ECUALIZACIÓN",
          descripcion:
            detalle?.ramAlmacenamiento && !detalle.ramAlmacenamiento.includes("RAM")
              ? detalle.ramAlmacenamiento
              : "App complementaria con ecualizador paramétrico, Speak-to-Chat y calibración acústica en tiempo real.",
        },
      ];
      metricas = [
        { nombre: "Calidad de Audio & Definición", puntos: detalle?.puntuaciones?.rendimiento || 9.6 },
        { nombre: "Cancelación Activa de Ruido (ANC)", puntos: 9.8 },
        { nombre: "Autonomía y Duración de Batería", puntos: detalle?.puntuaciones?.bateria || 9.7 },
        { nombre: "Comodidad, Ergonomía y Diseño", puntos: 9.5 },
      ];
    } else if (categoria === "laptops") {
      benchmark = {
        etiqueta: detalle?.benchmarkEtiqueta || "Geekbench / PC Benchmark",
        valor: detalle?.benchmarkValor || detalle?.antutuScore || "Multi-Core: 21,500 Puntos",
      };
      secciones = [
        {
          icono: "🖥️",
          titulo: "PANTALLA & RENDIMIENTO VISUAL",
          descripcion:
            detalle?.pantalla ||
            "Panel IPS / OLED antirreflejo · Resolución 2.5K o WQXGA · 100% sRGB / DCI-P3 · 120Hz-240Hz.",
        },
        {
          icono: "⚡",
          titulo: "PROCESADOR (CPU DE ALTO RENDIMIENTO)",
          descripcion:
            detalle?.procesador ||
            "Arquitectura multinúcleo de alto rendimiento con NPU integrada para aceleración de IA.",
        },
        {
          icono: "💾",
          titulo: "MEMORIA RAM & ALMACENAMIENTO NVMe",
          descripcion:
            detalle?.ramAlmacenamiento ||
            "Memoria RAM DDR5 / LPDDR5X Dual Channel · Almacenamiento SSD PCIe 4.0 NVMe ultra veloz.",
        },
        {
          icono: "🔋",
          titulo: "BATERÍA & SISTEMA DE REFRIGERACIÓN",
          descripcion:
            detalle?.bateriaCarga ||
            "Batería de alta capacidad con soporte de carga rápida USB-C Power Delivery y refrigeración térmica avanzada.",
        },
        {
          icono: "🌐",
          titulo: "PUERTOS & CONECTIVIDAD",
          descripcion:
            detalle?.conectividad ||
            "Wi-Fi 6E / Wi-Fi 7 · Bluetooth 5.3 · Puertos Thunderbolt 4 / USB-C · Salida de vídeo HDMI 2.1.",
        },
        {
          icono: "📹",
          titulo: "WEBCAM & MULTIMEDIA",
          descripcion:
            detalle?.camaras ||
            "Cámara web FHD 1080p con obturador de privacidad y micrófonos de matriz dual con reducción de eco.",
        },
      ];
      metricas = [
        { nombre: "Rendimiento CPU & Multitarea", puntos: detalle?.puntuaciones?.rendimiento || 9.8 },
        { nombre: "Calidad de Pantalla & Color", puntos: detalle?.puntuaciones?.pantalla || 9.7 },
        { nombre: "Autonomía de Batería", puntos: detalle?.puntuaciones?.bateria || 8.9 },
        { nombre: "Construcción, Chasis & Refrigeración", puntos: 9.5 },
      ];
    } else if (categoria === "monitores") {
      benchmark = {
        etiqueta: detalle?.benchmarkEtiqueta || "Frecuencia & Calibración de Color",
        valor: detalle?.benchmarkValor || "180Hz · 1ms GtG · 99% sRGB",
      };
      secciones = [
        {
          icono: "🖥️",
          titulo: "PANEL & RESOLUCIÓN",
          descripcion:
            detalle?.pantalla ||
            "Panel Fast IPS / OLED · Resolución QHD (2560x1440) o 4K · Ángulos de visión amplios 178°.",
        },
        {
          icono: "⚡",
          titulo: "TASA DE REFRESCO & RESPUESTA",
          descripcion:
            detalle?.procesador ||
            "Tasa de refresco de alta velocidad (144Hz - 240Hz) · Tiempo de respuesta de 1ms GtG con AMD FreeSync / G-Sync.",
        },
        {
          icono: "🎨",
          titulo: "GAMUT DE COLOR & HDR",
          descripcion:
            detalle?.camaras ||
            "Cobertura 99% sRGB / 95% DCI-P3 · Certificación DisplayHDR para alto contraste y fidelidad de imagen.",
        },
        {
          icono: "🔌",
          titulo: "PUERTOS & CONECTIVIDAD",
          descripcion:
            detalle?.conectividad ||
            "Entradas DisplayPort 1.4, HDMI 2.0 / 2.1, hub USB integrado y salida de audio jack 3.5mm.",
        },
        {
          icono: "📐",
          titulo: "ERGONOMÍA & AJUSTES",
          descripcion:
            detalle?.ramAlmacenamiento ||
            "Soporte ergonómico con ajuste de altura, inclinación, giro y pivote vertical · Compatible con anclaje VESA 100x100.",
        },
      ];
      metricas = [
        { nombre: "Calidad de Imagen & Fidelidad de Color", puntos: detalle?.puntuaciones?.pantalla || 9.6 },
        { nombre: "Fluidez & Tiempo de Respuesta", puntos: detalle?.puntuaciones?.rendimiento || 9.7 },
        { nombre: "Conectividad & Puertos", puntos: 9.2 },
        { nombre: "Ergonomía & Construcción", puntos: 9.4 },
      ];
    } else if (categoria === "tablets") {
      benchmark = {
        etiqueta: detalle?.benchmarkEtiqueta || "Rendimiento Global Tablet",
        valor: detalle?.benchmarkValor || detalle?.antutuScore || "2,050,000 Puntos",
      };
      secciones = [
        {
          icono: "📱",
          titulo: "PANTALLA & EXPERIENCIA MULTIMEDIA",
          descripcion:
            detalle?.pantalla ||
            "Pantalla de alta resolución 2K-3K · Tasa de refresco fluida de 120Hz-144Hz · Soporte HDR.",
        },
        {
          icono: "⚡",
          titulo: "PROCESADOR & RENDIMIENTO",
          descripcion:
            detalle?.procesador ||
            "Chipset insignia de alta eficiencia energética para multitarea y edición fluida.",
        },
        {
          icono: "💾",
          titulo: "MEMORIA RAM Y ALMACENAMIENTO",
          descripcion:
            detalle?.ramAlmacenamiento ||
            "Memoria RAM LPDDR5X de alta velocidad con almacenamiento rápido UFS o NVMe.",
        },
        {
          icono: "📸",
          titulo: "CÁMARAS & MULTIMEDIA",
          descripcion:
            detalle?.camaras ||
            "Cámara trasera para escaneo 4K + Cámara frontal centrada para videollamadas con encuadre automático.",
        },
        {
          icono: "🔋",
          titulo: "BATERÍA Y AUTONOMÍA",
          descripcion:
            detalle?.bateriaCarga ||
            "Batería de gran capacidad para todo el día con carga rápida de alta potencia.",
        },
        {
          icono: "✏️",
          titulo: "PRODUCTIVIDAD & CONECTIVIDAD",
          descripcion:
            detalle?.conectividad ||
            "Wi-Fi de alta velocidad · Soporte para lápiz óptico de baja latencia y teclado magnético.",
        },
      ];
      metricas = [
        { nombre: "Rendimiento y Fluidez", puntos: detalle?.puntuaciones?.rendimiento || 9.7 },
        { nombre: "Pantalla y Experiencia Visual", puntos: detalle?.puntuaciones?.pantalla || 9.8 },
        { nombre: "Batería y Autonomía", puntos: detalle?.puntuaciones?.bateria || 9.5 },
        { nombre: "Productividad y Stylus", puntos: 9.3 },
      ];
    } else {
      // Móviles / Smartphones
      benchmark = {
        etiqueta: detalle?.benchmarkEtiqueta || "AnTuTu Benchmark",
        valor: detalle?.benchmarkValor || detalle?.antutuScore || "1,450,000 Puntos",
      };
      secciones = [
        {
          icono: "📱",
          titulo: "PANTALLA & RENDIMIENTO VISUAL",
          descripcion:
            detalle?.pantalla ||
            "Pantalla AMOLED FHD+ / 1.5K · 120Hz adaptativo · Alto brillo para exteriores · Gorilla Glass.",
        },
        {
          icono: "⚡",
          titulo: "PROCESADOR & RENDIMIENTO",
          descripcion:
            detalle?.procesador ||
            "Procesador Octa-Core de 4nm con GPU avanzada y motor de aceleración gráfica para gaming.",
        },
        {
          icono: "💾",
          titulo: "MEMORIA RAM Y ALMACENAMIENTO",
          descripcion:
            detalle?.ramAlmacenamiento ||
            "8GB / 12GB RAM LPDDR5X · Almacenamiento rápido UFS 3.1 o UFS 4.0.",
        },
        {
          icono: "📸",
          titulo: "SISTEMA DE CÁMARAS",
          descripcion:
            detalle?.camaras ||
            "Sensor principal con Estabilización Óptica (OIS) + Ultra Gran Angular + Cámara Selfie de alta resolución.",
        },
        {
          icono: "🔋",
          titulo: "BATERÍA Y CARGA RÁPIDA",
          descripcion:
            detalle?.bateriaCarga ||
            "Batería de 5000 mAh o superior con tecnología de carga ultrarrápida por cable.",
        },
        {
          icono: "🌐",
          titulo: "CONECTIVIDAD & SISTEMA",
          descripcion:
            detalle?.conectividad ||
            "Redes 5G Dual SIM · Wi-Fi 6 / 7 · Bluetooth de baja latencia · Chip NFC para pagos móviles.",
        },
      ];
      metricas = [
        { nombre: "Rendimiento (CPU / GPU)", puntos: detalle?.puntuaciones?.rendimiento || 9.4 },
        { nombre: "Fotografía y Cámaras", puntos: detalle?.puntuaciones?.camara || 9.1 },
        { nombre: "Pantalla y Calidad Visual", puntos: detalle?.puntuaciones?.pantalla || 9.5 },
        { nombre: "Batería y Autonomía", puntos: detalle?.puntuaciones?.bateria || 9.3 },
      ];
    }

    return {
      categoriaTipo: categoria,
      categoriaEtiqueta: infoCat.etiqueta,
      categoriaIcono: infoCat.icono,
      marca,
      nombre,
      precio,
      imagen,
      puntuacionGlobal: (producto as DispositivoKimovil).puntuacion ?? null,
      resumen: (producto as DispositivoKimovil).especificaciones || "",
      secciones,
      metricas,
      benchmark,
      tiendas: detalle?.tiendas || [],
      tieneEspecificacionesReales: true,
    };
  }

  // 4. Caso Producto de backend SIN características registradas:
  // Se omiten datos inventados. Se entrega un estado vacío limpio y sin puntuación ficticia.
  return {
    categoriaTipo: categoria,
    categoriaEtiqueta: infoCat.etiqueta,
    categoriaIcono: infoCat.icono,
    marca,
    nombre,
    precio,
    imagen,
    puntuacionGlobal: null,
    resumen: (producto as Producto).descripcion || "Este dispositivo no cuenta con una descripción registrada.",
    secciones: [],
    metricas: [],
    benchmark: null,
    tiendas: [],
    tieneEspecificacionesReales: false,
  };
}
