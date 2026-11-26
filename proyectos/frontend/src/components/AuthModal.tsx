"use client";

import { useState, useEffect, useCallback } from "react";
import { UsuarioSesion } from "@/types/producto";
import { createClient } from "@/lib/supabase/client";
import { obtenerMiPerfil, mapearPerfilABusinessSession } from "@/services/api";
import TurnstileWidget, { TURNSTILE_SITE_KEY } from "@/components/ui/TurnstileWidget";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UsuarioSesion) => void;
  /** Site key de Turnstile; por defecto, NEXT_PUBLIC_TURNSTILE_SITE_KEY. */
  captchaSiteKey?: string;
}

const AUTH_REQUEST_TIMEOUT_MS = 20_000;

/**
 * Evita que la interfaz quede bloqueada si Supabase o el backend no responden.
 * La petición original puede continuar en red, pero la UI recupera el control.
 */
async function esperarRespuestaAuth<T>(
  peticion: Promise<T>,
  mensaje: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      peticion,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(mensaje)),
          AUTH_REQUEST_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  captchaSiteKey = TURNSTILE_SITE_KEY,
}: AuthModalProps) {
  const [modo, setModo] = useState<"login" | "registro" | "recuperar">("login");

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

  // CAPTCHA (Cloudflare Turnstile). Sin site key no se muestra ni se exige.
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaIntento, setCaptchaIntento] = useState(0);
  const [captchaErrorCarga, setCaptchaErrorCarga] = useState(false);

  /** Cada token sirve para un intento: se descarta y se monta un widget nuevo. */
  const reiniciarCaptcha = useCallback(() => {
    setCaptchaToken(null);
    setCaptchaIntento((n) => n + 1);
  }, []);

  const cambiarModo = useCallback((nuevoModo: "login" | "registro" | "recuperar") => {
    setModo(nuevoModo);
    setCaptchaToken(null);
  }, []);

  const manejarCierre = useCallback(() => {
    cambiarModo("login");
    setLoginEmail("");
    setLoginPassword("");
    setRegNombre("");
    setRegEmail("");
    setRegUsuario("");
    setRegPassword("");
    setRegConfirmPassword("");
    setRegTerminos(false);
    setError("");
    setExito("");
    setCargando(false);
    onClose();
  }, [onClose, cambiarModo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !cargando) manejarCierre();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, manejarCierre, cargando]);

  if (!isOpen) return null;

  const captchaActivo = Boolean(captchaSiteKey);

  /** Devuelve false y muestra el motivo si falta completar el CAPTCHA. */
  const captchaListo = (): boolean => {
    if (!captchaActivo || captchaToken) return true;
    setError(
      captchaErrorCarga
        ? "No se pudo cargar la verificación antibots. Recarga la página o desactiva el bloqueador de contenido para este sitio."
        : "Completa la verificación «No soy un robot» antes de continuar.",
    );
    return false;
  };

  /** Opciones de Supabase con el token, solo cuando el CAPTCHA está activo. */
  const opcionesCaptcha = () =>
    captchaActivo && captchaToken ? { captchaToken } : {};

  const esErrorCaptcha = (mensaje: string) => /captcha/i.test(mensaje);
  const MENSAJE_ERROR_CAPTCHA =
    "La verificación antibots falló o expiró. Complétala de nuevo e inténtalo otra vez.";

  const widgetCaptcha = captchaActivo ? (
    <TurnstileWidget
      key={`${modo}-${captchaIntento}`}
      siteKey={captchaSiteKey}
      onToken={(token) => {
        setCaptchaToken(token);
        if (token) setCaptchaErrorCarga(false);
      }}
      onErrorCarga={() => setCaptchaErrorCarga(true)}
    />
  ) : null;

  const manejarLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setExito("");

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError("Por favor completa tu correo y contraseña.");
      return;
    }

    if (!captchaListo()) return;

    let loginExitoso = false;
    setCargando(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await esperarRespuestaAuth(
        supabase.auth.signInWithPassword({
          email: loginEmail.trim(),
          password: loginPassword,
          options: opcionesCaptcha(),
        }),
        "El inicio de sesión está tardando demasiado. Verifica tu conexión e inténtalo nuevamente.",
      );

      if (authError) {
        if (esErrorCaptcha(authError.message)) {
          setError(MENSAJE_ERROR_CAPTCHA);
        } else if (authError.message.includes("Invalid login credentials")) {
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
        const perfilBackend = await esperarRespuestaAuth(
          obtenerMiPerfil(data.session.access_token),
          "La autenticación respondió, pero el servidor de TecReview no confirmó tu perfil. Inténtalo nuevamente.",
        );
        const usuarioSesion = mapearPerfilABusinessSession(perfilBackend, data.user);

        loginExitoso = true;
        setExito("¡Inicio de sesión exitoso! Bienvenido a TecReview.");
        onLoginSuccess(usuarioSesion);
        onClose();
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
        if (captchaActivo) reiniciarCaptcha();
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

    if (!captchaListo()) return;

    let registroExitoso = false;
    setCargando(true);
    try {
      const supabase = createClient();
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { data, error: authError } = await esperarRespuestaAuth(
        supabase.auth.signUp({
          email: regEmail.trim(),
          password: regPassword,
          options: {
            emailRedirectTo: redirectUrl,
            ...opcionesCaptcha(),
            data: {
              name: regNombre.trim(),
              full_name: regNombre.trim(),
              user_name: regUsuario.trim(),
              usuario: regUsuario.trim(),
            },
          },
        }),
        "El registro está tardando demasiado. Verifica tu conexión e inténtalo nuevamente.",
      );

      if (authError) {
        if (esErrorCaptcha(authError.message)) {
          setError(MENSAJE_ERROR_CAPTCHA);
        } else if (authError.message.includes("User already registered")) {
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
        // El registro terminó: salir del formulario de creación para que nunca
        // permanezca visible el estado «Creando cuenta...».
        setCargando(false);
        cambiarModo("login");
        return;
      }

      // Si Supabase devuelve la sesión activa de inmediato
      try {
        const perfilBackend = await esperarRespuestaAuth(
          obtenerMiPerfil(data.session.access_token),
          "La cuenta se creó, pero TecReview no confirmó tu perfil a tiempo. Inténtalo nuevamente.",
        );
        const usuarioSesion = mapearPerfilABusinessSession(perfilBackend, data.user);

        registroExitoso = true;
        setExito("¡Cuenta creada correctamente! Iniciando tu sesión...");
        onLoginSuccess(usuarioSesion);
        onClose();
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
      // El token ya se gastó, incluso si el registro terminó bien.
      if (captchaActivo) reiniciarCaptcha();
      if (!registroExitoso) {
        setCargando(false);
      }
    }
  };

  const manejarRecuperacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setExito("");

    const correo = loginEmail.trim();
    if (!correo) {
      setError("Escribe el correo electrónico asociado a tu cuenta.");
      return;
    }

    if (!captchaListo()) return;

    setCargando(true);
    try {
      const supabase = createClient();
      const { error: recoveryError } = await esperarRespuestaAuth(
        supabase.auth.resetPasswordForEmail(correo, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
          ...opcionesCaptcha(),
        }),
        "La solicitud está tardando demasiado. Inténtalo nuevamente.",
      );

      if (recoveryError) {
        setError(
          esErrorCaptcha(recoveryError.message ?? "")
            ? MENSAJE_ERROR_CAPTCHA
            : "No fue posible solicitar la recuperación. Verifica el correo e inténtalo nuevamente.",
        );
        return;
      }

      setExito("Si existe una cuenta asociada a ese correo, recibirás instrucciones para restablecer tu contraseña.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible solicitar la recuperación.");
    } finally {
      setCargando(false);
      if (captchaActivo) reiniciarCaptcha();
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) manejarCierre();
      }}
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-ink/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-md animate-scale-in overflow-y-auto rounded-card border border-line bg-paper p-6 text-ink">
        {/* Cabecera modal */}
        <div className="flex items-center justify-between border-b border-dotted border-line pb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-solid" aria-hidden="true" />
            <h2 id="auth-modal-title" className="text-base font-medium uppercase tracking-normal text-ink">
              Acceso a <span className="text-brand-blue">TecReview</span>.
            </h2>
          </div>
          <button
            type="button"
            onClick={manejarCierre}
            className="min-h-11 cursor-pointer rounded-ghost border border-ink bg-transparent px-4 text-label font-medium uppercase text-ink transition-colors hover:bg-surface-muted"
            aria-label="Cerrar modal de autenticación"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Pestañas de Login / Registro */}
        <div className="my-5 flex rounded-full border border-line bg-transparent p-1">
          <button
            type="button"
            onClick={() => {
              cambiarModo("login");
              setLoginEmail("");
              setLoginPassword("");
              setRegNombre("");
              setRegEmail("");
              setRegUsuario("");
              setRegPassword("");
              setRegConfirmPassword("");
              setRegTerminos(false);
              setError("");
              setExito("");
            }}
            className={`min-h-11 flex-1 cursor-pointer rounded-full px-3 py-2 text-xs font-medium uppercase transition-colors ${
              modo === "login"
                ? "bg-surface-2 text-ink"
                : "text-subtle hover:bg-surface-muted hover:text-ink"
            }`}
          >
            INICIAR SESIÓN
          </button>
          <button
            type="button"
            onClick={() => {
              cambiarModo("registro");
              setLoginEmail("");
              setLoginPassword("");
              setRegNombre("");
              setRegEmail("");
              setRegUsuario("");
              setRegPassword("");
              setRegConfirmPassword("");
              setRegTerminos(false);
              setError("");
              setExito("");
            }}
            className={`min-h-11 flex-1 cursor-pointer rounded-full px-3 py-2 text-xs font-medium uppercase transition-colors ${
              modo === "registro"
                ? "bg-surface-2 text-ink"
                : "text-subtle hover:bg-surface-muted hover:text-ink"
            }`}
          >
            CREAR CUENTA
          </button>
        </div>

        {/* Notificaciones de error o éxito */}
        {error && (
          <div className="mb-4 rounded-card border border-status-error bg-paper p-3 text-xs text-status-error" role="alert">
            ⚠️ {error}
          </div>
        )}
        {exito && (
          <div className="mb-4 rounded-card border border-line bg-surface-2 p-3 text-xs text-ink" role="status">
            ✅ {exito}
          </div>
        )}

        {/* FORMULARIO INICIAR SESIÓN */}
        {modo === "login" && (
          <form onSubmit={manejarLogin} className="space-y-4 text-xs">
            <div>
              <label htmlFor="login-email" className="mb-1 block font-medium text-ink">
                Correo electrónico (*)
              </label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="ejemplo@tecreview.com"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1 block font-medium text-ink">
                Contraseña (*)
              </label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-subtle">
              <label htmlFor="login-recordar" className="flex cursor-pointer items-center gap-2">
                <input
                  id="login-recordar"
                  type="checkbox"
                  className="rounded-card accent-brand-blue"
                />
                <span>Recordar sesión</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  cambiarModo("recuperar");
                  setError("");
                  setExito("");
                }}
                className="transition-colors hover:text-brand-blue"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {widgetCaptcha}

            <Button
              variant="primary"
              type="submit"
              disabled={cargando}
              className={`w-full ${
                cargando ? "cursor-not-allowed opacity-70" : "cursor-pointer"
              }`}
            >
              {cargando ? "Iniciando sesión..." : "Entrar a TecReview"}
            </Button>
          </form>
        )}


        {/* FORMULARIO DE RECUPERACIÓN DE CONTRASEÑA */}
        {modo === "recuperar" && (
          <form onSubmit={manejarRecuperacion} className="space-y-4 text-xs">
            <p className="text-sm text-subtle">
              Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
            </p>
            <div>
              <label htmlFor="recovery-email" className="mb-1 block font-medium text-ink">
                Correo electrónico
              </label>
              <Input
                id="recovery-email"
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="ejemplo@tecreview.com"
                required
              />
            </div>
            {widgetCaptcha}
            <Button
              variant="primary"
              type="submit"
              disabled={cargando}
              className="w-full disabled:opacity-70"
            >
              {cargando ? "Enviando..." : "Enviar enlace de recuperación"}
            </Button>
            <button
              type="button"
              onClick={() => {
                cambiarModo("login");
                setLoginEmail("");
                setError("");
                setExito("");
              }}
              className="w-full text-center text-xs font-medium text-brand-blue hover:underline"
            >
              Volver a iniciar sesión
            </button>
          </form>
        )}

        {/* FORMULARIO REGISTRO */}
        {modo === "registro" && (
          <form onSubmit={manejarRegistro} className="space-y-3.5 text-xs">
            <div>
              <label htmlFor="reg-nombre" className="mb-1 block font-medium text-ink">
                Nombre completo (*)
              </label>
              <Input
                id="reg-nombre"
                type="text"
                autoComplete="name"
                value={regNombre}
                onChange={(e) => setRegNombre(e.target.value)}
                placeholder="Ej. Adrian Gómez"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-usuario" className="mb-1 block font-medium text-ink">
                  Usuario (*)
                </label>
                <Input
                  id="reg-usuario"
                  type="text"
                  autoComplete="username"
                  value={regUsuario}
                  onChange={(e) => setRegUsuario(e.target.value)}
                  placeholder="adriang"
                  required
                />
              </div>
              <div>
                <label htmlFor="reg-email" className="mb-1 block font-medium text-ink">
                  Correo (*)
                </label>
                <Input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="adrian@mail.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-password" className="mb-1 block font-medium text-ink">
                  Contraseña (*)
                </label>
                <Input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label htmlFor="reg-confirm" className="mb-1 block font-medium text-ink">
                  Confirmar (*)
                </label>
                <Input
                  id="reg-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <label htmlFor="reg-terminos" className="flex cursor-pointer items-center gap-2 pt-1 text-[11px] text-subtle">
              <input
                id="reg-terminos"
                type="checkbox"
                checked={regTerminos}
                onChange={(e) => setRegTerminos(e.target.checked)}
                className="rounded-card accent-brand-blue"
              />
              <span>Acepto los términos de servicio y normas de la comunidad.</span>
            </label>

            {widgetCaptcha}

            <Button
              variant="primary"
              type="submit"
              disabled={cargando}
              className={`w-full ${
                cargando ? "cursor-not-allowed opacity-70" : "cursor-pointer"
              }`}
            >
              {cargando ? "Creando cuenta..." : "Crear mi cuenta"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
