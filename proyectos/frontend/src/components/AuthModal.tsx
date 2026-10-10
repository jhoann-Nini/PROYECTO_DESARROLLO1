"use client";

import { useState, useEffect } from "react";
import { UsuarioSesion } from "@/types/producto";

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

  // Estados de error / feedback
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const manejarLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setExito("");

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError("Por favor completa todos los campos de inicio de sesión.");
      return;
    }

    const usuarioSimulado: UsuarioSesion = {
      id: "usr_" + Date.now(),
      nombre: loginEmail.split("@")[0].toUpperCase() || "USUARIO",
      usuario: loginEmail.split("@")[0],
      email: loginEmail,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    };

    localStorage.setItem("usuario_sesion", JSON.stringify(usuarioSimulado));
    setExito("¡Sesión iniciada con éxito! Bienvenido al portal.");

    setTimeout(() => {
      onLoginSuccess(usuarioSimulado);
      onClose();
    }, 800);
  };

  const manejarRegistro = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setExito("");

    if (!regNombre.trim() || !regEmail.trim() || !regUsuario.trim() || !regPassword.trim()) {
      setError("Todos los campos con (*) son obligatorios.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!regTerminos) {
      setError("Debes aceptar los términos y políticas de uso.");
      return;
    }

    const nuevoUsuario: UsuarioSesion = {
      id: "usr_" + Date.now(),
      nombre: regNombre,
      usuario: regUsuario,
      email: regEmail,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    };

    localStorage.setItem("usuario_sesion", JSON.stringify(nuevoUsuario));
    setExito("¡Cuenta registrada con éxito! Iniciando sesión automáticamente...");

    setTimeout(() => {
      onLoginSuccess(nuevoUsuario);
      onClose();
    }, 1000);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-[#0d0d10] p-6 shadow-2xl">
        {/* Cabecera modal */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#d71920] animate-ping"></span>
            <h2 className="font-dot text-lg font-bold text-white tracking-wider">
              AUTHENTICATION <span className="text-[#d71920]">{"// OS"}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-zinc-400 hover:border-[#d71920] hover:text-white transition-all cursor-pointer"
          >
            ✕ CERRAR
          </button>
        </div>

        {/* Pestañas de Login / Registro */}
        <div className="my-5 flex rounded-xl border border-zinc-800 bg-black p-1">
          <button
            onClick={() => {
              setModo("login");
              setError("");
              setExito("");
            }}
            className={`flex-1 rounded-lg py-2 font-mono text-xs font-bold transition-all cursor-pointer ${
              modo === "login"
                ? "bg-[#d71920] text-white shadow-[0_0_12px_rgba(215,25,32,0.4)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            [ 1. INICIAR SESIÓN ]
          </button>
          <button
            onClick={() => {
              setModo("registro");
              setError("");
              setExito("");
            }}
            className={`flex-1 rounded-lg py-2 font-mono text-xs font-bold transition-all cursor-pointer ${
              modo === "registro"
                ? "bg-[#d71920] text-white shadow-[0_0_12px_rgba(215,25,32,0.4)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            [ 2. CREAR CUENTA ]
          </button>
        </div>

        {/* Notificaciones de error o éxito */}
        {error && (
          <div className="mb-4 rounded-xl border border-[#d71920]/50 bg-[#1f0d0f] p-3 font-mono text-xs text-[#ff6b75]" role="alert">
            🚨 {error}
          </div>
        )}
        {exito && (
          <div className="mb-4 rounded-xl border border-emerald-500/50 bg-emerald-950 p-3 font-mono text-xs text-emerald-400" role="status">
            ✅ {exito}
          </div>
        )}

        {/* FORMULARIO INICIAR SESIÓN */}
        {modo === "login" && (
          <form onSubmit={manejarLogin} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">CORREO O USUARIO (*)</label>
              <input
                type="text"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="ejemplo@tecnoreview.com"
                className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-2.5 text-white placeholder:text-zinc-600 focus:border-[#d71920] focus:outline-none focus:ring-1 focus:ring-[#d71920]"
                required
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">CONTRASEÑA (*)</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-2.5 text-white placeholder:text-zinc-600 focus:border-[#d71920] focus:outline-none focus:ring-1 focus:ring-[#d71920]"
                required
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-[#d71920] rounded" />
                <span>Recordar sesión</span>
              </label>
              <a href="#" className="hover:text-[#d71920] transition-colors">¿Olvidaste tu contraseña?</a>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl border border-[#d71920] bg-[#d71920] py-3 font-dot text-xs font-bold text-white transition-all hover:bg-[#ff2a35] hover:shadow-[0_0_20px_rgba(215,25,32,0.5)] cursor-pointer"
            >
              INGRESAR AL SISTEMA
            </button>
          </form>
        )}

        {/* FORMULARIO REGISTRO */}
        {modo === "registro" && (
          <form onSubmit={manejarRegistro} className="space-y-3.5 font-mono text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">NOMBRE COMPLETO (*)</label>
              <input
                type="text"
                value={regNombre}
                onChange={(e) => setRegNombre(e.target.value)}
                placeholder="Ej. Adrian Gomez"
                className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-2 text-white placeholder:text-zinc-600 focus:border-[#d71920] focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1">USUARIO (*)</label>
                <input
                  type="text"
                  value={regUsuario}
                  onChange={(e) => setRegUsuario(e.target.value)}
                  placeholder="adriang"
                  className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-600 focus:border-[#d71920] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">CORREO (*)</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="adrian@mail.com"
                  className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-600 focus:border-[#d71920] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1">CONTRASEÑA (*)</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-600 focus:border-[#d71920] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">CONFIRMAR (*)</label>
                <input
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-600 focus:border-[#d71920] focus:outline-none"
                  required
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={regTerminos}
                onChange={(e) => setRegTerminos(e.target.checked)}
                className="accent-[#d71920] rounded"
              />
              <span>Acepto los términos de servicio y moderación de contenido.</span>
            </label>

            <button
              type="submit"
              className="w-full rounded-xl border border-[#d71920] bg-[#d71920] py-3 font-dot text-xs font-bold text-white transition-all hover:bg-[#ff2a35] hover:shadow-[0_0_20px_rgba(215,25,32,0.5)] cursor-pointer"
            >
              REGISTRAR NUEVO USUARIO
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
