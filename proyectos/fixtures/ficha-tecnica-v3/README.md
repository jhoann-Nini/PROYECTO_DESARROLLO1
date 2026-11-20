# V3 shared conformance vectors

`conformance-cases.json` is consumed by Vitest and Maven; each suite routes the exact same JSON documents and checks the declared expected validity.

## Structural equality

For `semantica: "conjunto"`, values compare recursively: object property order is ignored, array order is retained, text and booleans compare by type and value, and numbers compare as finite IEEE-754/JavaScript Number values (`1` equals `1.0`; `-0` equals `0`; representably distinct values stay distinct). Null is structurally equal only to null, but null is not a permitted `ValorAtomoV3`, so it fails schema validation when used as a list element.

## Version markers

V3 is identified by root `evidencias`, or by `especificaciones` paired with a V3 category (`celulares`, `tablets`, `portatiles`, `auriculares`) or the full V3 envelope (`variantes`, `fuentes`, `benchmarks`). V2's `variantes`/`fuentes`/`benchmarks` without `especificaciones` remains valid V2. These markers cause unversioned or V1/V2-labeled V3 documents to be rejected; payloads are never converted.

All schema and reference identifiers are strings. Numeric JSON values are not coerced to strings when resolving variant, source, or evidence references.
