# Kiwi V3 · Fase 8: reseñas y blog

Referencias: `docs/diseno-v3-kiwi/DISENO.md`, `tokens.css` y `pantallas/Resenas.html`.

Se adaptaron las vistas de reseñas, sus formularios de edición y reporte, el índice del blog y las páginas de artículos al sistema Kiwi. Los cambios incluyen superficies y bordes en lugar de sombras, tipografía y títulos en mayúsculas mediante CSS, controles con los componentes base y colores semánticos de ambos temas. Se conservan textos, rutas, nombres accesibles, eventos, estados y llamadas a servicios.

La auditoría de foco detectó que cuatro controles de reseñas habían perdido la clase de foco compartida durante el cambio visual; se restauró `CLASE_FOCO` sin modificar la prueba.

Validación: `npm test` (94 archivos y 1375 pruebas aprobados) y `npm run build` (aprobado). No se actualizaron pruebas.
