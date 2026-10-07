# tecReview — AI Development Rules

## Proyecto

tecReview es un proyecto académico de desarrollo de software
realizado por un equipo de estudiantes.

## Estructura

proyectos/
├── backend/
└── frontend/
└── docs/

## Backend

- Java
- Spring Boot
- Spring Data JPA
- PostgreSQL
- Maven

## Frontend

- React
- JavaScript/TypeScript según el código existente

## Base de datos

- PostgreSQL
- Supabase cuando corresponda

# Reglas de trabajo

1. No trabajar directamente sobre main.

2. Respetar la rama actual del desarrollador.

3. No modificar código de otros módulos sin necesidad.

4. Antes de realizar cambios grandes:
   - analizar el código existente
   - identificar dependencias
   - explicar el plan

5. No cambiar la arquitectura sin aprobación.

6. No eliminar código existente solamente porque existe
   una alternativa considerada mejor.

7. Mantener compatibilidad con el código existente.

8. No modificar configuraciones sensibles sin autorización.

9. No exponer contraseñas, tokens o variables de entorno.

10. No modificar archivos de otros compañeros
    si no son necesarios para la tarea.
11. leer la documentacion 
12. actualizar dicumentacion 
13. comunicar cualquier cambio que tengas 

# Git

Usar Conventional Commits:

feat:
fix:
refactor:
test:
docs:
chore:

No hacer push a main.

No hacer merge automáticamente.

# Antes de finalizar

Ejecutar las pruebas correspondientes.

Backend:

./mvnw test

Frontend:

npm test

y/o

npm run build

según la configuración existente.

Después revisar:

git status
git diff

## Base de datos

La base de datos del proyecto ya existe en supabase

El agente NO debe asumir que se está diseñando
una base de datos desde cero.

Antes de modificar entidades, relaciones o
configuración de persistencia:

1. analizar la estructura existente de la BD
2. analizar las entidades JPA
3. comparar ambas
4. identificar inconsistencias
5. presentar una propuesta
6. esperar aprobación antes de modificar