---
name: ficha-tecnica-auditor
description: Usar cuando en TecReview se pida crear, completar, auditar o corregir una ficha técnica de producto (celular, tablet, portátil o auriculares), revisar un JSON de fixtures/fichas-v3-piloto, buscar especificaciones de un modelo o variante, o decidir si una ficha puede incorporarse al catálogo.
---

# Auditor de fichas técnicas V3 — TecReview

## Principio

Una ficha de TecReview es un **documento de evidencia**, no un resumen de
marketing. Cada valor `conocido` debe poder rastrearse hasta una fuente con
fecha de consulta y alcance de variante. Lo que no se pudo confirmar se
declara como no confirmado; nunca se rellena.

Esta skill **produce JSON e informes**. No escribe en Supabase, no llama a
`PUT/PATCH /api/productos/{id}/ficha-tecnica` y no crea commits.

## Cuándo usarla / cuándo no

| Usar | No usar (derivar) |
|---|---|
| Ficha nueva o ampliada de un modelo | Problema visual de `FichaTecnicaV3Panel` → frontend normal |
| Auditoría de un piloto en `proyectos/fixtures/fichas-v3-piloto/` | Imágenes y licencias → `docs/catalogo/procedencia-licencias-imagenes-piloto.md` |
| Duda sobre variantes, mercado o SKU de un producto | Fichas V1/V2/legacy: solo explicar; **no se convierten** a V3 |
| Antes de cargar una ficha desde el panel de administración | Filas del comparador → `comparador-tecreview` |

## Hechos del proyecto que no se deben suponer de otra forma

- Las fichas viven en `producto.caracteristicas` (JSONB). Coexisten **legacy, V1, V2 y V3**.
  El enrutado es explícito por `version_esquema` y **nunca convierte**:
  backend `FichaTecnicaV3Dispatcher.java`, frontend `clasificarFichaTecnicaProducto`
  (`frontend/src/data/fichaTecnicaProducto.ts`).
- Contrato V3 = dos implementaciones gemelas que deben coincidir:
  `proyectos/frontend/src/types/fichaTecnicaV3.ts` y
  `proyectos/backend/src/main/java/com/example/backend/service/DatosFichaTecnicaV3Validator.java`.
  Vectores compartidos: `proyectos/fixtures/ficha-tecnica-v3/conformance-cases.json`.
- Categorías V3: `celulares`, `tablets`, `portatiles`, `auriculares`.
  El catálogo/V2 usa `moviles` y `laptops` (equivalencias: moviles↔celulares, laptops↔portatiles).
  No se infiere categoría para Smartwatch ni Accesorios.
- El contrato **no define un conjunto obligatorio de atributos por categoría**
  (`pendientes.json` lo deja a una plantilla operativa inexistente). No inventes uno:
  si hace falta, propónlo como decisión del equipo.
- En los 8 pilotos ningún atributo está en `verificado`; todos en `con_fuente`.
- Identidad canónica: `proyectos/frontend/src/data/catalogoCanonico.ts` y
  `docs/arquitectura/catalogo-canonico-piloto.md`. Las variantes comerciales se mantienen
  separadas y no se fusionan modelos por similitud de nombre.

Detalle del contrato: [references/contrato-v3-resumen.md](references/contrato-v3-resumen.md).

## Procedimiento

1. **Identidad.** Nombre comercial exacto, ID canónico (si existe en `catalogoCanonico.ts`),
   categoría V3. Si el modelo pertenece a una familia (Plus, Pro, Special Edition, 5G/4G),
   confirma cuál es; si el usuario no lo dice, pregunta.
2. **Variantes.** Una entrada en `variantes` por combinación comercial real
   (RAM/almacenamiento/color/mercado). `sku` y `mercado` en `null` si no se confirmaron.
   Reglas: [references/politica-fuentes-variantes.md](references/politica-fuentes-variantes.md).
3. **Fuentes.** Prioridad: `fabricante` > `organismo` > `analisis`/`benchmark` > `comercio` > `otro`.
   Cada fuente registra `url`, `localizador`, `consultada_en` (AAAA-MM-DD real de la consulta),
   `mercado` y `variante_id` cuando la página es de un mercado/variante concretos.
4. **Atributo por atributo.**
   - `valor_original.texto` = texto literal de la fuente; `unidad` tal como aparece.
   - `normalizacion`: `normalizada` solo con unidades de `UNIDADES_CANONICAS_V3`;
     `no_segura` (con `motivo`) si hay ambigüedad (GB decimal vs GiB, "hasta", valores
     típicos vs nominales); `no_procesada` si no se intentó.
   - `estado_dato`: `conocido` solo con evidencia; si la fuente oficial no lo publica,
     `no_publicado`; si no se encontró, `desconocido`; si no tiene sentido para el
     producto, `no_aplica`. Los tres últimos llevan `justificacion_estado`.
   - `evidencia_ids` con alcance compatible: si `variante_id` es `null`, la evidencia debe
     ser `todas_las_variantes` y cubrir **todas** las variantes declaradas.
   - `verificacion.estado`: `con_fuente` o `pendiente`. **Nunca `verificado`**: exige
     responsable autorizado y `evento_auditoria_id`, que esta skill no tiene.
   - Contradicción entre fuentes → `revision_conflicto.estado = "conflicto_pendiente"`
     y una evidencia con `postura: "contradice"`. No elijas un ganador en silencio.
5. **Regla de comparación.** `{ "habilitada": false }` por defecto. Habilitar solo si el
   valor normalizado es `magnitud` escalar en la misma unidad que la regla
   (`orden_numerico`) o si la igualdad estructural tiene sentido (`igualdad_estructural`).
   Consulta `comparador-tecreview` antes de habilitar.
6. **Validación.** Ejecuta los validadores (sección Validaciones). Un error se corrige en
   la ficha, nunca en el validador.
7. **Entrega.** JSON + informe con la plantilla
   [references/plantilla-informe.md](references/plantilla-informe.md) + casos de prueba
   propuestos. Antes de incorporar, recorre
   [references/checklist-incorporacion.md](references/checklist-incorporacion.md).

## Validaciones

Desde `proyectos/frontend`:

```bash
npx vitest run src/data/fichaTecnicaV3.test.ts src/data/fichasTecnicasV3Piloto.test.ts src/data/fichaTecnica.contract.test.ts
```

Desde `proyectos/backend`:

```bash
./mvnw test -Dtest='DatosFichaTecnicaV3ValidatorTest,FichaTecnicaV3ConformanceTest'
```

Para validar un JSON suelto sin tocar el repositorio, cópialo al scratchpad y pásalo a
`validarDatosFichaTecnicaV3` con un test temporal fuera de `src/`, o pide permiso para
añadirlo como fixture.

## Criterios de aceptación

- Pasa ambos validadores (TS y Java) con cero errores.
- Toda especificación `conocido` tiene ≥1 evidencia `respalda` de alcance compatible.
- Toda fuente tiene `consultada_en`; ninguna variante mezcla mercados.
- Ningún atributo en `verificado`.
- El informe separa confirmados, desconocidos/no publicados, conflictos y pendientes.
- Se proponen pruebas (caso en `conformance-cases.json` o test de piloto) antes de incorporar.

## Errores frecuentes

| Error | Corrección |
|---|---|
| Copiar la ficha de la variante de EE. UU. a la de Colombia | Variante y fuente por mercado; si no existe fuente local, `mercado: null` y anotarlo |
| "128 GB" normalizado a GiB | Almacenamiento comercial es decimal: `GB`. Ante duda, `no_segura` |
| Batería "5000 mAh (típica)" vs "4900 mAh (nominal)" | Dos fuentes → conflicto pendiente o especificar cuál se registra en `nombre` |
| Rellenar un dato que solo aparece en una tienda sin fecha | Fuente `comercio` con fecha; si no hay fecha, no usarla |
| Atributo común con evidencia de una sola variante | `variante_id` de esa variante, o buscar evidencia de todas |
| Convertir una ficha V2 existente "para modernizarla" | Prohibido: el contrato no convierte; se crea una V3 nueva desde fuentes |

## Seguridad

Sin escrituras en Supabase, sin migraciones, sin instalar dependencias, sin commits ni push.
No incluir imágenes candidatas en la ficha: su licencia está pendiente (`imagenes.json`).
