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
  puntuacionGlobal: number;
  resumen: string;
  secciones: SeccionHardware[];
  metricas: MetricaPuntuacion[];
  benchmark: {
    etiqueta: string;
    valor: string;
  };
  tiendas: TiendaPrecio[];
}

export function detectarCategoria(
  producto: DispositivoKimovil | Producto
): CategoriaDispositivo {
  if ("categoria" in producto && producto.categoria) {
    const cat = producto.categoria.toLowerCase();
    if (cat.includes("auricular") || cat.includes("audio") || cat.includes("headphone")) return "auriculares";
    if (cat.includes("laptop") || cat.includes("pc") || cat.includes("portatil")) return "laptops";
    if (cat.includes("tablet") || cat.includes("pad")) return "tablets";
    if (cat.includes("movil") || cat.includes("móvil") || cat.includes("phone")) return "moviles";
  }

  if ("idCategoria" in producto) {
    if (producto.idCategoria === 4) return "auriculares";
    if (producto.idCategoria === 3) return "laptops";
    if (producto.idCategoria === 2) return "tablets";
    if (producto.idCategoria === 1) return "moviles";
  }

  const texto = `${producto.nombre} ${(producto as Producto).descripcion || (producto as DispositivoKimovil).especificaciones || ""}`.toLowerCase();
  if (texto.includes("wh-1000") || texto.includes("ear") || texto.includes("headphone") || texto.includes("auricular") || texto.includes("quietcomfort")) {
    return "auriculares";
  }
  if (texto.includes("laptop") || texto.includes("zephyrus") || texto.includes("thinkpad") || texto.includes("macbook") || texto.includes("legion") || texto.includes("notebook")) {
    return "laptops";
  }
  if (texto.includes("tablet") || texto.includes("ipad") || texto.includes("pad")) {
    return "tablets";
  }
  return "moviles";
}

export function normalizarFichaProducto(
  producto: DispositivoKimovil | Producto
): FichaNormalizada {
  const esKimovil = "ranking" in producto;
  const categoria = detectarCategoria(producto);
  const nombre = producto.nombre;
  const marca = esKimovil
    ? (producto as DispositivoKimovil).marca
    : (producto as Producto).nombreMarca || `MARCA #${(producto as Producto).idMarca}`;
  const precio = esKimovil
    ? (producto as DispositivoKimovil).precio
    : (producto as Producto).precioReferencia || 350;
  const imagen =
    producto.imagen ||
    "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80";
  const puntuacionGlobal = esKimovil
    ? (producto as DispositivoKimovil).puntuacion
    : 9.3;
  const resumen = esKimovil
    ? (producto as DispositivoKimovil).especificaciones
    : (producto as Producto).descripcion ||
      "Dispositivo de última generación con especificaciones de alto rendimiento.";

  const detalle = esKimovil ? (producto as DispositivoKimovil).detalleSpecs : undefined;

  let categoriaEtiqueta = "Móviles";
  let categoriaIcono = "📱";

  if (categoria === "auriculares") {
    categoriaEtiqueta = "Auriculares & Audio";
    categoriaIcono = "🎧";
  } else if (categoria === "laptops") {
    categoriaEtiqueta = "Portátiles & Laptops";
    categoriaIcono = "💻";
  } else if (categoria === "tablets") {
    categoriaEtiqueta = "Tablets & Pantallas";
    categoriaIcono = "📱";
  }

  // 1. Si el producto ya tiene secciones y métricas modulares definidas
  if (detalle?.secciones && detalle.secciones.length > 0 && detalle?.metricas && detalle.metricas.length > 0) {
    return {
      categoriaTipo: categoria,
      categoriaEtiqueta,
      categoriaIcono,
      marca,
      nombre,
      precio,
      imagen,
      puntuacionGlobal,
      resumen,
      secciones: detalle.secciones,
      metricas: detalle.metricas,
      benchmark: {
        etiqueta: detalle.benchmarkEtiqueta || (categoria === "auriculares" ? "Aislamiento Acústico ANC" : categoria === "laptops" ? "Geekbench / PC Benchmark" : "AnTuTu Benchmark"),
        valor: detalle.benchmarkValor || detalle.antutuScore || "N/A",
      },
      tiendas: detalle.tiendas || [
        { nombre: "Amazon España / Global", precio: precio, envioGratis: true },
        { nombre: "AliExpress Oficial", precio: Math.round(precio * 0.94), envioGratis: true },
        { nombre: "MercadoLibre Official Store", precio: Math.round(precio * 1.04), envioGratis: false },
      ],
    };
  }

  // 2. Construcción coherente según la categoría del producto
  let secciones: SeccionHardware[] = [];
  let metricas: MetricaPuntuacion[] = [];
  let benchmark = { etiqueta: "AnTuTu Benchmark", valor: "1,450,000 Puntos" };

  if (categoria === "auriculares") {
    benchmark = {
      etiqueta: detalle?.benchmarkEtiqueta || "Aislamiento Acústico & Audio",
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

  const tiendas = detalle?.tiendas || [
    { nombre: "Amazon España / Global", precio: precio, envioGratis: true },
    { nombre: "AliExpress Oficial", precio: Math.round(precio * 0.94), envioGratis: true },
    { nombre: "MercadoLibre Official Store", precio: Math.round(precio * 1.04), envioGratis: false },
  ];

  return {
    categoriaTipo: categoria,
    categoriaEtiqueta,
    categoriaIcono,
    marca,
    nombre,
    precio,
    imagen,
    puntuacionGlobal,
    resumen,
    secciones,
    metricas,
    benchmark,
    tiendas,
  };
}
