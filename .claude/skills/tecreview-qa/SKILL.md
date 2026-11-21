---
name: tecreview-qa
description: Usar cuando en TecReview se vaya a dar por terminada una tarea, preparar un PR o una entrega, o cuando se pida verificar, probar o revisar que un cambio en frontend, backend, migraciones SQL, fixtures de fichas técnicas o documentación no rompe nada.
---

# QA TecReview

## Principio

Nada está terminado sin la **salida real de los comandos**. Esta skill elige las pruebas
según lo que cambió, reproduce la CI localmente e informa con honestidad lo que pasó, lo que
falló y lo que no se pudo probar.

## Cuándo usarla / cuándo no

| Usar | No usar |
|---|---|
| Antes de declarar una tarea completa o abrir un PR | Exploración o diseño sin cambios en archivos |
| Tras cambios en fichas, comparador, moderación, API o SQL | — |

## Procedimiento

1. **Inventario**: `git status` y `git diff --stat` (y `git diff` de los archivos clave).
   Clasifica cada archivo: frontend, backend, SQL, fixtures, docs.
2. **Selección de pruebas** con la matriz
   [references/matriz-pruebas.md](references/matriz-pruebas.md). Ejecuta primero las
   específicas (rápidas) y después la réplica de la CI.
3. **Réplica de la CI** (`.github/workflows/ci.yml`), en este orden:
   - `proyectos/frontend`: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`
   - `proyectos/backend`: `./mvnw test --no-transfer-progress`
   Si `node_modules` falta o está desactualizado, **pide permiso** antes de `npm ci`.
4. **Huecos conocidos**: si el cambio toca triggers o funciones SQL, indica que H2 no los
   ejecuta y que hace falta Docker (`ReporteResenaPostgresIntegrationTest`) o una prueba
   manual en un PostgreSQL local.
5. **Documentación**: comprueba que se actualizó lo afectado (`proyectos/docs/api.md`,
   `proyectos/docs/modelo-datos.md`, `proyectos/frontend/docs/*.md`, documentos de fase).
6. **Ruido de herramientas**: si aparece en el diff el bloque que `next dev` regenera en
   `proyectos/frontend/AGENTS.md`, señálalo para que no se mezcle con el trabajo.
7. **Cierre**: `git status` y `git diff` otra vez; informe con la plantilla de abajo.

## Reglas obligatorias

- No crear commits ni hacer push; no hacer merge.
- No instalar ni actualizar dependencias sin autorización.
- No modificar pruebas para que pasen: un test que falla se investiga
  (superpowers:systematic-debugging si está disponible).
- No afirmar "todo pasa" si algún paso no se ejecutó: decir cuál y por qué.

## Plantilla de informe

```markdown
## Verificación
| Paso | Comando | Resultado |
|---|---|---|
| Typecheck | npx tsc --noEmit | ✅ / ❌ (error literal) / ⏭️ no ejecutado: motivo |
| Tests frontend | npm test | N pasan, M fallan |
| Lint | npm run lint | … |
| Build | npm run build | … |
| Tests backend | ./mvnw test | Tests run: X, Failures: Y, Errors: Z, Skipped: W |
| Específicas | … | … |

## No cubierto por las pruebas
- …

## Documentación revisada
- …

## Estado del árbol
- git status: …
```

## Criterios de aceptación

- Los cinco pasos de la CI ejecutados y en verde, o cada fallo reportado con su salida.
- Huecos de cobertura declarados explícitamente.
- Documentación sincronizada con el cambio.
