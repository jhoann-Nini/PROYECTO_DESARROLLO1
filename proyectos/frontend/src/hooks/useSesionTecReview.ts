"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ApiError,
  mapearPerfilABusinessSession,
  obtenerMiPerfil,
} from "@/services/api";
import type { UsuarioSesion } from "@/types/producto";
import { createClient } from "@/lib/supabase/client";

export interface UseSesionTecReviewResultado {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  error: string | null;
  establecerUsuario: (usuario: UsuarioSesion | null) => void;
  limpiarError: () => void;
  cerrarSesion: () => Promise<void>;
  reintentar: () => Promise<void>;
}

/**
 * Sincroniza Supabase Auth con el perfil de negocio confirmado por Spring Boot.
 * Conserva la revocación local ante errores definitivos y permite reintentar
 * cuando falla la red.
 */
export function useSesionTecReview(): UseSesionTecReviewResultado {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let montado = true;
    let ultimoTokenProcesado: string | null = null;
    let peticionEnVuelo: Promise<void> | null = null;
    let suscripcion: { unsubscribe: () => void } | null = null;

    async function sincronizarPerfil(session: Session | null) {
      if (!session?.access_token || !session.user) {
        ultimoTokenProcesado = null;
        if (montado) {
          setUsuario(null);
          setCargando(false);
        }
        return;
      }

      if (session.access_token === ultimoTokenProcesado) {
        if (peticionEnVuelo) {
          await peticionEnVuelo;
        }
        return;
      }

      ultimoTokenProcesado = session.access_token;
      if (montado) {
        setCargando(true);
        setError(null);
      }

      const tarea = (async () => {
        try {
          const perfil = await obtenerMiPerfil(session.access_token);
          if (montado) {
            setUsuario(mapearPerfilABusinessSession(perfil, session.user));
            setError(null);
          }
        } catch (err) {
          const esErrorDefinitivo =
            err instanceof ApiError &&
            (err.status === 401 || err.status === 403 || err.status === 409);

          const mensaje =
            err instanceof Error
              ? err.message
              : "No fue posible verificar tu perfil en el servidor.";

          if (esErrorDefinitivo) {
            ultimoTokenProcesado = null;
            if (montado) {
              setUsuario(null);
              setError(mensaje);
            }
            try {
              const supabase = createClient();
              await supabase.auth.signOut({ scope: "local" });
            } catch {}
          } else if (montado) {
            setError(mensaje);
            setUsuario((previo) => (previo ? previo : null));
          }
        } finally {
          if (montado) {
            setCargando(false);
          }
        }
      })();

      peticionEnVuelo = tarea;
      await tarea;
      if (peticionEnVuelo === tarea) {
        peticionEnVuelo = null;
      }
    }

    try {
      const supabase = createClient();

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!montado) return;
          sincronizarPerfil(session);
        },
      );
      suscripcion = authListener.subscription;

      supabase.auth
        .getSession()
        .then(({ data: { session }, error: errorSesion }) => {
          if (!montado || errorSesion) return;
          sincronizarPerfil(session);
        })
        .catch(() => {
          if (montado) {
            setCargando(false);
          }
        });
    } catch {
      queueMicrotask(() => {
        if (montado) {
          setCargando(false);
        }
      });
    }

    return () => {
      montado = false;
      suscripcion?.unsubscribe();
    };
  }, []);

  const establecerUsuario = useCallback((nuevo: UsuarioSesion | null) => {
    setUsuario(nuevo);
    setError(null);
  }, []);

  const limpiarError = useCallback(() => setError(null), []);

  const cerrarSesion = useCallback(async () => {
    setError(null);
    try {
      const supabase = createClient();
      const { error: errorCierre } = await supabase.auth.signOut();

      if (errorCierre) {
        try {
          const { error: errorLocal } = await supabase.auth.signOut({
            scope: "local",
          });
          if (errorLocal) {
            setError("No fue posible cerrar la sesión. Inténtalo de nuevo.");
            return;
          }
          setUsuario(null);
        } catch {
          setError("Error de conexión al cerrar la sesión.");
          return;
        }
      } else {
        setUsuario(null);
      }
    } catch {
      setError("Error al conectar con el servicio de autenticación.");
    }
  }, []);

  const reintentar = useCallback(async () => {
    setError(null);
    setCargando(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const perfil = await obtenerMiPerfil(session.access_token);
        setUsuario(mapearPerfilABusinessSession(perfil, session.user));
        setError(null);
      } else {
        setUsuario(null);
      }
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "Error al reintentar la conexión.";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }, []);

  return {
    usuario,
    cargando,
    error,
    establecerUsuario,
    limpiarError,
    cerrarSesion,
    reintentar,
  };
}
