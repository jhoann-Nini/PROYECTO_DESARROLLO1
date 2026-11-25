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

- Java 21
- Spring Boot 4 (spring-boot-starter-webmvc)
- Spring Data JPA (`ddl-auto=validate`)
- Spring Security con JWT de Supabase
- PostgreSQL (pruebas con H2 y Testcontainers)
- Maven

## Frontend

- Next.js 16 (App Router; ver `proyectos/frontend/AGENTS.md`:
  tiene cambios incompatibles con versiones anteriores)
- React 19
- TypeScript
- Tailwind CSS 4
- Vitest + Testing Library

## Skills de Claude Code

Las skills de proyecto están en `.claude/skills/`:
`ficha-tecnica-auditor`, `comparador-tecreview`, `moderacion-inteligente`,
`supabase-auditor`, `springboot-api-auditor`, `tecreview-qa` y
`pruebas-e2e-tecreview` (pruebas de navegador con Playwright).

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
11. leer la documentacion del proyecto antes de realizar cambios.
12. mantener la documentacion actualizada.
13. comunicar cualquier cambio que tengas.

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