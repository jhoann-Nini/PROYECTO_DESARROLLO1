# Datos de prueba para productos — TEC-33 (S1-24)

Este conjunto contiene registros ficticios para probar manualmente el CRUD de productos. Está en `proyectos/backend/src/test/resources/fixtures/productos-prueba.json` y solo usa campos que acepta actualmente `ProductoRequest`: nombre, descripción, imagen y precio de referencia. Los atributos técnicos por categoría no se incluyen porque todavía no existen en el DTO ni en la entidad `Producto`.

## Antes de enviar los datos

El servicio requiere que cada producto referencie una categoría y una marca existentes. El fixture guarda esos nombres como referencias legibles y evita asumir IDs que pueden cambiar entre bases de datos.

1. Consultar `GET /api/categorias` y `GET /api/marcas`.
2. Para cada registro, encontrar los objetos cuyos nombres coincidan con `categoria` y `marca` del fixture.
3. Copiar los campos de `producto` al cuerpo de la solicitud y agregar `idCategoria` e `idMarca` con los IDs obtenidos.
4. Enviar el cuerpo resultante a `POST /api/productos`.

Ejemplo de cuerpo después de resolver los IDs:

```json
{
  "nombre": "Celular Demo A1",
  "descripcion": "Equipo de prueba con datos generales completos.",
  "idCategoria": 1,
  "idMarca": 2,
  "imagen": null,
  "precioReferencia": 1200000
}
```

Los valores `1` y `2` de este ejemplo son ilustrativos; deben reemplazarse por los IDs devueltos por la base usada para la prueba.

## Cobertura de la muestra

- Seis productos ficticios en categorías diferentes.
- Campos opcionales nulos: descripción, imagen y precio de referencia.
- Campos de imagen con URL de ejemplo reservada (`example.com`), sin depender de imágenes reales.
- Precios de referencia de prueba en COP; no son precios comerciales.

## Prueba local automatizada

`ProductoFixtureIntegrationTest` lee este fixture, crea categorías y marcas de prueba en H2, y envía los seis productos por `POST /api/productos` con `MockMvc` y el controlador/servicio reales. Comprueba que queden activos y persistidos. La transacción se revierte al finalizar.

Desde `proyectos/backend`, se ejecuta con:

```powershell
.\mvnw.cmd -Dtest=ProductoFixtureIntegrationTest test
```

## Casos manuales sugeridos

| Caso | Variación | Resultado esperado |
| --- | --- | --- |
| Crear producto válido | Enviar un registro del fixture con los IDs resueltos | `POST /api/productos` responde `201` y devuelve el producto con ID y estado activo. |
| Listar productos | `GET /api/productos` después de crear registros | Responde `200` e incluye los productos activos creados. |
| Precio opcional vacío | Enviar `"precioReferencia": null` | Se acepta el producto sin precio. |
| Nombre vacío | Enviar `"nombre": " "` | La validación rechaza la solicitud. |
| Categoría o marca faltante | Omitir `idCategoria` o `idMarca` | La validación rechaza la solicitud. |
| Precio negativo | Enviar `"precioReferencia": -1` | La validación rechaza la solicitud. |
| Referencia inexistente | Usar un ID de categoría o marca que no exista | El servicio responde con recurso no encontrado. |
| Desactivar producto | `DELETE /api/productos/{id}` sobre uno creado | Responde `204`; el registro queda inactivo y no aparece en el listado de activos. |

La API también limita el nombre a 150 caracteres y la imagen a 255. Se pueden probar esos límites enviando primero un valor dentro del máximo y después uno que lo exceda.

## Límites conocidos

- La categoría y marca de cada registro deben existir previamente. El fixture no crea ni modifica esas tablas.
- No ejecutar estos datos contra producción. Usar una base local/de pruebas o el entorno autorizado por el equipo.
- Los atributos técnicos definidos en TEC-32 requieren una decisión e implementación posterior en el modelo; estos registros no simulan campos que la API aún no guarda.
- El API no contiene un campo de moneda; COP describe únicamente cómo interpretar estos precios ficticios durante la prueba.
- La prueba automatizada escribe únicamente en H2 en memoria; no ejecuta escrituras en Supabase.
