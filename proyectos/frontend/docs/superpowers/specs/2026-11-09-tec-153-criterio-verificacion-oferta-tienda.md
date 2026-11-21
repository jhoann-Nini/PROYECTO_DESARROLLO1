# TEC-153 — Criterio propuesto para verificar ofertas de tiendas

- **Fecha de creación:** 2026-11-09
- **Última revisión documental:** 2026-11-19
- **Rama:** `adrian`
**Estado:** propuesta abierta, pendiente de aprobación del equipo. La interfaz
puede mostrar una marca condicional, pero **la verificación no debe considerarse
operativa** hasta acordar su criterio y conectarla con el estado autoritativo
del backend. Este documento no modifica backend, esquema ni contrato.

## 0. Estado de la propuesta

- [x] Criterio funcional redactado y revisado contra el modelo actual.
- [x] Alcance aclarado para tiendas virtuales; no se exige local físico.
- [ ] Aprobación del equipo sobre la vigencia (7 días propuestos).
- [ ] Definición del tratamiento de promociones, variantes y condiciones.
- [ ] Acuerdo con backend sobre estado, fecha y evidencia expuesta.
- [x] El detalle contempla mostrar la marca si recibe `verificada: true`.
- [ ] Integración con el estado autoritativo, fecha y vigencia acordados con backend.
- [ ] Pruebas de integración con el contrato real.

Mientras los puntos anteriores sigan sin marcar, TEC-153 debe presentarse como
propuesta y no como funcionalidad disponible.

## 1. Alcance correcto

TEC-153 pertenece al flujo de ofertas de tiendas de las tareas TEC-134 a TEC-154:

- TEC-151 permite que una persona administradora verifique una oferta.
- TEC-152 muestra una marca de verificación en la lista de tiendas.
- TEC-153 define qué significa esa verificación.
- TEC-154 comprueba que una persona no administradora reciba 403.

La plataforma trabaja con **tiendas virtuales**. La verificación se refiere a **una oferta digital concreta de una tienda para un producto**: canal de venta, producto, precio y enlace. No se exige que la tienda tenga local físico, vitrina ni atención presencial.

El sello valida los datos de esa oferta en línea; no certifica a la tienda en general, no confirma que alguien haya comprado el producto y no sustituye una evaluación legal o comercial del negocio.

## 2. Criterio recomendado

Una oferta puede mostrarse como **Verificada** solo después de que una persona administradora revise manualmente la página enlazada y confirme, en la misma revisión, que:

1. El enlace abre el canal de venta virtual atribuido a la tienda en la oferta. Si se trata de un marketplace, la página debe identificar claramente al vendedor.
2. La página corresponde al mismo producto del catálogo, incluyendo modelo o variante cuando aplique.
3. El precio visible es legible, positivo y está expresado en COP.
4. El precio que muestra TecReview coincide con el precio visible en esa página al momento de la revisión.
5. El enlace es un destino HTTP o HTTPS accesible y conduce a la oferta, no solo a la página principal de la tienda.

La verificación significa únicamente que esos datos coincidían **en la fecha y hora de revisión**. No garantiza que el precio siga vigente, que haya inventario, que el envío sea gratis, que la tienda sea segura, que el vendedor cumpla todas sus obligaciones ni que TecReview haya realizado una compra.

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

El tipo de frontend `TiendaPrecio` incluye el indicador opcional `verificada`, pero no modela la fecha de revisión ni un identificador propio de la oferta. El detalle puede representar la marca cuando recibe `verificada: true`; eso por sí solo no confirma que el dato venga de una verificación vigente y autoritativa. Backend debe acordar y exponer la fuente de verdad, la fecha o vigencia y la oferta a la que aplica. Este documento no propone cambios de esquema ni contratos obligatorios.

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

Esta tarea documenta el criterio recomendado. No altera entidades, endpoints,
permisos, migraciones ni datos y no marca una oferta como verificada. La
verificación autoritativa y su vigencia dependen de la aprobación del criterio
y del contrato del backend.

Evidencia técnica actual:

- `src/types/producto.ts` define `TiendaPrecio` con `nombre`, `precio`,
  `envioGratis`, `url` y el indicador opcional `verificada`; no modela fecha de
  revisión ni identificador de oferta.
- `src/app/productos/[id]/DetalleProductoCliente.tsx` muestra una marca cuando
  recibe `verificada === true`.
- En el código backend revisado no aparece un contrato explícito de
  verificación de ofertas; TEC-151 sigue pendiente en Jira. La integración debe
  esperar a que backend acuerde el estado y su vigencia.
- No se debe inferir la verificación a partir de que exista un enlace o de que
  una tienda tenga productos publicados.
