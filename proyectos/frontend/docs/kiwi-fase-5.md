# Kiwi V3 · Fase 5: catálogo y categorías

Se aplicó la apariencia Kiwi al catálogo general, la página de categoría y sus componentes de filtros, chips, paginación, valoraciones y tarjetas de producto. `ProductCard` y `TarjetaProducto` siguen siendo componentes independientes.

- Las tarjetas usan superficies y bordes del tema, vitrina `surface-0` para la imagen, divisores punteados y tipografía en mayúsculas mediante CSS.
- Los botones principales reutilizan `Button`; los campos de búsqueda y precio reutilizan `Input` con línea inferior. Se conservaron los atributos, eventos, textos visibles y nombres accesibles.
- Se retiraron las clases de sombra y los colores directos de los archivos intervenidos. La señal de error usa coral como texto y borde sobre una superficie legible.
- No se cambiaron filtros, ordenamiento, paginación, carga de datos ni rutas.

Validación: `npm test` (94 archivos y 1375 pruebas aprobados) y `npm run build` (aprobado). No fue necesario actualizar pruebas.
