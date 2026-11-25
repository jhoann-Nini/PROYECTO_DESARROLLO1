# Capa B: pila completa local

Next.js, Spring Boot y PostgreSQL reales, con las migraciones y los triggers. Solo se reemplaza
Supabase Auth: el backend valida los tokens contra un **JWKS local**. `SecurityConfig` lee
`supabase.jwt.issuer-uri` y `supabase.jwt.jwk-set-uri` como propiedades y exige ES256, así que
basta con pasarlas por `-D`, sin cambiar código. Nunca se apunta a Supabase, Render ni Vercel.

## 1. Base de datos

Usa la receta de la skill `supabase-auditor`:
1. Vuelca el esquema con `pg_dump --schema-only --schema=public`. Es la única lectura de Supabase, solo de la estructura y sin datos. Las credenciales están en `proyectos/backend/.env` y no se muestran nunca.
2. Restáuralo en `postgres:17` en `127.0.0.1:55432`. Espera a que el log diga «ready to accept connections» dos veces y crea los roles `anon`, `authenticated` y `service_role`.

El esquema llega vacío. Siembra solo lo que el recorrido necesita, respetando el orden de los triggers:
- el rol `Usuario registrado` (y `Moderador` si hace falta);
- una categoría, una marca y un producto activo.

El usuario lo aprovisiona el backend la primera vez que recibe su token.

## 2. Servidor JWKS y tokens

Script `e2e/pila-completa/preparar.ts` (en `globalSetup`):
1. `generarClave()` de `e2e/soporte/sesion.ts`.
2. Sirve `{ keys: [clave.jwk] }` en `http://127.0.0.1:54399/auth/v1/.well-known/jwks.json` con `node:http`, durante toda la corrida.
3. Firma un token por usuario de prueba con `firmarToken(clave, usuario, "http://127.0.0.1:54399/auth/v1")`.
4. Guarda los tokens en `e2e/.auth/tokens.json`, que está en `.gitignore`.

## 3. Backend

Desde `proyectos/backend`, como un `webServer` más o a mano:
```
./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="\
 -Dspring.datasource.url=jdbc:postgresql://127.0.0.1:55432/postgres \
 -Dspring.datasource.username=postgres -Dspring.datasource.password=local \
 -Dspring.jpa.hibernate.ddl-auto=validate \
 -Dsupabase.jwt.issuer-uri=http://127.0.0.1:54399/auth/v1 \
 -Dsupabase.jwt.jwk-set-uri=http://127.0.0.1:54399/auth/v1/.well-known/jwks.json \
 -DFRONTEND_URL=http://127.0.0.1:3101 -Dserver.port=8081"
```
Con `ddl-auto=validate`, si las entidades no coinciden con la base, el arranque falla: eso también es una prueba.

## 4. Frontend

Compila con `NEXT_PUBLIC_API_URL=http://127.0.0.1:8081`, `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399`,
una `NEXT_PUBLIC_SUPABASE_ANON_KEY` ficticia y Turnstile vacío. Sírvelo en el puerto 3101. En cada
prueba, `inyectarSesion(page, "http://127.0.0.1:54399", tokens.ana, ana)`. No se simula ninguna ruta.

## 5. Aislamiento

Cada prueba crea sus propios datos con títulos únicos (`Date.now()`) y no depende del orden. Para
empezar limpio, se recrea el contenedor.

Ten en cuenta los límites reales: las cuotas (5 publicaciones por hora) y el límite general por IP.
Usa un usuario distinto por prueba que publique.

## Cuándo usar esta capa

Recorridos donde importa lo que la capa A no ve:
- triggers y restricciones de la base;
- moderación y visibilidad entre usuarios (Ana publica, Bea no ve lo pendiente);
- Server Components que llaman a la API;
- cuotas reales.

Pocos y críticos: son lentos.
