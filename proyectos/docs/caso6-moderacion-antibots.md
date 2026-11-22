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
| Correo verificado | Probable (configuración de Supabase, no verificada desde el código) | Que alguien controla esa dirección, **no** que sea una persona |
| Interacción con CAPTCHA | Código listo (Cloudflare Turnstile); falta activarlo en Supabase | Eleva el costo de automatizar; no prueba de forma absoluta que sea un humano |
| Identidad comprobada | No | — |
| Comprador verificado | No | La interfaz no lo afirma |

**Protecciones actuales:** límite de 100 peticiones por minuto en la API, 5 reseñas y 10 reportes por hora por usuario. El registro y el inicio de sesión van directo a Supabase Auth y no pasan por el backend.

## 4. Pendiente (por prioridad)

1. **Configuración externa, sin costo:**
   - activar Cloudflare Turnstile en Supabase Auth (Authentication → Attack Protection, con la clave secreta). El frontend ya muestra el widget y envía `captchaToken` en registro, inicio de sesión y recuperación cuando existe `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. **Orden:** primero desplegar el frontend con esa variable en Vercel y después activarlo en Supabase; al revés, nadie podría iniciar sesión;
   - confirmar que Supabase exige verificar el correo y corregir la comprobación del backend, que solo actúa si el token trae `email_verified` en falso;
   - verificar que el servidor de Render solo sea accesible a través de Cloudflare, porque el límite por IP confía en `CF-Connecting-IP`.
2. **Prioridad media:**
   - lista de palabras administrable desde el panel, con categorías (amenazas, acoso, discriminación);
   - señales de spam (teléfonos, la misma reseña en varios productos);
   - reincidencia con restricciones graduales;
   - apelaciones;
   - contador de pendientes para los moderadores.
3. **Prioridad baja:** clasificador externo para casos ambiguos, solo como señal. Tiene costo por uso y obliga a enviar el texto de los usuarios a un tercero.
