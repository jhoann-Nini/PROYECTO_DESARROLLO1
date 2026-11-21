# TEC-148 — Reportar precio o enlace de una oferta

**Estado:** Implementado en el frontend (rama `adrian`, integrada en `nini` el 20 de noviembre de 2026). La moderación de estos reportes se agregó en la Fase 2 (ver «Moderación» más abajo y `docs/api.md`, sección 31).

## Contrato verificado

- TEC-147 expone `POST /api/reportes/ofertas`, requiere JWT de Supabase y
  responde `201 Created` con `idReporte`, `idProducto`, `idEstablecimiento`,
  `motivo`, `descripcion`, `estado` (`PENDIENTE`) y `fechaCreacion`.
- Cuerpo: `idProducto` y `idEstablecimiento` (`Long`), `motivo` obligatorio
  (`precio_incorrecto` o `enlace_incorrecto`) y `descripcion` opcional (máximo
  2000 caracteres). No se envía usuario ni estado desde el navegador.
- Errores: validación `400`, autenticación `401`, restricciones del usuario
  `403` y oferta inexistente `404`. El cliente muestra el campo `message`
  del formato de error existente, o un mensaje genérico de conexión.
- Desde la Fase 2 (migración 021) el backend también responde `409` si el
  usuario ya tiene un reporte abierto sobre esa oferta y `429` si supera 10
  reportes por hora (reseñas y ofertas juntas). El modal muestra el mensaje
  del backend sin cerrarse.

## Origen de las ofertas y navegación

- En portada, «Ofertas destacadas» procede de `GET /api/rankings/ofertas` y
  ya incluye ambos identificadores y los nombres. Cada tarjeta tiene su
  botón «Reportar precio o enlace» independiente de «Ver detalle».
- En `/productos/{id}`, la sección «Dónde comprar» consulta
  `GET /api/productos/{id}/establecimientos` para obtener el
  `idEstablecimiento` real junto al precio de cada oferta. El `idProducto`
  proviene del producto consultado. No se infieren IDs a partir de nombres.
- Las tiendas heredadas de datos de ficha, si existen y no hay ofertas del
  endpoint real, se siguen mostrando para compatibilidad, **sin botón de
  reporte** porque sus filas no contienen un ID de establecimiento fiable.
  En un error de consulta de ofertas se muestra error y reintento, sin
  atribuir un ID a esas filas. El DTO público de TEC-134 tampoco trae la URL
  comercial: no se inventan enlaces «Ver tienda» para las ofertas reales.
- **Actualización Fase 3:** el detalle ya no muestra las tiendas heredadas del
  JSON; solo las ofertas del backend. El DTO público añade `urlOferta`,
  `verificado` y `fechaActualizacionPrecio` (migración 022), así que «Ver
  tienda», el sello «Verificada» y «Precio actualizado el…» salen de datos
  reales. Las ofertas se registran en la pestaña «Ofertas por tienda» del
  panel de administración.

## Flujo y pruebas

El botón abre el modal contextual con motivo requerido, descripción opcional
con contador y límite de 2000 caracteres, cierre por «Cerrar», «Cancelar»,
Escape y fondo, foco inicial y retorno al botón. El envío utiliza
`apiFetchAutenticado` (JWT de `supabase.auth.getSession()`), bloquea envíos
simultáneos y confirma solo al recibir éxito. Un `401` informa que hace falta
iniciar sesión y ofrece el `AuthModal` ya usado por la aplicación; los demás
errores conservan el formulario para reintentar.

Pruebas automatizadas: `npm test`, más `npm run lint` y `npm run build`.
Prueba manual: abrir una oferta real en portada y otra en el detalle, comprobar
los dos motivos y la pareja de IDs en la petición, enviar autenticado, repetir
sin sesión, provocar `404`/fallo de red y comprobar foco, teclado y pantalla
estrecha.

## Moderación (Fase 2)

- Los moderadores y administradores revisan los reportes en el panel de
  moderación, pestaña «Reportes de ofertas» (`ColaReportesOfertas`).
- La cola muestra producto, tienda, precio y disponibilidad actuales, motivo,
  descripción e historial. El filtro por defecto, «Abiertos», muestra los
  reportes `PENDIENTE` y `EN_REVISION`.
- Acciones: «Tomar para revisar», «Aceptar» y «Rechazar». Rechazar exige
  justificación. Aceptar **no** cambia el precio: el moderador corrige la
  oferta desde la administración de establecimientos.
- El motivo `enlace_incorrecto` se mantiene, aunque las ofertas todavía no
  tienen un campo de URL; la Fase 3 añadirá `url_oferta`.
