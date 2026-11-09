# Roles, perfiles y permisos de TecReview

**Documento:** Especificación funcional y de autorización  
**Versión:** 5.0 (Fase 1)  
**Estado:** Propuesta para validación  
**Alcance:** Definición de perfiles, responsabilidades, permisos y reglas de acceso.  
**Importante:** Este documento no implementa todavía cambios en backend, frontend ni base de datos.

---

## 1. Objetivo

Definir una única fuente de verdad para los perfiles de TecReview y las operaciones que puede realizar cada uno. Esta definición servirá como contrato para las siguientes fases de desarrollo y pruebas.

Los cuatro perfiles funcionales son:

1. Administrador.
2. Moderador.
3. Usuario.
4. Tienda (representante de establecimiento).

**Visitante no es un quinto rol:** es un estado de acceso público para una persona que no ha iniciado sesión. No debe asignarse como rol persistido a una cuenta.

## 2. Glosario y nombres canónicos

| Nombre funcional | Nombre canónico del rol | Identificador recomendado | Descripción |
|---|---|---|---|
| Administrador | Administrador | `ADMINISTRADOR` | Administra y supervisa la plataforma. |
| Moderador | Moderador | `MODERADOR` | Revisa contenido reportado y aplica decisiones de moderación. |
| Usuario | Usuario registrado | `USUARIO_REGISTRADO` | Participa en la comunidad y gestiona su propia cuenta y contenido. |
| Tienda | Representante de establecimiento | `REPRESENTANTE_ESTABLECIMIENTO` | Gestiona únicamente los establecimientos y datos comerciales que tenga asignados. |

Los identificadores son nombres conceptuales recomendados; no implican que ya existan como valores en la base de datos.

### 2.1 Reglas de nomenclatura

- En la interfaz se puede mostrar **Tienda** como nombre sencillo del perfil.
- En el modelo y en la documentación técnica se conservará **Representante de establecimiento** como nombre descriptivo del rol.
- No se deben crear dos roles distintos para “Tienda” y “Representante de establecimiento”.
- “Usuario” en esta matriz significa usuario registrado y autenticado.
- “Visitante” significa persona no autenticada y se controla como acceso público, no como rol asignado.

## 3. Principios de autorización

1. **Denegar por defecto:** toda operación no permitida explícitamente queda prohibida.
2. **Backend como autoridad:** ocultar botones o rutas en el frontend no concede ni protege permisos por sí solo.
3. **Mínimo privilegio:** cada perfil recibe solo los permisos necesarios para su función.
4. **Identidad confiable:** el backend obtiene la identidad del usuario desde el JWT validado; no confía en un `idUsuario`, correo o rol enviado libremente por el cliente.
5. **Propiedad de recursos:** usuario y tienda solo pueden modificar recursos propios o expresamente asignados.
6. **Separación de funciones:** moderar contenido no concede permisos para administrar el catálogo ni los roles.
7. **Trazabilidad:** las decisiones administrativas y de moderación deben poder asociarse al actor, fecha, recurso y resultado.
8. **Validación en cada solicitud:** el backend vuelve a comprobar que la cuenta esté activa y que el permiso siga vigente.
9. **Respuestas seguras:** las operaciones no autorizadas no deben revelar datos privados del recurso.
10. **Sin autoasignación:** ningún usuario puede elevar su propio rol desde el frontend o mediante una petición manipulada.

## 4. Definición de perfiles

### 4.1 Administrador

**Responsabilidad:** administración global y supervisión de TecReview.

Puede:
- Consultar el catálogo y sus datos de referencia.
- Crear, consultar, actualizar y desactivar productos globales.
- Crear, consultar, actualizar y desactivar categorías y marcas.
- Consultar y administrar cuentas de usuario según las operaciones administrativas definidas.
- Activar o suspender cuentas, con motivo y trazabilidad.
- Asignar y retirar los roles de moderador y representante de establecimiento.
- Consultar, supervisar y resolver reportes de contenido.
- Consultar establecimientos y gestionar sus asignaciones de representantes.
- Consultar indicadores globales y registros de auditoría.

No debe:
- Modificar contraseñas directamente ni almacenar credenciales de Supabase.
- Ejecutar acciones sensibles sin dejar registro de auditoría.
- Usar la identidad de otro usuario para operar en su nombre.

### 4.2 Moderador

**Responsabilidad:** mantener la calidad y las normas del contenido generado por la comunidad.

Puede:
- Consultar la cola de reportes pendientes.
- Consultar el contenido reportado y el contexto necesario para evaluarlo.
- Marcar un reporte como en revisión.
- Resolver un reporte como procedente o no procedente.
- Ocultar o restaurar reseñas cuando la política de moderación lo permita.
- Registrar el motivo de la decisión.
- Consultar el historial de reportes y decisiones de moderación.
- Consultar el catálogo y las reseñas públicas.

No puede:
- Crear, editar o eliminar productos globales.
- Administrar categorías o marcas.
- Crear, suspender o cambiar roles de usuarios.
- Asignar representantes a establecimientos.
- Modificar precios o disponibilidad de tiendas.
- Resolver un reporte sobre contenido propio o en el que tenga conflicto de interés; debe abstenerse y escalarlo al administrador.

### 4.3 Usuario registrado

**Responsabilidad:** participar en TecReview y gestionar su propia actividad.

Puede:
- Consultar y buscar productos, categorías, marcas y establecimientos públicos.
- Comparar productos y consultar reseñas y valoraciones.
- Crear reseñas y valoraciones conforme a las reglas de la plataforma.
- Editar o retirar sus propias reseñas, mientras la política y el estado del contenido lo permitan.
- Reportar reseñas de otros usuarios.
- Consultar el estado de los reportes que él mismo presentó.
- Gestionar los datos de su propio perfil y preferencias.
- Gestionar sus propios favoritos, si la funcionalidad está habilitada.

No puede:
- Modificar reseñas de otras personas.
- Resolver reportes ni ocultar contenido de terceros.
- Administrar productos, categorías, marcas o establecimientos.
- Consultar datos privados de otras cuentas.
- Cambiar su propio rol o estado de cuenta.

### 4.4 Tienda (representante de establecimiento)

**Responsabilidad:** mantener actualizada la información comercial de los establecimientos que le hayan sido asignados.

Puede:
- Consultar el catálogo público.
- Consultar la información de los establecimientos que representa.
- Actualizar los campos comerciales autorizados de esos establecimientos.
- Consultar los productos asociados a sus establecimientos.
- Gestionar los precios y la disponibilidad de los productos asociados, si la plataforma habilita esa operación.
- Consultar estadísticas limitadas a sus propios establecimientos.

No puede:
- Consultar o modificar información privada de otros establecimientos.
- Crear ni administrar categorías o marcas globales.
- Crear o editar productos del catálogo global, salvo que una futura decisión funcional lo autorice expresamente.
- Modificar precios, disponibilidad o datos de establecimientos no asignados.
- Administrar usuarios, roles o reportes de moderación.
- Resolver reportes o moderar reseñas.

La asignación de una tienda a una cuenta debe realizarse por un administrador y verificarse en el backend en cada operación de escritura.

## 5. Visitante: acceso público sin rol persistido

Una persona visitante puede:
- Ver la página principal.
- Consultar y buscar productos, categorías y marcas públicas.
- Ver detalles, comparaciones y reseñas públicas.
- Consultar establecimientos y ubicaciones públicas.
- Acceder a registro e inicio de sesión.

No puede:
- Crear, editar o eliminar reseñas.
- Crear reportes.
- Gestionar favoritos vinculados a una cuenta.
- Acceder a información privada o ejecutar operaciones de escritura protegidas.

## 6. Matriz de permisos

**Leyenda:** P = permitido; O = permitido solo sobre recursos propios/asignados; — = no permitido. Las operaciones no enumeradas se deniegan por defecto.

| Operación | Visitante | Usuario | Moderador | Administrador | Tienda |
|---|:---:|:---:|:---:|:---:|:---:|
| Consultar catálogo público | P | P | P | P | P |
| Buscar y comparar productos | P | P | P | P | P |
| Consultar reseñas públicas | P | P | P | P | P |
| Crear reseña | — | P | P | P | — |
| Editar/eliminar reseña propia | — | O | O | P | — |
| Reportar reseña ajena | — | P | P* | P | — |
| Consultar todos los reportes | — | — | P | P | — |
| Consultar reportes propios | — | O | O | P | — |
| Cambiar estado/resolver reportes | — | — | P | P | — |
| Ocultar/restaurar reseña por moderación | — | — | P | P | — |
| Gestionar productos globales | — | — | — | P | — |
| Gestionar categorías | — | — | — | P | — |
| Gestionar marcas | — | — | — | P | — |
| Consultar establecimientos públicos | P | P | P | P | P |
| Consultar establecimiento asignado | — | — | — | P | O |
| Editar datos de establecimiento | — | — | — | P | O |
| Gestionar precio/disponibilidad | — | — | — | P | O |
| Gestionar asignaciones de tiendas | — | — | — | P | — |
| Consultar/gestionar cuentas | — | O (propia) | — | P | O (propia) |
| Asignar o cambiar roles | — | — | — | P | — |
| Consultar auditoría global | — | — | — | P | — |
| Consultar estadísticas globales | — | — | Limitadas | P | — |
| Consultar estadísticas de tienda | — | — | — | P | O |

* Un moderador puede reportar contenido como cualquier participante, pero no puede intervenir en la resolución de un reporte en el que exista conflicto de interés.

### 6.1 Alcance de “propio” y “asignado”

- **Propio:** el recurso pertenece al usuario autenticado, verificado en backend.
- **Asignado:** existe una relación vigente entre la cuenta autenticada y el establecimiento.
- Conocer o adivinar un identificador no constituye autorización.
- Los permisos de lectura y escritura deben comprobarse por separado.

**Decisión de validación:** la matriz de permisos de la sección 6 queda aprobada por el equipo para la Fase 1, sin cambios en las operaciones y permisos descritos.

## 7. Reglas del flujo de moderación

Estados conceptuales del reporte:

| Estado | Significado | Quién puede establecerlo |
|---|---|---|
| PENDIENTE | Reporte recibido y aún no revisado | Sistema |
| EN_REVISION | Un moderador inició la evaluación | Moderador / Administrador |
| PROCEDENTE | Se confirma el incumplimiento | Moderador / Administrador |
| NO_PROCEDENTE | No se confirma el incumplimiento | Moderador / Administrador |
| ESCALADO | Requiere decisión administrativa o existe conflicto | Moderador |
| CERRADO | La decisión quedó registrada y finalizada | Moderador / Administrador |

Reglas:
- Toda resolución debe registrar actor, fecha, motivo, reporte y acción aplicada.
- Un reporte no debe desaparecer al resolverse; debe conservar su historial.
- La cantidad de reportes puede activar una revisión o una medida automática provisional, pero no debe sustituir la decisión trazable de moderación.
- El autor de una reseña debe poder conocer el estado público de su contenido sin acceder a datos privados de quien reportó.
- Los reportes duplicados deben controlarse según una regla de unicidad definida en la fase de implementación.

### 7.1 Transiciones y cierre de reportes

Para la prueba 1 del flujo de moderación se aprueba la **opción A**:

- Cuando el moderador o administrador determina que un reporte es `PROCEDENTE`, registra el motivo y la acción aplicada (por ejemplo, ocultar la reseña).
- Una vez guardada correctamente la resolución y aplicada la acción, el sistema cambia automáticamente el reporte de `PROCEDENTE` a `CERRADO`.
- El cierre automático no elimina la trazabilidad: se conservan el actor que tomó la decisión, la fecha, el motivo, la acción aplicada y la fecha del cierre automático.
- Si no se puede aplicar la acción requerida, el sistema no debe cerrar el reporte como si la operación hubiera sido exitosa; debe conservar un estado que permita corregir o reintentar la operación y registrar el error.

Esta aprobación cubre únicamente la transición `PROCEDENTE` → `CERRADO`. Las transiciones para `NO_PROCEDENTE` y `ESCALADO` se validarán por separado.

Para la prueba 2 del flujo de moderación se aprueba la **opción A**:

- Cuando el moderador o administrador determina que un reporte es `NO_PROCEDENTE`, registra la justificación y la decisión.
- Una vez guardada correctamente la resolución, el sistema cambia automáticamente el reporte de `NO_PROCEDENTE` a `CERRADO`.
- Se conservan el actor que tomó la decisión, la fecha, la justificación y la fecha del cierre automático.
- El cierre no elimina el reporte ni su historial.

Para la prueba 3 del flujo de moderación se aprueba la **opción A**:

- Cuando un reporte se escala por conflicto de interés u otra causa que exige intervención administrativa, el moderador no puede emitir la resolución final.
- El administrador revisa el caso y determina si es `PROCEDENTE` o `NO_PROCEDENTE`, registrando su justificación y la acción correspondiente.
- Una vez guardada correctamente la decisión administrativa, el sistema cierra automáticamente el reporte (`CERRADO`).
- Se conserva la trazabilidad del escalamiento y de la resolución: motivo del escalamiento, actor que escaló, administrador que resolvió, fechas, justificación, acción aplicada y fecha de cierre.
- Si la acción necesaria no se puede aplicar, el sistema no debe marcar el reporte como cerrado; debe conservar el estado y registrar el error para su corrección.
- El administrador que resuelve debe ser distinto del actor con conflicto de interés. La asignación de un administrador sin conflicto debe verificarse antes de permitir la resolución.

Para la prueba 4 del flujo de moderación se aprueba la **opción A**:

- Antes de permitir una acción de moderación, el sistema verifica si el moderador tiene conflicto de interés con el reporte, la reseña o el establecimiento involucrado.
- Si detecta conflicto, bloquea la resolución por parte de ese moderador y escala automáticamente el reporte a un administrador sin conflicto.
- El sistema registra el motivo del conflicto, la regla que activó el bloqueo, el moderador involucrado, el administrador destinatario y las fechas de detección y escalamiento.
- El moderador bloqueado no puede eludir la restricción mediante otra ruta o petición directa al backend; la validación debe realizarse en el servidor.
- El administrador asignado revisa y resuelve el caso conforme al flujo aprobado para reportes `ESCALADO`.
- Si no existe un administrador disponible sin conflicto, el reporte permanece sin resolución, se registra la incidencia y se requiere asignación administrativa; nunca se permite que el moderador en conflicto lo resuelva.

Para la prueba 5 del flujo de moderación se aprueba la **opción A**:

- Si un usuario sin capacidad de moderación intenta cambiar el estado o resolver un reporte, el backend rechaza la petición con respuesta HTTP `403 Forbidden`.
- El estado y el contenido del reporte permanecen sin cambios como resultado de esa petición no autorizada.
- El sistema registra el intento en la auditoría de seguridad con la identidad disponible del solicitante, la operación intentada, el recurso afectado, la fecha y el resultado de acceso denegado.
- El registro no debe almacenar contraseñas, tokens ni secretos. Si la petición no permite identificar de forma fiable al solicitante, se registra como intento no autenticado con los datos técnicos permitidos por la política de privacidad.
- La protección se aplica en backend para todas las rutas y operaciones equivalentes; ocultar botones en frontend no se considera un control de autorización.

Para la prueba 6 del modelo de múltiples roles se aprueba la **opción A**:

- Cuando una cuenta tiene los roles `Usuario registrado` y `Moderador`, la revocación del rol `Moderador` retira únicamente las capacidades asociadas a ese rol.
- La cuenta conserva el rol `Usuario registrado` y sus permisos vigentes, siempre que la cuenta y sus demás condiciones de acceso sigan activas.
- La pérdida de capacidades de moderación debe surtir efecto inmediatamente en las operaciones del backend; no basta con actualizar u ocultar elementos de la interfaz.
- El sistema registra quién revocó el rol, a qué cuenta, cuál rol fue revocado, cuándo ocurrió y el motivo cuando corresponda.
- Después de la revocación, cualquier intento de ejecutar una operación exclusiva de moderación debe rechazarse conforme a la regla de acceso denegado aprobada; las operaciones permitidas al usuario registrado deben seguir disponibles.

## 8. Reglas de relación entre cuentas y establecimientos

La autorización de tienda requiere una relación explícita entre la cuenta y el establecimiento. No basta con recibir `idEstablecimiento` desde el frontend.

Reglas obligatorias:
- La asignación la realiza un administrador.
- Toda modificación verifica en backend que el establecimiento está asignado a la cuenta.
- La revocación de una asignación debe retirar inmediatamente la capacidad de escritura.
- Una cuenta no puede asignarse a sí misma un establecimiento.
- Debe quedar historial de quién asignó o revocó la representación.

**Decisión aprobada para TecReview: opción B.**

- Una cuenta puede representar varios establecimientos.
- Un establecimiento puede tener varios representantes.
- La relación es de muchos a muchos (N:M).
- La asignación y revocación de cada vínculo corresponde al administrador.
- Cada vínculo debe poder activarse/desactivarse y conservar trazabilidad de quién lo creó o revocó y cuándo.
- En cada operación, el backend debe comprobar que la cuenta autenticada tenga una asignación vigente al establecimiento indicado.
- Revocar un vínculo debe retirar la capacidad de escritura sobre ese establecimiento sin afectar los vínculos de otros representantes.

Para la prueba 8 de la relación cuenta-establecimiento se aprueba la **opción A**:

- Si una cuenta representa los establecimientos A y B, y un administrador revoca únicamente el vínculo con el establecimiento A, la cuenta pierde inmediatamente la capacidad de gestionar A.
- El vínculo vigente con el establecimiento B permanece activo y la cuenta conserva las capacidades autorizadas para gestionar B.
- La revocación debe identificar el vínculo específico cuenta-establecimiento; no debe eliminar ni desactivar otras relaciones de esa cuenta.
- El backend debe comprobar la vigencia del vínculo correspondiente en cada operación. Una sesión o selección previa del establecimiento A no puede conservar permisos después de la revocación.
- Se registra el vínculo revocado, el administrador que realizó la acción, la fecha y el motivo cuando corresponda.

Esta decisión define el comportamiento esperado, pero no autoriza todavía crear tablas, migraciones ni modificar entidades; eso pertenece a una fase posterior.

Para la prueba 9 de la relación establecimiento-representantes se aprueba la **opción A**:

- Si un establecimiento tiene dos representantes y el administrador revoca únicamente la representación del Representante 1, ese representante pierde inmediatamente la capacidad de gestionar el establecimiento.
- El vínculo vigente del Representante 2 permanece activo y conserva las capacidades autorizadas para gestionar ese mismo establecimiento.
- La revocación debe identificar el vínculo específico entre la cuenta del representante y el establecimiento; no debe eliminar ni desactivar las relaciones de otros representantes.
- El backend debe comprobar la vigencia del vínculo correspondiente en cada operación. Una sesión previa del Representante 1 no puede conservar permisos después de la revocación.
- Se registra el vínculo revocado, el administrador que realizó la acción, la fecha y el motivo cuando corresponda.

Esta decisión confirma que la revocación es independiente en ambos sentidos de la relación N:M: una cuenta puede perder acceso a una tienda sin perder acceso a otras, y una tienda puede retirar a un representante sin afectar a los demás. No autoriza todavía crear tablas, migraciones ni modificar entidades; eso pertenece a una fase posterior.
Para la prueba 10 de autorización contextual por establecimiento se aprueba la **opción A**:

- Una cuenta con los roles `USUARIO_REGISTRADO` y `REPRESENTANTE_ESTABLECIMIENTO` puede operar sobre la Tienda A únicamente dentro de las capacidades permitidas por ambos roles y por su vínculo vigente con A.
- Si la cuenta intenta modificar un producto de la Tienda B sin tener una asignación vigente a B, el backend rechaza la operación con HTTP `403 Forbidden`.
- El intento denegado se registra en la auditoría de seguridad, identificando la cuenta, la operación, el establecimiento y el resultado, sin almacenar contraseñas, tokens ni secretos.
- La denegación sobre B no revoca ni altera los roles de la cuenta ni su vínculo o permisos vigentes sobre A.
- La autorización se valida en el servidor en cada solicitud y aplica denegación por defecto; tener el rol de representante no concede acceso global a todos los establecimientos.
- Una sesión, identificador de tienda enviado por el cliente o selección previa no sustituye la comprobación del vínculo vigente en el backend.

Esta decisión valida el alcance contextual de los permisos: los roles definen capacidades generales y la relación cuenta-establecimiento limita dónde pueden ejercerse. No autoriza todavía implementar endpoints, tablas o migraciones; eso corresponde a la fase de implementación posterior.
Para la prueba 11 sobre suspensión de un establecimiento se aprueba la **opción A — bloqueo de operaciones**:

- Mientras un establecimiento esté suspendido, ninguno de sus representantes podrá crear, modificar ni eliminar productos, precios o información comercial del establecimiento.
- La suspensión del establecimiento bloquea las operaciones comerciales de ese recurso; no desactiva las cuentas personales de sus representantes ni les retira otros roles.
- Los vínculos vigentes entre el establecimiento y sus representantes se conservan durante la suspensión. No se interpretan como revocados.
- El backend debe comprobar el estado vigente del establecimiento en cada operación comercial protegida y rechazar la solicitud mientras permanezca suspendido, incluso si el representante conserva una sesión activa.
- La suspensión y la reactivación deben ser acciones autorizadas y auditadas, registrando actor, establecimiento, fecha, motivo cuando corresponda y cambio de estado.
- Al reactivar el establecimiento, los vínculos que sigan vigentes vuelven a habilitar el alcance de gestión que corresponda; la reactivación no debe restaurar vínculos o permisos revocados por separado.
- La interfaz puede informar el estado de suspensión, pero la restricción debe imponerse en backend y no depender de ocultar botones.

Esta decisión define el comportamiento esperado y sus criterios de aceptación; no significa que el bloqueo ya esté implementado o probado funcionalmente.
Para la prueba 12 sobre reactivación de un establecimiento se aprueba la **opción A — conservar únicamente los vínculos vigentes**:

- La reactivación devuelve al establecimiento el estado operativo, sujeto a las demás reglas y permisos vigentes.
- Solo los representantes que mantengan un vínculo vigente con el establecimiento recuperan la capacidad de gestión que les corresponda.
- Los vínculos revocados antes o durante la suspensión permanecen revocados. La reactivación no los restaura ni crea nuevas asignaciones.
- La autorización debe comprobar en backend tanto el estado activo del establecimiento como la vigencia del vínculo específico del representante en cada operación.
- La reactivación debe ser ejecutada por un actor autorizado y quedar registrada en auditoría, con actor, establecimiento, fecha y motivo cuando corresponda.
- La reactivación del establecimiento no reactiva cuentas personales desactivadas ni restaura roles o permisos revocados de forma independiente.

Esta decisión establece el comportamiento esperado para la reactivación; no significa que el flujo esté implementado o probado funcionalmente.
Para la prueba 13 sobre cierre definitivo de un establecimiento se aprueba la **opción A — cierre lógico y conservación histórica**:

- El establecimiento cambia a un estado definitivo de cerrado y deja de estar disponible para operaciones comerciales y de gestión.
- El establecimiento y sus productos dejan de mostrarse en las vistas y consultas públicas; los productos asociados quedan inactivos/no publicados, sin borrarse físicamente por este cambio de estado.
- Los representantes pierden la capacidad de gestionar ese establecimiento. Sus cuentas personales, otros roles y vínculos con otros establecimientos no se modifican.
- Se conserva el registro del establecimiento, sus relaciones históricas con representantes, los productos asociados y los registros de actividad necesarios para trazabilidad, auditoría y soporte.
- Los vínculos históricos deben distinguirse de asignaciones vigentes: conservar el historial no concede permisos de gestión ni permite reactivar automáticamente una representación.
- El cierre debe ser realizado por un actor autorizado y quedar auditado, incluyendo actor, establecimiento, fecha, motivo cuando corresponda y estado anterior/nuevo.
- Las operaciones del backend deben rechazar cambios sobre el establecimiento cerrado. Cualquier reapertura excepcional deberá ser una acción explícita y autorizada, auditada y sujeta a la revisión de los vínculos vigentes; no se presume por el cierre lógico.
- La conservación de datos debe respetar las políticas de retención, privacidad y obligaciones legales aplicables; el cierre lógico no autoriza conservar datos indefinidamente sin justificación.

Esta decisión define el comportamiento esperado; no significa que el cierre lógico, la despublicación o las restricciones estén implementados o probados funcionalmente.
Para la prueba 14 sobre reapertura de un establecimiento cerrado se aprueba la **opción A — reapertura controlada**:

- La reapertura debe ser solicitada y ejecutada por un administrador autorizado; no ocurre automáticamente por una solicitud del antiguo representante.
- Antes de reabrir, se debe verificar la identidad y los datos vigentes del establecimiento, su estado y las condiciones administrativas que correspondan.
- La reapertura debe registrarse como una transición explícita de estado, con actor autorizado, fecha, motivo y resultado en la auditoría.
- Los vínculos históricos con representantes se conservan para trazabilidad, pero no se consideran vigentes por el solo hecho de reabrir el establecimiento.
- Solo los representantes con asignaciones vigentes y verificadas podrán recuperar capacidades de gestión. Los vínculos revocados o finalizados deben ser reasignados mediante un proceso autorizado y auditado.
- Los productos conservados históricamente no deben publicarse ni habilitarse automáticamente: su estado, vigencia y contenido deben revisarse antes de volver a mostrarlos o permitir operaciones.
- El backend debe validar el nuevo estado del establecimiento, la vigencia del vínculo y los permisos del actor en cada operación; la interfaz no sustituye esos controles.

Esta decisión define el comportamiento esperado de reapertura; no significa que el flujo esté implementado o probado funcionalmente.
Para la prueba 15 sobre productos tras la reapertura de un establecimiento se aprueba la **opción A — revisión obligatoria**:

- Al cerrar definitivamente el establecimiento, todos sus productos quedan sin publicación, independientemente del estado que tuvieran antes del cierre.
- La reapertura del establecimiento no reactiva ni publica automáticamente los productos que estaban publicados antes del cierre.
- Cada producto debe ser revisado por un representante con vínculo vigente y permisos suficientes. Debe confirmar o actualizar, según corresponda, nombre, descripción, precio, disponibilidad y demás datos comerciales definidos para el catálogo.
- La publicación debe pasar por las validaciones de negocio del sistema; no basta con que el representante cambie manualmente el estado a publicado.
- El backend debe comprobar que el establecimiento está operativo, que el representante mantiene un vínculo vigente y que tiene permiso para gestionar el producto.
- La revisión y el cambio de estado de cada producto deben quedar registrados, incluyendo actor, producto, establecimiento, fecha y resultado.
- Los productos que no hayan sido revisados y validados permanecen sin publicar y no deben aparecer en consultas públicas.

Esta decisión define el comportamiento esperado; no significa que el proceso de revisión y publicación esté implementado o probado funcionalmente.
Para la prueba 16 sobre permisos específicos de representantes se aprueba la **opción A — denegar la operación**:

- La vigencia del vínculo entre una cuenta y un establecimiento no concede por sí sola todos los permisos de gestión.
- El representante que tenga únicamente permisos de consulta no puede modificar precios ni otros datos de productos.
- El backend debe validar en cada solicitud la identidad autenticada, el estado de la cuenta, el estado operativo del establecimiento, la vigencia del vínculo y el permiso específico requerido para la acción.
- Si el representante carece del permiso de modificación, el backend responde HTTP `403 Forbidden` y no modifica el producto ni sus datos comerciales.
- El intento denegado debe registrarse en auditoría con actor, establecimiento, producto, acción solicitada, fecha y resultado, sin guardar tokens, contraseñas ni secretos.
- La interfaz debe reflejar los permisos disponibles, pero ocultar o deshabilitar controles no sustituye la autorización obligatoria en backend.
- Los permisos de otros representantes y los vínculos vigentes no se modifican por el intento denegado.

Esta decisión define el comportamiento esperado; no significa que la autorización específica esté implementada o probada funcionalmente.

### Prueba 17. Revocación de permisos durante una sesión activa

**Decisión aprobada: opción A — revocación inmediata.**

- La revocación de un permiso específico debe surtir efecto en la siguiente solicitud protegida, aunque el representante mantenga abierta su sesión.
- El backend debe consultar los permisos vigentes para la operación solicitada y no confiar en permisos antiguos conservados en el cliente ni en datos de autorización obsoletos o cacheados.
- Si el representante intenta realizar una acción cuyo permiso fue revocado, el backend responde HTTP `403 Forbidden` y no modifica el producto ni sus datos.
- La revocación es granular: el representante puede continuar utilizando las demás funciones para las que conserve permisos vigentes. No implica cerrar toda la sesión ni desactivar la cuenta.
- La revocación y el intento denegado deben quedar registrados en auditoría, con actor, cuenta, establecimiento, producto o recurso, acción, fecha y resultado; nunca se registran contraseñas, tokens ni secretos.

Esta decisión define el comportamiento esperado; no significa que la revocación inmediata esté implementada o probada funcionalmente.

### Prueba 18. Revocación mientras una operación está en curso

**Decisión aprobada: opción A — prioridad a la revocación.**

- Si el administrador confirma la revocación del permiso antes de que la modificación del producto se aplique definitivamente, el backend debe impedir que la operación termine.
- La autorización debe comprobarse de forma consistente en el punto de confirmación de la operación, coordinando la comprobación del permiso y la escritura para evitar que una solicitud con autorización obsoleta se confirme después de la revocación.
- La operación afectada debe cancelarse o rechazarse sin escrituras parciales ni cambios en el producto. El backend debe devolver una respuesta de autorización denegada, como HTTP `403 Forbidden`, cuando corresponda.
- Si la modificación se confirma antes de que la revocación quede efectiva, no se revierte automáticamente: el orden efectivo de ambas operaciones debe ser inequívoco y quedar reflejado en los registros.
- La revocación y la operación cancelada deben quedar registradas en auditoría con actor, cuenta, establecimiento, producto, acción, fecha y resultado, sin almacenar tokens, contraseñas ni secretos.
- La validación debe contemplar solicitudes concurrentes y garantizar que no se aplique una modificación después de que la revocación haya sido confirmada.

Esta decisión define el comportamiento esperado; no significa que el control de concurrencia y la cancelación de operaciones estén implementados o probados funcionalmente.

### Prueba 19. Revocación global en varias sesiones y dispositivos

**Decisión aprobada: opción A — revocación global inmediata.**

- La revocación de un permiso específico debe aplicarse a todas las sesiones activas de la cuenta, independientemente del dispositivo o navegador utilizado.
- Ninguna sesión puede seguir ejecutando la acción protegida con el permiso revocado. El backend debe consultar una fuente vigente y compartida de autorización; no debe confiar en permisos almacenados localmente ni en claims de sesión que hayan quedado obsoletos.
- La siguiente solicitud protegida desde cualquiera de las sesiones debe denegarse con HTTP `403 Forbidden` y no producir cambios cuando el permiso ya esté revocado.
- La revocación es granular: las demás funciones y permisos que continúen vigentes deben seguir disponibles en cada sesión. No es obligatorio cerrar todas las sesiones ni desactivar la cuenta.
- El cambio de permisos y los intentos denegados desde cualquiera de las sesiones deben quedar registrados en auditoría, con actor, cuenta, sesión o dispositivo identificable de forma segura, recurso, acción, fecha y resultado; sin almacenar tokens ni secretos.
- La interfaz puede actualizarse o informar el cambio, pero la seguridad no debe depender de que el dispositivo reciba una notificación: el backend debe hacer cumplir la revocación global.

Esta decisión define el comportamiento esperado; no significa que la propagación global de revocaciones esté implementada o probada funcionalmente.

### Prueba 20. Fallo temporal de la verificación de permisos

**Decisión aprobada: opción A — denegar por seguridad (fail closed).**

- Si el backend no puede consultar o verificar de forma confiable los permisos vigentes, debe denegar temporalmente las operaciones protegidas que dependan de esa autorización.
- El sistema no debe permitir la operación basándose en permisos antiguos, datos cacheados cuya vigencia no pueda garantizarse ni supuestos de autorización.
- La operación protegida debe responder con un error controlado que indique que no fue posible completar la autorización; no debe presentarse como un rechazo por falta de permiso cuando la causa real sea la indisponibilidad del servicio de autorización. La respuesta no debe revelar detalles internos.
- Las funciones públicas o no protegidas que no dependan de la fuente de autorización pueden continuar si sus propias condiciones de seguridad y disponibilidad se cumplen.
- Una vez restablecida la verificación, el backend debe volver a consultar los permisos vigentes antes de permitir nuevas operaciones protegidas. No se deben ejecutar automáticamente operaciones que fueron rechazadas durante la falla.
- Los fallos de verificación y las operaciones bloqueadas deben registrarse para monitoreo y auditoría, sin almacenar contraseñas, tokens ni secretos.

Esta decisión define el comportamiento esperado; no significa que el manejo de fallos de autorización esté implementado o probado funcionalmente.

## 9. Ciclo de vida de los roles

- Toda cuenta nueva obtiene el rol Usuario registrado por defecto.
- Los roles Moderador y Representante de establecimiento solo pueden asignarse por un administrador autorizado.
- El rol Administrador debe asignarse mediante un procedimiento controlado, nunca desde el registro público.
- La asignación y retirada del rol Administrador son operaciones exclusivas de un administrador autorizado; requieren validación en backend y auditoría. El titular no puede asignarse ni elevarse ese rol a sí mismo.
- Los cambios de rol deben quedar auditados.
- Al suspender una cuenta, se bloquean las operaciones protegidas independientemente del rol.

Para la prueba 7 del ciclo de vida de la cuenta se aprueba la **opción A**:

- Cuando una cuenta se desactiva o suspende, se bloquea el acceso a toda la cuenta, no solamente las capacidades de un rol particular.
- Mientras la cuenta permanezca inactiva, no puede iniciar sesión ni ejecutar operaciones mediante ninguno de sus roles, incluido `USUARIO_REGISTRADO`.
- El backend debe comprobar el estado vigente de la cuenta en cada operación protegida y rechazar el acceso aunque el cliente conserve una sesión o datos de roles anteriores.
- La desactivación debe quedar auditada con la cuenta afectada, el actor autorizado que la realizó, la fecha y el motivo cuando corresponda.
- La reactivación requiere una acción autorizada y debe quedar igualmente registrada. Reactivar la cuenta no restaura roles que hayan sido revocados por separado.
- La revocación de rol o asignación debe aplicarse en solicitudes posteriores; no se debe confiar indefinidamente en datos de rol antiguos almacenados en el cliente.
- No se permitirá que una cuenta se otorgue permisos a sí misma.

**Decisión aprobada para TecReview: opción B — múltiples roles por cuenta.**

- Una cuenta puede tener simultáneamente uno o varios roles funcionales.
- Toda cuenta nueva recibe inicialmente el rol `USUARIO_REGISTRADO`; los demás roles se agregan mediante asignación autorizada.
- Una misma cuenta puede, por ejemplo, ser usuario y representante de uno o varios establecimientos, o combinar otros roles cuando exista una necesidad aprobada.
- Los permisos efectivos corresponden a la unión de las capacidades concedidas por los roles vigentes de la cuenta, siempre sujetos a las restricciones de propiedad, asignación, estado de cuenta y conflicto de interés descritas en esta especificación.
- La unión de permisos no elimina restricciones: tener un rol no permite realizar operaciones expresamente prohibidas para el actor en un contexto concreto. Por ejemplo, un moderador debe abstenerse de resolver reportes sobre contenido propio o con conflicto de interés.
- Para cada operación, el backend debe comprobar la capacidad requerida, la identidad autenticada, el estado de la cuenta y la relación con el recurso. No debe depender de un “rol principal”, del orden de los roles ni de roles enviados por el cliente.
- Solo un administrador autorizado puede asignar o revocar roles adicionales. Toda modificación debe quedar auditada y aplicarse en las solicitudes posteriores.
- La asignación de roles no puede permitir autoelevación de privilegios. El rol Administrador seguirá sujeto al procedimiento controlado definido anteriormente.
- Pueden coexistir varias cuentas con el rol Administrador. Cada cuenta conserva su identidad y sus acciones administrativas se auditan individualmente; revocar el rol a una cuenta no modifica los roles de las demás.
- No se puede retirar, degradar ni desactivar la última cuenta con rol Administrador activo. Antes de hacerlo, debe existir otra cuenta Administrador activa, asignada mediante el procedimiento controlado. Esta protección también impide la autoeliminación del último administrador.
- Un administrador puede renunciar voluntariamente a su propio rol si, al confirmar el cambio, existe al menos otra cuenta Administrador activa. La operación retira únicamente el rol Administrador de su cuenta, conserva sus demás roles y queda auditada. La regla de protección del último administrador prevalece siempre. Los permisos efectivos posteriores se recalculan con los roles restantes; por ejemplo, si conserva `USUARIO_REGISTRADO`, mantiene las funciones correspondientes a ese perfil.
- Un administrador autorizado puede suspender temporalmente el rol Administrador de otra cuenta por una causa justificada. La suspensión bloquea las capacidades administrativas, pero no desactiva la cuenta ni afecta los permisos de sus otros roles vigentes. Deben registrarse el actor, la cuenta afectada, el motivo y las fechas de inicio y levantamiento. El levantamiento de la suspensión requiere una acción autorizada y auditada. No se puede suspender al último Administrador activo.

Esta decisión define el comportamiento esperado, pero no autoriza todavía modificar el esquema de usuarios/roles ni implementar la autorización; eso pertenece a fases posteriores.

## 10. Requisitos de seguridad verificables

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| AUTH-01 | El backend valida firma, emisor y vigencia del JWT | Token inválido/expirado recibe 401 |
| AUTH-02 | Toda operación protegida deniega por defecto | Sin permiso recibe 403 |
| AUTH-03 | El rol no se acepta desde el body ni query del cliente | Manipular rol enviado no eleva privilegios |
| AUTH-04 | Usuario solo modifica recursos propios | Intento sobre recurso ajeno es rechazado |
| AUTH-05 | Tienda solo modifica establecimientos asignados | ID de otra tienda es rechazado |
| AUTH-06 | Moderador no administra catálogo ni usuarios | Intentos directos a API son rechazados |
| AUTH-07 | Usuario no resuelve reportes | Intento directo a API es rechazado |
| AUTH-08 | Cuenta suspendida no ejecuta operaciones protegidas | Respuesta de acceso denegado |
| AUTH-09 | Cambios de rol/asignación son trazables | Actor, fecha, recurso y cambio quedan registrados |
| AUTH-10 | La UI refleja permisos pero no los sustituye | Pruebas de API confirman la protección independiente del frontend |
| AUTH-11 | Establecimiento suspendido no permite operaciones comerciales | Representantes vinculados reciben denegación en backend; vínculos y cuentas personales permanecen vigentes |
| AUTH-12 | Reactivación no restaura vínculos revocados | Solo representantes con vínculo vigente recuperan acceso; estado y vínculo se validan en backend |
| AUTH-13 | Establecimiento cerrado no admite gestión ni publicación | Backend rechaza operaciones; establecimiento y productos no aparecen públicamente; se conserva historial auditable |
| AUTH-14 | Reapertura controlada de establecimiento cerrado | Requiere administrador autorizado, auditoría, revisión de productos y vínculos vigentes; no restaura accesos automáticamente |
| AUTH-15 | Productos tras reapertura requieren revisión antes de publicarse | Producto no revisado permanece no publicado; backend valida estado de tienda, vínculo, permisos y registra la revisión |
| AUTH-16 | Representante sin permiso específico no modifica productos | Backend responde 403, no cambia datos y registra el intento de auditoría |
| AUTH-17 | La revocación de un permiso específico surte efecto durante una sesión activa | La siguiente solicitud se valida con permisos vigentes; acción revocada recibe 403 sin cambios; otras funciones autorizadas siguen disponibles y se registra auditoría |
| AUTH-18 | La revocación prevalece sobre operaciones aún no confirmadas | La autorización se valida de forma consistente al confirmar; si la revocación se hizo efectiva antes, se cancela la operación sin cambios parciales y se registra auditoría |
| AUTH-19 | La revocación se aplica a todas las sesiones activas | Cualquier sesión/dispositivo recibe 403 en la siguiente solicitud protegida tras la revocación; no hay cambios y las demás funciones autorizadas continúan disponibles |
| AUTH-20 | La autorización falla de forma segura cuando no puede verificarse | Si la fuente de permisos no está disponible o no es confiable, las operaciones protegidas se bloquean sin usar permisos obsoletos; las funciones independientes pueden continuar |
| AUTH-21 | La recuperación del servicio de autorización exige revalidar permisos actuales | Antes de reanudar operaciones protegidas, el backend consulta nuevamente los permisos vigentes; las operaciones bloqueadas durante la falla no se ejecutan automáticamente |
| AUTH-22 | El rol Administrador solo se asigna o retira por un administrador autorizado | Backend valida la autoridad del actor; impide autoasignación y cambios desde registro público; registra actor, cuenta afectada, cambio y fecha |
| AUTH-23 | Pueden coexistir varias cuentas con rol Administrador | Cada administrador conserva identidad propia y sus acciones se auditan individualmente; revocar uno no afecta los roles ni el acceso administrativo de los demás |
| AUTH-24 | No se puede retirar ni desactivar al último Administrador activo | Backend rechaza la operación si deja la plataforma sin administradores; primero debe existir otro Administrador activo asignado mediante el procedimiento controlado; el intento queda auditado |
| AUTH-25 | Renuncia voluntaria al rol Administrador | Se permite retirar el propio rol solo si existe otro Administrador activo; se conservan los demás roles de la cuenta y se registra la operación; nunca se permite dejar la plataforma sin administradores |
| AUTH-26 | Renuncia de Administrador con otros roles vigentes | Al retirar el rol Administrador, el backend revoca solo las capacidades asociadas a ese rol; conserva los demás roles y sus permisos, sin desactivar la cuenta ni afectar funciones independientes |
| AUTH-27 | Suspensión temporal del rol Administrador | Un administrador autorizado puede suspender temporalmente solo las capacidades administrativas de otra cuenta; se conservan sus demás roles y permisos; se auditan actor, cuenta afectada, motivo y fechas; no se puede suspender al último Administrador activo |
| AUTH-28 | Reactivación autorizada del rol Administrador suspendido | Otro administrador autorizado debe validar y levantar la suspensión mediante una acción explícita; se registra actor, cuenta afectada, fecha y decisión/motivo; se restauran únicamente las capacidades administrativas suspendidas y se conservan los demás roles y permisos; no existe reactivación automática por vencimiento del tiempo |

## 11. Decisiones de alcance de la Fase 1

Incluye:
- Definir nombres canónicos y significado de los perfiles.
- Diferenciar visitante de usuario autenticado.
- Definir permisos y límites de cada perfil.
- Establecer reglas de propiedad y asignación.
- Definir el flujo conceptual de reportes y moderación.
- Establecer criterios verificables para las siguientes fases.

No incluye:
- Crear o modificar roles en la base de datos.
- Crear migraciones SQL.
- Cambiar entidades, controladores, servicios o endpoints.
- Crear paneles o pantallas.
- Cambiar autenticación o configuración de Supabase.
- Implementar autorización nueva.
- Cambiar datos de usuarios existentes.

## 12. Criterios de cierre de la Fase 1

La fase solo puede declararse terminada cuando se cumplan todos estos puntos:

- [x] Se aprueban los cuatro perfiles y sus nombres canónicos: Administrador, Moderador, Usuario registrado y Representante de establecimiento (Tienda).
- [x] Se confirma que Visitante es acceso público y no un rol persistido.
- [x] Se aprueba la matriz de permisos (validación funcional de Fase 1).
- [ ] Se aprueba la política de moderación y sus estados (en validación; aprobados los cierres automáticos de `PROCEDENTE`, `NO_PROCEDENTE`, la resolución administrativa de casos `ESCALADO`, el bloqueo/escalamiento automático por conflicto de interés y el rechazo auditado de intentos no autorizados).
- [x] Se aprueba la cardinalidad cuenta-establecimiento: muchos a muchos (una cuenta puede representar varias tiendas y una tienda puede tener varios representantes), incluida la revocación independiente de cada vínculo.
- [x] Se aprueba la autorización contextual por establecimiento: los roles no conceden acceso a tiendas sin vínculo vigente; los intentos se rechazan y auditan en backend.
- [x] Se aprueba el modelo de múltiples roles por cuenta y la unión de capacidades con validación contextual en backend, incluida la revocación independiente de un rol sin retirar los demás.
- [x] Se aprueba que la desactivación de una cuenta bloquee todos sus roles y accesos hasta una reactivación autorizada.
- [x] Se aprueba que la suspensión de un establecimiento bloquee sus operaciones comerciales en backend, conserve los vínculos con representantes y permita reactivación autorizada y auditada.
- [x] Se aprueba que la reactivación de un establecimiento conserve únicamente los vínculos vigentes y no restaure representantes, roles ni cuentas revocadas o desactivadas por separado.
- [x] Se aprueba el cierre lógico del establecimiento: bloqueo de gestión, retirada de publicación y conservación del historial, sin eliminación física automática de sus registros.
- [x] Se aprueba la reapertura controlada de un establecimiento cerrado, con verificación y auditoría; no se restauran automáticamente representantes, permisos ni publicaciones.
- [x] Se aprueba que los productos de un establecimiento reabierto permanezcan sin publicar hasta que un representante vigente los revise y el sistema valide su publicación.
- [x] Se aprueba que la vigencia del vínculo de representante no conceda permisos generales: las acciones sobre productos requieren el permiso específico y, si falta, se deniegan con HTTP `403` y auditoría.
- [x] Se aprueba que la revocación de un permiso específico sea efectiva en la siguiente solicitud, incluso durante una sesión activa, sin cerrar la sesión ni afectar otras funciones autorizadas.
- [x] Se aprueba que una revocación confirmada antes de la aplicación definitiva de una operación impida su confirmación, con control de concurrencia, sin escrituras parciales y con auditoría.
- [x] Se aprueba que la revocación de un permiso se aplique globalmente a todas las sesiones y dispositivos, sin depender de notificaciones al cliente y sin cerrar las demás funciones autorizadas.
- [x] Se aprueba la política de denegación por seguridad: si no puede verificarse la autorización vigente, se bloquean las operaciones protegidas sin recurrir a permisos obsoletos; las funciones independientes pueden continuar.
- [x] Se aprueba que, tras una falla del servicio de autorización, la recuperación exija consultar nuevamente los permisos vigentes antes de reanudar operaciones protegidas; las solicitudes bloqueadas no se reproducen automáticamente.
- [x] Se aprueba que puedan coexistir varias cuentas Administrador, con identidad y auditoría individual; revocar una no afecta a las demás.
- [x] Se aprueba la protección del último Administrador activo: no se permite retirar su rol ni desactivar esa cuenta hasta que exista otro administrador activo asignado de forma controlada.
- [x] Se aprueba la renuncia voluntaria al rol Administrador cuando existe otro administrador activo; solo se retira ese rol, se conservan los demás y la operación queda auditada.
- [x] Se aprueba que la renuncia al rol Administrador no desactive la cuenta ni retire los permisos de los demás roles vigentes; las capacidades administrativas se revocan de forma independiente.
- [x] Se aprueba la suspensión temporal exclusiva del rol Administrador, conservando los demás roles y permisos; el levantamiento es autorizado y auditado y no puede dejar la plataforma sin administradores.
- [x] Se aprueba que la reactivación del rol Administrador suspendido requiera la intervención explícita de otro administrador autorizado, con validación y auditoría; no se reactiva automáticamente por el vencimiento de un plazo.
- [ ] Se revisa que no existan contradicciones entre este documento y los documentos de API/modelo de datos.
- [ ] Se revisa el documento con el equipo y se registran las decisiones pendientes o aprobadas.

**La Fase 2 no debe comenzar mientras exista algún criterio de cierre sin aprobar.** Las pruebas de autorización automatizadas se implementarán en la fase correspondiente; en esta fase se validan la coherencia, cobertura y aprobación de la especificación, no el comportamiento del backend.

## 13. Relación con el código existente

Esta especificación es el objetivo funcional. No afirma que todas las capacidades estén implementadas actualmente.

Elementos existentes que deberán alinearse en fases posteriores:
- Rol `Administrador`.
- Rol `Usuario registrado`.
- Rol `Representante de establecimiento`.
- Funciones de frontend `esAdministrador`, `esUsuarioRegistrado` y `esRepresentante`.
- Autorización administrativa existente para operaciones de catálogo.
- Reportes y ocultamiento de reseñas existentes.
- Entidades `Establecimiento` y `ProductoEstablecimiento`.

El rol `Moderador`, su matriz de permisos y su flujo completo quedan definidos como objetivo, no como funcionalidad ya disponible.

## 14. Referencias de diseño

- TecReview: autorización en backend, JWT validado y propiedad de recursos.
- PARCI: separación de administración y moderación, políticas de acceso a datos, estados de contenido y trazabilidad de reportes.
- OWASP ASVS / Authorization: mínimo privilegio, denegación por defecto y validación de permisos en cada solicitud.

---

**Historial**
- v1.0: borrador inicial con visitante, usuario, administrador y representante.
- v2.0: especificación de los cuatro perfiles solicitados, matriz de permisos, reglas de propiedad, moderación y criterios de cierre de Fase 1.
- v2.2: aprobación de la transición automática `PROCEDENTE` → `CERRADO` tras registrar y aplicar la decisión.
- v2.3: aprobación de la transición automática `NO_PROCEDENTE` → `CERRADO` tras registrar la justificación.
- v2.4: aprobación de la resolución administrativa de reportes `ESCALADO` y su cierre automático tras registrar y aplicar la decisión.
- v2.5: aprobación del bloqueo y escalamiento automático cuando un moderador tiene conflicto de interés.
- v2.6: aprobación del rechazo HTTP `403` y registro de auditoría ante intentos de moderación no autorizados.
- v2.7: aprobación de la revocación independiente de un rol, conservando los permisos de los demás roles vigentes.
- v2.8: aprobación del bloqueo integral de acceso al desactivar una cuenta, con reactivación autorizada y auditada.
- v2.9: aprobación de la revocación independiente de un vínculo cuenta-establecimiento, sin afectar las demás representaciones vigentes.
- v3.0: aprobación de la revocación independiente de un representante en un establecimiento, sin afectar a los demás representantes.
- v3.1: aprobación de la autorización contextual por establecimiento, con rechazo HTTP `403` y auditoría cuando una cuenta intenta operar sobre una tienda no asignada.
- v3.2: aprobación del bloqueo de operaciones comerciales durante la suspensión de un establecimiento, conservando los vínculos de representantes y exigiendo reactivación autorizada y auditada.
- v3.3: aprobación de la reactivación del establecimiento sin restaurar vínculos de representantes revocados; solo los vínculos vigentes recuperan su alcance de gestión.
- v3.4: aprobación del cierre lógico del establecimiento, con bloqueo de operaciones, retirada de publicación y conservación de relaciones, productos e historial para trazabilidad.
- v3.5: aprobación de la reapertura controlada del establecimiento cerrado, con revisión de vínculos y productos, autorización administrativa y sin restauración automática de accesos ni publicaciones.
- v3.6: aprobación de la revisión obligatoria de productos tras la reapertura; no se restauran publicaciones anteriores y cada producto requiere revisión, validación y auditoría.
- v3.7: aprobación de la denegación HTTP `403` y auditoría cuando un representante sin permiso específico intenta modificar productos; el vínculo vigente no concede permisos generales.
- v3.8: aprobación de la revocación inmediata de permisos durante una sesión activa; el backend valida permisos vigentes en cada solicitud, deniega con HTTP `403` la acción revocada y conserva las demás funciones autorizadas.
- v3.9: aprobación de la prioridad de la revocación sobre operaciones en curso aún no confirmadas; se exige autorización consistente al confirmar, cancelación sin escrituras parciales y auditoría.
- v4.0: aprobación de la revocación global e inmediata en todas las sesiones y dispositivos; el backend hace cumplir los permisos vigentes sin depender de la actualización de la interfaz.
- v4.1: aprobación de la política de denegación por seguridad ante fallos de verificación de permisos; se bloquean operaciones protegidas y no se utilizan autorizaciones obsoletas.
- v4.2: aprobación de la recuperación con validación nueva de permisos; no se restauran permisos anteriores ni se ejecutan automáticamente operaciones bloqueadas durante la falla.
- v4.3: aprobación de los cuatro perfiles funcionales y sus nombres canónicos; Visitante se confirma como acceso público, no como rol persistido.
- v4.4: aprobación de la asignación y retirada controladas del rol Administrador, exclusivas de un administrador autorizado, sin autoasignación y con auditoría.
- v4.5: aprobación de múltiples cuentas con rol Administrador simultáneamente, con identidad y auditoría individual y sin afectar a otros administradores al revocar uno.
- v4.6: aprobación de la protección del último Administrador activo; se impide retirar su rol o desactivar su cuenta mientras no exista otro administrador activo.
- v4.7: aprobación de la renuncia voluntaria al rol Administrador cuando existe otro administrador activo, conservando los demás roles y registrando la operación.
- v4.8: precisión de los efectos de la renuncia administrativa: revocación exclusiva de capacidades de Administrador y conservación de permisos de los demás roles vigentes.
- v4.9: aprobación de la suspensión temporal exclusiva del rol Administrador, con conservación de otros roles, auditoría, levantamiento autorizado y protección del último administrador.
- v5.0: aprobación de la reactivación explícita y autorizada del rol Administrador suspendido por otro administrador, con validación, auditoría y conservación de los demás roles; se descarta la reactivación automática por vencimiento del plazo.
