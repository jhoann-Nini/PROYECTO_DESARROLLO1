# Pruebas de integración del backend

Este documento describe las pruebas automatizadas disponibles actualmente en el backend de TecnoReview y cómo ejecutarlas.

## Requisitos

- Java JDK 21, según la versión declarada en `proyectos/backend/pom.xml`.
- No es necesario instalar Maven por separado: el repositorio incluye Maven Wrapper (`mvnw.cmd`).

## Ejecutar las pruebas

Abre PowerShell en la carpeta raíz del repositorio y ejecuta:

```powershell
cd proyectos\backend
.\mvnw.cmd test
```

Para ejecutar únicamente la prueba del endpoint de salud:

```powershell
.\mvnw.cmd -Dtest=HealthControllerTest test
```

Para ejecutar únicamente la prueba de carga del contexto:

```powershell
.\mvnw.cmd -Dtest=BackendApplicationTests test
```

Una ejecución correcta termina con `BUILD SUCCESS`. Maven también guarda los resultados de cada prueba en `target/surefire-reports/`, dentro de `proyectos/backend`.

### Resultado de la última ejecución

Ejecución realizada el 29 de septiembre de 2026:

```text
Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## Pruebas disponibles

### `HealthControllerTest`

Ubicación: `src/test/java/com/example/backend/controller/HealthControllerTest.java`.

Usa `@WebMvcTest(HealthController.class)` y `MockMvc` para probar la capa web sin iniciar un servidor HTTP externo. Envía una solicitud `GET /api/health` y comprueba que:

- la respuesta tenga estado HTTP `200`;
- el JSON contenga `{"status":"UP"}`.

El controlador también devuelve `"service":"backend"`; la prueba actual no valida ese campo.

### `BackendApplicationTests`

Ubicación: `src/test/java/com/example/backend/BackendApplicationTests.java`.

Usa `@SpringBootTest` para cargar el contexto completo de Spring Boot. La prueba `contextLoads` verifica que la aplicación pueda iniciar su contexto; no envía solicitudes HTTP ni valida operaciones de persistencia.

## Base de datos de pruebas

`src/test/resources/application.properties` configura una base H2 en memoria (`jdbc:h2:mem:testdb`) y `spring.jpa.hibernate.ddl-auto=create-drop`. La base se crea para la ejecución de pruebas y se descarta al terminar. Las pruebas actuales no verifican repositorios, relaciones entre entidades ni conexión con Supabase/PostgreSQL.

## Alcance actual y siguiente cobertura

La prueba de `HealthController` es una prueba de integración de la capa web; no es una prueba completa de extremo a extremo entre frontend, API y base de datos. Para cubrir el modelo inicial de datos se pueden agregar posteriormente pruebas de repositorios y entidades con H2, verificando las relaciones y claves definidas en el modelo.
