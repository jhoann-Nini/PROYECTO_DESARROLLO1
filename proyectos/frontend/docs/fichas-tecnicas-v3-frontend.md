# Integración frontend de fichas V3

La clasificación de una ficha se realiza en `data/fichaTecnicaProducto.ts` por `version_esquema`. Los documentos V3 pasan el validador V3 y quedan separados de los normalizadores V1/V2/legacy. El modelo conserva el objeto original; una ficha inválida se muestra como error y no se degrada a otro formato.

`FichaTecnicaV3Panel` presenta la ficha versionada en el modal y en la sección de especificaciones del detalle. Organiza atributos por grupo, permite elegir variantes, distingue estados de dato y verificación, y muestra fuentes/evidencias solo cuando el contrato incluye referencias. Los benchmarks incluyen contexto y estado. No hay acciones para verificar o resolver conflictos.

El comparador agrega atributos V3 solo para productos con fichas válidas de la misma categoría. Considera únicamente especificaciones comunes o de la variante seleccionada (la única variante se selecciona automáticamente). Una fila se compara cuando todos los productos tienen dato conocido y normalizado, no hay conflicto pendiente y las reglas V3 coinciden. El orden numérico requiere magnitudes escalares en la unidad declarada; igualdad usa comparación estructural. Tolerancia y dirección se reflejan en la nota. La interfaz no anuncia ganador global para selecciones con V3. El comparador legacy mantiene sus filas y comportamiento anteriores.

Los productos sin ficha conservan el comportamiento actual; esta integración no crea datos V3. La tabla comparativa no convierte listas, texto, desconocidos, datos no publicados o no aplicables en magnitudes.

## Ajustes de cierre de Fase 3.1

El extractor de filas legacy consulta el mismo clasificador versionado que usa el ViewModel. Solo acepta documentos legacy sin versión y fichas V1/V2 válidas. Las versiones desconocidas, fichas inválidas y estructuras V3 mal etiquetadas quedan fuera de la ruta legacy. Los identificadores de filas conservan `tecnica:<clave>` para legacy y usan `tecnica:v3:<clave>` para V3; la clave se codifica para evitar colisiones textuales.

La correspondencia de categorías conocida es `moviles` ↔ `celulares`, `laptops` ↔ `portatiles`, y correspondencia directa para `tablets` y `auriculares`. Si el catálogo declara una categoría distinta, no reconocida o ausente, la ficha V3 se muestra bajo su categoría declarada con una advertencia; no participa en comparaciones V3. No se infiere una categoría para `Smartwatch` o `Accesorios`.

Los benchmarks V3 siempre requieren `variante_id` y evidencia del alcance de esa variante; el contrato actual no modela benchmarks comunes ni benchmarks sin alcance. Con varias variantes, el panel oculta los benchmarks hasta que se elija una. Una vez elegida, filtra por esa variante y contrasta fuente/evidencia antes de atribuirlas. Los conflictos pendientes se anuncian como resultados no confirmados. Los benchmarks V3 no se comparan automáticamente porque el contrato no declara reglas para compararlos.

Las especificaciones muestran las reglas V3 de comparabilidad y, cuando no se compara, el motivo disponible: regla deshabilitada, dato no conocido o no normalizado, revisión pendiente, conflicto pendiente o evidencia incompatible con la variante. La comparación numérica falla cerrada ante unidades o tolerancias inválidas y exige magnitudes en la unidad de la regla. La comparación estructural usa igualdad JSON estructural del contrato. La vista presenta `verificado` como un estado declarado en la ficha y expone fecha, responsable y evento cuando están disponibles; no verifica autorizaciones. Las evidencias de especificaciones se presentan solo cuando fuente y alcance cubren su variante.

Limitaciones: no se compara la categoría de un producto cuyo nombre de categoría no pueda mapearse a las categorías principales; se advierte y se excluye de comparación V3. La vista no puede probar la veracidad de una URL ni la autoridad real de quien figura como responsable. Los benchmarks permanecen informativos hasta que el contrato defina condiciones de comparabilidad específicas.
