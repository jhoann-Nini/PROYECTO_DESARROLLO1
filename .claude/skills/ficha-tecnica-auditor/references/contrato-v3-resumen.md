# Contrato de ficha técnica V3 — resumen operativo

Fuente de verdad: `proyectos/frontend/src/types/fichaTecnicaV3.ts` y
`DatosFichaTecnicaV3Validator.java`. Si este resumen y el código difieren, **manda el código**
y este archivo debe actualizarse.

## Raíz

```json
{
  "version_esquema": 3,
  "categoria": "celulares | tablets | portatiles | auriculares",
  "variantes": [], "especificaciones": [], "fuentes": [], "evidencias": [], "benchmarks": []
}
```

Los cinco arreglos son obligatorios (pueden estar vacíos salvo lo que exijan las referencias).
Todos los `id` son texto, únicos dentro de su arreglo. No hay coerción de números a texto.

## Variante

`{ id, modelo, sku, mercado, identificadores }` — `modelo/sku/mercado` texto o `null` (la clave
debe existir); `identificadores` es un mapa de textos no vacíos (p. ej. `{"color":"Black"}`,
`{"ram":"12 GB","almacenamiento":"256 GB"}`).

## Fuente

`{ id, tipo, nombre, url, localizador, consultada_en, variante_id, mercado }`
`tipo ∈ fabricante | organismo | comercio | analisis | benchmark | otro`.

## Evidencia

`{ id, fuente_id, alcance, localizador, extracto, postura, registrada_en, registrada_por }`
- `alcance`: `{ "tipo": "variante", "variante_id": "…" }` o
  `{ "tipo": "todas_las_variantes", "variante_ids": [ … ] }`.
- `postura ∈ respalda | contradice | contexto`.

## Especificación

| Campo | Valores |
|---|---|
| `clave` | Espacio de nombres con punto: `display.diagonal`, `audio.driver`, `battery.capacity`… Reutiliza las claves que ya usan los pilotos |
| `grupo` | Prefijo de la clave (`display`, `audio`…) |
| `variante_id` | `null` = común a todas |
| `estado_dato` | `conocido`, `desconocido`, `no_publicado`, `no_aplica` |
| `justificacion_estado` | Obligatoria si no es `conocido` |
| `valor_original` | `{ texto, unidad }` literal de la fuente |
| `normalizacion.estado` | `normalizada` (con `valor`), `no_segura` (con `motivo`), `no_procesada` |
| `verificacion.estado` | `pendiente`, `con_fuente`, `verificado`, `requiere_revision` |
| `revision_conflicto.estado` | `sin_conflicto`, `conflicto_pendiente`, `conflicto_resuelto` |
| `comparacion` | `{habilitada:false}` o regla `orden_numerico` / `igualdad_estructural` |

## Tipos de valor normalizado

`texto`, `numero`, `booleano`, `magnitud {valor, unidad}`, `lista {semantica: secuencia|conjunto,
tipo_elemento, elementos}`, `dimensiones {ejes[≥2] en mm|cm|in, misma unidad}`,
`resolucion {ancho, alto, unidad:"px"}`, `rango {minimo, maximo}` (misma unidad, min ≤ max),
`compuesto {componentes}` (máximo 3 niveles).

Reglas finas: un `conjunto` no admite duplicados (igualdad estructural); las magnitudes de una
lista comparten unidad; los textos no pueden estar vacíos; los números deben ser finitos.

## Unidades canónicas

`B kB MB GB TB KiB MiB GiB TiB · mm cm in px · Hz kHz MHz GHz · bit/s kbit/s Mbit/s ·
mAh Ah mWh Wh kWh · mg g kg · mW W · ms s min h · mpx puntos % nits dB`

Para interpretar texto libre existe `proyectos/frontend/src/data/unidades.ts`
(`normalizarUnidad`, `esUnidadAmbigua`, `convertirUnidad`, `parsearDatoConUnidad`).

## Benchmarks

Siempre con `variante_id` y evidencia de esa variante. El contrato no modela benchmarks
comunes y el comparador no los compara automáticamente.

## Marcadores de versión

Un documento es V3 si tiene `evidencias` en la raíz, o `especificaciones` junto a una
categoría V3 o al sobre completo (`variantes`+`fuentes`+`benchmarks`). Un documento con
marcadores V3 etiquetado como V1/V2 o sin versión se **rechaza** (400 en el backend).
