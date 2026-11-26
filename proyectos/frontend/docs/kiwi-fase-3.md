# Kiwi V3 — Fase 3: shell y búsqueda global

Fecha: 2026-11-24. Rama: `rediseno-kiwi`.
Referencias: [DISENO.md](tecreview-diseno-v3-kiwi/DISENO.md),
[Inicio.html](tecreview-diseno-v3-kiwi/pantallas/Inicio.html) y
[componentes base](kiwi-fase-2.md).

## Cambios visuales

- `AppShell`: superficies Kiwi y espacio inferior que incluye la zona segura
  móvil, después del footer, para evitar que la navegación fija lo cubra.
- `SiteHeader`: superficie opaca sin sombra, divisor punteado, enlaces en
  mayúsculas CSS y estado activo sobre `surface-2`. Se mantiene el logo.
  Búsqueda, perfil y tema tienen objetivos de 44 px. Explorar catálogo
  reutiliza `buttonClassName`; el perfil usa contorno para reservar el relleno
  principal al CTA. Las acciones pueden envolver en pantallas estrechas.
- `SiteFooter`: divisor punteado, tipografía y colores semánticos Kiwi.
- `BottomNav`: conserva las cinco rutas y sus etiquetas; aplica fondo activo,
  distribución de cinco columnas y espacio seguro inferior. El texto puede
  partirse en pantallas estrechas sin eliminar caracteres.
- `BotonTema`: reutiliza Button secundario con 44 × 44 px.
- `PanelBusquedaModal`: elimina sombra y negro directo; usa overlay `inverse`,
  superficie `paper`, divisores punteados e imágenes sobre `surface-0`.
  Reutiliza Input con línea inferior y Button secundario para cerrar.
  Los chips seleccionados usan `ink` sobre `canvas` invertidos (fondo `ink`,
  texto `canvas`); los resultados y títulos usan peso 500 y mayúsculas CSS.

Se conservan todos los textos y nombres accesibles, roles, URLs, hooks, tipos,
servicios, filtros, Ctrl/Cmd+K, Escape, contención y retorno del foco. No se
modifican los componentes heredados `Header.tsx` y `Footer.tsx`, ni los paneles
de roles ni las páginas de fases posteriores. El mecanismo de tema y los
tokens aprobados permanecen intactos.

## Pruebas y revisión

- Línea base: `npm test` aprobado, **94 archivos / 1375 pruebas**, 65,21 s.
- `PanelBusquedaModal.test.tsx`: se actualizan exclusivamente dos selectores
  CSS de las barras de skeleton, de `.rounded` a `.rounded-full`, para reflejar
  el radio Kiwi intencional. Las demás comprobaciones quedan intactas.
- Comparación del árbol TypeScript de los seis componentes frente a HEAD:
  idéntico al excluir imports, clases y sustituciones visuales Button/Input.
  Confirma que se preservan lógica, JSX de texto y atributos no visuales.
- `npm test` final: **94 archivos / 1375 pruebas aprobadas**, 0 fallos,
  61,49 s. Mismo total que la línea base.
- `npm run build`: **aprobado**, TypeScript correcto, **17/17 páginas**
  generadas. Ejecutado con autorización fuera del sandbox por el `EPERM`
  observado en fases anteriores.
- Se comprobó que el CSS de producción incluye las utilidades nuevas de
  padding, visibilidad responsive, superficies y tipografía.
- `git diff --check`: sin errores; se revisaron `git diff` y `git status`.

La revisión visual completa de pantallas y ambos temas queda en la fase 11.
Esta fase no inicia el rediseño de Inicio ni arranca un servidor de desarrollo.
