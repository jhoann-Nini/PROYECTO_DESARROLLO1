# Inicio · ajuste visual Kiwi V3

Referencia: `diseno-v3-kiwi/capturas/Inicio · escritorio.png` y la columna «Inicio» de `diseno-v3-kiwi/capturas/Móvil · Inicio, Categoría, Detalle, Comparador, Comunidad.png`. Comparación realizada en tema oscuro a 1440 px y 390 px.

## Diferencias corregidas

- Cabecera de Inicio compacta en una fila en escritorio; márgenes y ancho máximo cercanos a la maqueta.
- Hero en dos paneles con búsqueda a la izquierda y presupuesto a la derecha en escritorio; en móvil, búsqueda → categorías → presupuesto.
- Categorías en tarjetas de cuatro columnas. El control «Todos» se conserva como opción adicional.
- Destacados en cuatro columnas de escritorio, con imagen 4:3 y tarjetas de estilo Kiwi; en móvil permanecen todos los productos en una columna.
- La llamada al comparador queda tras Destacados; Rankings precede a Ofertas; Opiniones cierra la página.
- Rankings usan separadores discontinuos y Ofertas usa filas tabulares con columnas en escritorio. Opiniones deja de estar dentro de una tarjeta general.
- Pie de Inicio horizontal en escritorio y barra inferior móvil sin pastilla de selección. El resto de rutas conserva el encabezado y las tarjetas previos.

## Diferencias deliberadamente no copiadas

- Los títulos, textos, nombres accesibles, rutas y acciones existentes no se sustituyen por el contenido ilustrativo de la maqueta.
- El presupuesto inicial real es $ 4.000.000 COP (no el valor ilustrativo de $ 2.500.000); el deslizador mantiene sus límites y confirmación.
- El catálogo muestra sus productos e imágenes reales (hasta seis destacados), no los cuatro dispositivos de ejemplo. No se simula disponibilidad, reseñas, valoraciones, favoritos ni ofertas que la API no devuelve.
- Se conserva el formulario de opiniones y sus controles de autenticación/moderación, así como la sección «Todos» y los botones de detalle, sin inventar interacciones para «Comparar» o «Ir a la tienda».
- La maqueta móvil muestra dos tarjetas en un carrusel y una barra «Comunidad/Cuenta»; la aplicación conserva seis tarjetas en flujo vertical y sus rutas «Favoritos/Perfil» para no cambiar comportamiento.
- Los paneles de administración, moderación y representante continúan como modales.
