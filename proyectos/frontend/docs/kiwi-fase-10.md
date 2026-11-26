# Kiwi V3 · Fase 10: modales

Referencias: `docs/diseno-v3-kiwi/DISENO.md`, `tokens.css` y `pantallas/Estados.html`, `Admin.html`, `Moderador.html` y `Representante.html`.

Se adaptaron `AuthModal`, `AdminPanelModal`, `PanelModeracionModal` y `PanelRepresentanteModal` al sistema Kiwi. También se ajustaron sus componentes internos de administración, colas de moderación y campos compartidos de establecimientos. Los cambios afectan superficies, bordes, divisores, tipografía, campos, botones, etiquetas y alertas. Se retiraron las sombras y las clases de paletas directas de los archivos modificados. Los paneles siguen siendo modales; se conservaron textos, roles, nombres accesibles, eventos, estados, rutas y llamadas a servicios.

La prueba `AdminPanelModal.test.tsx` se actualizó porque comprobaba la sintaxis anterior de tres utilidades CSS (`bg-[var(--color-canvas)]`, `border-[var(--color-hairline)]`, `border-l-[var(--color-brand-blue)]` y `text-[var(--color-ink)]`). Ahora comprueba `bg-canvas`, `border-line`, `border-l-brand-blue` y `text-ink`. No se alteraron expectativas funcionales.

Validación final: `npm test` (94 archivos y 1375 pruebas aprobados) y `npm run build` (aprobado).
