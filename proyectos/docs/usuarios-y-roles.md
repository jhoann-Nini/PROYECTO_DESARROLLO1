# Roles, perfiles y permisos de TecReview

**Documento:** Especificación funcional y de autorización  
**Versión:** 2.3 (Fase 1)  
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

Esta decisión define el comportamiento esperado, pero no autoriza todavía crear tablas, migraciones ni modificar entidades; eso pertenece a una fase posterior.

## 9. Ciclo de vida de los roles

- Toda cuenta nueva obtiene el rol Usuario registrado por defecto.
- Los roles Moderador y Representante de establecimiento solo pueden asignarse por un administrador autorizado.
- El rol Administrador debe asignarse mediante un procedimiento controlado, nunca desde el registro público.
- Los cambios de rol deben quedar auditados.
- Al suspender una cuenta, se bloquean las operaciones protegidas independientemente del rol.
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

- [ ] Se aprueban los cuatro perfiles y sus nombres canónicos.
- [ ] Se confirma que Visitante es acceso público y no un rol persistido.
- [x] Se aprueba la matriz de permisos (validación funcional de Fase 1).
- [ ] Se aprueba la política de moderación y sus estados (en validación; aprobados los cierres automáticos de `PROCEDENTE` y `NO_PROCEDENTE`).
- [x] Se aprueba la cardinalidad cuenta-establecimiento: muchos a muchos (una cuenta puede representar varias tiendas y una tienda puede tener varios representantes).
- [x] Se aprueba el modelo de múltiples roles por cuenta y la unión de capacidades con validación contextual en backend.
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
