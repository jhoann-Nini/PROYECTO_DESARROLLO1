# Revisión de favoritos y evaluación entre dispositivos

Mejora 5. Los favoritos exigen una sesión activa: los visitantes deben iniciar
sesión para agregar, consultar o quitar productos y no se guardan favoritos
anónimos en el navegador. No se modificaron backend, JPA ni base de datos. La
sincronización real entre dispositivos sigue siendo una propuesta pendiente de
aprobación.

## Alcance

Se revisó y ajustó la funcionalidad existente de favoritos:

- `src/data/favoritos.ts`: normalización, límite, claves por cuenta y limpieza
  de la clave anónima heredada.
- `src/hooks/useFavoritos.ts`: sesión de Supabase, hidratación, persistencia y
  sincronización por cuenta.
- `src/components/favoritos/BotonFavorito.tsx`: guardar, quitar, aviso de
  límite y solicitud de inicio de sesión.
- `src/app/favoritos/FavoritosCliente.tsx`: acceso con sesión, lista, filtros,
  orden, estados vacío y error, y aviso de productos fuera del catálogo.
- Pruebas de datos, hook, botón, vista y accesibilidad.

También se analizaron las entidades JPA, la configuración de seguridad y las
migraciones del backend para evaluar la persistencia entre dispositivos.

## Requisito aplicado

- Solo las cuentas con sesión activa pueden agregar, consultar o quitar
  favoritos.
- Sin sesión, la interfaz no hidrata favoritos, no escribe en `localStorage` y
  dirige al inicio de sesión.
- La clave anónima histórica `tecreview:favoritos` se elimina al montar el
  hook. No se migran favoritos anónimos a una cuenta.
- Los favoritos se guardan por cuenta con
  `tecreview:favoritos:<idSesion>`, donde `idSesion` es el UID de Supabase.
- La sesión se comprueba con `getSession()` y se mantiene al día con
  `onAuthStateChange`. `/favoritos` además valida la sesión con
  `useSesionTecReview` y `/api/usuarios/me`, igual que el perfil.

## Estado implementado

- `useFavoritos` expone `autenticado` e hidrata solo la clave de la cuenta
  activa. Si la sesión se cierra, la lista visible queda vacía.
- `alternar` devuelve el motivo `sin-sesion` cuando no hay cuenta activa y no
  modifica el almacenamiento.
- La sesión se sincroniza entre pestañas con el evento `storage` y dentro de la
  misma pestaña con `tecreview:favoritos:cambio`. El evento incluye la clave de
  la cuenta para no mezclar listas.
- `normalizarIdsFavoritos` acepta solo enteros positivos, elimina duplicados y
  aplica un máximo de 100.
- `BotonFavorito` abre `AuthModal` sin sesión y anuncia la petición con
  `role="status"`. Con sesión mantiene `aria-pressed`, el aviso accesible y el
  estado «Favoritos llenos (100/100)».
- `/favoritos` muestra «Inicia sesión para ver tus favoritos» a los visitantes,
  no consulta el catálogo sin sesión y permite abrir `AuthModal`.
- La cabecera de `/favoritos` explica que solo se administran con sesión y que
  no se sincronizan entre dispositivos.
- El ranking de «más deseados» se presenta como «Favoritos vinculados a una
  cuenta» y aclara que los favoritos de este navegador no lo alimentan.

## Hallazgos y cambios

| Hallazgo | Corrección |
|---|---|
| La versión anterior permitía favoritos de invitado y guardaba la lista anónima en `tecreview:favoritos`. | Solo se hidrata y escribe con sesión activa; la clave anónima histórica se elimina. Cada cuenta usa su propia clave. |
| Al llegar a 100 favoritos, el botón no comunicaba por qué no se guardaba el producto; el clic fallaba en silencio. | El botón muestra «Favoritos llenos (100/100)», anuncia el límite con `role="status"` y no altera la lista. |
| La vista no explicaba que los favoritos no se sincronizan entre dispositivos y decía que no hacía falta sesión. | La cabecera exige sesión para administrarlos y aclara que se conservan en este navegador sin sincronización entre dispositivos. |
| No existía un aviso accesible después de guardar o quitar desde el botón. | Se añadió un estado `aria-live="polite"` asociado con `aria-describedby`; en modo compacto es visualmente oculto para no alterar la tarjeta. |
| La home decía que «la funcionalidad de listas de deseos y favoritos estará disponible en una fase posterior», aunque los favoritos ya existen. Además, el ranking de «más deseados» no se alimenta con esos favoritos locales. | El ranking ahora se presenta como «Favoritos vinculados a una cuenta» y aclara que los favoritos del navegador son locales y no alimentan ese ranking. |
| Guardar desde una tarjeta no ofrecía acceso cuando no había sesión. | El botón abre `AuthModal` y anuncia que se debe iniciar sesión; no guarda nada hasta que exista una cuenta activa. |

## Límites conocidos

- Si `localStorage` está bloqueado o lleno, la interfaz sigue funcionando en
  memoria, pero la selección puede perderse al recargar. El código actual no
  muestra un aviso específico para ese caso.
- La lista se asocia a la cuenta solo dentro de este navegador; no se comparte
  entre navegadores o dispositivos ni se recupera al cambiar de equipo.
- Cerrar sesión deja de mostrar los favoritos; la copia local por cuenta puede
  reutilizarse cuando esa misma cuenta vuelve a iniciar sesión en este
  navegador.
- El máximo de 100 es defensivo y ahora se comunica en la interfaz.
- El ranking de «más deseados» no se alimenta con los favoritos locales porque
  el backend no registra favoritos.

## Evaluación de persistencia entre dispositivos

### Estado actual del backend

- No existe tabla `favorito` ni una relación equivalente.
- No existen entidad JPA, repositorio, servicio ni controlador de favoritos.
- `RankingService` documenta expresamente que el modelo no registra favoritos y
  devuelve una lista vacía para «más deseados» en lugar de inventar datos.
- `spring.jpa.hibernate.ddl-auto=validate`: el esquema se gestiona con
  migraciones SQL; Hibernate no crea ni altera tablas.
- La API es stateless y valida JWT de Supabase. `UsuarioService` aprovisiona el
  usuario local a partir de `supabase_uid`; los endpoints nuevos bajo
  `/api/favoritos` quedarían autenticados por la regla `anyRequest()`.
- Las migraciones existentes llegan a `011` y usan `schema_version` para
  controlar la aplicación.

### Opciones evaluadas

| Opción | Ventajas | Costos y riesgos | Decisión |
|---|---|---|---|
| Mantener solo `localStorage` por cuenta | Sin backend, sin migraciones, privacidad por navegador y funcionamiento sin conexión. | No hay sincronización entre dispositivos ni recuperación al cambiar de navegador. | Comportamiento actual. |
| Favoritos por usuario en el backend con caché local por cuenta | Sincronización real entre dispositivos para cuentas; conserva la respuesta local y el límite actual. | Requiere tabla, migración, entidad JPA, repositorio, servicio, endpoints, reglas de fusión y pruebas de integración. | **Recomendada, pendiente de aprobación.** |
| Tabla de Supabase consultada directamente desde el frontend | Menos código Spring. | Rompe la arquitectura de API, duplica reglas de autorización y expone la tabla al cliente. | Rechazada. |
| Sincronización con un servicio externo o almacenamiento en la nube del navegador | Podría evitar backend propio. | Dependencia nueva, privacidad, disponibilidad y poca integración con la cuenta TecReview. | Rechazada. |

### Propuesta recomendada si se aprueba

1. **Base de datos:** migración `012_favoritos.sql` con una tabla
   `public.favorito`:
   - `id_favorito BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
   - `id_usuario BIGINT NOT NULL` con FK a `public.usuario`
   - `id_producto BIGINT NOT NULL` con FK a `public.producto`
   - `fecha_creacion TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`
   - restricción única `(id_usuario, id_producto)`
   - índice por `id_usuario, fecha_creacion`
   - borrado en cascada al eliminar usuario o producto
   - registro en `schema_version`
2. **JPA:** entidad `Favorito`, repositorio con consultas por usuario,
   servicio con validación de producto activo y límite de 100, y controlador
   autenticado.
3. **API propuesta:**
   - `GET /api/favoritos` → ids del usuario autenticado en orden de guardado.
   - `POST /api/favoritos/{idProducto}` → agregar de forma idempotente.
   - `DELETE /api/favoritos/{idProducto}` → quitar.
   - `DELETE /api/favoritos` → vaciar.
   - Una operación de fusión para la primera sincronización de una cuenta con
     caché local.
4. **Frontend:** mantener la caché local por cuenta para respuestas rápidas y
   añadir una capa remota para sesiones autenticadas. Al iniciar sesión se
   propone unir la caché local de esa cuenta con la remota, sin duplicados y
   con el límite de 100; al cerrar sesión no se mostrará nada sin una nueva
   sesión.
5. **Seguridad:** los endpoints nuevos deben exigir JWT válido y resolver el
   usuario por `supabase_uid`, sin aceptar `idUsuario` del cliente.
6. **Compatibilidad:** conservar el formato local por cuenta para no perder la
   selección de una sesión anterior en el mismo navegador; migrar solo cuando
   el usuario acepte la fusión.

### Riesgos y decisiones pendientes

- Orden de la lista al fusionar dos dispositivos.
- Cómo tratar la caché local de una cuenta cuando la lista remota cambió en otro
  dispositivo.
- Comportamiento sin conexión y reintentos.
- Límite de 100 y conflictos cuando la unión supera el máximo.
- Privacidad y borrado de la cuenta.
- Pruebas de integración y migración en un entorno con datos reales.
- Aprobación explícita antes de tocar backend, JPA o base de datos.

## Pruebas

- `src/data/favoritos.test.ts`: claves por cuenta, lectura y escritura con clave
  explícita, y eliminación de la clave anónima heredada.
- `src/hooks/useFavoritos.test.tsx`: hidratación por cuenta, persistencia,
  rechazo sin sesión (`sin-sesion`), cierre de sesión, aislamiento entre cuentas
  y sincronización entre pestañas e instancias.
- `src/components/favoritos/BotonFavorito.test.tsx`: guardar, quitar,
  `aria-pressed`, límite de 100, apertura de `AuthModal` sin sesión y ausencia
  de escrituras anónimas.
- `src/app/favoritos/FavoritosCliente.test.tsx`: acceso con y sin sesión, copy
  de sesión obligatoria, lista, quitar, vaciar, filtrar, ordenar, estado vacío
  por filtro y error con reintento.
- `src/components/home/home.test.tsx` y `src/app/page.test.tsx`: el estado vacío
  de «más deseados» distingue los favoritos locales del ranking vinculado a una
  cuenta.
- `src/components/accesibilidad/foco.test.tsx`: la vista de favoritos conserva
  el foco visible.

## Verificación

- `npm test`: 772 pruebas en 63 archivos, todas correctas.
- `npx tsc --noEmit`: sin errores.
- `npm run lint`: sin errores.
- `npm run build`: exitoso.
- No se modificaron backend, JPA, base de datos ni dependencias.

## Límites

- La sincronización entre dispositivos no está implementada.
- El aviso de almacenamiento bloqueado o lleno sigue siendo una limitación
  conocida, no una funcionalidad nueva.
- La propuesta de backend requiere aprobación y una ejecución separada.
