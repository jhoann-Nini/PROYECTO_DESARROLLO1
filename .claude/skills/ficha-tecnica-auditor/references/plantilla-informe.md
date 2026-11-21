# Plantilla de informe de ficha técnica

Completa todas las secciones. Si una sección está vacía, escribe "Ninguno".

```markdown
# Ficha V3 — <Nombre comercial exacto>

- ID canónico: <id o "no existe en catalogoCanonico.ts">
- Categoría V3: <celulares|tablets|portatiles|auriculares>  (catálogo: <moviles|laptops|…>)
- Fecha de consulta: <AAAA-MM-DD>
- Variantes declaradas: <id — modelo — mercado — identificadores>

## Resultado de validación
- Vitest (validarDatosFichaTecnicaV3): <válida / errores literales>
- Maven (DatosFichaTecnicaV3Validator): <válida / errores literales / no ejecutado y por qué>

## Datos confirmados (estado_dato = conocido)
| clave | valor normalizado | variante | fuente (tipo) | evidencia |

## Desconocidos / no publicados / no aplica
| clave | estado | justificación |

## Conflictos entre fuentes
| clave | valores en conflicto | fuentes | propuesta (sin resolver) |

## Normalizaciones no seguras
| clave | valor original | motivo |

## Fuentes
| id | tipo | URL | mercado | consultada_en |

## Compatibilidad con el comparador
- Reglas habilitadas: <lista> — ver informe de comparador-tecreview
- Filas que no se compararán y motivo: <…>

## Pruebas propuestas antes de incorporar
- <caso nuevo en conformance-cases.json / test de piloto / test de comparador>

## Pendientes para el equipo
- <confirmar SKU/mercado, verificación por responsable autorizado, licencia de imagen…>
```
