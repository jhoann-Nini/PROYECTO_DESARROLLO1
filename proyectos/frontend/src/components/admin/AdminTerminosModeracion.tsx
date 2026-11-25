"use client";

import { useEffect, useState } from "react";
import type { CategoriaTerminoModeracion, TerminoModeracion } from "@/types/administracion";
import {
  ApiError,
  crearTerminoModeracion,
  desactivarTerminoModeracion,
  obtenerTerminosModeracion,
} from "@/services/api";
import { CLASE_FOCO } from "@/components/ui/foco";

type FiltroEstado = "ACTIVOS" | "INACTIVOS" | "TODOS";

const CATEGORIAS: { valor: CategoriaTerminoModeracion; etiqueta: string; ayuda: string }[] = [
  { valor: "INSULTO", etiqueta: "Insulto", ayuda: "riesgo medio" },
  { valor: "ACOSO", etiqueta: "Acoso", ayuda: "riesgo medio" },
  { valor: "DISCRIMINACION", etiqueta: "Discriminación", ayuda: "riesgo medio" },
  { valor: "SPAM", etiqueta: "Spam", ayuda: "riesgo medio" },
  { valor: "AMENAZA", etiqueta: "Amenaza", ayuda: "riesgo alto, primero en la cola" },
];

const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" });

function formatear(valor: string | null): string {
  if (!valor) return "";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? valor : FORMATO_FECHA.format(fecha);
}

const CLASE_CAMPO = `mt-1 block w-full rounded-card border border-line bg-paper px-3 py-1.5 text-sm text-ink focus:border-brand-blue ${CLASE_FOCO}`;
const CLASE_BOTON = `cursor-pointer rounded-card border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`;

/**
 * Caso 6: términos que los administradores agregan al filtro automático.
 * Solo los evalúa el servidor; la lista base sigue en el código.
 */
export default function AdminTerminosModeracion() {
  const [filtro, setFiltro] = useState<FiltroEstado>("ACTIVOS");
  const [terminos, setTerminos] = useState<TerminoModeracion[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const [nuevoTermino, setNuevoTermino] = useState("");
  const [categoria, setCategoria] = useState<CategoriaTerminoModeracion>("INSULTO");
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [desactivando, setDesactivando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerTerminosModeracion(filtro)
      .then((datos) => {
        if (!activo) return;
        setTerminos(datos);
        setErrorCarga(null);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setErrorCarga(err instanceof Error ? err.message : "No fue posible cargar los términos.");
      });
    return () => {
      activo = false;
    };
  }, [filtro, intento]);

  async function agregar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    if (nuevoTermino.trim() === "") {
      setErrorFormulario("Escribe el término.");
      return;
    }
    setGuardando(true);
    setErrorFormulario(null);
    setMensaje(null);
    try {
      const creado = await crearTerminoModeracion(nuevoTermino, categoria);
      if (filtro !== "INACTIVOS") {
        setTerminos((previos) => [creado, ...(previos ?? [])]);
      }
      setNuevoTermino("");
      setMensaje(`«${creado.termino}» agregado. Las reseñas nuevas que lo contengan quedarán en revisión.`);
    } catch (err) {
      setErrorFormulario(err instanceof ApiError ? err.message : "No fue posible agregar el término.");
    } finally {
      setGuardando(false);
    }
  }

  async function desactivar(termino: TerminoModeracion) {
    if (desactivando) return;
    setDesactivando(true);
    setErrorAccion(null);
    setMensaje(null);
    try {
      const actualizado = await desactivarTerminoModeracion(termino.idTermino);
      setTerminos((previos) =>
        filtro === "ACTIVOS"
          ? (previos ?? []).filter((t) => t.idTermino !== termino.idTermino)
          : (previos ?? []).map((t) => (t.idTermino === termino.idTermino ? actualizado : t)),
      );
      setConfirmando(null);
      setMensaje(`«${termino.termino}» desactivado.`);
    } catch (err) {
      setErrorAccion(err instanceof ApiError ? err.message : "No fue posible desactivar el término.");
    } finally {
      setDesactivando(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="rounded-card border border-line bg-canvas p-3 text-xs text-subtle">
        Estas palabras solo las revisa el servidor: el autor no recibe aviso previo y su reseña queda en
        revisión. Se detectan sin importar mayúsculas, tildes, números en lugar de letras ni separadores, y
        siempre como palabra completa. La lista base del filtro no se modifica desde aquí.
      </p>

      <form onSubmit={agregar} className="flex flex-wrap items-end gap-3" noValidate>
        <label htmlFor="termino-moderacion-nuevo" className="min-w-48 flex-1 text-xs font-medium text-subtle">
          Término
          <input
            id="termino-moderacion-nuevo"
            type="text"
            value={nuevoTermino}
            onChange={(evento) => {
              setNuevoTermino(evento.target.value);
              if (evento.target.value.trim() !== "") setErrorFormulario(null);
            }}
            maxLength={60}
            placeholder="Palabra o frase corta"
            aria-describedby={errorFormulario ? "termino-moderacion-error" : undefined}
            className={CLASE_CAMPO}
          />
        </label>
        <label htmlFor="termino-moderacion-categoria" className="text-xs font-medium text-subtle">
          Categoría
          <select
            id="termino-moderacion-categoria"
            value={categoria}
            onChange={(evento) => setCategoria(evento.target.value as CategoriaTerminoModeracion)}
            className={CLASE_CAMPO}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {`${c.etiqueta} (${c.ayuda})`}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={guardando} className={CLASE_BOTON}>
          {guardando ? "Agregando…" : "Agregar término"}
        </button>
      </form>
      {errorFormulario && (
        <p id="termino-moderacion-error" role="alert" className="text-xs text-status-error">
          {errorFormulario}
        </p>
      )}
      {mensaje && (
        <p role="status" className="rounded-card border border-surface-border-strong bg-surface-2 p-3 text-xs text-ink">
          {mensaje}
        </p>
      )}
      {errorAccion && (
        <p role="alert" className="rounded-card border border-status-error bg-paper p-3 text-xs text-status-error">
          {errorAccion}
        </p>
      )}

      <label htmlFor="termino-moderacion-filtro" className="block text-xs font-medium text-subtle">
        Mostrar
        <select
          id="termino-moderacion-filtro"
          value={filtro}
          onChange={(evento) => {
            setFiltro(evento.target.value as FiltroEstado);
            setTerminos(null);
            setConfirmando(null);
          }}
          className={`${CLASE_CAMPO} max-w-xs`}
        >
          <option value="ACTIVOS">Activos</option>
          <option value="INACTIVOS">Desactivados</option>
          <option value="TODOS">Todos</option>
        </select>
      </label>

      {errorCarga ? (
        <div role="alert" className="rounded-card border border-status-error bg-paper p-3 text-xs text-status-error">
          <p>{errorCarga}</p>
          <button type="button" onClick={() => setIntento((v) => v + 1)} className={`mt-2 ${CLASE_BOTON}`}>
            Reintentar
          </button>
        </div>
      ) : terminos === null ? (
        <p role="status" aria-busy="true" className="text-xs text-subtle">
          Cargando términos…
        </p>
      ) : terminos.length === 0 ? (
        <p className="text-xs text-subtle">No hay términos agregados.</p>
      ) : (
        <ul className="space-y-2" aria-label="Términos de moderación">
          {terminos.map((t) => (
            <li key={t.idTermino} className="rounded-card border border-line bg-paper p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ink">{t.termino}</p>
                  <p className="mt-0.5 text-xs text-subtle">
                    <span className="rounded-full bg-canvas px-2 py-0.5 font-medium text-ink">
                      {t.etiquetaCategoria}
                    </span>{" "}
                    {`Agregado por ${t.creadoPor ?? "un administrador"} el ${formatear(t.fechaCreacion)}`}
                  </p>
                  {!t.activo && (
                    <p className="mt-0.5 text-xs text-subtle">
                      {`Desactivado por ${t.desactivadoPor ?? "un administrador"} el ${formatear(t.fechaDesactivacion)}`}
                    </p>
                  )}
                </div>
                {t.activo && confirmando !== t.idTermino && (
                  <button
                    type="button"
                    onClick={() => setConfirmando(t.idTermino)}
                    aria-label={`Desactivar ${t.termino}`}
                    className={CLASE_BOTON}
                  >
                    Desactivar
                  </button>
                )}
              </div>
              {confirmando === t.idTermino && (
                <div className="mt-2 rounded-card border border-surface-border-strong bg-surface-2 p-2 text-xs text-star">
                  <p>{`¿Desactivar «${t.termino}»? Las reseñas nuevas con este término ya no quedarán en revisión.`}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => desactivar(t)} disabled={desactivando} className={CLASE_BOTON}>
                      Sí, desactivar
                    </button>
                    <button type="button" onClick={() => setConfirmando(null)} className={CLASE_BOTON}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
