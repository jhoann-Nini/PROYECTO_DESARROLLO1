import type { EstadoVisibleRespuesta } from "@/types/comunidad";

const AVISOS: Record<Exclude<EstadoVisibleRespuesta, "VISIBLE">, string> = {
  ELIMINADA: "Esta respuesta fue eliminada.",
  OCULTA: "Esta respuesta no está disponible.",
  EN_REVISION: "Esta respuesta está en revisión.",
};

/** Ocupa el lugar de una respuesta que no se puede leer; sus respuestas siguen visibles (RN-10). */
export default function ContenidoNoVisible({ estado }: { estado: EstadoVisibleRespuesta }) {
  if (estado === "VISIBLE") return null;
  return <p className="text-sm italic text-[var(--color-subtle)]">{AVISOS[estado]}</p>;
}
