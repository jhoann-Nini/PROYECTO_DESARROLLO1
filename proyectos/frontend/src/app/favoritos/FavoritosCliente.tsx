"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  obtenerCategorias,
  obtenerMarcas,
  obtenerProductos,
} from "@/services/api";
import type {
  CategoriaResponse,
  MarcaResponse,
  Producto,
} from "@/types/producto";
import { aplicarResumenOfertasAVistas, construirCatalogo } from "@/data/catalogoApi";
import { useResumenOfertas } from "@/hooks/useResumenOfertas";
import { ORDENES_CATALOGO, type OrdenCatalogo } from "@/data/catalogo";
import {
  filtrarFavoritos,
  opcionesCategoriaFavoritos,
  ordenarFavoritos,
  type FiltroCategoriaFavoritos,
} from "@/data/favoritosCatalogo";
import type { ProductoViewModel } from "@/data/productoViewModel";
import { useFavoritos } from "@/hooks/useFavoritos";
import { useSesionTecReview } from "@/hooks/useSesionTecReview";
import TarjetaProducto from "@/components/catalogo/TarjetaProducto";
import AuthModal from "@/components/AuthModal";
import { CLASE_FOCO } from "@/components/ui/foco";
import EstadoVacio from "@/components/ui/EstadoVacio";
import Button, { buttonClassName } from "@/components/ui/Button";

export default function FavoritosCliente() {
  const router = useRouter();
  const {
    usuario,
    cargando: cargandoSesion,
    error: errorSesion,
    establecerUsuario,
    limpiarError,
    reintentar: reintentarSesion,
  } = useSesionTecReview();
  const { ids, hidratado, limpiar } = useFavoritos();

  const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
  const [productos, setProductos] = useState<ProductoViewModel[]>([]);
  const resumenOfertas = useResumenOfertas();
  const productosConOfertas = useMemo(
    () => aplicarResumenOfertasAVistas(productos, resumenOfertas),
    [productos, resumenOfertas],
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [aviso, setAviso] = useState("");
  const [categoria, setCategoria] = useState<FiltroCategoriaFavoritos>("todas");
  const [orden, setOrden] = useState<OrdenCatalogo>("relevancia");
  const idSesion = usuario?.id ?? null;

  useEffect(() => {
    if (!idSesion) return;

    let activo = true;
    queueMicrotask(() => {
      if (!activo) return;
      setCargando(true);
      setError(null);
    });

    Promise.all([
      obtenerProductos<Producto>(),
      obtenerCategorias(),
      obtenerMarcas(),
    ])
      .then(
        ([productosApi, categorias, marcas]: [
          Producto[],
          CategoriaResponse[],
          MarcaResponse[],
        ]) => {
          if (!activo) return;
          setProductos(
            construirCatalogo({
              productos: productosApi,
              categorias,
              marcas,
            }),
          );
        },
      )
      .catch((err: unknown) => {
        if (!activo) return;
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar tus favoritos.",
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [idSesion, intento]);

  const favoritos = useMemo(() => {
    const porId = new Map(
      productosConOfertas.map((producto) => [producto.idProducto, producto]),
    );
    return ids
      .map((id) => porId.get(id))
      .filter((producto): producto is ProductoViewModel => Boolean(producto));
  }, [ids, productosConOfertas]);

  const opcionesCategoria = useMemo(
    () => opcionesCategoriaFavoritos(favoritos),
    [favoritos],
  );

  const favoritosVisibles = useMemo(
    () => ordenarFavoritos(filtrarFavoritos(favoritos, categoria), orden),
    [favoritos, categoria, orden],
  );

  const noDisponibles = Math.max(0, ids.length - favoritos.length);

  function reintentar() {
    setCargando(true);
    setError(null);
    setIntento((valor) => valor + 1);
  }

  function vaciarFavoritos() {
    limpiar();
    setAviso("Se vaciaron tus favoritos.");
  }

  if (cargandoSesion) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          role="status"
          aria-busy="true"
          className="flex flex-col items-center justify-center rounded-card border border-line bg-paper p-12 text-center"
        >
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-brand-blue" />
          <p className="mt-4 text-sm text-subtle">
            Verificando tu sesión…
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20.25s-7.5-4.5-7.5-9.75A4.5 4.5 0 0 1 12 7.5a4.5 4.5 0 0 1 7.5 3c0 5.25-7.5 9.75-7.5 9.75Z"
              />
            </svg>
          </span>

          <h1 className="mt-4 text-2xl font-medium uppercase tracking-normal text-ink">
            Inicia sesión para ver tus favoritos
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-subtle">
            Solo las cuentas con sesión activa pueden guardar, consultar y
            quitar favoritos. Tus favoritos se conservan en este navegador y no
            se sincronizan entre dispositivos.
          </p>

          {errorSesion && (
            <p role="alert" className="mt-4 text-sm text-status-error">
              {errorSesion}
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
            {errorSesion && (
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  void reintentarSesion();
                }}
              >
                Reintentar
              </Button>
            )}
          </div>
        </section>

        <AuthModal
          isOpen={modalAuthAbierto}
          onClose={() => setModalAuthAbierto(false)}
          onLoginSuccess={(usuarioSesion) => {
            establecerUsuario(usuarioSesion);
            setModalAuthAbierto(false);
          }}
        />
      </main>
    );
  }

  if (cargando) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          role="status"
          aria-busy="true"
          className="flex flex-col items-center justify-center rounded-card border border-line bg-paper p-12 text-center"
        >
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-brand-blue" />
          <p className="mt-4 text-sm text-subtle">
            Cargando tus favoritos…
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <EstadoVacio
          tipo="error"
          titulo="No pudimos cargar tus favoritos"
          descripcion={error}
          accion={{ etiqueta: "Reintentar", onClick: reintentar }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-normal text-subtle">
            Tu selección personal
          </p>
          <h1 className="mt-2 text-2xl font-medium uppercase tracking-normal text-ink sm:text-3xl">
            Favoritos
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-subtle">
            Solo puedes ver y administrar tus favoritos con la sesión iniciada.
            Se conservan en este navegador y no se sincronizan entre
            dispositivos.
          </p>
        </div>

        {hidratado && ids.length > 0 && (
          <Button
            variant="danger"
            type="button"
            onClick={vaciarFavoritos}
            className="self-start sm:self-auto"
          >
            Vaciar favoritos
          </Button>
        )}
      </header>

      <p
        role="status"
        aria-live="polite"
        className="mb-4 min-h-4 text-xs text-subtle"
      >
        {aviso}
      </p>

      {!hidratado ? (
        <p role="status" className="text-sm text-subtle">
          Cargando tu lista de favoritos…
        </p>
      ) : favoritos.length === 0 ? (
        <EstadoVacio
          titulo="Aún no tienes productos favoritos."
          descripcion="Usa el corazón en cualquier tarjeta o en la ficha de un producto para guardarlo aquí."
          icono={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-8 w-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20.25s-7.5-4.5-7.5-9.75A4.5 4.5 0 0 1 12 7.5a4.5 4.5 0 0 1 7.5 3c0 5.25-7.5 9.75-7.5 9.75Z"
              />
            </svg>
          }
          accion={{ etiqueta: "Explorar catálogo", href: "/productos" }}
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-subtle">
            {favoritos.length} producto{favoritos.length === 1 ? "" : "s"} en
            favoritos.
          </p>

          {noDisponibles > 0 && (
            <p
              role="status"
              className="mb-4 rounded-card border border-line bg-surface-2 px-3 py-2 text-sm text-ink"
            >
              {noDisponibles} producto{noDisponibles === 1 ? "" : "s"} guardado
              {noDisponibles === 1 ? "" : "s"} ya no aparece
              {noDisponibles === 1 ? "" : "n"} en el catálogo actual.
            </p>
          )}

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="favoritos-categoria"
                className="text-xs font-medium uppercase tracking-normal text-subtle"
              >
                Filtrar por categoría
              </label>
              <select
                id="favoritos-categoria"
                value={categoria}
                onChange={(evento) =>
                  setCategoria(
                    evento.target.value as FiltroCategoriaFavoritos,
                  )
                }
                className={`min-h-11 rounded-input border-0 border-b border-ink bg-transparent px-0 py-3 text-sm text-ink ${CLASE_FOCO}`}
              >
                <option value="todas">Todas las categorías</option>
                {opcionesCategoria.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta} ({opcion.cantidad})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="favoritos-orden"
                className="text-xs font-medium uppercase tracking-normal text-subtle"
              >
                Ordenar favoritos
              </label>
              <select
                id="favoritos-orden"
                value={orden}
                onChange={(evento) =>
                  setOrden(evento.target.value as OrdenCatalogo)
                }
                className={`min-h-11 rounded-input border-0 border-b border-ink bg-transparent px-0 py-3 text-sm text-ink ${CLASE_FOCO}`}
              >
                {ORDENES_CATALOGO.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {favoritosVisibles.length === 0 ? (
            <EstadoVacio
              titulo="No hay favoritos en esa categoría."
              descripcion="Prueba con otra categoría o vuelve a ver todos tus favoritos."
              accion={{
                etiqueta: "Quitar filtros",
                onClick: () => setCategoria("todas"),
              }}
            />
          ) : (
            <section
              aria-label="Productos favoritos"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {favoritosVisibles.map((producto) => (
                <TarjetaProducto
                  key={producto.idProducto}
                  producto={producto}
                  onVerDetalle={(vista) => {
                    const idDestino =
                      typeof vista.idApi === "number" && Number.isSafeInteger(vista.idApi) && vista.idApi > 0
                        ? vista.idApi
                        : typeof vista.idProducto === "number" && Number.isSafeInteger(vista.idProducto) && vista.idProducto > 0
                          ? vista.idProducto
                          : null;
                    if (idDestino) {
                      router.push(`/productos/${idDestino}`);
                    }
                  }}
                />
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
