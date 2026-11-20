/** Contrato independiente y versionado de fichas técnicas V3. */
export const VERSION_ESQUEMA_FICHA_TECNICA_V3 = 3 as const;

export const CATEGORIAS_FICHA_V3 = ["celulares", "tablets", "portatiles", "auriculares"] as const;
export type CategoriaFichaV3 = (typeof CATEGORIAS_FICHA_V3)[number];
export const ESTADOS_DATO_V3 = ["conocido", "desconocido", "no_publicado", "no_aplica"] as const;
export type EstadoDatoV3 = (typeof ESTADOS_DATO_V3)[number];
export const ESTADOS_VERIFICACION_V3 = ["pendiente", "con_fuente", "verificado", "requiere_revision"] as const;
export type EstadoVerificacionV3 = (typeof ESTADOS_VERIFICACION_V3)[number];
export const UNIDADES_CANONICAS_V3 = [
  "B", "kB", "MB", "GB", "TB", "KiB", "MiB", "GiB", "TiB",
  "mm", "cm", "in", "px", "Hz", "kHz", "MHz", "GHz",
  "bit/s", "kbit/s", "Mbit/s", "mAh", "Ah", "mWh", "Wh", "kWh",
  "mg", "g", "kg", "mW", "W", "ms", "s", "min", "h",
  "mpx", "puntos", "%", "nits", "dB",
] as const;
export type UnidadCanonicaV3 = (typeof UNIDADES_CANONICAS_V3)[number];

export type ValorAtomoV3 =
  | { tipo: "texto"; valor: string }
  | { tipo: "numero"; valor: number }
  | { tipo: "booleano"; valor: boolean }
  | { tipo: "magnitud"; valor: number; unidad: UnidadCanonicaV3 };
export interface ListaV3 {
  tipo: "lista";
  semantica: "secuencia" | "conjunto";
  tipo_elemento: "texto" | "numero" | "booleano" | "magnitud";
  elementos: ValorAtomoV3[];
}
export interface DimensionesV3 {
  tipo: "dimensiones";
  ejes: Array<{ eje: "alto" | "ancho" | "profundidad" | "grosor" | "otro"; nombre_eje?: string; magnitud: { valor: number; unidad: UnidadCanonicaV3 } }>;
}
export interface ResolucionV3 { tipo: "resolucion"; ancho: number; alto: number; unidad: "px" }
export interface RangoV3 {
  tipo: "rango";
  minimo: { valor: number; unidad: UnidadCanonicaV3 };
  maximo: { valor: number; unidad: UnidadCanonicaV3 };
}
export type ValorComponenteCompuestoV3 =
  | ValorAtomoV3
  | ListaV3
  | DimensionesV3
  | ResolucionV3
  | RangoV3
  | CompuestoV3;

export interface CompuestoV3 {
  tipo: "compuesto";
  componentes: Array<{ clave: string; nombre: string; valor: ValorComponenteCompuestoV3 }>;
}
export type ValorFichaV3 = ValorAtomoV3 | ListaV3 | DimensionesV3 | ResolucionV3 | RangoV3 | CompuestoV3;
export interface ValorOriginalV3 { texto: string; unidad: string | null }
export type NormalizacionV3 =
  | { estado: "normalizada"; valor: ValorFichaV3; regla_conversion_id: string | null; precision: { decimales: number | null } | null }
  | { estado: "no_segura"; valor: null; regla_conversion_id: null; precision: null; motivo: string }
  | { estado: "no_procesada"; valor: null; regla_conversion_id: null; precision: null };
export interface FuenteFichaV3 {
  id: string; tipo: "fabricante" | "organismo" | "comercio" | "analisis" | "benchmark" | "otro";
  nombre: string; url: string | null; localizador: string | null; consultada_en: string | null;
  variante_id: string | null; mercado: string | null;
}
export type AlcanceEvidenciaV3 =
  | { tipo: "variante"; variante_id: string }
  | { tipo: "todas_las_variantes"; variante_ids: string[] };
export interface EvidenciaFichaV3 {
  id: string; fuente_id: string; alcance: AlcanceEvidenciaV3; localizador: string | null;
  extracto: string | null; postura: "respalda" | "contradice" | "contexto";
  registrada_en: string; registrada_por: string | null;
}
export interface RevisionConflictoV3 {
  estado: "sin_conflicto" | "conflicto_pendiente" | "conflicto_resuelto";
  resuelto_en: string | null; resuelto_por: string | null; resolucion: string | null;
}
export interface VerificacionV3 {
  estado: EstadoVerificacionV3; verificado_en: string | null; verificado_por: string | null;
  evento_auditoria_id: string | null; motivo_revision: string | null;
}
export type ReglaComparacionV3 =
  | { habilitada: false }
  | { habilitada: true; id: string; modo: "orden_numerico"; unidad: UnidadCanonicaV3;
      direccion: "mayor_es_mejor" | "menor_es_mejor" | "objetivo"; objetivo: number | null;
      tolerancia: { valor: number; unidad: UnidadCanonicaV3 } | null }
  | { habilitada: true; id: string; modo: "igualdad_estructural"; unidad: null;
      direccion: "igualdad"; objetivo: null; tolerancia: null };
export interface EspecificacionFichaV3 {
  id: string; clave: string; nombre: string; grupo: string; variante_id: string | null;
  estado_dato: EstadoDatoV3; justificacion_estado: string | null;
  valor_original: ValorOriginalV3 | null; normalizacion: NormalizacionV3;
  evidencia_ids: string[]; revision_conflicto: RevisionConflictoV3;
  verificacion: VerificacionV3; comparacion: ReglaComparacionV3;
}
export interface VarianteFichaV3 {
  id: string; modelo: string | null; sku: string | null; mercado: string | null;
  identificadores: Record<string, string>;
}
export interface BenchmarkFichaV3 {
  id: string; nombre_prueba: string; version: string | null; plataforma: string | null;
  modo_ejecucion: string | null; resultado_original: ValorOriginalV3;
  resultado: { valor: number; unidad: UnidadCanonicaV3 }; regla_conversion_id: string | null;
  fecha_ejecucion: string | null; fuente_id: string; evidencia_id: string; variante_id: string;
  verificacion: VerificacionV3; revision_conflicto: RevisionConflictoV3;
}
export interface DatosFichaTecnicaV3 {
  version_esquema: typeof VERSION_ESQUEMA_FICHA_TECNICA_V3; categoria: CategoriaFichaV3;
  variantes: VarianteFichaV3[]; especificaciones: EspecificacionFichaV3[];
  fuentes: FuenteFichaV3[]; evidencias: EvidenciaFichaV3[]; benchmarks: BenchmarkFichaV3[];
}

export interface ResultadoValidacionV3 { valido: boolean; errores: string[] }
const UNIDADES = new Set<string>(UNIDADES_CANONICAS_V3);
const CATEGORIAS = new Set<string>(CATEGORIAS_FICHA_V3);
const ESTADOS_DATO = new Set<string>(ESTADOS_DATO_V3);
const ESTADOS_VERIFICACION = new Set<string>(ESTADOS_VERIFICACION_V3);
const FUENTES = new Set(["fabricante", "organismo", "comercio", "analisis", "benchmark", "otro"]);
const OBJ = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const TXT = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const FINITO = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const unidadValida = (v: unknown): v is UnidadCanonicaV3 => typeof v === "string" && UNIDADES.has(v);
const error = (e: string[], p: string, m: string) => e.push(`${p}: ${m}`);

/** Igualdad JSON estructural: propiedades de objeto no ordenan, arrays sí; números usan igualdad Number (IEEE-754). */
export function valoresEstructuralmenteIgualesV3(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return a === b;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b)
    && a.length === b.length && a.every((value, i) => valoresEstructuralmenteIgualesV3(value, b[i]));
  const aa = a as Record<string, unknown>, bb = b as Record<string, unknown>;
  const ak = Object.keys(aa), bk = Object.keys(bb);
  return ak.length === bk.length && ak.every((key) => Object.hasOwn(bb, key) && valoresEstructuralmenteIgualesV3(aa[key], bb[key]));
}

/**
 * Evalúa si el alcance de una evidencia cubre la variante de una especificación.
 * Si la especificación tiene una variante asociada, la evidencia es compatible si su alcance
 * es esa variante específica o si es de alcance general (todas_las_variantes) e incluye dicha variante.
 * Si la especificación no tiene variante (aplica a todo el producto), la evidencia debe ser de
 * alcance general (todas_las_variantes) y cubrir todas las variantes declaradas del producto.
 */
export function esAlcanceCompatibleConVariante(
  alcance: AlcanceEvidenciaV3 | Record<string, unknown> | null | undefined,
  varianteId: string | null,
  todasLasVariantes: Iterable<string>,
): boolean {
  if (!OBJ(alcance)) return false;
  const variantSet = todasLasVariantes instanceof Set ? todasLasVariantes : new Set(todasLasVariantes);
  if (varianteId !== null) {
    if (alcance.tipo === "variante") return alcance.variante_id === varianteId;
    if (alcance.tipo === "todas_las_variantes") {
      return Array.isArray(alcance.variante_ids) && (alcance.variante_ids as unknown[]).includes(varianteId);
    }
    return false;
  }
  return (
    alcance.tipo === "todas_las_variantes" &&
    Array.isArray(alcance.variante_ids) &&
    variantSet.size > 0 &&
    [...variantSet].every((id) => (alcance.variante_ids as unknown[]).includes(id))
  );
}

function validarValor(v: unknown, p: string, e: string[], profundidad = 1): boolean {
  if (!OBJ(v) || typeof v.tipo !== "string") { error(e, p, "debe ser un valor tipado"); return false; }
  if (v.tipo === "compuesto" && profundidad > 3) { error(e, p, "supera la profundidad máxima de tres niveles de compuesto"); return false; }
  switch (v.tipo) {
    case "texto": if (!TXT(v.valor)) error(e, p, "el texto no puede estar vacío"); return TXT(v.valor);
    case "numero": if (!FINITO(v.valor)) error(e, p, "debe ser un número finito"); return FINITO(v.valor);
    case "booleano": if (typeof v.valor !== "boolean") error(e, p, "debe ser booleano"); return typeof v.valor === "boolean";
    case "magnitud":
      if (!FINITO(v.valor)) error(e, p, "la magnitud debe ser finita");
      if (!unidadValida(v.unidad)) error(e, p, "unidad canónica desconocida");
      return FINITO(v.valor) && unidadValida(v.unidad);
    case "lista": {
      if (!Array.isArray(v.elementos) || v.elementos.length === 0) { error(e, p, "la lista debe tener elementos"); return false; }
      if (typeof v.semantica !== "string" || !["secuencia", "conjunto"].includes(v.semantica)) error(e, p, "semántica de lista inválida");
      if (typeof v.tipo_elemento !== "string" || !["texto", "numero", "booleano", "magnitud"].includes(v.tipo_elemento)) error(e, p, "tipo_elemento inválido");
      const firmas: unknown[] = [];
      let baseUnidad: unknown;
      v.elementos.forEach((item, i) => {
        const ip = `${p}.elementos[${i}]`;
        if (!OBJ(item) || item.tipo !== v.tipo_elemento) { error(e, ip, "el elemento no coincide con tipo_elemento"); return; }
        validarValor(item, ip, e, profundidad + 1);
        if (item.tipo === "magnitud") {
          if (baseUnidad === undefined) baseUnidad = item.unidad;
          else if (baseUnidad !== item.unidad) error(e, ip, "todas las magnitudes de la lista deben usar la misma unidad");
        }
        firmas.push(item);
      });
      if (v.semantica === "conjunto" && firmas.some((item, i) => firmas.slice(0, i).some((prior) => valoresEstructuralmenteIgualesV3(prior, item)))) error(e, p, "un conjunto no puede contener elementos duplicados");
      return true;
    }
    case "dimensiones": {
      if (!Array.isArray(v.ejes) || v.ejes.length < 2) { error(e, p, "se requieren al menos dos ejes"); return false; }
      const ejes = new Set<string>(); let unidad: unknown;
      v.ejes.forEach((axis, i) => {
        const ap = `${p}.ejes[${i}]`;
        if (!OBJ(axis) || typeof axis.eje !== "string" || !["alto", "ancho", "profundidad", "grosor", "otro"].includes(axis.eje)) { error(e, ap, "eje inválido"); return; }
        const key = axis.eje === "otro" ? `otro:${axis.nombre_eje ?? ""}` : `estandar:${String(axis.eje)}`;
        if (axis.eje === "otro" && !TXT(axis.nombre_eje)) error(e, `${ap}.nombre_eje`, "un eje otro requiere nombre");
        if (ejes.has(key)) error(e, ap, "eje duplicado"); ejes.add(key);
        const m = axis.magnitud;
        if (!OBJ(m) || !FINITO(m.valor) || m.valor <= 0 || typeof m.unidad !== "string" || !["mm", "cm", "in"].includes(m.unidad)) error(e, `${ap}.magnitud`, "una dimensión física requiere valor positivo finito y unidad de longitud canónica");
        else if (unidad !== undefined && unidad !== m.unidad) error(e, `${ap}.magnitud.unidad`, "los ejes deben usar la misma unidad canónica");
        else unidad = m.unidad;
      }); return true;
    }
    case "resolucion":
      if (!Number.isInteger(v.ancho) || Number(v.ancho) <= 0 || !Number.isInteger(v.alto) || Number(v.alto) <= 0) error(e, p, "ancho y alto deben ser enteros positivos");
      if (v.unidad !== "px") error(e, `${p}.unidad`, "la resolución debe usar px"); return true;
    case "rango": {
      const min = v.minimo; const max = v.maximo;
      if (!OBJ(min) || !OBJ(max) || !FINITO(min.valor) || !FINITO(max.valor) || !unidadValida(min.unidad) || !unidadValida(max.unidad)) { error(e, p, "los extremos requieren magnitudes finitas y unidades canónicas"); return false; }
      if (min.unidad !== max.unidad) error(e, p, "los extremos deben usar la misma unidad canónica");
      if (min.valor > max.valor) error(e, p, "el mínimo no puede superar al máximo"); return true;
    }
    case "compuesto": {
      if (!Array.isArray(v.componentes) || v.componentes.length === 0) { error(e, p, "el compuesto debe tener componentes"); return false; }
      const keys = new Set<string>();
      v.componentes.forEach((c, i) => {
        const cp = `${p}.componentes[${i}]`;
        if (!OBJ(c) || !TXT(c.clave) || !TXT(c.nombre)) { error(e, cp, "clave y nombre son obligatorios"); return; }
        if (keys.has(c.clave)) error(e, cp, "clave de componente duplicada"); keys.add(c.clave);
        validarValor(c.valor, `${cp}.valor`, e, profundidad + 1);
      }); return true;
    }
    default: error(e, p, `tipo de valor no soportado: ${v.tipo}`); return false;
  }
}

export function validarDatosFichaTecnicaV3(input: unknown): ResultadoValidacionV3 {
  const errores: string[] = [];
  if (!OBJ(input)) return { valido: false, errores: ["ficha: debe ser un objeto"] };
  if (input.version_esquema !== 3) error(errores, "version_esquema", "debe ser 3");
  if (typeof input.categoria !== "string" || !CATEGORIAS.has(input.categoria)) error(errores, "categoria", "categoría V3 no soportada");
  for (const k of ["variantes", "especificaciones", "fuentes", "evidencias", "benchmarks"]) if (!Array.isArray(input[k])) error(errores, k, "debe ser un arreglo");
  if (errores.length) return { valido: false, errores };
  const variants = input.variantes as unknown[]; const specs = input.especificaciones as unknown[];
  const sources = input.fuentes as unknown[]; const evidence = input.evidencias as unknown[]; const benchmarks = input.benchmarks as unknown[];
  const ids = (rows: unknown[], path: string) => {
    const set = new Set<string>();
    rows.forEach((r, i) => { if (!OBJ(r) || !TXT(r.id)) error(errores, `${path}[${i}].id`, "id obligatorio"); else if (set.has(r.id)) error(errores, `${path}[${i}].id`, "id duplicado"); else set.add(r.id); });
    return set;
  };
  const variantIds = ids(variants, "variantes"); const sourceIds = ids(sources, "fuentes"); const evidenceIds = ids(evidence, "evidencias");
  ids(benchmarks, "benchmarks");
  const keys = new Set<string>(); const specIds = new Set<string>();
  variants.forEach((v, i) => {
    if (!OBJ(v)) return;
    for (const field of ["modelo", "sku", "mercado"]) if (!Object.hasOwn(v, field) || (v[field] !== null && typeof v[field] !== "string")) error(errores, `variantes[${i}].${field}`, "debe ser texto o null");
    if (!OBJ(v.identificadores) || Object.values(v.identificadores).some((x) => !TXT(x))) error(errores, `variantes[${i}].identificadores`, "debe ser un mapa de textos no vacíos");
  });
  const nullableRequired = (row: Record<string, unknown>, fields: string[], path: string) => {
    for (const field of fields) if (!Object.hasOwn(row, field) || (row[field] !== null && typeof row[field] !== "string")) error(errores, `${path}.${field}`, "campo requerido: texto o null");
  };
  sources.forEach((s, i) => {
    if (!OBJ(s)) return;
    nullableRequired(s, ["url", "localizador", "consultada_en", "variante_id", "mercado"], `fuentes[${i}]`);
    if (!TXT(s.nombre) || typeof s.tipo !== "string" || !FUENTES.has(s.tipo)) error(errores, `fuentes[${i}]`, "nombre o tipo de fuente inválido");
    if (s.variante_id !== null && s.variante_id !== undefined && (typeof s.variante_id !== "string" || !variantIds.has(s.variante_id))) error(errores, `fuentes[${i}].variante_id`, "variante inexistente");
  });
  evidence.forEach((ev, i) => {
    const p = `evidencias[${i}]`; if (!OBJ(ev)) return;
    nullableRequired(ev, ["localizador", "extracto", "registrada_por"], p);
    if (typeof ev.fuente_id !== "string" || !sourceIds.has(ev.fuente_id)) error(errores, `${p}.fuente_id`, "fuente inexistente");
    if (!OBJ(ev.alcance)) { error(errores, `${p}.alcance`, "alcance obligatorio"); return; }
    if (ev.alcance.tipo === "variante") { if (typeof ev.alcance.variante_id !== "string" || !variantIds.has(ev.alcance.variante_id)) error(errores, `${p}.alcance.variante_id`, "variante inexistente"); }
    else if (ev.alcance.tipo === "todas_las_variantes") {
      if (!Array.isArray(ev.alcance.variante_ids) || ev.alcance.variante_ids.some((id) => typeof id !== "string" || !variantIds.has(id))) error(errores, `${p}.alcance.variante_ids`, "debe enumerar variantes existentes como cadenas");
    } else error(errores, `${p}.alcance.tipo`, "tipo de alcance inválido");
    if (typeof ev.postura !== "string" || !["respalda", "contradice", "contexto"].includes(ev.postura)) error(errores, `${p}.postura`, "postura inválida");
    if (!TXT(ev.registrada_en)) error(errores, `${p}.registrada_en`, "fecha requerida");
    if (!TXT(ev.localizador) && !TXT(ev.extracto)) error(errores, p, "evidencia requiere localizador o extracto concreto");
    const linkedSource = sources.find((item) => OBJ(item) && item.id === ev.fuente_id);
    if (OBJ(linkedSource) && TXT(linkedSource.variante_id) && OBJ(ev.alcance)) {
      if (ev.alcance.tipo === "variante" && ev.alcance.variante_id !== linkedSource.variante_id) error(errores, `${p}.alcance`, "el alcance contradice la variante declarada por la fuente");
      if (ev.alcance.tipo === "todas_las_variantes") error(errores, `${p}.alcance`, "una fuente de variante única no puede cubrir todas las variantes");
    }
  });
  const evidenceById = new Map(evidence.filter(OBJ).map((ev) => [String(ev.id), ev]));
  specs.forEach((s, i) => {
    const p = `especificaciones[${i}]`; if (!OBJ(s)) { error(errores, p, "debe ser un objeto"); return; }
    nullableRequired(s, ["variante_id", "justificacion_estado"], p);
    if (!TXT(s.id) || !TXT(s.clave) || !TXT(s.nombre) || !TXT(s.grupo)) error(errores, p, "id, clave, nombre y grupo son obligatorios");
    if (TXT(s.id) && specIds.has(s.id)) error(errores, `${p}.id`, "id de especificación duplicado"); if (TXT(s.id)) specIds.add(s.id);
    const uniqueKey = `${String(s.variante_id ?? "*")}:${String(s.clave)}`;
    if (keys.has(uniqueKey)) error(errores, `${p}.clave`, "clave duplicada para la misma variante"); keys.add(uniqueKey);
    if (s.variante_id !== null && s.variante_id !== undefined && (typeof s.variante_id !== "string" || !variantIds.has(s.variante_id))) error(errores, `${p}.variante_id`, "variante inexistente");
    if (typeof s.estado_dato !== "string" || !ESTADOS_DATO.has(s.estado_dato)) error(errores, `${p}.estado_dato`, "estado del dato inválido");
    if (s.estado_dato === "no_aplica" && !TXT(s.justificacion_estado)) error(errores, `${p}.justificacion_estado`, "no_aplica requiere justificación");
    if (s.estado_dato !== "no_aplica" && s.justificacion_estado !== null && s.justificacion_estado !== undefined && typeof s.justificacion_estado !== "string") error(errores, `${p}.justificacion_estado`, "debe ser texto o null");
    const originalOk = OBJ(s.valor_original) && TXT(s.valor_original.texto) && (s.valor_original.unidad === null || typeof s.valor_original.unidad === "string");
    if (s.estado_dato === "conocido" && !originalOk) error(errores, `${p}.valor_original`, "dato conocido requiere el valor original");
    if (s.estado_dato !== "conocido" && s.valor_original !== null) error(errores, `${p}.valor_original`, "dato ausente no debe llevar valor original");
    if (!OBJ(s.normalizacion) || typeof s.normalizacion.estado !== "string" || !["normalizada", "no_segura", "no_procesada"].includes(s.normalizacion.estado)) error(errores, `${p}.normalizacion`, "estado de normalización inválido");
    else if (s.estado_dato === "conocido") {
      if (s.normalizacion.estado === "normalizada") {
        validarValor(s.normalizacion.valor, `${p}.normalizacion.valor`, errores);
        if (s.normalizacion.regla_conversion_id !== null && !TXT(s.normalizacion.regla_conversion_id)) error(errores, `${p}.normalizacion.regla_conversion_id`, "debe ser un id no vacío o null");
        const precision = s.normalizacion.precision;
        if (precision !== null && (!OBJ(precision) || !(precision.decimales === null || (FINITO(precision.decimales) && Number.isInteger(precision.decimales) && precision.decimales >= 0)))) error(errores, `${p}.normalizacion.precision`, "decimales debe ser entero no negativo o null");
      }
      else if (s.normalizacion.estado === "no_segura") { if (s.normalizacion.valor !== null || s.normalizacion.regla_conversion_id !== null || s.normalizacion.precision !== null || !TXT(s.normalizacion.motivo)) error(errores, `${p}.normalizacion`, "no_segura requiere valor, regla y precisión null, además de un motivo"); }
      else error(errores, `${p}.normalizacion`, "dato conocido no puede quedar no_procesada");
    } else if (s.normalizacion.estado !== "no_procesada" || s.normalizacion.valor !== null || s.normalizacion.regla_conversion_id !== null || s.normalizacion.precision !== null) error(errores, `${p}.normalizacion`, "dato ausente requiere no_procesada y valores de normalización null");
    const evIds = Array.isArray(s.evidencia_ids) ? s.evidencia_ids.filter((id): id is string => typeof id === "string") : [];
    if (!Array.isArray(s.evidencia_ids)) error(errores, `${p}.evidencia_ids`, "debe ser un arreglo");
    if (Array.isArray(s.evidencia_ids)) s.evidencia_ids.forEach((id) => { if (typeof id !== "string" || !evidenceIds.has(id)) error(errores, `${p}.evidencia_ids`, `evidencia inexistente o id no textual: ${String(id)}`); });
    const conflict = OBJ(s.revision_conflicto) ? s.revision_conflicto : null;
    if (!conflict || typeof conflict.estado !== "string" || !["sin_conflicto", "conflicto_pendiente", "conflicto_resuelto"].includes(conflict.estado)) error(errores, `${p}.revision_conflicto`, "revisión de conflicto inválida");
    else if (["resolucion", "resuelto_en", "resuelto_por"].some((field) => !Object.hasOwn(conflict, field) || (conflict[field] !== null && typeof conflict[field] !== "string"))) error(errores, `${p}.revision_conflicto`, "campos de resolución deben declararse como texto o null");
    else if (conflict.estado === "conflicto_pendiente" && (conflict.resolucion !== null || conflict.resuelto_en !== null || conflict.resuelto_por !== null)) error(errores, `${p}.revision_conflicto`, "conflicto pendiente no puede declarar resolución");
    else if (conflict.estado === "conflicto_resuelto" && (!TXT(conflict.resolucion) || !TXT(conflict.resuelto_en) || !TXT(conflict.resuelto_por))) error(errores, `${p}.revision_conflicto`, "conflicto resuelto requiere resolución, fecha y responsable");
    const linkedEvidence = evIds.map((id) => evidenceById.get(id)).filter((ev): ev is Record<string, unknown> => !!ev);
    linkedEvidence.forEach((ev) => {
      const compatible = esAlcanceCompatibleConVariante(ev.alcance as AlcanceEvidenciaV3, s.variante_id as string | null, variantIds);
      if (!compatible) error(errores, `${p}.evidencia_ids`, "la evidencia no cubre la variante de la especificación");
    });
    const hasContradiction = linkedEvidence.some((ev) => ev.postura === "contradice");
    if (hasContradiction && conflict?.estado !== "conflicto_resuelto") error(errores, `${p}.revision_conflicto`, "la evidencia contradictoria requiere resolución explícita");
    if (!OBJ(s.verificacion) || typeof s.verificacion.estado !== "string" || !ESTADOS_VERIFICACION.has(s.verificacion.estado)) error(errores, `${p}.verificacion`, "estado de verificación inválido");
    else {
      const ver = s.verificacion;
      nullableRequired(ver, ["verificado_en", "verificado_por", "evento_auditoria_id", "motivo_revision"], `${p}.verificacion`);
      if (ver.estado === "requiere_revision" && !TXT(ver.motivo_revision)) error(errores, `${p}.verificacion.motivo_revision`, "requiere_revision necesita motivo");
      if (ver.estado === "verificado") {
        if (s.estado_dato !== "conocido") error(errores, `${p}.verificacion`, "solo un dato conocido puede marcarse verificado");
        if (!TXT(ver.verificado_en) || !TXT(ver.verificado_por) || !TXT(ver.evento_auditoria_id)) error(errores, `${p}.verificacion`, "verificado requiere fecha, responsable y evento de auditoría");
        if (conflict?.estado === "conflicto_pendiente") error(errores, `${p}.verificacion`, "un conflicto pendiente impide verificar");
        const supports = linkedEvidence.filter((ev) => ev.postura === "respalda");
        if (supports.length === 0) error(errores, `${p}.verificacion`, "verificado requiere evidencia que respalde el dato");
        if (conflict?.estado === "conflicto_resuelto" && (!TXT(conflict.resolucion) || !TXT(conflict.resuelto_por))) error(errores, `${p}.revision_conflicto`, "resolución de conflicto incompleta");
      }
      if (ver.estado === "con_fuente" && evIds.length === 0) error(errores, `${p}.verificacion`, "con_fuente requiere al menos una evidencia enlazada");
    }
    validarComparacion(s.comparacion, s.normalizacion, `${p}.comparacion`, errores);
  });
  benchmarks.forEach((b, i) => {
    const p = `benchmarks[${i}]`; if (!OBJ(b)) return;
    nullableRequired(b, ["version", "plataforma", "modo_ejecucion", "fecha_ejecucion", "regla_conversion_id"], p);
    if (b.regla_conversion_id !== null && !TXT(b.regla_conversion_id)) error(errores, `${p}.regla_conversion_id`, "debe ser un id no vacío o null");
    const benchmarkResult = OBJ(b.resultado) ? b.resultado : null;
    if (!TXT(b.nombre_prueba) || !benchmarkResult || !FINITO(benchmarkResult.valor) || !unidadValida(benchmarkResult.unidad)) error(errores, p, "benchmark requiere nombre y resultado numérico finito con unidad");
    if (!OBJ(b.resultado_original) || !TXT(b.resultado_original.texto) || (b.resultado_original.unidad !== null && typeof b.resultado_original.unidad !== "string")) error(errores, `${p}.resultado_original`, "resultado original inválido");
    if (typeof b.fuente_id !== "string" || !sourceIds.has(b.fuente_id)) error(errores, `${p}.fuente_id`, "fuente inexistente");
    const ev = typeof b.evidencia_id === "string" ? evidenceById.get(b.evidencia_id) : undefined; if (!ev) error(errores, `${p}.evidencia_id`, "evidencia inexistente");
    if (OBJ(ev) && ev.fuente_id !== b.fuente_id) error(errores, `${p}.evidencia_id`, "la evidencia debe pertenecer a la fuente declarada por el benchmark");
    if (typeof b.variante_id !== "string" || !variantIds.has(b.variante_id)) error(errores, `${p}.variante_id`, "variante inexistente");
    if (OBJ(ev) && OBJ(ev.alcance) && (ev.alcance.tipo !== "variante" || ev.alcance.variante_id !== b.variante_id)) error(errores, `${p}.evidencia_id`, "benchmark requiere evidencia de su variante exacta");
    const benchmarkConflict = OBJ(b.revision_conflicto) ? b.revision_conflicto : null;
    const benchmarkVerification = OBJ(b.verificacion) ? b.verificacion : null;
    if (!benchmarkVerification || typeof benchmarkVerification.estado !== "string") error(errores, `${p}.verificacion`, "estado de verificación inválido");
    else nullableRequired(benchmarkVerification, ["verificado_en", "verificado_por", "evento_auditoria_id", "motivo_revision"], `${p}.verificacion`);
    if (!benchmarkConflict || typeof benchmarkConflict.estado !== "string" || !["sin_conflicto", "conflicto_pendiente", "conflicto_resuelto"].includes(benchmarkConflict.estado)) error(errores, `${p}.revision_conflicto`, "revisión de conflicto inválida");
    else nullableRequired(benchmarkConflict, ["resuelto_en", "resuelto_por", "resolucion"], `${p}.revision_conflicto`);
    if (benchmarkConflict?.estado === "conflicto_pendiente" && (benchmarkConflict.resolucion !== null || benchmarkConflict.resuelto_en !== null || benchmarkConflict.resuelto_por !== null)) error(errores, `${p}.revision_conflicto`, "conflicto pendiente no puede declarar resolución");
    if (benchmarkConflict?.estado === "conflicto_resuelto" && (!TXT(benchmarkConflict.resolucion) || !TXT(benchmarkConflict.resuelto_en) || !TXT(benchmarkConflict.resuelto_por))) error(errores, `${p}.revision_conflicto`, "conflicto resuelto requiere resolución, fecha y responsable");
    if (ev?.postura === "contradice" && benchmarkConflict?.estado !== "conflicto_resuelto") error(errores, `${p}.revision_conflicto`, "la evidencia contradictoria requiere conflicto_resuelto");
    if (!benchmarkVerification || typeof benchmarkVerification.estado !== "string" || !ESTADOS_VERIFICACION.has(benchmarkVerification.estado)) error(errores, `${p}.verificacion`, "estado de verificación inválido");
    if (benchmarkVerification?.estado === "verificado" && benchmarkConflict?.estado === "conflicto_pendiente") error(errores, `${p}.verificacion`, "conflicto pendiente impide verificar benchmark");
    if (benchmarkVerification?.estado === "verificado" && (ev?.postura !== "respalda" || !TXT(benchmarkVerification.verificado_por) || !TXT(benchmarkVerification.verificado_en) || !TXT(benchmarkVerification.evento_auditoria_id))) error(errores, `${p}.verificacion`, "benchmark verificado requiere evidencia de respaldo y auditoría");
    if (benchmarkVerification?.estado === "requiere_revision" && !TXT(benchmarkVerification.motivo_revision)) error(errores, `${p}.verificacion`, "requiere_revision necesita motivo");
    if (benchmarkVerification?.estado === "con_fuente" && !ev) error(errores, `${p}.verificacion`, "con_fuente requiere evidencia enlazada");
    if (benchmarkVerification?.estado === "verificado" && benchmarkConflict?.estado === "conflicto_resuelto" && (!TXT(benchmarkConflict.resolucion) || !TXT(benchmarkConflict.resuelto_por) || !TXT(benchmarkConflict.resuelto_en))) error(errores, `${p}.revision_conflicto`, "conflicto resuelto requiere resolución, fecha y responsable");
  });
  return { valido: errores.length === 0, errores };
}

function validarComparacion(rule: unknown, normalization: unknown, p: string, e: string[]): void {
  if (!OBJ(rule) || typeof rule.habilitada !== "boolean") { error(e, p, "regla de comparación inválida"); return; }
  if (!rule.habilitada) return;
  if (!TXT(rule.id)) error(e, `${p}.id`, "id de regla obligatorio");
  if (rule.modo === "orden_numerico") {
    if (!unidadValida(rule.unidad)) error(e, `${p}.unidad`, "unidad de comparación inválida");
    if (typeof rule.direccion !== "string" || !["mayor_es_mejor", "menor_es_mejor", "objetivo"].includes(rule.direccion)) error(e, `${p}.direccion`, "dirección inválida");
    if (rule.direccion === "objetivo" && !FINITO(rule.objetivo)) error(e, `${p}.objetivo`, "comparación por objetivo requiere número finito");
    if (rule.direccion !== "objetivo" && rule.objetivo !== null) error(e, `${p}.objetivo`, "objetivo solo se usa con dirección objetivo");
    if (rule.tolerancia !== null) {
      if (!OBJ(rule.tolerancia) || !FINITO(rule.tolerancia.valor) || rule.tolerancia.valor < 0 || rule.tolerancia.unidad !== rule.unidad) error(e, `${p}.tolerancia`, "tolerancia debe ser finita, no negativa y usar la unidad de la regla");
    }
    if (!OBJ(normalization) || normalization.estado !== "normalizada") error(e, p, "solo se comparan valores normalizados");
    else {
      const normalizedValue = OBJ(normalization.valor) ? normalization.valor : null;
      if (!normalizedValue || normalizedValue.tipo !== "magnitud" || normalizedValue.unidad !== rule.unidad) error(e, p, "orden_numerico solo admite magnitud escalar en la unidad de la regla");
    }
  } else if (rule.modo === "igualdad_estructural") {
    if (rule.unidad !== null || rule.direccion !== "igualdad" || rule.objetivo !== null || rule.tolerancia !== null) error(e, p, "igualdad estructural no admite unidad, dirección de ranking ni tolerancia");
    if (!OBJ(normalization) || normalization.estado !== "normalizada") error(e, p, "igualdad estructural requiere valor normalizado");
  } else error(e, `${p}.modo`, "modo de comparación no soportado");
}

export type RutaFichaTecnica = "v1" | "v2" | "v3" | "legacy";
export interface ResultadoDespachoFicha { ruta: RutaFichaTecnica | "error"; errores: string[] }

/** Marcadores exclusivos: evidencias en raíz o especificaciones V3 junto a categoría V3 / sobre V3 completo. */
export function tieneMarcadoresV3(input: unknown): boolean {
  if (!OBJ(input)) return false;
  return Object.hasOwn(input, "evidencias") || (Object.hasOwn(input, "especificaciones") && (
    (typeof input.categoria === "string" && CATEGORIAS.has(input.categoria)) ||
    ["variantes", "fuentes", "benchmarks"].every((key) => Object.hasOwn(input, key))
  ));
}

export function despacharFichaTecnica(input: unknown): ResultadoDespachoFicha {
  if (!OBJ(input)) return { ruta: "legacy", errores: [] };
  const marker = tieneMarcadoresV3(input);
  if (!Object.hasOwn(input, "version_esquema")) return marker
    ? { ruta: "error", errores: ["version_esquema: es obligatorio para una ficha técnica V3"] }
    : { ruta: "legacy", errores: [] };
  const version = input.version_esquema;
  if (typeof version !== "number" || !Number.isFinite(version) || !Number.isInteger(version)) return { ruta: "error", errores: ["version_esquema: debe ser un entero soportado (1, 2 o 3)"] };
  if (version === 3) { const result = validarDatosFichaTecnicaV3(input); return result.valido ? { ruta: "v3", errores: [] } : { ruta: "error", errores: result.errores }; }
  if (version !== 1 && version !== 2) return { ruta: "error", errores: [`version_esquema no soportada: ${version}`] };
  if (marker) return { ruta: "error", errores: [`version_esquema: la estructura contiene marcadores V3 y no puede declararse como V${version}`] };
  return { ruta: version === 1 ? "v1" : "v2", errores: [] };
}

export function esDatosFichaTecnicaV3(input: unknown): input is DatosFichaTecnicaV3 {
  return validarDatosFichaTecnicaV3(input).valido;
}
