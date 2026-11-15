# TEC-153 — Criterio propuesto para verificar ofertas de tiendas

**Fecha:** 2026-11-09  
**Rama:** `adrian`  
**Estado:** propuesta abierta. El criterio frontend está redactado, pero **no
está aprobado, no está implementado y no se considera una tarea cerrada**. No
modifica backend, esquema ni contrato.

## 0. Estado de la propuesta

- [x] Criterio funcional redactado y revisado contra el modelo actual.
- [ ] Aprobación del equipo sobre la vigencia (7 días propuestos).
- [ ] Definición del tratamiento de promociones, variantes y condiciones.
- [ ] Acuerdo con backend sobre estado, fecha y evidencia expuesta.
- [ ] Implementación de TEC-151/152 en frontend.
- [ ] Pruebas de integración con el contrato real.

Mientras los puntos anteriores sigan sin marcar, TEC-153 debe presentarse como
propuesta y no como funcionalidad disponible.

## 1. Alcance correcto

TEC-153 pertenece al flujo de ofertas de tiendas de las tareas TEC-134 a TEC-154:

- TEC-151 permite que una persona administradora verifique una oferta.
- TEC-152 muestra una marca de verificación en la lista de tiendas.
- TEC-153 define qué significa esa verificación.
- TEC-154 comprueba que una persona no administradora reciba 403.

La verificación se refiere a **una oferta concreta de una tienda para un producto**: tienda, producto, precio y enlace. No significa que una persona compró el producto ni que la tienda en general esté certificada.

## 2. Criterio recomendado

Una oferta puede mostrarse como **Verificada** solo después de que una persona administradora revise manualmente la página enlazada y confirme, en la misma revisión, que:

1. El enlace abre una página de producto de la tienda identificada en la oferta.
2. La página corresponde al mismo producto del catálogo, incluyendo modelo o variante cuando aplique.
3. El precio visible es legible, positivo y está expresado en COP.
4. El precio que muestra TecReview coincide con el precio visible en esa página al momento de la revisión.
5. El enlace es un destino HTTP o HTTPS accesible y conduce a la oferta, no solo a la página principal de la tienda.

La verificación significa únicamente que esos datos coincidían **en la fecha y hora de revisión**. No garantiza que el precio siga vigente, que haya inventario, que el envío sea gratis, que la tienda sea segura ni que TecReview haya realizado una compra.

## 3. Vigencia y retiro de la marca

Se recomienda que la marca caduque a los **7 días calendario** de la última revisión aprobada. Debe volver a revisión y dejar de mostrarse como vigente si:

- vence ese plazo;
- cambia el producto, la tienda, el precio o el enlace de la oferta;
- el enlace deja de abrir o ya no corresponde al producto;
- se confirma que el precio visible ya no coincide;
- un reporte justificado indica que los datos son incorrectos.

La marca debe retirarse o pasar a revisión pendiente hasta una nueva comprobación. No se debe mostrar “Verificada” solo porque la oferta tenga precio o enlace, ni conservarla después de cambiar esos datos.

**Decisión que requiere aprobación del equipo:** confirmar si 7 días es el plazo adecuado. El frontend no debe fijar un plazo distinto por su cuenta; para la futura implementación conviene que el backend determine y exponga la vigencia.

## 4. Evidencia y autoridad

El backend debe ser la fuente de verdad del estado. La revisión debe dejar evidencia interna suficiente para auditarla:

- identificador de la oferta revisada;
- fecha y hora de revisión;
- resultado y motivo cuando no se aprueba;
- referencia a la persona administradora que ejecutó la acción, conservada de forma privada.

No es necesario exponer públicamente datos personales de quien verificó. La interfaz debe recibir del backend el estado y la fecha de última verificación; no debe inferirlos del rol local, de la existencia de una URL ni de datos en `localStorage`.

El modelo actual `TiendaPrecio` (`nombre`, `precio`, `envioGratis`, `url`) no incluye estado ni fecha de verificación. Por eso TEC-152 no se debe conectar a una marca inventada antes de que backend acuerde y exponga esos datos. Este documento no propone cambios de esquema ni contratos obligatorios.

## 5. Comportamiento esperado del frontend (cuando exista el contrato)

- Mostrar la marca solo si el backend indica explícitamente que la oferta está verificada y vigente.
- Sin estado, con estado falso, vencido o error de carga, no mostrar la marca.
- Presentar la fecha de revisión en texto claro cuando esté disponible.
- No usar el color como único indicador; la marca tendrá texto accesible.
- No convertir la marca de oferta en una afirmación de “Compra verificada”.

## 6. Pruebas futuras

La implementación coordinada con backend debería cubrir:

- coincidencia correcta de tienda, producto, precio COP y enlace;
- producto o variante incorrectos, precio distinto, ausente o inválido;
- enlace roto o que no lleva a una página de producto;
- verificación vigente, vencida, retirada y todavía pendiente;
- intento de verificar sin rol administrador: 403 comprobado por backend;
- el frontend muestra la marca solo para ofertas explícitamente verificadas y vigentes.

## 7. Decisiones pendientes del equipo

Ninguna de estas decisiones está cerrada. La propuesta no debe usarse como
especificación definitiva hasta que el equipo y backend las resuelvan.

| # | Decisión | Estado | Criterio de cierre |
|---|----------|--------|--------------------|
| 1 | Vigencia de la verificación (7 días propuestos) | Pendiente | El equipo aprueba un plazo o define otro; backend calcula y expone `vigente`/`fechaVerificacion`. |
| 2 | Promociones, variantes y precios condicionados | Pendiente | Se acuerda qué precio se compara y cómo se representa la variante. |
| 3 | Efecto de un reporte justificado | Pendiente | Se define si suspende automáticamente la marca o solo abre revisión. |
| 4 | Contrato de estado y fecha por oferta | Pendiente | Backend documenta campos, tipos y permisos; frontend no los inventa. |

## 8. Límite de esta entrega

Esta tarea documenta el criterio frontend recomendado. No altera entidades,
endpoints, permisos, migraciones ni datos y no marca una oferta como
verificada. La implementación de TEC-151/152 depende de la aprobación del
criterio y del contrato del backend.

Evidencia técnica actual:

- `src/types/producto.ts` define `TiendaPrecio` solo con `nombre`, `precio`,
  `envioGratis` y `url`; no existe estado, fecha ni identificador de oferta.
- `src/services/api.ts` no expone un endpoint de verificación de ofertas.
- `src/app/productos/[id]/DetalleProductoCliente.tsx` muestra las tiendas y sus
  enlaces, pero no pinta ninguna marca de verificación.
- Por tanto, no se añadió UI, estado local ni persistencia simulada para esta
  tarea.
