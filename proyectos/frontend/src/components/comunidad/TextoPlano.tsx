/**
 * Texto de la comunidad: solo texto plano con saltos de línea (RN-03). React
 * escapa el contenido y los enlaces no se convierten en vínculos.
 */
export default function TextoPlano({ texto, className = "" }: { texto: string; className?: string }) {
  return <p className={`whitespace-pre-line break-words text-sm leading-relaxed text-[var(--color-ink)] ${className}`}>{texto}</p>;
}
