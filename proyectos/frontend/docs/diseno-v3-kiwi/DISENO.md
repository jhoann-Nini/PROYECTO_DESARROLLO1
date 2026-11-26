# TecReview · Rediseño visual V3 "Kiwi"

Guía para aplicar el nuevo diseño al proyecto existente. **El objetivo es cambiar la apariencia, no la funcionalidad**: rutas, lógica, llamadas a la API y pruebas se mantienen.

## Contenido de esta carpeta

| Archivo | Para qué sirve |
|---|---|
| `DISENO.md` | Esta guía: reglas, componentes y orden de trabajo |
| `tokens.css` | Variables CSS del sistema (tema oscuro y claro) |
| `pantallas/*.html` | Maquetas de referencia de cada pantalla |

### Cómo leer las maquetas

Los archivos de `pantallas/` vienen de una herramienta de diseño. Son **referencia visual, no código para copiar**:

- `{{variable}}`, `<sc-for>`, `<sc-if>`, `<x-dc>` y `<helmet>` son sintaxis de esa herramienta. Los datos de ejemplo están al final de cada archivo, dentro de `renderVals()`.
- Los estilos van en línea (`style="…"`). Tradúcelos a los componentes y al sistema de estilos que ya use el proyecto.
- Productos, precios, tiendas, usuarios y valoraciones son de ejemplo. En la app real salen de la API.
- `Main.html` es la guía del sistema visual y `Mapa.html` el mapa de navegación. `Estados.html` reúne carga, vacío, error, éxito, formularios y diálogos.

| Maqueta | Pantalla |
|---|---|
| `Inicio.html` | Inicio |
| `Catalogo.html` | Catálogo y categorías |
| `Detalle.html` | Detalle de producto |
| `Comparador.html` | Comparador |
| `Resenas.html` | Reseñas y blog |
| `Favoritos.html` | Favoritos |
| `Perfil.html` | Perfil |
| `Admin.html` · `Moderador.html` · `Representante.html` | Paneles por rol |
| `Movil-publico.html` · `Movil-cuenta.html` | Versiones móviles (390 px) |

## Reglas del sistema

1. **Color.** Paleta kiwi: fondo semilla `--tr-canvas`, texto corazón `--tr-text` y verde kiwi `--tr-accent` para la acción. Nunca `#fff` ni `#000` puros. Todos los pares de texto cumplen WCAG AA (4,5:1 o más) en ambos temas.
2. **Sin sombras.** La profundidad sale de los pasos de superficie: canvas → card (con borde corcho) → raised.
3. **Dos voces tipográficas.**
   - MAYÚSCULAS, peso 500: títulos, navegación, botones, etiquetas, precios y nombres de producto. Interlineado 0,9 en títulos grandes.
   - Minúsculas, peso 400: descripciones, reseñas y ayudas de formulario.
   - Solo pesos 400 y 500, sin `letter-spacing`.
4. **Botones.**
   - Principal: relleno `--tr-accent`, texto `--tr-on-accent`, radio 36 px. En tema claro, fondo `#2F4416`. **Máximo uno por bloque.**
   - Secundario: transparente, borde `--tr-text`, radio 22,5 px.
   - Terciario: enlace subrayado en `--tr-accent`.
   - Destructivo: contorno y texto `--tr-danger`.
5. **Campos de formulario.** Sin caja: solo línea inferior `--tr-text` y radio 0.
6. **Divisores.** Línea de 1 px **punteada** en `--tr-border`, entre filas de tablas y entre secciones.
7. **Señales.** Dorado `--tr-deal` para descuentos y valoraciones; coral `--tr-danger` para errores y acciones destructivas. Siempre como texto o contorno, nunca de relleno.
8. **Radios.** Solo 36 · 22,5 · 12 · 9999 · 0. Ningún contenedor con menos de 12.
9. **Imagen de producto.** Va sobre `--tr-void`, como objeto en vitrina. Si no hay foto, se muestra una representación genérica (icono de la categoría y nombre del modelo), nunca una imagen inventada.

## Estado de los datos técnicos (obligatorio)

Se distinguen por forma, icono y texto, no por color:

| Estado | Tag | Valor |
|---|---|---|
| Verificado | Fondo `--tr-raised` + "✓ Verificado" | Texto `--tr-text` |
| Pendiente de revisión | Borde continuo `--tr-structure` + "◷ Pendiente" | Texto `--tr-text-2`. No cuenta para destacar ventajas en el comparador |
| Sin dato | Borde **punteado** `--tr-structure` + "— Sin dato" | "No registrado" en cursiva. Nunca se rellena ni se estima |

## Componentes base sugeridos

Crear o restilizar, en este orden:

1. `Button` (variantes `primary`, `secondary`, `link`, `danger`)
2. `Input`, `Select` y `Textarea` con línea inferior
3. `Chip` (filtro removible, seleccionado = fondo `--tr-text` y texto `--tr-canvas`) y `Tag` (estado, disponibilidad, descuento)
4. `Card` y `ProductCard`
5. `SpecRow` con `SpecStatusTag`
6. `SegmentedControl` (pastilla con borde corcho, activo en `--tr-raised`)
7. `Header` con búsqueda ⌘K / Ctrl+K y `MobileTabBar` de 5 pestañas: Inicio · Catálogo · Comparar · Comunidad · Cuenta
8. `Dialog`, `Toast`, `EmptyState`, `ErrorState` y `Skeleton`

## Orden de trabajo recomendado

1. Importar `tokens.css` y la fuente Inter (400 y 500). Agregar el cambio de tema con `data-theme` en `<html>`.
2. Restilizar los componentes base (lista anterior) sin tocar la lógica.
3. Aplicar el sistema pantalla por pantalla: Inicio → Catálogo → Detalle → Comparador → Reseñas → Favoritos → Perfil → paneles.
4. Revisar los estados de `Estados.html` en cada flujo.
5. Correr las pruebas existentes después de cada pantalla. Si una prueba depende de textos o clases que cambiaron, ajustar la prueba, nunca la lógica.

## Accesibilidad

- Contraste mínimo 4,5:1 para texto (los tokens ya lo cumplen en ambos temas; la tabla de contraste está en `pantallas/Main.html`).
- Áreas táctiles de 44 px o más.
- Botones de solo icono con `aria-label`.
- El foco visible usa un contorno `--tr-accent` de 2 px.
