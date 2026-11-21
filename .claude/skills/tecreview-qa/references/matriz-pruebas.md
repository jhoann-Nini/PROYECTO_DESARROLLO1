# Matriz de pruebas por área

Comandos frontend desde `proyectos/frontend`; backend desde `proyectos/backend`.

| Si cambió… | Pruebas específicas |
|---|---|
| `frontend/src/types/fichaTecnicaV3.ts`, `data/fichaTecnica*.ts`, `data/normalizadorFicha.ts`, `data/unidades.ts` | `npx vitest run src/data/fichaTecnica src/data/normalizadorFicha.test.ts src/data/unidades.test.ts src/components/FichaTecnica` |
| `DatosFichaTecnicaV3Validator.java`, `FichaTecnicaV3Dispatcher.java` | `./mvnw test -Dtest='DatosFichaTecnicaV3ValidatorTest,FichaTecnicaV3ConformanceTest,ProductoControllerTest'` |
| `fixtures/ficha-tecnica-v3/conformance-cases.json` | **Ambas** suites: Vitest `src/data/fichaTecnicaV3.test.ts` y Maven `FichaTecnicaV3ConformanceTest` |
| `fixtures/fichas-v3-piloto/*` | `npx vitest run src/data/fichasTecnicasV3Piloto.test.ts src/data/mockProductos.pilotos.test.ts` |
| Comparador (`data/comparador.ts`, `especificacionesComparador.ts`, `hooks/useComparador.ts`, `app/comparador`) | `npx vitest run src/data/comparador src/data/especificacionesComparador.test.ts src/hooks/useComparador.test.tsx src/app/comparador` |
| Catálogo (`data/catalogo*.ts`, `components/catalogo`, `app/categorias`) | `npx vitest run src/data/catalogo src/components/catalogo src/app/categorias` |
| Moderación frontend (`components/moderacion`, `app/resenas`, `ReportarOfertaModal`) | `npx vitest run src/components/moderacion src/app/resenas src/components/ReportarOfertaModal.test.tsx` |
| Moderación backend | `./mvnw test -Dtest='Moderacion*,ReporteResena*,ReporteOferta*,Resena*,RevisionResenas*'` |
| Seguridad (`config/*`) | `./mvnw test -Dtest='Seguridad*,LineaBase*,Autorizacion*,EndpointsNuevos*,Cors*,GeneralRateLimiting*'` |
| Migración SQL nueva | `cmp` entre las dos copias; `./mvnw test`; prueba en PostgreSQL local (con permiso) — H2 no ejecuta SQL de migraciones |
| `services/api.ts`, `types/*` | `npx vitest run src/services/api.test.ts` + `npx tsc --noEmit` |
| Encabezados de seguridad / `next.config.ts` / `vercel.json` | `npx vitest run src/lib/securityHeaders.test.ts` + `npm run build` |
| Solo documentación | Revisar enlaces y rutas citadas; no hace falta suite completa |

Siempre al final: réplica de la CI (tsc, `npm test`, lint, build, `./mvnw test`).
