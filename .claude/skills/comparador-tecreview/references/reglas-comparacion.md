# Reglas de comparación de filas V3

Fuente de verdad: `construirFilasV3` y `evidenciaCompatibleConEspecificacion` en
`proyectos/frontend/src/data/comparador.ts`. Si difieren de este archivo, manda el código.

## Precondiciones de la tabla V3

1. Al menos 2 productos.
2. Todos con ficha V3 válida y la **misma** categoría V3.
3. Por producto, se consideran las especificaciones con `variante_id = null` o igual a la
   variante seleccionada (una única variante se selecciona automáticamente).

## Valor mostrado en la celda

| Situación | Texto |
|---|---|
| No hay especificación para ese producto/variante | "Sin ficha V3 / sin variante seleccionada" |
| `estado_dato` = `no_aplica` / `no_publicado` / `desconocido` | "No aplica" / "No publicado" / "Desconocido" |
| Normalizada | `formatearValorFichaV3(valor)` |
| No normalizada con `valor_original` | texto original + unidad |

## Una fila es comparable solo si se cumplen todas

- Todos los productos tienen la especificación, `conocido`, `normalizada`.
- Sin `conflicto_pendiente` ni `requiere_revision`.
- Evidencias compatibles: cada evidencia existe, su fuente es común o de la misma variante,
  y su alcance cubre la variante (`esAlcanceCompatibleConVariante`).
- La regla está habilitada y es **idéntica** en todos (`id`, `modo`, `unidad`, `direccion`,
  `objetivo`, `tolerancia`).
- `orden_numerico`: tolerancia nula o en la misma unidad, finita y ≥ 0; cada valor es
  `magnitud` en la unidad de la regla.
- `igualdad_estructural`: igualdad JSON estructural (`valoresEstructuralmenteIgualesV3`).

Si falla alguna condición, la fila se muestra con `difiere = false` y una nota
`comparabilidad` que empieza por "No comparable: …".

## Nota de una fila numérica comparable

`Regla <direccion> · <unidad>[ · tolerancia <v> <u>]. Sin ganador global.`

## Para diseñar insignias por criterio (Fase 4)

- Una insignia solo puede salir de una fila comparable con `orden_numerico` y dirección
  `mayor_es_mejor`, `menor_es_mejor` u `objetivo`.
- Dentro de la tolerancia, los productos empatan (sin insignia exclusiva).
- Las filas legacy no tienen reglas declaradas: cualquier insignia sobre ellas sería una
  decisión nueva del equipo y debe aprobarse antes.
