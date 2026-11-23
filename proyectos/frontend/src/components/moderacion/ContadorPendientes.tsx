/**
 * Número de pendientes junto a una pestaña o un botón del panel de
 * moderación. No se muestra cuando no hay pendientes o el dato no cargó.
 */
export default function ContadorPendientes({
  cantidad,
}: {
  cantidad: number | null | undefined;
}) {
  if (!cantidad || cantidad <= 0) return null;
  const texto = cantidad > 99 ? "99+" : String(cantidad);
  return (
    <>
      <span
        aria-hidden="true"
        className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-brand-solid)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-[var(--color-on-solid)]"
      >
        {texto}
      </span>
      <span className="sr-only">
        {`(${cantidad} ${cantidad === 1 ? "pendiente" : "pendientes"})`}
      </span>
    </>
  );
}
