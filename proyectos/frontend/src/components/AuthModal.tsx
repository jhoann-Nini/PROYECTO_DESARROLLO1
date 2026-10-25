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

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-card border border-line bg-surface-1 p-6 text-slate-100 shadow-soft">
        {/* Cabecera modal */}
        <div className="flex items-center justify-between border-b border-line/70 pb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600"></span>
            <h2 id="auth-modal-title" className="font-display text-base font-semibold tracking-[-0.01em] text-white">
              Acceso a <span className="text-blue-300">TecReview</span>.
            </h2>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-control border border-line bg-surface-2/60 px-2.5 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-blue-500/40 hover:text-white"
            aria-label="Cerrar modal de autenticación"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Pestañas de Login / Registro */}
        <div className="my-5 flex rounded-control border border-line bg-surface-0/60 p-1">
          <button
            type="button"
            onClick={() => {
              setModo("login");
              setError("");
              setExito("");
            }}
            className={`flex-1 rounded-control py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
              modo === "login"
                ? "bg-surface-2 text-blue-300 shadow-soft"
                : "text-slate-400 hover:text-white"
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
            className={`flex-1 rounded-control py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
              modo === "registro"
                ? "bg-surface-2 text-blue-300 shadow-soft"
                : "text-slate-400 hover:text-white"
            }`}
          >
            CREAR CUENTA
          </button>
        </div>

        {/* Notificaciones de error o éxito */}
        {error && (
          <div className="mb-4 rounded-control border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300" role="alert">
            ⚠️ {error}
          </div>
        )}
        {exito && (
          <div className="mb-4 rounded-control border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300" role="status">
            ✅ {exito}
          </div>
        )}

        {/* FORMULARIO INICIAR SESIÓN */}
        {modo === "login" && (
          <form onSubmit={manejarLogin} className="space-y-4 text-xs">
            <div>
              <label className="mb-1 block font-medium text-slate-300">Correo electrónico (*)</label>
              <input
                type="text"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="ejemplo@tecreview.com"
                className="w-full rounded-control border border-line bg-surface-0/80 px-4 py-2.5 text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                required
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-300">Contraseña (*)</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-control border border-line bg-surface-0/80 px-4 py-2.5 text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                required
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="rounded accent-blue-500" />
                <span>Recordar sesión</span>
              </label>
              <a href="#" className="transition-colors hover:text-blue-300">¿Olvidaste tu contraseña?</a>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className={`w-full rounded-control bg-blue-600 py-3 text-xs font-semibold text-white transition-all hover:bg-blue-500 ${
                cargando ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
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
              <label className="mb-1 block font-medium text-slate-300">Nombre completo (*)</label>
              <input
                type="text"
                value={regNombre}
                onChange={(e) => setRegNombre(e.target.value)}
                placeholder="Ej. Adrian Gómez"
                className="w-full rounded-control border border-line bg-surface-0/80 px-4 py-2 text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-medium text-slate-300">Usuario (*)</label>
                <input
                  type="text"
                  value={regUsuario}
                  onChange={(e) => setRegUsuario(e.target.value)}
                  placeholder="adriang"
                  className="w-full rounded-control border border-line bg-surface-0/80 px-3 py-2 text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-300">Correo (*)</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="adrian@mail.com"
                  className="w-full rounded-control border border-line bg-surface-0/80 px-3 py-2 text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-medium text-slate-300">Contraseña (*)</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-control border border-line bg-surface-0/80 px-3 py-2 text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-300">Confirmar (*)</label>
                <input
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-control border border-line bg-surface-0/80 px-3 py-2 text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  required
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 pt-1 text-[11px] text-slate-400">
              <input
                type="checkbox"
                checked={regTerminos}
                onChange={(e) => setRegTerminos(e.target.checked)}
                className="rounded accent-blue-500"
              />
              <span>Acepto los términos de servicio y normas de la comunidad.</span>
            </label>

            <button
              type="submit"
              disabled={cargando}
              className={`w-full rounded-control bg-blue-600 py-3 text-xs font-semibold text-white transition-all hover:bg-blue-500 ${
                cargando ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
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
