# Kiwi V3 · Fase 9: favoritos y perfil

Referencias: `docs/diseno-v3-kiwi/DISENO.md`, `tokens.css`, `pantallas/Favoritos.html`, `pantallas/Perfil.html` y la vista de cuenta de `pantallas/Movil-cuenta.html`.

Se adaptaron las páginas de Favoritos y Perfil, el botón para guardar productos y los bloques de estado de cuenta y decisiones de moderación. Se usan superficies y bordes Kiwi sin sombras, botones y etiquetas base, campos con línea inferior y títulos en mayúsculas mediante CSS. Las tarjetas de producto conservan el componente existente. Los paneles por rol continúan abriéndose como modales. No cambiaron textos, rutas, llamadas a servicios, estados, eventos ni nombres accesibles.

Validación: `npm test` (94 archivos y 1375 pruebas aprobados) y `npm run build` (aprobado). No se actualizaron pruebas.
