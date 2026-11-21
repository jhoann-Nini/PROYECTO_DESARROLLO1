# Política de fuentes y variantes

## Jerarquía de fuentes

1. **fabricante** — página oficial de especificaciones o soporte técnico del modelo exacto
   (p. ej. `support.apple.com/...`, página "Specs" del fabricante). Preferir la ficha de
   soporte frente a la página comercial.
2. **organismo** — certificaciones y registros oficiales (FCC, organismos de
   telecomunicaciones, etiquetas energéticas). Útiles para bandas, batería nominal, potencia.
3. **analisis / benchmark** — medios con metodología declarada. Solo para mediciones
   (brillo medido, autonomía medida, benchmarks), nunca para sustituir un dato oficial.
4. **comercio** — tiendas. Solo como respaldo y con fecha; nunca como única fuente de un
   dato técnico si existe fuente oficial.
5. **otro** — evitar; requiere justificar en el informe.

Agregadores de especificaciones (bases de datos de terceros) no son fuente primaria. Pueden
orientar la búsqueda, pero el dato se registra con la fuente oficial que lo confirme.

## Registro obligatorio por fuente

- URL exacta (no la portada).
- `localizador`: sección, tabla o encabezado donde aparece el dato.
- `extracto` en la evidencia: texto literal corto.
- `consultada_en`: fecha real de la consulta (AAAA-MM-DD). Nunca una fecha estimada.
- `mercado`: código o nombre del mercado de la página si es regional (p. ej. `CO`, `US`, `global`).

## Variantes

- Una variante = combinación comercial que cambia especificaciones o identidad
  (RAM, almacenamiento, color, mercado, conectividad 4G/5G, chip).
- Si una especificación difiere entre variantes, se crean especificaciones separadas con
  `variante_id` y la misma `clave`.
- Si una referencia del catálogo no indica capacidad o color, **queda sin variante asignada**
  (regla del catálogo canónico).
- **Variantes regionales**: no mezclar en una misma variante datos de páginas de mercados
  distintos (bandas, cargador incluido, capacidad de batería y SKU suelen variar). Si solo hay
  fuente global, registrar `mercado: null` en la variante y anotarlo en pendientes.
- Familias cercanas (Phone (2a) vs (2a) Plus; S24 vs S24 Ultra; M3 Pro vs M3 Max;
  CPU 14/30 vs 16/40 núcleos) son productos o variantes distintas: confirmar con el usuario.

## Normalización de unidades

- Almacenamiento y RAM comerciales: `GB`/`TB` decimales salvo que la fuente diga GiB.
- Pantalla: diagonal en `in`; resolución con tipo `resolucion` en `px`; frecuencia en `Hz`;
  brillo en `nits`.
- Batería: `mAh` en móviles/auriculares; `Wh` en portátiles. No convertir mAh↔Wh sin voltaje
  publicado (`convertirCargaAEnergiaWh` exige el voltaje).
- Peso en `g` (o `kg` en portátiles); dimensiones con tipo `dimensiones`, misma unidad en todos
  los ejes.
- "Hasta X", "aprox.", "típico" → conservar en `valor_original`; si cambia el significado,
  `no_segura` con motivo.
