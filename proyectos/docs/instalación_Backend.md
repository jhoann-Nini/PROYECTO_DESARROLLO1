# Checklist instalación Backend
## 1. Requisitos previos

Antes de iniciar verificar:

Herramienta	Versión recomendada	Verificar
Java	21	java -version
Maven	incluido con wrapper	./mvnw -version
Git	última versión	git --version
PostgreSQL/Supabase	activo	acceso a BD

## 2. Clonar repositorio
git clone https://github.com/jhoann-Nini/PROYECTO_DESARROLLO1.git

Entrar al backend:

cd PROYECTO_DESARROLLO1/proyectos/backend

## 3. Cambiar a la rama correcta

Ver ramas:

git branch

Actualizar:

git pull

Ejemplo:

git checkout nini

## 4. Configurar variables de entorno

⚠️ El archivo .env.local NO debe subirse al repositorio.

Crear:

backend/.env

Contenido:

POSTGRES_USER=postgres.xjepyqdynspdekuixuoe
POSTGRES_PASSWORD=su_password
POSTGRES_HOST=aws-0-us-east-1.pooler.supabase.com
POSTGRES_PORT=5432
POSTGRES_DATABASE=postgres

## 5. Configurar conexión Spring Boot

Archivo:

src/main/resources/application.properties

Debe contener:

spring.application.name=backend

spring.datasource.url=jdbc:postgresql://${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}?sslmode=require
spring.datasource.username=${POSTGRES_USER}
spring.datasource.password=${POSTGRES_PASSWORD}
spring.datasource.driver-class-name=org.postgresql.Driver


spring.jpa.hibernate.ddl-auto=update
spring.jpa.open-in-view=false

spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

## 6. Instalar dependencias

Linux / WSL:

./mvnw clean install

Windows:

.\mvnw.cmd clean install

Debe terminar:

BUILD SUCCESS

## 7. Ejecutar pruebas

Linux:

./mvnw test

Windows:

.\mvnw.cmd test

Resultado esperado:

BUILD SUCCESS

## 8. Ejecutar Backend

Linux:

./mvnw spring-boot:run

Windows:

.\mvnw.cmd spring-boot:run

## 9. Verificar que inició correctamente

Debe aparecer:

Started BackendApplication
Tomcat started on port 8080
HikariPool-1 - Start completed

## 10. Probar API

Abrir:

http://localhost:8080

o probar endpoints:

Productos:

GET http://localhost:8080/api/productos

Marcas:

GET http://localhost:8080/api/marcas
Problemas comunes
Error:
Driver org.postgresql.Driver claims to not accept jdbcUrl
Causa:

La URL no usa JDBC.

Incorrecto:

postgres://...

Correcto:

jdbc:postgresql://...
Error:
Unable to determine Dialect without JDBC metadata
Revisar:
usuario
contraseña
URL
variables de entorno
conexión Supabase
Error:
Could not resolve placeholder POSTGRES_PASSWORD
Causa:

Spring no encuentra .env.local.

Solución:

Verificar:

.env

está dentro de:

backend/
Flujo recomendado para nuevos integrantes

Cada integrante debe hacer:

git clone
↓
crear .env
↓
./mvnw clean install
↓
./mvnw test
↓
./mvnw spring-boot:run
↓
probar endpoints
Antes de hacer Pull Request

Checklist:

 No subir .env
 No subir contraseñas
 Pruebas pasan
 Backend inicia correctamente
 Nuevos endpoints documentados
 Migraciones/base de datos actualizadas