# Kiwi V3 — Fase 2: componentes base

Fecha: 2026-11-24. Rama: `rediseno-kiwi`.
Referencia: [DISENO.md](tecreview-diseno-v3-kiwi/DISENO.md) y los
[tokens de la fase 1](kiwi-fase-1.md).

## Componentes

- `ui/Button.tsx`: botón nativo con variantes `primary`, `secondary`, `link`
  y `danger`. La variante `link` conserva la semántica de botón; para navegar
  se usa un enlace real con `buttonClassName`, como en `EstadoVacio`.
  No cambia el tipo nativo: cada consumidor conserva su `type` original.
- `ui/Input.tsx`: campo con línea inferior, sin caja y radio cero. Recibe las
  props nativas, incluida la referencia de React 19, sin añadir validaciones,
  etiquetas ni manejadores. Destinado a campos de texto, búsqueda, correo,
  contraseña y número; los controles checkbox/radio necesitan su propio estilo.
- `ui/Tag.tsx`: etiqueta no interactiva con variantes `neutral`, `verified`,
  `pending`, `missing`, `deal` y `danger`. Dorado y coral solo en texto/borde.
- `ui/EstadoDato.tsx`: compone Tag con estado explícito `verificado`,
  `pendiente` o `sin-dato`. Muestra icono y texto; pendiente tiene borde continuo
  y sin dato punteado. El icono es decorativo para el lector de pantalla.
  No consulta ni infiere datos ni agrega regiones vivas automáticamente.

Los componentes reutilizan los tokens existentes, mayúsculas mediante CSS,
pesos 400/500 y radios Kiwi. Button e Input tienen altura mínima de 44 px y
reutilizan el indicador de foco de 2 px existente. No incorporan sombras.
Las etiquetas no interactivas no requieren un área táctil de 44 px.

## Integración y alcance

`EstadoVacio` reutiliza Button y sus estilos para las dos ramas de acción
(botón y Link), preservando etiquetas, tipo, URL y manejador. No se reescribe
el componente. Input y los tags quedan preparados para las fases de pantallas;
EstadoDato ya reutiliza Tag.

La etiqueta de estado y el valor técnico son elementos distintos: al integrar
el detalle en fase 6, el valor verificado usa `text-ink`, el pendiente
`text-text-secondary` y el ausente conserva el tratamiento de texto previsto
por el diseño (cursiva), sin estimar valores ni cambiar los textos existentes.
Se conserva la regla funcional del comparador; esta fase no interpreta datos.

No se modifican `globals.css`, el mecanismo de tema, contratos de dominio,
servicios, hooks, rutas ni paneles. No se inicia la fase 3.

## Validación

- Línea base antes de editar: `npm test` aprobado, **93 archivos / 1368
  pruebas**, 60,48 s (mismo total que la fase 1).
- Se añaden siete pruebas de contratos nativos y accesibilidad: envío,
  deshabilitado, referencias, campo controlado, semántica de Tag y tres estados.
- `npm test` posterior: **94 archivos / 1375 pruebas aprobadas**, 0 fallos,
  60,91 s. Se conservan las 1368 pruebas anteriores y se suman las siete nuevas.
  No se modificó ninguna prueba existente por clases CSS ni por otro motivo.
- `npm run build`: **aprobado**, TypeScript correcto, **17/17 páginas**
  generadas. Se ejecutó con autorización fuera del sandbox por el error de
  permisos `EPERM` observado en la fase 1.
- `git diff --check`: sin errores. Se revisaron `git diff` y `git status`.
  Los cuatro componentes nuevos no contienen colores directos ni sombras.

Fase 2 terminada. El servidor de desarrollo permanece detenido.
