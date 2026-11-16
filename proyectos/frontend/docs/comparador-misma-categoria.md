# Comparador: productos de la misma categoría

Mejora 1 implementada el 16 de noviembre de 2026. No incluye las mejoras 2–5.

## Comportamiento

- El primer producto válido fija el `idCategoria` de la selección; no se
  deduce la categoría de nombres, especificaciones ni del tipo visual.
- Se pueden comparar hasta cuatro productos de esa misma categoría.
- El selector filtra los productos compatibles antes de aplicar búsqueda
  y límite de resultados. Al vaciar o quitar el último producto se permite
  elegir otra categoría.
- La ficha bloquea agregar productos incompatibles y explica cómo cambiar de
  categoría. Quitar productos ya seleccionados sigue disponible.
- Al recuperar selecciones antiguas o recibir cambios de otra pestaña, se
  conservan el primer producto existente con categoría válida y los
  compatibles, respetando su orden. Se descartan IDs ausentes, categorías
  inválidas y productos de otras categorías; se informa de la depuración.
- La tabla recibe únicamente la selección validada, también antes de terminar
  la actualización de `localStorage`.

## Implementación y límites

- `src/data/comparador.ts`: validación compartida y rechazo de adiciones
  incompatibles.
- `src/hooks/useComparador.ts`: hidratación, reconciliación con el catálogo,
  categoría activa y sincronización entre pestañas. Sin catálogo se conserva
  el estado para lectura, pero no se pueden agregar productos.
- `/comparador` reutiliza su consulta actual del catálogo. El botón de la
  ficha consulta `GET /api/productos` para validar incluso selecciones
  antiguas, sin persistir categorías potencialmente obsoletas. Si falla,
  bloquea adiciones, conserva la selección y permite reintentar.
- Se mantiene `tecreview:comparador` como arreglo de IDs: no requiere migración,
  sesión, nueva API, entidades JPA ni cambios de base de datos.
- Los intentos rechazados no modifican el historial de comparados recientes;
  este historial puede incluir distintas categorías porque no es una selección.
- El resumen del perfil sigue siendo de solo lectura; la selección se valida
  al abrir el comparador o una ficha.
- No se modifican las filas técnicas, recomendaciones, presupuesto, blog ni
  favoritos. La adaptación de filas técnicas por categoría queda para la
  mejora 2.

## Pruebas

`npm test` incluye pruebas de la regla pura, del hook, del selector y del botón
en la ficha, además de la integración existente del detalle:

- Categoría real frente a etiquetas visuales iguales.
- Adición compatible, rechazo incompatible, duplicados y máximo de cuatro.
- Selecciones antiguas mixtas, IDs ausentes y categorías inválidas.
- Liberación al vaciar o quitar el último producto.
- Actualización del catálogo y eventos `storage`.
- Clics rápidos y persistencia no disponible.
- Error, carga y reintento del catálogo sin perder la selección.

Verificación de cierre: `npm test`, `npx tsc --noEmit`, `npm run lint`,
`npm run build`, `git diff --check`, revisión de `git status` y `git diff`.

Resultado automatizado: 671 pruebas correctas en 60 archivos; comprobación de
tipos, lint y build de producción correctos. No se ejecutaron pruebas de backend
porque no se modificó ese módulo.

Revisión independiente sin hallazgos críticos de la regla. Su observación sobre
el nombre de la categoría activa se corrigió usando el nombre registrado y,
si falta, su ID, con dos pruebas RED→GREEN. El cierre no incluyó una prueba
manual contra un backend real.
