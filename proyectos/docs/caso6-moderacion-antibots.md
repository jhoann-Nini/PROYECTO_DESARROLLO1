# Caso 6: moderación inteligente, lenguaje ofensivo y protección antibots

**Fecha:** 21 de noviembre de 2026. Responde a las preguntas del profesor sobre la dependencia del equipo humano de moderación, la detección de palabras alteradas y la comprobación de que una cuenta no es un bot.

## 1. Cómo funciona la moderación automática

Es un **filtro por reglas, sin IA ni aprendizaje automático**, presente en el backend (`ResenaModerationService`, la autoridad final) y en el frontend (`src/data/resenas.ts`, que solo previene). Un corpus compartido, `proyectos/fixtures/moderacion/corpus-moderacion.json`, garantiza que los dos clasifican igual.

### Niveles de riesgo

| Nivel | Ejemplos | Resultado | ¿Interviene un moderador? |
|---|---|---|---|
| Ninguno | «Excelente batería» | Se publica | No |
| Bajo | «odio que la batería dure tan poco», «este cargador es una basura» | Se publica; el formulario sugiere revisar el tono | No |
| Medio | «eres un idiota», «eres una basura», enlaces, texto repetido | El formulario pide corregir; si llega al backend, queda en revisión | Solo si el autor no corrige |
| Alto | «te voy a matar», «sé dónde vives» | Queda en revisión, primero en la cola con «Prioridad alta» | Sí, con prioridad |

### Evasiones que detecta

| Técnica | Ejemplo | Detecta |
|---|---|---|
| Mayúsculas y tildes | «IDIOTA», «estúpido» | Sí |
| Números y símbolos (leet) | «1diota», «m13rda», «es7upido», «¡diota» | Sí |
| Espacios y separadores | «m i e r d a», «p.u.t.a», caracteres invisibles | Sí |
| Letras repetidas | «idiooooota», «mieeerda» | Sí |
| Homoglifos | «idiоta» con «о» cirílica, caracteres de ancho completo | Sí |
| Palabras pegadas | «eresidiota» | **No**: detectarlas marcaría «computadora» por «puta» |
| Insultos fuera de la lista, otros idiomas, discriminación | «imbécil», «idiot» | **No** |

## 2. Qué se implementó (prioridad 1)

- **Niveles de gravedad**: las palabras ambiguas sobre el producto ya no van a la cola. Antes, 7 de 9 comentarios legítimos de prueba quedaban retenidos.
- **Detección de amenazas y acoso** con prioridad en la cola.
- **Normalización ampliada**: letras repetidas, homoglifos y más sustituciones leet.
- **Corpus compartido** entre frontend y backend.
- **Texto revisado en la auditoría** (migración 024): cada decisión guarda lo que el moderador vio, aunque el autor edite después.
- **Suspensión de cuentas** auditada (`PUT /api/admin/usuarios/{id}/estado`, migración 024). Antes no existía forma de suspender una cuenta.

## 3. Verificación de usuarios

| Nivel | Estado | Qué demuestra |
|---|---|---|
| Usuario registrado | Sí (Supabase Auth) | Que existe una cuenta |
| Correo verificado | Sí: «Confirm email» activo en Supabase desde el 22 de noviembre de 2026 | Que alguien controla esa dirección, **no** que sea una persona |
| Interacción con CAPTCHA | Sí: Cloudflare Turnstile en registro, inicio de sesión y recuperación, exigido por Supabase desde el 22 de noviembre de 2026 | Eleva el costo de automatizar; no prueba de forma absoluta que sea un humano |
| Identidad comprobada | No | — |
| Comprador verificado | No | La interfaz no lo afirma |

**Protecciones actuales:** límite de 100 peticiones por minuto en la API, 5 reseñas y 10 reportes por hora por usuario. El registro y el inicio de sesión van directo a Supabase Auth y no pasan por el backend.

## 4. Pendiente (por prioridad)

1. **Configuración externa, sin costo:**
   - ✅ Cloudflare Turnstile activo en Supabase Auth. La variable `NEXT_PUBLIC_TURNSTILE_SITE_KEY` debe existir en Vercel: sin ella el formulario no muestra el CAPTCHA y, como Supabase lo exige, nadie puede iniciar sesión;
   - ✅ Supabase exige verificar el correo, y el backend lo comprueba en cada petición (corregido el 23 de noviembre de 2026). Los access tokens de Supabase no traen `email_verified` en el nivel superior, sino dentro de `user_metadata`, y la comprobación anterior solo miraba el nivel superior y solo al crear el perfil. Ahora revisa los dos lugares en `obtenerUsuarioDesdeJwt`, que usan todos los servicios. Verificado en Supabase: `user_metadata.email_verified` coincide con `email_confirmed_at` en todas las cuentas;
   - ✅ Render solo es accesible a través de Cloudflare (verificado el 23 de noviembre de 2026):
     - el frontend llama a `https://tecreview-backend.onrender.com`, que responde con `server: cloudflare`, `cf-ray` y `x-render-origin-server: Render`;
     - Render no expone una IP pública del servidor de origen;
     - una petición que intenta falsear la cabecera `CF-Connecting-IP` la rechaza el propio Cloudflare (`403`, error 1000) antes de llegar a Render.

     Por eso el límite por IP del backend puede confiar en `CF-Connecting-IP`.
2. **Prioridad media:**
   - ✅ señales de spam: teléfonos y el mismo texto en varias reseñas del mismo autor (`api.md` §33.3);
   - ✅ contador de pendientes en las pestañas del panel y en el botón del perfil (`api.md` §33.4);
   - ✅ lista de palabras administrable: los administradores agregan términos con categoría (amenaza, acoso, discriminación, insulto o spam) desde el panel. Solo los evalúa el backend para que la lista no sea pública (`api.md` §33.7, migración 027). Así se cubren los insultos fuera de la lista base y la discriminación, que figuraban como limitaciones en el corpus;
   - ✅ reincidencia con restricciones graduales: aviso, revisión previa de 30 días, bloqueo de 7 días y lista para el administrador desde 4 faltas (`api.md` §33.5);
   - ✅ apelaciones: el autor apela un rechazo o un ocultamiento en 15 días, lo resuelve otra persona y, si se acepta, la reseña se publica o se restaura y la falta deja de contar (`api.md` §33.6, migración 026).
   - ✅ RLS en `apelacion` y `termino_moderacion` (hallazgo D4 de la auditoría de la comunidad): en producción ya estaba activo en todas las tablas; la migración 028 lo activa también desde el repositorio en las 23 tablas de public (24 de noviembre de 2026).
3. **Prioridad baja:** clasificador externo para casos ambiguos, solo como señal. Tiene costo por uso y obliga a enviar el texto de los usuarios a un tercero.
