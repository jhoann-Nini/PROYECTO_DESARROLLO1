export interface SeccionBlog {
  titulo: string;
  parrafos: string[];
}

export interface ArticuloBlog {
  slug: string;
  titulo: string;
  extracto: string;
  categoriaSlug: "celulares" | "tablets" | "portatiles" | "auriculares";
  categoriaEtiqueta: string;
  fecha: string;
  secciones: SeccionBlog[];
  puntosClave: string[];
}

/**
 * Contenido editorial estático de TecReview.
 *
 * Las guías explican cómo leer una ficha técnica y cómo usar el catálogo.
 * No incluyen precios, ratings, disponibilidad ni recomendaciones de productos
 * concretos: esos datos solo se muestran cuando provienen de la API real.
 */
export const ARTICULOS_BLOG: ArticuloBlog[] = [
  {
    slug: "como-comparar-dos-moviles",
    titulo: "Cómo comparar dos móviles sin perderte en la ficha técnica",
    extracto:
      "Una guía práctica para ordenar las especificaciones, distinguir lo importante de lo accesorio y usar el comparador con datos reales.",
    categoriaSlug: "celulares",
    categoriaEtiqueta: "Móviles",
    fecha: "2026-10-26",
    puntosClave: [
      "Define primero el uso real que le darás al teléfono.",
      "Compara especificaciones equivalentes, no números aislados.",
      "Revisa precio de referencia y disponibilidad antes de decidir.",
    ],
    secciones: [
      {
        titulo: "Empieza por el uso, no por la ficha",
        parrafos: [
          "Antes de abrir dos fichas técnicas, define qué necesitas: llamadas y mensajería, fotografía, juegos, trabajo o autonomía para todo el día. Esa respuesta cambia qué especificaciones merecen atención.",
          "Si dos teléfonos cubren tu uso principal, las diferencias secundarias pesan menos. La ficha sirve para confirmar, no para sustituir esa decisión.",
        ],
      },
      {
        titulo: "Pantalla y batería: los datos que sí notas",
        parrafos: [
          "En pantalla, revisa tamaño, tecnología y resolución como un conjunto. Un panel grande con buena resolución puede consumir más energía; uno más pequeño puede ser más cómodo de usar con una mano.",
          "En batería, los miliamperios (mAh) indican capacidad, pero no garantizan autonomía. La duración real depende del consumo del equipo, la pantalla y el uso. Si la ficha no registra un dato, TecReview lo muestra como ausente en lugar de completarlo.",
        ],
      },
      {
        titulo: "Procesador, RAM y almacenamiento",
        parrafos: [
          "El procesador y la memoria RAM influyen en la fluidez, pero no existe una equivalencia universal entre marcas. Compara generaciones y características dentro de la misma familia antes de asumir que un número mayor siempre es mejor.",
          "El almacenamiento determina cuántas fotos, aplicaciones y archivos caben. Revisa también si el equipo admite tarjeta microSD; no todos lo hacen.",
        ],
      },
      {
        titulo: "Cámara: mira el conjunto, no solo los megapíxeles",
        parrafos: [
          "Los megapíxeles describen la resolución del sensor, no la calidad final. Importan el tamaño del sensor, la apertura, la estabilización y el procesamiento de imagen.",
          "Si la ficha solo registra la resolución, tómala como un dato parcial. No supongas que una cifra mayor implica mejores fotos.",
        ],
      },
      {
        titulo: "Cierra la comparación con precio y disponibilidad",
        parrafos: [
          "El precio de referencia y la disponibilidad son parte de la decisión. Un equipo con mejores especificaciones puede no estar disponible o superar tu presupuesto.",
          "En TecReview puedes agregar hasta cuatro productos al comparador. La sugerencia que aparece es informativa y se basa en los datos registrados; no declara un ganador absoluto.",
        ],
      },
    ],
  },
  {
    slug: "bateria-y-carga-que-significan-los-numeros",
    titulo: "Batería y carga: qué significan los números de la ficha",
    extracto:
      "mAh, vatios, ciclos y autonomía: cómo leer cada dato sin confundir capacidad con duración real.",
    categoriaSlug: "celulares",
    categoriaEtiqueta: "Móviles",
    fecha: "2026-10-26",
    puntosClave: [
      "Los mAh miden capacidad, no horas de uso.",
      "Los vatios describen la potencia de carga, no la velocidad garantizada.",
      "La autonomía depende del consumo y del patrón de uso.",
    ],
    secciones: [
      {
        titulo: "Capacidad no es autonomía",
        parrafos: [
          "La capacidad de una batería se expresa en miliamperios-hora (mAh). Es una medida de cuánta carga puede almacenar, pero no indica directamente cuántas horas durará.",
          "Dos equipos con la misma capacidad pueden tener autonomías distintas por el consumo de la pantalla, el procesador y el software. Por eso TecReview no convierte mAh en horas de uso.",
        ],
      },
      {
        titulo: "Vatios de carga: una parte de la historia",
        parrafos: [
          "Los vatios (W) indican la potencia máxima que puede entregar un cargador compatible. La velocidad real depende también del protocolo de carga, el cable y la gestión térmica del equipo.",
          "Un número mayor no siempre significa una carga más rápida en todo el ciclo: la potencia suele reducirse al acercarse al 100 %.",
        ],
      },
      {
        titulo: "Ciclos, salud y hábitos",
        parrafos: [
          "Un ciclo de carga equivale a consumir el 100 % de la capacidad, no necesariamente a una conexión completa. La salud de la batería se degrada con el uso y la temperatura.",
          "Evitar el calor extremo y cargar con el cargador adecuado ayuda más que perseguir una cifra concreta de vatios.",
        ],
      },
      {
        titulo: "Qué buscar en la ficha de TecReview",
        parrafos: [
          "Si la ficha registra capacidad y potencia de carga, úsalas para comparar equipos de la misma categoría. Si falta un dato, aparecerá como no registrado.",
          "La autonomía real solo puede evaluarse con pruebas reproducibles. Cuando no existen, es preferible decir que no hay dato antes que inventar una cifra.",
        ],
      },
    ],
  },
  {
    slug: "portatiles-para-estudiar",
    titulo: "Portátiles para estudiar: una guía de especificaciones",
    extracto:
      "Qué mirar en RAM, almacenamiento, pantalla, peso y batería cuando el portátil será tu herramienta principal de estudio.",
    categoriaSlug: "portatiles",
    categoriaEtiqueta: "Laptops / PCs",
    fecha: "2026-10-26",
    puntosClave: [
      "La RAM y el tipo de almacenamiento afectan la fluidez diaria.",
      "El peso y la batería importan si lo llevarás todos los días.",
      "La pantalla influye en comodidad, no solo en resolución.",
    ],
    secciones: [
      {
        titulo: "RAM: piensa en las aplicaciones abiertas",
        parrafos: [
          "La memoria RAM permite mantener aplicaciones y pestañas abiertas al mismo tiempo. Para estudio y trabajo ligero, la cantidad adecuada depende de cuántas herramientas uses en paralelo.",
          "La velocidad y el tipo de memoria también influyen, pero no compensan una cantidad insuficiente para tu flujo de trabajo.",
        ],
      },
      {
        titulo: "Almacenamiento: capacidad y tipo",
        parrafos: [
          "Un SSD es más rápido que un disco mecánico para arrancar el sistema y abrir archivos. Revisa tanto la capacidad como la tecnología y si el equipo permite ampliarla.",
          "Si guardas muchos videos o proyectos pesados, la capacidad disponible a largo plazo importa más que una cifra inicial ajustada.",
        ],
      },
      {
        titulo: "Pantalla, teclado y peso",
        parrafos: [
          "La resolución y el tamaño de pantalla afectan cuánto contenido cabe y qué tan cómodo es trabajar. La tecnología del panel influye en contraste y ángulo de visión.",
          "Si vas a transportarlo a diario, revisa el peso y las dimensiones. Un equipo potente pero pesado puede terminar quedándose en casa.",
        ],
      },
      {
        titulo: "Batería y conectividad",
        parrafos: [
          "La autonomía depende del uso y del brillo de la pantalla. Los puertos disponibles también importan: HDMI, USB-C, lector de tarjetas o conector de carga.",
          "Antes de comparar, verifica que la ficha registre estos datos. TecReview no completa especificaciones faltantes con supuestos.",
        ],
      },
    ],
  },
  {
    slug: "auriculares-anc-codecs-y-autonomia",
    titulo: "Auriculares: ANC, códecs y autonomía explicados",
    extracto:
      "Una guía para entender las siglas que aparecen en la ficha de unos auriculares y decidir cuáles importan para tu uso.",
    categoriaSlug: "auriculares",
    categoriaEtiqueta: "Auriculares",
    fecha: "2026-10-26",
    puntosClave: [
      "La cancelación de ruido activa no es lo mismo que el aislamiento pasivo.",
      "Los códecs deben ser compatibles con tu teléfono y tus auriculares.",
      "La autonomía suele cambiar al activar ANC.",
    ],
    secciones: [
      {
        titulo: "ANC no es aislamiento pasivo",
        parrafos: [
          "El aislamiento pasivo depende del diseño y las almohadillas. La cancelación activa de ruido (ANC) usa micrófonos y procesamiento para reducir sonidos del entorno.",
          "La eficacia varía según el tipo de ruido y el ajuste. Una ficha puede indicar que hay ANC sin detallar su rendimiento; ese dato no basta para prometer resultados.",
        ],
      },
      {
        titulo: "Códecs: la cadena completa importa",
        parrafos: [
          "Un códec es la forma en que el audio se transmite por Bluetooth. Para aprovecharlo, tanto el teléfono como los auriculares deben ser compatibles.",
          "El códec no lo es todo: también influyen los transductores, el ajuste y la implementación. No elijas solo por la sigla más avanzada.",
        ],
      },
      {
        titulo: "Autonomía con y sin ANC",
        parrafos: [
          "La autonomía se mide en horas y puede reducirse al activar la cancelación de ruido. Revisa si el dato corresponde al estuche, a los auriculares o a ambos.",
          "Si la ficha no distingue entre esos escenarios, tómalo como una referencia incompleta.",
        ],
      },
      {
        titulo: "Cómo usar el catálogo",
        parrafos: [
          "Compara los datos registrados de cada modelo y revisa las opiniones de la comunidad. Las estrellas provienen de valoraciones reales y se muestran por separado de las reseñas escritas.",
          "Si un dato no está en la ficha, no lo completes por lógica: consúltalo con el fabricante o espera a que se registre en el catálogo.",
        ],
      },
    ],
  },
];

export function obtenerArticuloPorSlug(
  slug: string,
): ArticuloBlog | undefined {
  return ARTICULOS_BLOG.find((articulo) => articulo.slug === slug);
}

/**
 * Calcula una estimación de lectura a partir del contenido real del artículo.
 * Es una referencia, no una métrica editorial inventada.
 */
export function calcularMinutosLectura(articulo: ArticuloBlog): number {
  const texto = [
    articulo.titulo,
    articulo.extracto,
    ...articulo.puntosClave,
    ...articulo.secciones.flatMap((seccion) => [
      seccion.titulo,
      ...seccion.parrafos,
    ]),
  ].join(" ");

  const palabras = texto.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(palabras / 200));
}
