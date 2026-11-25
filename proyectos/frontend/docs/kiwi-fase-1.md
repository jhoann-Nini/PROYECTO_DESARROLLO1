# Kiwi V3 — Fase 1: tokens y tema

Fecha: 2026-11-24. Rama: `rediseno-kiwi`.

Referencias leídas: [DISENO.md](tecreview-diseno-v3-kiwi/DISENO.md) y
[tokens.css](tecreview-diseno-v3-kiwi/tokens.css). Estos archivos de referencia
no se modifican ni se importan directamente. Los valores viven en `@theme`
(claro) y `html.dark` (oscuro) de `src/app/globals.css`.

## Alcance

Solo fase 1. Se conservan `.dark`, `data-tema`, la clave `tecreview:tema`,
el oscuro por defecto, `src/lib/tema.ts` y el script del layout. No se introduce
`data-theme`. Inter ya está integrada mediante `next/font`; se reutiliza.
No hay cambios en JSX, lógica, rutas, servicios, hooks, tipos, textos ni nombres
accesibles. Los paneles de roles siguen siendo modales.

## Equivalencias de color

Tabla presentada antes de editar. Todos los nombres de la primera columna
llevan el prefijo `--color-`; los tokens Kiwi llevan `--tr-`.

| Variable actual → destino | Token Kiwi | Claro | Oscuro |
|---|---|---|---|
| `canvas`, `surface-base` | `canvas` | `#F6F3DF` | `#10140A` |
| `surface-0` | `void` | `#ECE8CC` | `#0A0D06` |
| `paper`, `surface-card`, `surface-1` | `card` | `#FCFAEE` | `#171D0F` |
| `surface-2`, `status-success-bg` | `raised` | `#E2E8C6` | `#2F4416` |
| `surface-muted`, `brand-light` | `selected` | `#ECE8CC` | `#1E2812` |
| `hairline`, `line`, `line-soft`, `surface-border` | `border` | `#CFCBA9` | `#3A4626` |
| `surface-border-strong` | `structure` | `#8C7A50` | `#8C7A50` |
| `ink`, `text-primary` | `text` | `#10140A` | `#F4F1DC` |
| Nueva: `text-body` | `text-body` | `#1E2410` | `#E6E3CB` |
| `text-secondary` | `text-2` | `#454A2E` | `#CFCDB3` |
| `subtle`, `text-muted` | `text-3` | `#5C5F42` | `#B4B397` |
| `brand-blue`, `brand-primary`, `brand-focus`, `positive`, `status-success` | `accent` | `#3D6614` | `#A5D64C` |
| `brand-solid`, `brand-hover` | Botón principal de DISENO.md | `#2F4416` | `#A5D64C` |
| `on-solid`, `on-positive` | `on-accent` | `#F6F3DF` | `#10140A` |
| `star` (valoraciones y descuentos) | `deal` | `#6B5200` | `#E6C34A` |
| `status-error` | `danger` | `#B3361B` | `#FF8C69` |
| `status-error-bg` | `card` (sin relleno coral) | `#FCFAEE` | `#171D0F` |
| `inverse` (overlay fijo) | `canvas` oscuro | `#10140A` | `#10140A` |

No se duplica el dorado con otro token: `star` ya cumple ese rol. El borde de
pendiente/sin dato puede usar `surface-border-strong`, que corresponde a
`structure`. El único rol de color nuevo es `text-body` para lectura larga.

## Tipografía, radios, espaciado y sombras

Estos valores son iguales en ambos temas. Los nombres son variables completas;
la columna Kiwi omite el prefijo `--tr-`.

| Variable actual → destino | Token Kiwi | Claro | Oscuro |
|---|---|---|---|
| `--font-sans`, `--font-doto` | `font` | Inter, system-ui, sans-serif | Igual |
| Nuevas: `--text-display`, `--text-heading`, `--text-heading-sm` | `text-display`, `text-heading`, `text-heading-sm` | 51 / 41 / 24 px | Igual |
| Nueva: `--text-sub` | `text-sub` | 18 px | Igual |
| Nueva: `--text-body-lg` | `text-body-lg` | 29 px | Igual |
| `--text-base` de Tailwind | `text-base` | 15 px | Igual |
| Nuevas: `--text-label`, `--text-micro` | `text-label`, `text-micro` | 12 / 11 px | Igual |
| `--radius-sm/md/lg/xl/2xl/3xl/card/control` | `radius-card` | 12 px | Igual |
| Nuevas: `--radius-pill`, `--radius-ghost` | `radius-pill`, `radius-ghost` | 36 / 22,5 px | Igual |
| `--radius-full`, nueva `--radius-input` | `radius-full`, `radius-input` | 9999 / 0 px | Igual |
| Nuevas: `--spacing-gap`, `--spacing-card-padding` | `gap`, `card-padding` | 18 / 24 px | Igual |
| `--shadow-soft/paper/paper-hover` | Sin sombras visibles | `0 0 transparent` | `0 0 transparent` |

Los tamaños `display`, `heading`, `heading-sm` y `body-lg` incluyen sus
interlineados de 0,9 / 0,9 / 1,09 / 1,26 mediante las variables asociadas de
Tailwind `--text-…--line-height`. El cuerpo usa 15 px, peso 400 y `ss01` activado.
Se elimina el espaciado de letras heredado de `.font-doto`, que sigue siendo
un alias de Inter, y el scrollbar usa el radio completo Kiwi.

La tabla previa proponía `none` para las sombras. Al revisar el CSS generado
se ajustó a `0 0 transparent`: no produce sombra visible y mantiene válida la
lista de sombras que Tailwind compone con los anillos de foco. Así se conservan
los indicadores de teclado durante la migración. Las clases de sombra en JSX,
las sombras estándar de Tailwind,
los colores directos, los pesos y las mayúsculas de cada componente se
adaptarán en sus fases. Esta fase no certifica el contraste de toda la interfaz
existente: aún hay colores directos, transparencias y combinaciones heredadas.

## Validación

Línea base registrada antes de editar:

- `npm test`: **93 archivos y 1368 pruebas aprobadas**, 0 fallos. Duración:
  **59,34 s**.
- `npm run build`: **aprobado**, TypeScript correcto y **17/17 páginas**
  generadas. El primer intento dentro del sandbox falló con `EPERM` al crear
  `.next/server/app/_not-found.segments/_not-found`; el reintento autorizado
  fuera del sandbox pasó sin modificar código.

Contraste calculado mediante luminancia relativa sRGB: todos los siete roles
de texto (`text`, `text-body`, `text-2`, `text-3`, `accent`, `deal`, `danger`)
frente a las cinco superficies opacas (`canvas`, `void`, `card`, `raised`,
`selected`) cumplen 4,5:1. Mínimos: **4,80:1 en claro** y **4,70:1 en oscuro**.
`on-solid` sobre `brand-solid`: **9,60:1 en claro**, **10,94:1 en oscuro**.
`structure` es un borde, no un color de texto.

Validación posterior:

- `npm test`: **93 archivos y 1368 pruebas aprobadas**, 0 fallos, igual que la
  línea base. Ejecución final tras el ajuste de sombras: **62,66 s** frente a
  **59,34 s** de la línea base. No se modificó ninguna prueba.
- Las **34 equivalencias de color por tema** se comprobaron contra el archivo
  de referencia y la excepción documentada del botón principal claro.
- `npm run build`: **aprobado**, TypeScript correcto y **17/17 páginas**
  generadas, igual que la línea base. Se ejecutó fuera del sandbox con
  autorización por el `EPERM` observado antes de editar.
- `git diff --check`: sin errores. Se revisaron `git diff` y `git status`;
  únicamente se cambió `globals.css` y la documentación de esta fase.

Se detiene el trabajo al completar la fase 1. No se han iniciado componentes
base, shell, pantallas ni modales. La revisión visual completa de ambos temas
corresponde a la fase 11.
