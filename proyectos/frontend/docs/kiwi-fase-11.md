# Kiwi V3 · Fase 11: revisión final

Referencia visual: `docs/diseno-v3-kiwi/DISENO.md`, `tokens.css` y las maquetas de `pantallas/`.

Se revisaron las rutas y los componentes que todavía usaban colores de paleta directos o sombras. Se restilizaron las páginas de confirmación y restablecimiento de contraseña, el explorador de depuración, `Header`, `Footer`, elementos de dispositivos y rankings, el marcador de imagen, el fondo geométrico y el modal de reporte de ofertas. También se retiraron los últimos estilos directos de los paneles de administración y moderación. No se cambiaron rutas, lógica, servicios, textos visibles ni nombres accesibles.

La búsqueda en `src/**/*.{tsx,jsx}` no encuentra clases de paleta directa (`red-*`, `blue-*`, `sky-*`, etc.), colores hexadecimales en JSX, `bg-black`, `bg-white`, `text-black`, `text-white` ni utilidades de sombra. Las superficies, bordes, texto y acentos usan tokens semánticos. Los paneles por rol continúan como modales.

Se comprobaron los pares de contraste de texto sobre lienzo, papel, superficie secundaria y botones sólidos con los valores de `globals.css` en ambos temas. Los 15 pares medidos en cada tema superan WCAG AA (4,5:1); el valor más bajo fue 5,23:1 en claro y 5,02:1 en oscuro. Se conserva el mecanismo `.dark`, `data-tema` y `tecreview:tema`; `src/lib/tema.test.ts` pasó sus ocho pruebas.

Validación final: `npm test` (94 archivos, 1375 pruebas aprobadas), `npm run build` (aprobado) y `git diff --check` (sin errores). La línea base de la fase 10 también fue de 94 archivos, 1375 pruebas y compilación aprobada.
