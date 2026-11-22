# TEC-108 — Panel de moderación de reseñas reportadas

**Estado:** Implementado en frontend contra la API real de moderación del
backend. La pantalla consume los endpoints `/api/moderacion/...`, aplica las
reglas de rol y ya no muestra el aviso de integración pendiente.
**Rama de trabajo:** `adrian` (cambios locales, sin push).

---

## 1. Contrato real consumido

El panel usa las rutas implementadas por el backend para Moderador y
Administrador con cuenta activa:

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/moderacion/resenas/reportadas` | Reseñas con reportes para revisión |
| `GET` | `/api/moderacion/resenas/pendientes` | Reseñas pendientes de moderación |
| `GET` | `/api/moderacion/reportes?estado={estado}` | Cola plana de reportes para un estado (por defecto `PENDIENTE`) |
| `PUT` | `/api/moderacion/resenas/{idResena}/ocultar` | Oculta manualmente la reseña |
| `PUT` | `/api/moderacion/resenas/{idResena}/publicar` | Revierte la ocultación manual |
| `PUT` | `/api/moderacion/resenas/{idResena}/rechazar-reportes` | Rechaza en lote los reportes que ya están en revisión |

El cuerpo de las tres acciones es `AccionModeracionRequest`:

```json
{ "motivo": "Texto opcional de justificación" }
```

`motivo` es opcional para el backend y admite hasta 2000 caracteres. La UI lo
exige para **ocultar** y **publicar**, y lo mantiene opcional al **rechazar
reportes**.

El detalle de los reportes de una reseña viene incluido en cada
`ResenaReportadaResponse` de `/api/moderacion/resenas/reportadas`; no se obtiene
con `/api/moderacion/reportes`, que es una cola plana filtrada por estado.

### Rechazo por lote

El servicio rechaza la acción con `409` si hay algún reporte `PENDIENTE` que
todavía debe iniciar revisión. Solo procesa reportes en `EN_REVISION`, y el
moderador debe ser su responsable asignado (o Administrador activo). La UI
habilita el rechazo si hay al menos un reporte `EN_REVISION` y ninguno
`PENDIENTE`; si el moderador no está asignado, muestra el `403` del backend.

### Ocultación manual y reportes

La reseña expone dos banderas distintas:

- `ocultaPorReportes`: la ocultación derivada de reportes.
- `ocultaPorModeracion`: la ocultación manual aplicada por Moderación.

`publicar` restablece únicamente `ocultaPorModeracion`; no borra ni rechaza los
reportes. Por eso el panel decide entre “Ocultar” y “Publicar” usando
`ocultaPorModeracion`, no `ocultaPorReportes`.

## 2. Alcance implementado en frontend

- `src/types/moderacion.ts`: tipos de reseñas reportadas, reportes y acciones;
  incluye `ocultaPorReportes` y `ocultaPorModeracion`.
- `src/types/producto.ts`: rol `Moderador`, `esModerador()` y `puedeModerar()`
  (Moderador o Administrador).
- `src/services/api.ts`: consultas y acciones de moderación contra las rutas
  reales; validación de la forma de las listas y envío de `motivo` cuando
  corresponde.
- `src/components/moderacion/PanelModeracionModal.tsx`: diálogo con cierre por
  Escape, foco inicial, filtros, carga, error con reintento, vacío, detalle de
  reportes y acciones según rol.
- `src/app/perfil/PerfilCliente.tsx`: botón **Panel de moderación** para
  Moderador/Administrador y montaje del modal.

### Reglas de interfaz

- Solo Moderador y Administrador ven y ejecutan las acciones.
- Ocultar y publicar exigen una justificación no vacía; la validación se
  presenta al intentar la acción si el texto está vacío.
- Rechazar reportes permite enviar un motivo opcional.
- El estado “Oculta por moderación” se muestra a partir de
  `ocultaPorModeracion`.
- Tras una acción exitosa se reemplaza localmente la reseña con la respuesta del
  backend y se excluye de la vista si deja de coincidir con el filtro activo.
  Los errores del backend se muestran sin inventar un resultado.
- El panel distingue el vacío sin filtros del vacío por filtros y advierte que
  los reportes de precios y enlaces no forman parte de esta API.
- Al abrir el diálogo el foco entra en él; Tab permanece dentro del panel y
  al cerrarlo vuelve al activador.

### Filtros

La UI expone los filtros `estado` y `oculta=true`. El cliente API y el backend
también admiten `idProducto`, pero el panel no presenta ese filtro. No hay
paginación en el contrato actual.

## 3. Pruebas

- `src/components/moderacion/PanelModeracionModal.test.tsx`: 15 pruebas de
  carga, error y reintento, vacío, filtros, detalle, permisos por rol,
  justificación obligatoria, acciones y fallos.
- `src/services/api.test.ts`: rutas, query string, cuerpo de las acciones y
  validación de respuesta del cliente real.
- `src/types/producto.test.ts`: normalización y permisos multirrol.
- `src/app/perfil/PerfilCliente.test.tsx`: visibilidad del punto de entrada y
  apertura del modal.

Las pruebas del frontend usan mocks del cliente HTTP; la verificación de la
persistencia y de las reglas de autorización corresponde a las pruebas de
integración del backend.

## 3.1 Revisión automática (Fase 1, migración 020)

El panel tiene dos pestañas:

- **Reseñas reportadas:** la cola descrita arriba, sin cambios.
- **Revisión automática:** `ColaRevisionAutomatica.tsx` lista las reseñas que el
  filtro automático retuvo (`GET /api/moderacion/resenas/en-revision`), muestra
  el motivo de la retención y permite **Aprobar y publicar** (justificación
  opcional) o **Rechazar** (justificación obligatoria) mediante
  `PUT /api/moderacion/resenas/{id}/revision/{aprobar|rechazar}`.

Del lado del autor, `crearResena` y `editarResena` devuelven `estadoModeracion`.
Si es `PENDIENTE`, la interfaz no muestra la reseña como publicada y avisa:
«Recibimos tu opinión. Quedó en revisión y se publicará cuando un moderador la
apruebe». Los helpers `esResenaPublica`, `agregarResenaCreada` y
`aplicarResenaEditada` de `src/data/resenas.ts` centralizan esa regla.

La lista de palabras bloqueadas de `src/data/resenas.ts` debe coincidir con la
de `ResenaModerationService` en el backend. En la Fase 1 se retiraron `spam`,
`estafa` y `fraude` (críticas legítimas de compra) y ambos lados revisan el
texto tal cual y con sustituciones leet.

### 3.2 Niveles de riesgo (Caso 6)

El filtro es por reglas, sin IA. Clasifica cada comentario en cuatro niveles
(`analizarComentario` en el frontend, `ResenaModerationService.analizar` en el
backend):

| Nivel | Qué detecta | Formulario | Backend |
|---|---|---|---|
| ninguno | — | publica | `PUBLICADA` |
| bajo | palabras ambiguas sobre el producto («odio que la batería…», «este cargador es una basura») | aviso suave: «Puedes publicar, pero revisa el tono» | `PUBLICADA` |
| medio | insultos y vulgaridades, palabras ambiguas dirigidas a una persona («eres una basura»), enlaces y texto repetido | pide corregir | `PENDIENTE` |
| alto | amenazas o acoso («te voy a matar», «sé dónde vives») | pide corregir | `PENDIENTE`, primero en la cola con «Prioridad alta» |

Normalización compartida: mayúsculas, tildes, NFKC (caracteres de ancho
completo), homoglifos cirílicos y griegos, leet (`@ 4 $ 5 ! ¡ | 1 0 3 € 7 8 9`),
separadores entre letras y letras repetidas («idiooooota»). Las letras
repetidas se colapsan en el texto antes de comparar: un patrón con repeticiones
anidadas desbordaba la pila del motor de expresiones regulares con textos
largos.

**Fuente de verdad:** `proyectos/fixtures/moderacion/corpus-moderacion.json`.
Lo comprueban `resenas.corpus.test.ts` (frontend) y
`ResenaModerationServiceCorpusTest` (backend): si una regla cambia en un lado y
no en el otro, falla una de las dos suites. El archivo también lista las
limitaciones conocidas (palabras pegadas, insultos fuera de la lista, otros
idiomas, discriminación).

Cada decisión de moderación guarda el texto revisado
(`resena_moderacion_auditoria.comentario_revisado`, migración 024): lo copia el
trigger de inserción, aunque el autor edite la reseña después.

Pruebas: `ColaRevisionAutomatica.test.tsx`, la prueba de pestañas en
`PanelModeracionModal.test.tsx` y el bloque «Reportes y revisión» de
`OpinionesProducto.test.tsx`.

## 4. Pendientes y límites conocidos

1. El backend expone `GET /api/moderacion/resenas/{id}/historial`, pero el
   panel todavía no lo muestra.
2. No existe un listado paginado de reseñas reportadas; la UI trabaja con la
   respuesta completa del endpoint.
3. La regla de conflicto de interés (por ejemplo, moderar una reseña propia)
   debe seguir validándose en backend; el frontend no la simula.
4. No se incluyó una prueba E2E con backend real; la integración se cubre con
   pruebas de backend y del cliente API.
5. `publicar` no limpia los reportes: si la reseña sigue oculta por reportes,
   la UI debe seguir reflejando esa condición.
6. Después de una acción, el elemento se actualiza localmente y no se vuelve a
   filtrar contra los filtros activos. Si la mutación hace que deje de
   coincidir, puede permanecer visible en esa sesión hasta cambiar el filtro o
   volver a abrir el panel.

TEC-148 (reporte de precio/enlace) no depende de este panel y sigue bloqueada
por la ausencia del contrato de TEC-147; ver `docs/reportes-precio-enlace.md`.
