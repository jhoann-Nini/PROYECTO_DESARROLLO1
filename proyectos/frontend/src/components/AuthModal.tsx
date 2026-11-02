"use client";

import { useState, useEffect } from "react";
import { UsuarioSesion } from "@/types/producto";
import { createClient } from "@/lib/supabase/client";
import { obtenerMiPerfil, mapearPerfilABusinessSession } from "@/services/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UsuarioSesion) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [modo, setModo] = useState<"login" | "registro">("login");

  // Formulario Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Formulario Registro
  const [regNombre, setRegNombre] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regUsuario, setRegUsuario] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regTerminos, setRegTerminos] = useState(false);

  // Estados de error, éxito y carga
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !cargando) onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, cargando]);

  if (!isOpen) return null;

  const manejarLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setExito("");

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError("Por favor completa tu correo y contraseña.");
      return;
    }

    let loginExitoso = false;
    setCargando(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.");
        } else {
          setError(authError.message || "No fue posible iniciar sesión. Inténtalo de nuevo.");
        }
        return;
      }

      if (!data.user || !data.session?.access_token) {
        setError("No se recibió la información del usuario tras iniciar sesión.");
        return;
      }

      try {
        const perfilBackend = await obtenerMiPerfil(data.session.access_token);
        const usuarioSesion = mapearPerfilABusinessSession(perfilBackend, data.user);

        loginExitoso = true;
        setExito("¡Inicio de sesión exitoso! Bienvenido a TecReview.");
        setTimeout(() => {
          onLoginSuccess(usuarioSesion);
          onClose();
        }, 600);
      } catch (errPerfil) {
        const mensaje =
          errPerfil instanceof Error
            ? errPerfil.message
            : "Error al sincronizar el perfil con el servidor.";
        setError(mensaje);
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {}
        return;
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error al conectar con el servicio de autenticación.";
      setError(mensaje);
    } finally {
      if (!loginExitoso) {
        setCargando(false);
      }
    }
  };

  const manejarRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setExito("");

    if (!regNombre.trim() || !regEmail.trim() || !regUsuario.trim() || !regPassword.trim()) {
      setError("Todos los campos marcados con (*) son obligatorios.");
      return;
    }

    if (regPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!regTerminos) {
      setError("Debes aceptar los términos y condiciones de uso.");
      return;
    }

    let registroExitoso = false;
    setCargando(true);
    try {
      const supabase = createClient();
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { data, error: authError } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: regNombre.trim(),
            full_name: regNombre.trim(),
            user_name: regUsuario.trim(),
            usuario: regUsuario.trim(),
          },
        },
      });

      if (authError) {
        if (authError.message.includes("User already registered")) {
          setError("Ya existe una cuenta registrada con este correo electrónico.");
        } else if (authError.message.includes("Password should be at least 6 characters")) {
          setError("La contraseña debe tener al menos 6 caracteres.");
        } else {
          setError(authError.message || "No fue posible registrar la cuenta. Inténtalo de nuevo.");
        }
        return;
      }

      if (!data.user) {
        setError("No se pudo completar el registro.");
        return;
      }

      // Si Supabase requiere confirmación de email, data.session es nulo
      if (!data.session?.access_token) {
        registroExitoso = true;
        setExito("¡Registro exitoso! Hemos enviado un enlace de confirmación a tu correo. Por favor revisa tu bandeja de entrada antes de iniciar sesión.");
        setTimeout(() => {
          onClose();
        }, 3500);
        return;
      }

      // Si Supabase devuelve la sesión activa de inmediato
      try {
        const perfilBackend = await obtenerMiPerfil(data.session.access_token);
        const usuarioSesion = mapearPerfilABusinessSession(perfilBackend, data.user);

        registroExitoso = true;
        setExito("¡Cuenta creada correctamente! Iniciando tu sesión...");
        setTimeout(() => {
          onLoginSuccess(usuarioSesion);
          onClose();
        }, 800);
      } catch (errPerfil) {
        const mensaje =
          errPerfil instanceof Error
            ? errPerfil.message
            : "Cuenta creada, pero ocurrió un error al sincronizar el perfil con el servidor.";
        setError(mensaje);
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {}
        return;
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error al conectar con el servicio de autenticación.";
      setError(mensaje);
    } finally {
      if (!registroExitoso) {
        setCargando(false);
      }
    }
  };

  const claseInput =
    "w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-subtle)] transition-colors focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-[var(--color-inverse)]/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-md animate-scale-in overflow-y-auto rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-6 text-[var(--color-ink)] shadow-[var(--shadow-paper-hover)]">
        {/* Cabecera modal */}
        <div className="flex items-center justify-between border-b border-[var(--color-hairline)] pb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-brand-solid)]" aria-hidden="true" />
            <h2 id="auth-modal-title" className="text-base font-semibold tracking-tight text-[var(--color-ink)]">
              Acceso a <span className="text-[var(--color-brand-blue)]">TecReview</span>.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-2.5 py-1 text-xs font-semibold text-[var(--color-subtle)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
            aria-label="Cerrar modal de autenticación"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Pestañas de Login / Registro */}
        <div className="my-5 flex rounded-md bg-[var(--color-canvas)] p-1">
          <button
            type="button"
            onClick={() => {
              setModo("login");
              setError("");
              setExito("");
            }}
            className={`flex-1 cursor-pointer rounded-md py-2 text-xs font-semibold transition-all duration-200 ${
              modo === "login"
                ? "bg-[var(--color-paper)] text-[var(--color-brand-blue)] shadow-[var(--shadow-paper)]"
                : "text-[var(--color-subtle)] hover:text-[var(--color-ink)]"
            }`}
          >
            INICIAR SESIÓN
          </button>
          <button
            type="button"
            onClick={() => {
              setModo("registro");
              setError("");
              setExito("");
            }}
            className={`flex-1 cursor-pointer rounded-md py-2 text-xs font-semibold transition-all duration-200 ${
              modo === "registro"
                ? "bg-[var(--color-paper)] text-[var(--color-brand-blue)] shadow-[var(--shadow-paper)]"
                : "text-[var(--color-subtle)] hover:text-[var(--color-ink)]"
            }`}
          >
            CREAR CUENTA
          </button>
        </div>

        {/* Notificaciones de error o éxito */}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800" role="alert">
            ⚠️ {error}
          </div>
        )}
        {exito && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800" role="status">
            ✅ {exito}
          </div>
        )}

        {/* FORMULARIO INICIAR SESIÓN */}
        {modo === "login" && (
          <form onSubmit={manejarLogin} className="space-y-4 text-xs">
            <div>
              <label htmlFor="login-email" className="mb-1 block font-medium text-[var(--color-ink)]">
                Correo electrónico (*)
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="ejemplo@tecreview.com"
                className={claseInput}
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1 block font-medium text-[var(--color-ink)]">
                Contraseña (*)
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className={claseInput}
                required
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--color-subtle)]">
              <label htmlFor="login-recordar" className="flex cursor-pointer items-center gap-2">
                <input
                  id="login-recordar"
                  type="checkbox"
                  className="rounded accent-[var(--color-brand-blue)]"
                />
                <span>Recordar sesión</span>
              </label>
              <a href="#" className="transition-colors hover:text-[var(--color-brand-blue)]">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className={`w-full rounded-md bg-[var(--color-brand-solid)] py-3 text-xs font-semibold text-[var(--color-on-solid)] transition-all hover:bg-[var(--color-brand-solid)]/90 ${
                cargando ? "cursor-not-allowed opacity-70" : "cursor-pointer"
              }`}
            >
              {cargando ? "Iniciando sesión..." : "Entrar a TecReview"}
            </button>
          </form>
        )}

        {/* FORMULARIO REGISTRO */}
        {modo === "registro" && (
          <form onSubmit={manejarRegistro} className="space-y-3.5 text-xs">
            <div>
              <label htmlFor="reg-nombre" className="mb-1 block font-medium text-[var(--color-ink)]">
                Nombre completo (*)
              </label>
              <input
                id="reg-nombre"
                type="text"
                autoComplete="name"
                value={regNombre}
                onChange={(e) => setRegNombre(e.target.value)}
                placeholder="Ej. Adrian Gómez"
                className={claseInput}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-usuario" className="mb-1 block font-medium text-[var(--color-ink)]">
                  Usuario (*)
                </label>
                <input
                  id="reg-usuario"
                  type="text"
                  autoComplete="username"
                  value={regUsuario}
                  onChange={(e) => setRegUsuario(e.target.value)}
                  placeholder="adriang"
                  className={claseInput}
                  required
                />
              </div>
              <div>
                <label htmlFor="reg-email" className="mb-1 block font-medium text-[var(--color-ink)]">
                  Correo (*)
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="adrian@mail.com"
                  className={claseInput}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-password" className="mb-1 block font-medium text-[var(--color-ink)]">
                  Contraseña (*)
                </label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className={claseInput}
                  required
                />
              </div>
              <div>
                <label htmlFor="reg-confirm" className="mb-1 block font-medium text-[var(--color-ink)]">
                  Confirmar (*)
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={claseInput}
                  required
                />
              </div>
            </div>

            <label htmlFor="reg-terminos" className="flex cursor-pointer items-center gap-2 pt-1 text-[11px] text-[var(--color-subtle)]">
              <input
                id="reg-terminos"
                type="checkbox"
                checked={regTerminos}
                onChange={(e) => setRegTerminos(e.target.checked)}
                className="rounded accent-[var(--color-brand-blue)]"
              />
              <span>Acepto los términos de servicio y normas de la comunidad.</span>
            </label>

            <button
              type="submit"
              disabled={cargando}
              className={`w-full rounded-md bg-[var(--color-brand-solid)] py-3 text-xs font-semibold text-[var(--color-on-solid)] transition-all hover:bg-[var(--color-brand-solid)]/90 ${
                cargando ? "cursor-not-allowed opacity-70" : "cursor-pointer"
              }`}
            >
              {cargando ? "Creando cuenta..." : "Crear mi cuenta"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
