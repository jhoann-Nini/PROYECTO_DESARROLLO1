"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function CallbackContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [estado, setEstado] = useState<"procesando" | "exito" | "error">("procesando");
  const [mensaje, setMensaje] = useState("Verificando tu enlace de confirmación...");

  useEffect(() => {
    let cancelado = false;

    async function procesarCallback() {
      // 1. Revisar si existen parámetros de error en la URL o en el hash fragment
      const errorDescParam = searchParams.get("error_description");
      const errorParam = searchParams.get("error");

      // También verificar si el hash contiene error (flujo implícito)
      let hashErrorDesc: string | null = null;
      let hashError: string | null = null;
      if (typeof window !== "undefined" && window.location.hash.startsWith("#")) {
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        hashErrorDesc = hashParams.get("error_description");
        hashError = hashParams.get("error");
      }

      const errorFinal = errorDescParam || hashErrorDesc;
      const errorCodeFinal = errorParam || hashError;

      if (errorFinal || errorCodeFinal) {
        if (cancelado) return;
        setEstado("error");
        let mensajeTraducido = "El enlace de confirmación es inválido o ha expirado.";
        if (errorFinal) {
          const descLimpia = decodeURIComponent(errorFinal.replace(/\+/g, " "));
          if (descLimpia.toLowerCase().includes("expired") || descLimpia.toLowerCase().includes("otp")) {
            mensajeTraducido = "El enlace de confirmación ha expirado. Por favor solicita uno nuevo registrándote o iniciando sesión.";
          } else {
            mensajeTraducido = descLimpia;
          }
        }
        setMensaje(mensajeTraducido);
        return;
      }

      // 2. Revisar si viene un código de autorización PKCE (?code=...)
      const code = searchParams.get("code");
      if (code) {
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (cancelado) return;

          if (error) {
            // Antes de declarar un error, verificar si la sesión ya fue establecida válidamente
            // (por ejemplo si detectSessionInUrl procesó el código durante la inicialización del cliente)
            try {
              const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
              if (!sessionError && sessionData?.session?.access_token) {
                setEstado("exito");
                setMensaje("¡Tu correo ha sido confirmado con éxito! Redirigiendo a TecReview...");
                setTimeout(() => {
                  if (!cancelado) {
                    router.push("/");
                  }
                }, 1800);
                return;
              }
            } catch {
              // Si falla la lectura de respaldo, continuar hacia el reporte de error
            }

            setEstado("error");
            setMensaje(
              error.message.includes("code verifier") || error.message.includes("invalid")
                ? "El enlace de confirmación no es válido o ya fue utilizado en otro navegador."
                : error.message || "Error al confirmar tu cuenta."
            );
            return;
          }

          if (data?.session) {
            setEstado("exito");
            setMensaje("¡Tu correo ha sido confirmado con éxito! Redirigiendo a TecReview...");
            setTimeout(() => {
              if (!cancelado) {
                router.push("/");
              }
            }, 1800);
            return;
          }
        } catch (err) {
          if (cancelado) return;
          setEstado("error");
          setMensaje(err instanceof Error ? err.message : "Error al conectar con el servicio de autenticación.");
          return;
        }
      }

      // 3. Revisar si la sesión ya fue detectada por el cliente de Supabase (por ejemplo, mediante detectSessionInUrl)
      try {
        const supabase = createClient();
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (cancelado) return;

        if (!sessionError && session) {
          setEstado("exito");
          setMensaje("¡Sesión confirmada! Redirigiendo a TecReview...");
          setTimeout(() => {
            if (!cancelado) {
              router.push("/");
            }
          }, 1500);
          return;
        }
      } catch {
        // Continuar hacia el estado de error si no hay sesión
      }

      // 4. Si no hay código, ni error explícito, ni sesión activa encontrada
      if (!cancelado) {
        setEstado("error");
        setMensaje("No se encontraron credenciales ni código de confirmación en el enlace.");
      }
    }

    procesarCallback();

    return () => {
      cancelado = true;
    };
  }, [searchParams, router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {estado === "procesando" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-100 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              <svg className="h-7 w-7 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Confirmando cuenta</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{mensaje}</p>
          </div>
        )}

        {estado === "exito" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">¡Confirmación Exitosa!</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{mensaje}</p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-cyan-500"
              >
                Ir a la página principal
              </Link>
            </div>
          </div>
        )}

        {estado === "error" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Error de Confirmación</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{mensaje}</p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Cargando verificación...</p>
          </div>
        </div>
      }
    >
      <CallbackContenido />
    </Suspense>
  );
}
