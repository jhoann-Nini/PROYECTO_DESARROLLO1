Vas a aplicar un rediseño visual al frontend de TecReview (Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4).
El diseño está en docs/diseno-v3-kiwi/. Lee primero DISENO.md y tokens.css completos.
La carpeta pantallas/ tiene maquetas HTML de referencia; NO copies su sintaxis ({{ }}, <sc-for>, <x-dc>), solo tómalas como guía visual.

OBJETIVO: cambiar SOLO la apariencia. No cambies lógica, rutas, llamadas a servicios, hooks, tipos, textos visibles ni nombres accesibles (aria-label, roles). Los paneles de Administrador, Moderador y Representante siguen siendo modales.

REGLAS TÉCNICAS

1. Tokens: los valores de tokens.css deben vivir en el bloque @theme y en los estilos de tema oscuro de src/app/globals.css.
   Reutiliza las variables que ya existen cuando tengan el mismo rol (por ejemplo surface-_, line, text-_, brand-solid, on-solid, star, status-error) y cambia su valor.
   Crea variables nuevas solo si falta un rol (por ejemplo, el dorado de descuentos o el estado "pendiente").
   Antes de editar, muéstrame una tabla de equivalencias: variable actual → token kiwi → valor claro → valor oscuro.
2. Tema: conserva el mecanismo actual (clase .dark, atributo data-tema, localStorage "tecreview:tema", oscuro por defecto, src/lib/tema.ts). No uses el selector data-theme de tokens.css: adapta los valores a .dark.
3. Sin sombras: el sistema kiwi no usa sombras. Elimina --shadow-\* de los componentes; la profundidad se logra con superficies y bordes.
4. Colores directos: reemplaza clases como red-_, amber-_, slate-_, zinc-_, emerald-\* o colores hexadecimales en JSX por utilidades basadas en los tokens.
5. Mayúsculas: hazlas con la clase "uppercase" (CSS), nunca cambiando el texto en el JSX, para no romper pruebas ni lectores de pantalla.
6. Componentes base: crea en src/components/ui/ Button (primary, secondary, link, danger), Input, Tag y EstadoDato (verificado, pendiente, sin dato), según DISENO.md.
   Úsalos donde reemplacen estilos repetidos, sin reescribir componentes enteros.
7. No borres ni fusiones componentes (ProductCard/TarjetaProducto, Header.tsx/Footer.tsx). Solo restilízalos.
8. Contraste: todo texto debe cumplir WCAG AA (4,5:1) en ambos temas. Los valores de tokens.css ya lo cumplen; no inventes colores nuevos.

PRUEBAS

- Ejecuta "npm test" antes de empezar y guarda el resultado como línea base.
- Después de cada fase, ejecuta "npm test" y "npm run build".
- Si una prueba falla SOLO porque cambió una clase CSS que modificaste a propósito (por ejemplo en home.test.tsx, AdminPanelModal.test.tsx, EstadoVacio.test.tsx o ProductCard.test.tsx), actualiza la prueba para que verifique la nueva clase y explícame el cambio.
- Si falla por cualquier otro motivo, detente y repórtamelo: no cambies la lógica para hacerla pasar.

FASES (haz una a la vez)

1. Tokens y tema en globals.css (con la tabla de equivalencias primero).
2. Componentes base en src/components/ui/.
3. Shell: AppShell, SiteHeader, SiteFooter, BottomNav, BotonTema y el buscador Ctrl+K.
4. Inicio (src/app/page.tsx y components/home).
5. Catálogo y categorías (productos, categorias/[slug], components/catalogo, ProductCard, TarjetaProducto).
6. Detalle de producto (productos/[id], components/detalle, FichaTecnicaModal) con los estados de dato.
7. Comparador.
8. Reseñas y blog.
9. Favoritos y perfil.
10. Modales: AuthModal, AdminPanelModal, PanelModeracionModal, PanelRepresentanteModal.
11. Revisión final: busca colores directos que hayan quedado y verifica ambos temas.

Empieza SOLO con la fase 1. Al terminarla, detente y entrégame:

- la tabla de equivalencias,
- los archivos modificados,
- el resultado de npm test y npm run build comparado con la línea base.

- Si una prueba o la compilación falla por un error de sintaxis o de tipos que tú introdujiste en esta fase, corrígelo tú mismo sin cambiar la lógica, y repórtalo en el resumen.