"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { obtenerResenas, type ResenaResponse } from "@/services/api";
import { esAdministrador } from "@/types/producto";
import { useSesionTecReview } from "@/hooks/useSesionTecReview";
import { useFavoritos } from "@/hooks/useFavoritos";
import { useComparador } from "@/hooks/useComparador";
import AuthModal from "@/components/AuthModal";
import AdminPanelModal from "@/components/AdminPanelModal";

function formatearFecha(valor?: string): string {
  if (!valor) return "No registrada";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
  }).format(fecha);
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "U";
  return `${partes[0].charAt(0)}${partes[1]?.charAt(0) ?? ""}`.toUpperCase();
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
  const [resenas, setResenas] = useState<ResenaResponse[]>([]);
  const [cargandoResenas, setCargandoResenas] = useState(false);
  const [errorResenas, setErrorResenas] = useState<string | null>(null);

  const esAdmin = useMemo(() => esAdministrador(usuario), [usuario]);

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
  }, [usuario?.idUsuario]);

  if (cargando) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          role="status"
          aria-busy="true"
          className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-12 text-center"
        >
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--color-hairline)] border-t-[var(--color-brand-blue)]" />
          <p className="mt-4 text-sm text-[var(--color-subtle)]">
            Consultando tu perfil…
          </p>
        </div>
      </main>
    );
  }

  if (!usuario) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-8 text-center shadow-[var(--shadow-paper)] sm:p-10">
          <span
            aria-hidden="true"
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand-blue)]/10 text-[var(--color-brand-blue)]"
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

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--color-ink)]">
            Inicia sesión para ver tu perfil
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--color-subtle)]">
            Tu perfil reúne tus reseñas y el acceso a tus favoritos y al
            comparador. La sesión se valida con Supabase y el backend de
            TecReview.
          </p>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                limpiarError();
                setModalAuthAbierto(true);
              }}
              className="cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-solid)]/90"
            >
              Iniciar sesión
            </button>
            <Link
              href="/productos"
              className="rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
            >
              Explorar catálogo
            </Link>
            {error && (
              <button
                type="button"
                onClick={reintentar}
                className="cursor-pointer rounded-md border border-[var(--color-hairline)] px-5 py-2.5 text-sm font-semibold text-[var(--color-subtle)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
              >
                Reintentar conexión
              </button>
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-subtle)]">
          Cuenta TecReview
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          Mi perfil
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-subtle)]">
          Datos confirmados por el backend y tu actividad dentro de la
          plataforma.
        </p>
      </header>

      <section
        aria-labelledby="titulo-datos-perfil"
        className="mt-6 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)] sm:p-6"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {usuario.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={usuario.avatar}
                alt={`Avatar de ${usuario.nombre}`}
                className="h-16 w-16 shrink-0 rounded-full border border-[var(--color-hairline)] object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-blue)]/10 text-xl font-bold text-[var(--color-brand-blue)]"
              >
                {iniciales(usuario.nombre)}
              </span>
            )}

            <div className="min-w-0">
              <h2
                id="titulo-datos-perfil"
                className="truncate text-xl font-bold tracking-tight text-[var(--color-ink)]"
              >
                {usuario.nombre}
              </h2>
              <p className="text-sm text-[var(--color-subtle)]">
                @{usuario.usuario}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--color-brand-blue)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-brand-blue)]">
                  {usuario.rol || "Usuario registrado"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    usuario.activo === false
                      ? "bg-[var(--color-hairline)] text-[var(--color-subtle)]"
                      : "bg-[var(--color-positive)]/15 text-[var(--color-ink)]"
                  }`}
                >
                  {usuario.activo === false ? "Cuenta inactiva" : "Cuenta activa"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {esAdmin && (
              <button
                type="button"
                onClick={() => setModalAdminAbierto(true)}
                className="cursor-pointer rounded-md border border-[var(--color-hairline)] px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
              >
                Panel de administración
              </button>
            )}
            <button
              type="button"
              onClick={cerrarSesion}
              className="cursor-pointer rounded-md border border-[var(--color-hairline)] px-3.5 py-2 text-xs font-semibold text-[var(--color-subtle)] transition-colors hover:border-red-300 hover:text-red-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-[var(--color-hairline)] pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]">
              Correo electrónico
            </dt>
            <dd className="mt-1 break-all text-sm font-medium text-[var(--color-ink)]">
              {usuario.email}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]">
              Miembro desde
            </dt>
            <dd className="mt-1 text-sm font-medium text-[var(--color-ink)]">
              {formatearFecha(usuario.fechaRegistro)}
            </dd>
          </div>
        </dl>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      <section aria-label="Resumen de actividad" className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]">
            Mis reseñas
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-ink)]">
            {cargandoResenas ? "—" : resenas.length}
          </p>
        </div>
        <Link
          href="/favoritos"
          className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 transition-colors hover:border-[var(--color-brand-blue)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]">
            Favoritos
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-ink)]">
            {favoritosHidratados ? favoritos.length : "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--color-brand-blue)]">
            Ver favoritos →
          </p>
        </Link>
        <Link
          href="/comparador"
          className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 transition-colors hover:border-[var(--color-brand-blue)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]">
            Comparador
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-ink)]">
            {comparadorHidratado ? comparador.length : "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--color-brand-blue)]">
            Ver comparador →
          </p>
        </Link>
      </section>

      <section aria-labelledby="titulo-mis-resenas" className="mt-8">
        <h2
          id="titulo-mis-resenas"
          className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
        >
          Mis reseñas
        </h2>
        <p className="mt-1 text-sm text-[var(--color-subtle)]">
          Opiniones que has publicado en el catálogo.
        </p>

        {cargandoResenas ? (
          <p role="status" className="mt-4 text-sm text-[var(--color-subtle)]">
            Cargando tus reseñas…
          </p>
        ) : errorResenas ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {errorResenas}
          </p>
        ) : resenas.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-[var(--color-hairline)] bg-[var(--color-paper)] p-8 text-center">
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              Aún no has publicado reseñas.
            </p>
            <p className="mt-1 text-sm text-[var(--color-subtle)]">
              Explora el catálogo y comparte tu experiencia con otros usuarios.
            </p>
            <Link
              href="/resenas"
              className="mt-4 inline-flex rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-solid)]/90"
            >
              Ir a reseñas
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {resenas.map((resena) => (
              <li
                key={resena.idResena}
                className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/productos/${resena.idProducto}`}
                    className="text-sm font-semibold text-[var(--color-brand-blue)] hover:underline"
                  >
                    {resena.nombreProducto || `Producto #${resena.idProducto}`}
                  </Link>
                  <span className="text-xs text-[var(--color-subtle)]">
                    {formatearFecha(resena.fechaCreacion)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink)]">
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
    </main>
  );
}
