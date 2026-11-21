---
name: comparador-tecreview
description: Usar cuando en TecReview se trabaje con /comparador, la tabla comparativa, filas técnicas, "solo diferencias", la recomendación o ganador, insignias por criterio, la selección guardada en localStorage, o cuando haya que saber si una ficha técnica nueva se comparará correctamente con otros productos.
---

# Comparador TecReview

## Principio

El comparador **muestra diferencias verificables; no decide por el usuario**. Solo compara
lo que es comparable por contrato (misma categoría, misma regla, misma unidad) y explica por
qué no compara el resto. Con fichas V3 nunca hay ganador global.

## Cuándo usarla / cuándo no

| Usar | No usar |
|---|---|
| Cambios o bugs en `/comparador`, `BotonComparador`, `useComparador` | Búsqueda general, favoritos o presupuesto (aunque compartan `ProductoViewModel`) |
| Simular cómo se comparará una ficha V3 nueva | Contenido de la ficha en sí → `ficha-tecnica-auditor` |
| Fase 4 de la auditoría: insignias por criterio en vez de ganador | Endpoints del catálogo → `springboot-api-auditor` |

## Mapa del código (rutas desde `proyectos/frontend/src`)

| Pieza | Archivo | Responsabilidad |
|---|---|---|
| Selección | `data/comparador.ts` (`normalizarIdsComparador`, `agregarIdComparador`, `validarSeleccionComparador`) | Máx. `MAX_COMPARADOR = 4`, misma `idCategoria`, clave `tecreview:comparador` = arreglo de IDs |
| Hidratación / pestañas | `hooks/useComparador.ts` | Reconciliar con el catálogo, depurar IDs inválidos, sincronizar entre pestañas |
| Filas generales | `construirFilasComparacion` | precio, disponibilidad, marca, categoría |
| Filas legacy/V1/V2 | `data/especificacionesComparador.ts` (`CAMPOS`, alias por categoría) | Texto registrado; sin convertir unidades; claves `tecnica:<clave>` |
| Filas V3 | `construirFilasV3` en `data/comparador.ts` | Claves `tecnica:v3:<clave>`; requiere ≥2 productos, misma categoría V3 y ficha V3 válida en todos |
| Recomendación | `generarRecomendacion` | V3 → mensaje sin ganador. Legacy → **todavía elige un candidato** por disponibilidad/precio/cantidad de datos (pendiente Fase 4) |
| UI | `app/comparador/ComparadorCliente.tsx` | Tabla, variantes seleccionadas, nota de comparabilidad |
| Documentación | `frontend/docs/comparador-misma-categoria.md`, `comparador-filas-por-categoria.md`, `fichas-tecnicas-v3-frontend.md` | Comportamiento acordado |

Reglas de la fila V3: [references/reglas-comparacion.md](references/reglas-comparacion.md).

## Procedimiento

1. **Ubicar la ruta**: general, legacy (V1/V2/legacy) o V3. El clasificador común es
   `clasificarFichaTecnicaProducto`; una ficha inválida o V3 mal etiquetada queda fuera de
   la ruta legacy.
2. **Para una ficha nueva**, simula producto por producto:
   - ¿La categoría del catálogo se corresponde con la categoría V3 (moviles↔celulares,
     laptops↔portatiles)? Si no, no participa en la comparación V3.
   - Con varias variantes, ¿hay una seleccionada? Sin selección solo cuentan las
     especificaciones con `variante_id = null`.
   - Por cada `clave` común, recorre la tabla de motivos de no comparabilidad.
   Entrega una tabla `clave | comparable sí/no | motivo`.
3. **Para un cambio de comportamiento**, identifica qué pruebas cubren hoy esa conducta y
   escribe primero la prueba que falla.
4. **Compatibilidad**: no cambies el formato de `tecreview:comparador` ni las claves de fila
   (`tecnica:`, `tecnica:v3:`, `benchmark:`) sin un plan de migración aprobado.
5. Documenta el cambio en el `.md` correspondiente de `frontend/docs/`.

## Reglas obligatorias

- Nunca anunciar un ganador global con V3; en Fase 4 la dirección acordada es
  **insignias por criterio** (por fila con regla), no una puntuación total.
- No convertir listas, texto, `desconocido`, `no_publicado` ni `no_aplica` en magnitudes.
- Comparación numérica solo con `magnitud` escalar en la unidad exacta de la regla; ante
  unidades o tolerancias inválidas, fallar cerrado (no comparar).
- Benchmarks V3: informativos, no se comparan automáticamente.
- "Solo diferencias" en legacy compara textos tal como están registrados.
- No inferir categoría desde el nombre del producto ni desde IDs fijos.
- Next.js 16 tiene cambios incompatibles: antes de tocar páginas o layouts, leer la guía en
  `proyectos/frontend/node_modules/next/dist/docs/`.

## Validaciones

Desde `proyectos/frontend`:

```bash
npx vitest run src/data/comparador.test.ts src/data/comparador.metricas.test.ts src/data/especificacionesComparador.test.ts src/hooks/useComparador.test.tsx src/app/comparador src/components/detalle/BotonComparador.test.tsx
```

Después, `tecreview-qa` (tsc, lint, build).

## Criterios de aceptación

- Pruebas del comparador en verde, incluida una prueba nueva por cada conducta cambiada.
- Toda fila V3 no comparada muestra su motivo.
- Selecciones antiguas en `localStorage` siguen cargando (o se depuran con aviso).
- Documentación de `frontend/docs/` actualizada.

## Errores frecuentes

| Error | Corrección |
|---|---|
| Habilitar `orden_numerico` en un valor `rango` o `lista` | Solo `magnitud` escalar; si no, deshabilitar o usar `igualdad_estructural` |
| Reglas con el mismo `id` pero distinta `unidad` o `direccion` entre productos | Todas las propiedades de la regla deben coincidir, si no la fila no compara |
| Suponer que "Sin ficha V3" es un error | Es el resultado esperado si falta ficha o variante seleccionada |
| Cambiar `generarRecomendacion` legacy sin pruebas | Es conducta visible; prueba primero y documenta |
