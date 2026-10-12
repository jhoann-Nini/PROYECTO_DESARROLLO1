# TecReview

Plataforma web de reseñas imparciales, análisis de hardware y comparativas de dispositivos tecnológicos con lenguaje claro y accesible.

## Tecnologías Principales

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.
- **Backend:** Java 17, Spring Boot, Spring Data JPA, Maven.
- **Base de Datos:** PostgreSQL / Supabase.
- **Accesibilidad y Diseño:** WCAG 2.1 AA, modo claro y modo oscuro funcional con fondo geométrico bicolor.

## Instalación del Frontend

```bash
cd proyectos/frontend
npm install
```

## Desarrollo Local

```bash
cd proyectos/frontend
npm run dev
```

La aplicación se ejecutará en [http://localhost:3000](http://localhost:3000).

## Tests y Validación

```bash
# Frontend
cd proyectos/frontend
npm test
npm run build

# Backend
cd proyectos/backend
./mvnw test
```

## Estructura

```text
proyectos/
├── frontend/
│   ├── src/app/          # Páginas y layout Next.js
│   ├── src/components/   # Componentes modulares accesibles
│   ├── src/data/         # Helpers, tipos y datos mock
│   └── src/services/     # Clientes de API para Spring Boot
├── backend/              # API REST en Spring Boot
└── docs/                 # Documentación técnica y funcional
```

## Moneda y Localización

- Precios expresados en Pesos Colombianos (COP).

## Estado

En desarrollo activo (rama `adrian`).