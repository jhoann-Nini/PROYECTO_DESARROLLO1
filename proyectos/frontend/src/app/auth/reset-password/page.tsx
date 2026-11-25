"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [sesionValida, setSesionValida] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function verificarSesionRecuperacion() {
      try {
        const supabase = createClient();
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (cancelado) return;

        if (sessionError || !data.session) {
          setError("El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo desde el inicio de sesión.");
          setSesionValida(false);
        } else {
          setSesionValida(true);
        }
      } catch {
        if (!cancelado) {
          setError("No fue posible verificar el enlace. Solicita uno nuevo e inténtalo otra vez.");
        }
      } finally {
        if (!cancelado) setVerificando(false);
      }
    }

    verificarSesionRecuperacion();
    return () => {
      cancelado = true;
    };
  }, []);

  async function manejarCambioPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setExito("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError("No fue posible actualizar la contraseña. Solicita un nuevo enlace e inténtalo otra vez.");
        return;
      }

      setExito("Tu contraseña se actualizó correctamente. Serás redirigido al inicio de sesión.");
      window.setTimeout(() => router.replace("/"), 1800);
    } catch {
      setError("Ocurrió un error al actualizar la contraseña. Inténtalo nuevamente.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <section className="w-full max-w-md rounded-card border border-line bg-paper p-8">
        <h1 className="mb-2 text-2xl font-medium uppercase text-ink">Restablecer contraseña</h1>
        <p className="mb-6 text-sm text-subtle">
          Crea una contraseña nueva para tu cuenta de TecReview.
        </p>

        {verificando ? (
          <p className="text-sm text-subtle" role="status">Verificando el enlace...</p>
        ) : null}

        {!verificando && error ? (
          <div className="mb-4 rounded-card border border-status-error bg-paper p-3 text-sm text-status-error" role="alert">
            {error}
          </div>
        ) : null}

        {!verificando && exito ? (
          <div className="mb-4 rounded-card border border-line bg-surface-2 p-3 text-sm text-ink" role="status">
            {exito}
          </div>
        ) : null}

        {!verificando && sesionValida && !exito ? (
          <form onSubmit={manejarCambioPassword} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-ink">
                Nueva contraseña
              </label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-ink">
                Confirmar contraseña
              </label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={confirmacion}
                onChange={(event) => setConfirmacion(event.target.value)}
              />
            </div>
            <Button
              variant="primary"
              type="submit"
              disabled={cargando}
              className="w-full disabled:opacity-70"
            >
              {cargando ? "Actualizando..." : "Guardar nueva contraseña"}
            </Button>
          </form>
        ) : null}

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm font-medium text-brand-blue hover:underline">
            Volver a TecReview
          </Link>
        </div>
      </section>
    </main>
  );
}
