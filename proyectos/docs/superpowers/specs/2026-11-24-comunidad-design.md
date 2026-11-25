# Comunidad tipo foro: especificación definitiva

**Fecha:** 24 de noviembre de 2026. **Estado:** aprobada; implementación autorizada por fases.

Copia en el repositorio del documento compartido
https://claude.ai/artifact/AJLDyXfu5Gw4wEB4jZSxYS, para que las revisiones
independientes la lean sin acceso a ese documento. La auditoría previa está en
https://claude.ai/artifact/NVPGfPiS1vWTVW8p6Y8E7C. Si difieren, manda esta
especificación.

La comunidad (foro general y comunidades por producto) se implementa en 6
fases con 5 migraciones, sobre tablas propias separadas de reseñas y
valoraciones.

## 1. Decisiones cerradas

| Decisión | Valor | Efecto en el diseño |
|---|---|---|
| P1. Profundidad | 3 niveles: respuesta directa y dos más | `profundidad` de 0 a 2. Responder en el nivel 2 crea una hermana en el nivel 2 con «En respuesta a @usuario» |
| P2. Reincidencia | Historial único para reseñas y foro | Las faltas de `resena_moderacion_auditoria` y `moderacion_comunidad_auditoria` suman, sin las apelaciones aceptadas. Un bloqueo aplica en los dos espacios |
| P3. Cuotas | 5 publicaciones y 20 respuestas por hora | En base de datos, con bloqueo de la fila del usuario. Exceder devuelve 429 |
| P4. Notificaciones | Fase 5, solo dentro de la aplicación | La migración 032 no entra en las fases 0 a 4 |
| P5. RLS en las migraciones | Migración propia 028, antes de las de la comunidad | Producción ya tiene RLS sin políticas en sus 23 tablas, pero las migraciones solo lo activan en 3. La 028 lo activa en todas (sin efecto en producción), para que una base creada desde el repositorio quede igual. Cambio aprobado el 24 de noviembre de 2026 |

## 2. Correcciones respecto de la auditoría

1. La profundidad va de 0 a 2, no de 0 a 3.
2. Las migraciones son de la 028 a la 032.
3. La reincidencia es un historial único; las apelaciones aceptadas de ambos espacios anulan su falta.
4. El bloqueo impide publicar, responder, editar y reportar, pero no dar o retirar «Me gusta».
5. El contenido es solo texto plano con saltos de línea; los enlaces no son clicables.
6. La fecha de última actividad la actualiza el backend en la misma transacción cuando una respuesta queda visible.

## 3. Alcance

**Dentro:**

- foro general y comunidades por producto;
- publicaciones, respuestas en 3 niveles, «Me gusta» y su retiro;
- edición y eliminación lógica del contenido propio;
- reportes, moderación auditada, ocultamiento por umbral, apelaciones y reincidencia unificada;
- paginación por cursor;
- notificaciones dentro de la aplicación (fase 5).

**Fuera:**

- correo o push;
- imágenes, adjuntos y formato enriquecido;
- menciones que notifican;
- búsqueda, etiquetas, votos negativos y mensajes privados;
- cualquier efecto en calificaciones, ranking o reseñas.

## 4. Reglas de negocio

| ID | Regla | Dónde se hace cumplir |
|---|---|---|
| RN-01 | Publicación GENERAL sin producto o PRODUCTO con producto activo | `CHECK` y servicio |
| RN-02 | Producto desactivado: sus publicaciones siguen visibles, sin publicaciones ni respuestas nuevas | Servicio |
| RN-03 | Título de 5 a 150 caracteres; publicación de 1 a 5000; respuesta de 1 a 3000; texto plano | `CHECK` y DTO |
| RN-04 | Una respuesta pertenece a la publicación de su madre | FK compuesta |
| RN-05 | Profundidad máxima 2; responder en el nivel 2 crea una hermana que cita al autor | Trigger, `CHECK` y servicio |
| RN-06 | La madre, la publicación y el autor de una respuesta no cambian | Trigger |
| RN-07 | No se responde en publicaciones cerradas o eliminadas | Trigger y servicio |
| RN-08 | Un «Me gusta» por usuario y contenido; dar y retirar son idempotentes | PK y `ON CONFLICT DO NOTHING` |
| RN-09 | El autor edita mientras no esté oculto por moderación; editar vuelve a pasar por el filtro | Servicio |
| RN-10 | Eliminar es lógico; el hilo conserva el lugar y las hijas | Servicio y frontend |
| RN-11 | El moderador elimina u oculta con motivo y queda auditado | Trigger y servicio |
| RN-12 | El riesgo MEDIO o ALTO queda PENDIENTE, visible solo para el autor y los moderadores | Servicio |
| RN-13 | Con 3 reportes activos el contenido se oculta solo | Trigger |
| RN-14 | Cuotas de 5 publicaciones y 20 respuestas en 60 minutos, contando las eliminadas | Servicio con bloqueo pesimista |
| RN-15 | Una cuenta suspendida no escribe ni reacciona; el bloqueo impide publicar, responder, editar y reportar | Servicio |
| RN-16 | Nadie modera ni reporta su propio contenido | Trigger y servicio |
| RN-17 | El foro no modifica `resena`, `valoracion`, calificaciones ni ranking | Diseño y prueba de regresión |

## 5. Migraciones

| Migración | Contenido | Requisito previo |
|---|---|---|
| `028_rls_tablas_publicas` | RLS sin políticas en las 23 tablas existentes de `public` (idempotente; sin efecto en producción) | 027 |
| `029_comunidad` | Publicaciones, respuestas (FK compuesta, profundidad 0 a 2, triggers) y las dos tablas de reacciones | 028 |
| `030_moderacion_comunidad` | Auditoría del foro, reportes y su historial, ocultamiento por 3 reportes | 029 |
| `031_apelaciones_comunidad` | Apelaciones del foro, como la 026 | 030 |
| `032_notificaciones` | Notificaciones y preferencias | 031 |

Reglas comunes a todas las migraciones:

- dos copias idénticas comprobadas con `cmp`;
- `BEGIN … COMMIT`, con preflight y fila en `schema_version`;
- funciones con `SET search_path = pg_catalog`;
- tablas nuevas con RLS sin políticas y `REVOKE ALL` a `anon`, `authenticated` y `PUBLIC`;
- un script `docs/sql/tests/0NN_verificacion_*.sql`, aplicable dos veces sin error.

**Claude no aplica migraciones:** una persona las aplica en Supabase después de aprobarlas y antes de fusionar el PR que las usa.

Las columnas detalladas están en la sección E2 de la auditoría, con las correcciones de la sección 2.

## 6. API, frontend y moderación

Los endpoints, las páginas y la moderación son los de las secciones 6, 7 y 8
del documento compartido. Puntos clave:

- **Lecturas:** públicas con `GET /api/comunidad/**`.
- **Escrituras:** autenticadas, con 401, 403 (suspensión o bloqueo, con la fecha de fin), 409 y 429.
- **Paginación:** por cursor, con `limite` de 1 a 50.
- **Respuestas:** un nivel por petición.
- **Motor de moderación:** el foro usa `AnalizadorContenido` (fase 0), el mismo que las reseñas.

## 7. Criterios de aceptación

| ID | Criterio | Evidencia | Fase |
|---|---|---|---|
| CA-01 | El corpus compartido clasifica igual antes y después de extraer `AnalizadorContenido` | `ResenaModerationServiceCorpusTest` y `resenas.corpus.test.ts` sin cambios en sus casos | 0 |
| CA-02 | La base de datos rechaza GENERAL con producto y PRODUCTO sin producto | Script SQL de la 029 | 1 |
| CA-03 | La base de datos rechaza madre de otra publicación, profundidad 3 y cambiar madre, publicación o autor | Script SQL de la 029 | 1 |
| CA-04 | Responder en el nivel 2 crea una hermana de nivel 2 con «En respuesta a @usuario» | Prueba de integración | 1 |
| CA-05 | Dos «Me gusta» simultáneos dejan 1; retirar sin haber dado responde 200 | Pruebas de concurrencia e idempotencia | 1 |
| CA-06 | Editar o eliminar lo ajeno, 403; sin sesión, 401; cuenta suspendida, 403 | Pruebas de integración | 1 |
| CA-07 | La sexta publicación o la respuesta 21 en una hora, 429 | Prueba de integración | 1 |
| CA-08 | El contenido PENDIENTE solo lo ven el autor y los moderadores; el eliminado conserva su lugar | Pruebas de integración y de componente | 1 |
| CA-09 | La paginación por cursor no repite ni salta con inserciones entre páginas | Prueba de integración | 1 |
| CA-10 | La calificación y el ranking no cambian con el foro | Prueba de regresión | 1 |
| CA-11 | Las páginas muestran los estados obligatorios y se usan con teclado | Pruebas de componente | 1 |
| CA-12 | Reporte propio, 403; duplicado abierto, 409; el reporte 11 en una hora, 429; 3 reportes ocultan | Pruebas y script SQL de la 030 | 2 |
| CA-13 | Toda decisión queda auditada con el texto revisado; nadie decide sobre lo propio | Script SQL de la 030 y pruebas | 2 |
| CA-14 | Una falta del foro cuenta para la reincidencia y el bloqueo aplica en reseñas y foro | Prueba de integración | 3 |
| CA-15 | Una apelación aceptada del foro revierte la decisión y anula la falta | Pruebas y script SQL de la 031 | 3 |
| CA-16 | Las notificaciones no se duplican, no llegan por acciones propias ni por contenido PENDIENTE, y respetan las preferencias | Pruebas de integración | 5 |
| CA-17 | Tablas nuevas y corregidas con RLS sin políticas y sin acceso de `anon` ni `authenticated` | Scripts SQL 028 a 032 | 0 a 5 |
| CA-18 | Cada PR pasa `./mvnw clean test`, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` y la CI | Salida en el PR y CI en verde | Todas |

## 8. Fases

| Fase | Migración | Entregable | Criterios |
|---|---|---|---|
| 0 | 028 | `AnalizadorContenido` extraído sin cambios funcionales; RLS en todas las tablas desde las migraciones | CA-01, CA-17, CA-18 |
| 1 | 029 | Foro básico y las tres páginas | CA-02 a CA-11, CA-17, CA-18 |
| 2 | 030 | Moderación del foro | CA-12, CA-13, CA-17, CA-18 |
| 3 | 031 | Apelaciones y reincidencia unificada | CA-14, CA-15, CA-17, CA-18 |
| 4 | — | Señales de comportamiento automatizado y cierre de hilos | Pruebas de cada señal, CA-18 |
| 5 | 032 | Notificaciones | CA-16, CA-17, CA-18 |

## 9. Proceso de aprobación por fase

1. Plan de la fase aprobado por el equipo antes de escribir código.
2. Migración y script de verificación probados en PostgreSQL local restaurado desde `pg_dump --schema-only`. En Supabase solo se lee la estructura.
3. **Punto de control 1:** un revisor independiente (otro agente con el modelo más capaz, sin el contexto del autor, o una persona) compara la migración con esta especificación. Los hallazgos críticos o importantes se corrigen.
4. Una persona aprueba la migración y la aplica en Supabase.
5. Implementación con pruebas primero, en la rama de trabajo.
6. **Punto de control 2:** un revisor independiente revisa toda la rama. Cada hallazgo crítico o importante se corrige con una prueba que primero falla.
7. PR con la salida de CA-18, el informe de la revisión y el aviso de la migración. Una persona confirma que la migración está aplicada y fusiona.

Si una fase contradice esta especificación, se detiene y el cambio se aprueba antes de seguir.
