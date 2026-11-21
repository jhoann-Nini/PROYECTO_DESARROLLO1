# Checklist antes de incorporar una ficha

Incorporar significa: añadirla como fixture/piloto en el repositorio o cargarla en un
producto real. Lo segundo lo hace una persona con rol Administrador desde
`AdminFichaTecnicaModal` (que llama a `PUT /api/productos/{id}/ficha-tecnica`); **Claude no
lo hace**.

- [ ] Modelo y variante confirmados con el usuario cuando había ambigüedad.
- [ ] El producto destino existe y su categoría de catálogo corresponde a la categoría V3
      (moviles↔celulares, laptops↔portatiles, tablets, auriculares).
- [ ] Validador TS sin errores.
- [ ] Validador Java sin errores (o explicado por qué no se pudo ejecutar).
- [ ] Ningún `verificado`; conflictos marcados como `conflicto_pendiente`.
- [ ] Cada fuente con `consultada_en` y URL exacta.
- [ ] Reglas de comparación revisadas con `comparador-tecreview`.
- [ ] Pruebas propuestas y, con autorización, añadidas:
  - piloto nuevo → actualizar `proyectos/fixtures/fichas-v3-piloto/` (`resumen.json`,
    `fuentes-por-atributo.json`, `pendientes.json`), registrar el import JSON en
    `frontend/src/data/fichasTecnicasV3Piloto.ts` (los pilotos se importan uno a uno) y
    revisar `frontend/src/data/fichasTecnicasV3Piloto.test.ts`;
  - nuevo caso límite del contrato → `proyectos/fixtures/ficha-tecnica-v3/conformance-cases.json`
    (lo consumen Vitest **y** Maven: ejecutar ambos).
- [ ] Documentación actualizada si cambió algo del contrato o del catálogo canónico.
- [ ] `tecreview-qa` ejecutado antes de dar el trabajo por terminado.
