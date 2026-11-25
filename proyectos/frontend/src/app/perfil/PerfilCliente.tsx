"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { obtenerResenas, type ResenaResponse } from "@/services/api";
import { esAdministrador, esRepresentante, puedeModerar } from "@/types/producto";
import { useSesionTecReview } from "@/hooks/useSesionTecReview";
import { useFavoritos } from "@/hooks/useFavoritos";
import { useComparador } from "@/hooks/useComparador";
import AuthModal from "@/components/AuthModal";
import AdminPanelModal from "@/components/AdminPanelModal";
import PanelModeracionModal from "@/components/moderacion/PanelModeracionModal";
import ContadorPendientes from "@/components/moderacion/ContadorPendientes";
import { useResumenPendientesModeracion } from "@/hooks/useResumenPendientesModeracion";
import EstadoCuentaReincidencia from "@/components/perfil/EstadoCuentaReincidencia";
import DecisionesModeracion from "@/components/perfil/DecisionesModeracion";
import PanelRepresentanteModal from "@/components/representante/PanelRepresentanteModal";
import { CLASE_FOCO } from "@/components/ui/foco";
import EstadoVacio from "@/components/ui/EstadoVacio";
import Button, { buttonClassName } from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";

function formatearFecha(valor?: string): string {
  if (!valor) return "No registrada";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
  }).format(fecha);
}

export default function PerfilCliente() {
  const {
    usuario,
    cargando,
    error,
    establecerUsuario,
    limpiarError,
    cerrarSesion,
    reintentar,
  } = useSesionTecReview();
  const { ids: favoritos, hidratado: favoritosHidratados } = useFavoritos();
  const { ids: comparador, hidratado: comparadorHidratado } = useComparador();

  const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
  const [modalAdminAbierto, setModalAdminAbierto] = useState(false);
  const [modalModeracionAbierto, setModalModeracionAbierto] = useState(false);
  const [modalRepresentanteAbierto, setModalRepresentanteAbierto] =
    useState(false);
  const [resenas, setResenas] = useState<ResenaResponse[]>([]);
  const [cargandoResenas, setCargandoResenas] = useState(false);
  const [errorResenas, setErrorResenas] = useState<string | null>(null);
  const [intentoResenas, setIntentoResenas] = useState(0);

  const esAdmin = useMemo(() => esAdministrador(usuario), [usuario]);
  const esModerador = useMemo(() => puedeModerar(usuario), [usuario]);
  // Contador del botón: se pausa con el panel abierto (el panel lleva el suyo)
  // y se vuelve a consultar al cerrarlo, para reflejar las decisiones tomadas.
  const { resumen: resumenPendientes } = useResumenPendientesModeracion(
    esModerador && !modalModeracionAbierto,
  );
  const esRep = useMemo(() => esRepresentante(usuario), [usuario]);

  function reintentarResenas() {
    setCargandoResenas(true);
    setErrorResenas(null);
    setIntentoResenas((valor) => valor + 1);
  }

  useEffect(() => {
    const idUsuario = usuario?.idUsuario;
    if (!idUsuario) {
      return;
    }

    let activo = true;

    const cargarResenas = async () => {
      setCargandoResenas(true);
      setErrorResenas(null);

      try {
        const todas = await obtenerResenas();
        if (!activo) return;

        setResenas(
          todas.filter((resena) => resena.idUsuario === idUsuario),
        );
      } catch (err: unknown) {
        if (!activo) return;

        setResenas([]);
        setErrorResenas(
          err instanceof Error
            ? err.message
            : "No fue posible cargar tus reseñas.",
        );
      } finally {
        if (activo) setCargandoResenas(false);
      }
    };

    void cargarResenas();

    return () => {
      activo = false;
    };
  }, [usuario?.idUsuario, intentoResenas]);

  if (cargando) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          role="status"
          aria-busy="true"
          className="flex flex-col items-center justify-center rounded-card border border-line bg-paper p-12 text-center"
        >
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-brand-blue" />
          <p className="mt-4 text-sm text-subtle">
            Consultando tu perfil…
          </p>
        </div>
      </main>
    );
  }

  if (!usuario) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-card border border-line bg-paper p-8 text-center sm:p-10">
          <span
            aria-hidden="true"
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-7 w-7"
            >
              <circle cx="12" cy="8.25" r="3.75" />
              <path strokeLinecap="round" d="M4.5 20.25a7.5 7.5 0 0 1 15 0" />
            </svg>
          </span>

          <h1 className="mt-4 text-2xl font-medium uppercase tracking-normal text-ink">
            Inicia sesión para ver tu perfil
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-subtle">
            Tu perfil reúne tus reseñas y el acceso a tus favoritos y al
            comparador. La sesión se valida con Supabase y el backend de
            TecReview.
          </p>

          {error && (
            <p role="alert" className="mt-4 text-sm text-status-error">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              variant="primary"
              type="button"
              onClick={() => {
                limpiarError();
                setModalAuthAbierto(true);
              }}
            >
              Iniciar sesión
            </Button>
            <Link
              href="/productos"
              className={buttonClassName("secondary")}
            >
              Explorar catálogo
            </Link>
            {error && (
              <Button
                variant="secondary"
                type="button"
                onClick={reintentar}
              >
                Reintentar conexión
              </Button>
            )}
          </div>
        </section>

        <AuthModal
          isOpen={modalAuthAbierto}
          onClose={() => setModalAuthAbierto(false)}
          onLoginSuccess={(nuevoUsuario) => {
            establecerUsuario(nuevoUsuario);
            setModalAuthAbierto(false);
          }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[11px] font-medium uppercase tracking-normal text-subtle">
          Cuenta TecReview
        </p>
        <h1 className="mt-2 text-2xl font-medium uppercase tracking-normal text-ink sm:text-3xl">
          Mi perfil
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-subtle">
          Datos confirmados por el backend y tu actividad dentro de la
          plataforma.
        </p>
      </header>

      <section
        aria-labelledby="titulo-datos-perfil"
        className="mt-6 rounded-card border border-line bg-paper p-5 sm:p-6"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {usuario.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={usuario.avatar}
                alt={`Avatar de ${usuario.nombre}`}
                className="h-16 w-16 shrink-0 rounded-full border border-line object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                data-testid="avatar-placeholder"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-8 w-8"
                >
                  <circle cx="12" cy="8.25" r="3.75" />
                  <path
                    strokeLinecap="round"
                    d="M4.5 20.25a7.5 7.5 0 0 1 15 0"
                  />
                </svg>
              </span>
            )}

            <div className="min-w-0">
              <h2
                id="titulo-datos-perfil"
                className="truncate text-xl font-medium uppercase tracking-normal text-ink"
              >
                {usuario.nombre}
              </h2>
              <p className="text-sm text-subtle">
                @{usuario.usuario}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Tag variant="neutral">
                  {usuario.rol || "Usuario registrado"}
                </Tag>
                <Tag variant={usuario.activo === false ? "pending" : "verified"}>
                  {usuario.activo === false ? "Cuenta inactiva" : "Cuenta activa"}
                </Tag>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {esAdmin && (
              <Button
                variant="secondary"
                type="button"
                onClick={() => setModalAdminAbierto(true)}
              >
                Panel de administración
              </Button>
            )}
            {esModerador && (
              <Button
                variant="secondary"
                type="button"
                onClick={() => setModalModeracionAbierto(true)}
              >
                Panel de moderación
                <ContadorPendientes cantidad={resumenPendientes?.total} />
              </Button>
            )}
            {(esAdmin || esRep) && (
              <Button
                variant="secondary"
                type="button"
                onClick={() => setModalRepresentanteAbierto(true)}
              >
                Panel de representante
              </Button>
            )}
            <Button
              variant="danger"
              type="button"
              onClick={cerrarSesion}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-dotted border-line pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-normal text-subtle">
              Correo electrónico
            </dt>
            <dd className="mt-1 break-all text-sm font-medium text-ink">
              {usuario.email}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-normal text-subtle">
              Miembro desde
            </dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {formatearFecha(usuario.fechaRegistro)}
            </dd>
          </div>
        </dl>

        {error && (
          <p role="alert" className="mt-4 text-sm text-status-error">
            {error}
          </p>
        )}
      </section>

      <EstadoCuentaReincidencia idUsuario={usuario.idUsuario} />
      <DecisionesModeracion idUsuario={usuario.idUsuario} />

      <section aria-label="Resumen de actividad" className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-line bg-paper p-4">
          <p className="text-[11px] font-medium uppercase tracking-normal text-subtle">
            Mis reseñas
          </p>
          <p className="mt-1 text-2xl font-medium tabular-nums text-ink">
            {cargandoResenas ? "—" : resenas.length}
          </p>
        </div>
        <Link
          href="/favoritos"
          className={`rounded-card border border-line bg-paper p-4 transition-colors hover:border-brand-blue ${CLASE_FOCO}`}
        >
          <p className="text-[11px] font-medium uppercase tracking-normal text-subtle">
            Favoritos
          </p>
          <p className="mt-1 text-2xl font-medium tabular-nums text-ink">
            {favoritosHidratados ? favoritos.length : "—"}
          </p>
          <p className="mt-1 text-xs text-brand-blue">
            Ver favoritos →
          </p>
        </Link>
        <Link
          href="/comparador"
          className={`rounded-card border border-line bg-paper p-4 transition-colors hover:border-brand-blue ${CLASE_FOCO}`}
        >
          <p className="text-[11px] font-medium uppercase tracking-normal text-subtle">
            Comparador
          </p>
          <p className="mt-1 text-2xl font-medium tabular-nums text-ink">
            {comparadorHidratado ? comparador.length : "—"}
          </p>
          <p className="mt-1 text-xs text-brand-blue">
            Ver comparador →
          </p>
        </Link>
      </section>

      <section aria-labelledby="titulo-mis-resenas" className="mt-8">
        <h2
          id="titulo-mis-resenas"
          className="text-lg font-medium uppercase tracking-normal text-ink"
        >
          Mis reseñas
        </h2>
        <p className="mt-1 text-sm text-subtle">
          Opiniones que has publicado en el catálogo.
        </p>

        {cargandoResenas ? (
          <p role="status" className="mt-4 text-sm text-subtle">
            Cargando tus reseñas…
          </p>
        ) : errorResenas ? (
          <EstadoVacio
            className="mt-4"
            tipo="error"
            titulo="No pudimos cargar tus reseñas"
            descripcion={errorResenas}
            accion={{ etiqueta: "Reintentar", onClick: reintentarResenas }}
          />
        ) : resenas.length === 0 ? (
          <EstadoVacio
            className="mt-4"
            titulo="Aún no has publicado reseñas."
            descripcion="Explora el catálogo y comparte tu experiencia con otros usuarios."
            accion={{ etiqueta: "Ir a reseñas", href: "/resenas" }}
          />
        ) : (
          <ul className="mt-4 space-y-3">
            {resenas.map((resena) => (
              <li
                key={resena.idResena}
                className="rounded-card border border-line bg-paper p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/productos/${resena.idProducto}`}
                    className={`text-sm font-medium uppercase text-brand-blue hover:underline ${CLASE_FOCO}`}
                  >
                    {resena.nombreProducto || `Producto #${resena.idProducto}`}
                  </Link>
                  <span className="text-xs text-subtle">
                    {formatearFecha(resena.fechaCreacion)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line border-t border-dotted border-line pt-3 text-sm leading-relaxed text-text-body">
                  {resena.comentario}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AuthModal
        isOpen={modalAuthAbierto}
        onClose={() => setModalAuthAbierto(false)}
        onLoginSuccess={(nuevoUsuario) => {
          establecerUsuario(nuevoUsuario);
          setModalAuthAbierto(false);
        }}
      />

      <AdminPanelModal
        isOpen={modalAdminAbierto}
        onClose={() => setModalAdminAbierto(false)}
        usuarioSesion={usuario}
        onProductoCambiado={() => {}}
      />

      <PanelModeracionModal
        isOpen={modalModeracionAbierto}
        onClose={() => setModalModeracionAbierto(false)}
        usuarioSesion={usuario}
      />

      <PanelRepresentanteModal
        isOpen={modalRepresentanteAbierto}
        onClose={() => setModalRepresentanteAbierto(false)}
        usuarioSesion={usuario}
      />
    </main>
  );
}
