import Tag, { type TagProps } from "./Tag";

export type EstadoDatoProps = Omit<TagProps, "variant" | "children"> & {
  estado: "verificado" | "pendiente" | "sin-dato";
};

const estados = {
  verificado: { variant: "verified", icono: "✓", etiqueta: "Verificado" },
  pendiente: { variant: "pending", icono: "◷", etiqueta: "Pendiente" },
  "sin-dato": { variant: "missing", icono: "—", etiqueta: "Sin dato" },
} as const;

/** Presenta el estado recibido; no lo deduce del valor ni de su existencia. */
export default function EstadoDato({ estado, ...props }: EstadoDatoProps) {
  const { variant, icono, etiqueta } = estados[estado];
  return (
    <Tag {...props} variant={variant}>
      <span aria-hidden="true">{icono}</span>
      {etiqueta}
    </Tag>
  );
}
