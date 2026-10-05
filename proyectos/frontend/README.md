# Frontend - TecnoReview (Nothing Movil UI)

Plataforma frontend desarrollada con **Next.js 16**, **React 19**, **TypeScript** y **Tailwind CSS**, con arquitectura orientada al consumo de servicios REST en Spring Boot y diseño industrial inspirado en **Nothing Phone (Nothing OS)** sobre la estructura comparativa de **Kimovil**.

---

## 📋 Tareas del Sprint Cubiertas

- **TEC-21 (S1-12)**: Preparar servicio API en frontend (`src/services/api.ts`).
- **TEC-22 (S1-13)**: Consumir endpoint desde Next.js con manejo de ciclo de vida (`useEffect`), estados (`cargando`, `error`, `datos`) e interfaz reactiva.
- **TEC-44 (CP-05)**: Caso de prueba de integración para el consumo del endpoint REST (`GET /api/productos`) desde el cliente web.

---

## 🎨 Identidad Visual y Diseño ("Nothing Movil")

La interfaz replica la disposición técnica de dos columnas y buscador de **Kimovil**, adaptada con los parámetros de diseño de **Nothing OS**:

1. **Paleta de Colores**:
   - **Fondo**: Negro profundo técnico (`#080808`) con patrón Glyph de circuitos y matriz de puntos (`bg-glyph-circuit`).
   - **Acentos**: Crimson Red (`#D71920` / `#FF2A35`) para precios, acentos interactivos, rankings e indicadores.
   - **Paneles**: Gris carbón oscuro (`#0D0D10` / `#101013`) con bordes rectos y definidos (`border-zinc-800`).
2. **Tipografía**:
   - **Titulares y Rankings**: Tipografía Dot Matrix (`Silkscreen`) en rojo y blanco.
   - **Cuerpo y Especificaciones**: Sans-serif técnica (`Space Grotesk`) y Monospace (`Space Mono`).
3. **Componentes y Secciones**:
   - **Header Banner**: Logo `NOTHING MOVIL`, titular `EXPLORA TU PRÓXIMO DISPOSITIVO`, buscador técnico con filtros de categoría rápida (Móviles, Tablets, TVs, Wearables).
   - **Slider de Presupuesto**: Control deslizante interactivo con panel técnico `[ HASTA $XXX USD ]` que filtra en vivo.
   - **Últimas Ofertas**: Módulo lateral segmentado con porcentajes de descuento y precios Crimson.
   - **Sección Lo Más Top (Kimovil)**: Dos columnas simultáneas (*Los Más Vendidos* y *Los Más Deseados*) con tarjetas modulares, ranking dot matrix, flechas de tendencia y calificación *Nothing Score*.
   - **Inspector y Catálogo API**: Selector de vista para auditar en tiempo real los datos entregados por Spring Boot (`/api/productos`).

---

## 📂 Estructura del Proyecto Frontend

```text
proyectos/frontend/
├── src/
│   ├── app/
│   │   ├── globals.css         # Importación de fuentes Nothing, temas y utilidades
│   │   ├── layout.tsx          # Layout raíz con metadata y soporte dark
│   │   ├── page.tsx            # Página principal (Nothing Movil + Integración API)
│   │   └── productos/
│   │       └── page.tsx        # Inspector de endpoint y payload JSON
│   ├── components/
│   │   ├── DeviceListItem.tsx  # Tarjeta modular para listas de ranking top
│   │   └── ProductCard.tsx     # Tarjeta de catálogo de productos
│   ├── data/
│   │   └── mockProductos.ts    # Datos de respaldo técnico (fallback si la API está offline)
│   ├── services/
│   │   └── api.ts              # Cliente HTTP centralizado (apiFetch, ApiError, obtenerProductos)
│   └── types/
│       └── producto.ts         # Contrato TypeScript de la entidad Producto
├── .env.local                  # Configuración de variables (NEXT_PUBLIC_API_URL)
└── package.json
```

---

## ⚙️ Configuración y Variables de Entorno

Crear o revisar el archivo `.env.local` en la raíz de `proyectos/frontend`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## 🚀 Comandos de Ejecución

### 1. Instalar dependencias
```bash
npm install
```

### 2. Iniciar servidor de desarrollo
```bash
npm run dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

### 3. Ejecutar análisis estático (Linter)
```bash
npm run lint
```
*Garantiza 0 errores y 0 advertencias bajo las reglas de Next.js y TypeScript.*

### 4. Compilar para producción (Build)
```bash
npm run build
```
*Verifica la compilación estática y validación de tipos estricta.*

---

## 🧪 Pruebas de Integración (CP-05)

- **Caso**: CP-05 - Consumir endpoint desde el frontend.
- **Resultado**: 
  - Al iniciar el cliente, se dispara la solicitud HTTP `GET` a `${NEXT_PUBLIC_API_URL}/api/productos`.
  - Si el backend de Spring Boot se encuentra activo, los datos reales se inyectan en pantalla con el indicador `ONLINE (:8080)`.
  - Si el backend está apagado o en mantenimiento, el cliente activa el modo de prueba con datos simulados y advertencia informativa, garantizando tolerancia a fallos.
