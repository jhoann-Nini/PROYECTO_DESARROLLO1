// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AuthModal from "./AuthModal";

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockObtenerMiPerfil = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  }),
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerMiPerfil: (...args: unknown[]) => mockObtenerMiPerfil(...args),
  };
});

// Sustituye el widget real de Cloudflare: un botón entrega un token de prueba.
vi.mock("@/components/ui/TurnstileWidget", () => ({
  TURNSTILE_SITE_KEY: "",
  default: ({ onToken }: { onToken: (token: string | null) => void }) => (
    <button type="button" onClick={() => onToken("token-captcha-prueba")}>
      Completar CAPTCHA de prueba
    </button>
  ),
}));

describe("Componente AuthModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("1. Debe invocar signUp incluyendo emailRedirectTo hacia /auth/callback", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: {
        user: { id: "usr_new", email: "nuevo@example.com" },
        session: null,
      },
      error: null,
    });

    render(<AuthModal isOpen={true} onClose={() => {}} onLoginSuccess={() => {}} />);

    // Cambiar a la pestaña de registro
    fireEvent.click(screen.getByRole("button", { name: /Crear cuenta/i }));

    // Completar el formulario
    fireEvent.change(screen.getByPlaceholderText(/Ej. Adrian Gómez/i), {
      target: { value: "Juan Pérez" },
    });
    fireEvent.change(screen.getByPlaceholderText(/adriang/i), {
      target: { value: "juanp" },
    });
    fireEvent.change(screen.getByPlaceholderText(/adrian@mail.com/i), {
      target: { value: "juan@example.com" },
    });

    const passwordInputs = screen.getAllByPlaceholderText(/••••••••/i);
    // El primero es la contraseña, el segundo es confirmar contraseña
    fireEvent.change(passwordInputs[0], {
      target: { value: "Password123!" },
    });
    fireEvent.change(passwordInputs[1], {
      target: { value: "Password123!" },
    });

    // Aceptar términos
    const terminosCheckbox = screen.getByRole("checkbox");
    fireEvent.click(terminosCheckbox);

    // Enviar formulario
    const submitBtn = screen.getByRole("button", { name: /Crear mi cuenta/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
    });

    const signUpCall = mockSignUp.mock.calls[0][0];
    expect(signUpCall.email).toBe("juan@example.com");
    expect(signUpCall.password).toBe("Password123!");
    expect(signUpCall.options?.emailRedirectTo).toContain("/auth/callback");

    await waitFor(() => {
      expect(
        screen.getByText(/¡Registro exitoso! Hemos enviado un enlace de confirmación/i),
      ).toBeDefined();
      expect(
        screen.getByRole("button", { name: /Entrar a TecReview/i }),
      ).toBeDefined();
      expect(
        screen.queryByRole("button", { name: /Creando cuenta/i }),
      ).toBeNull();
    });
  });

  it("2. Tras iniciar sesión en Supabase debe consultar obtenerMiPerfil y llamar onLoginSuccess con el perfil de negocio", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: "sub_uuid_123",
          email: "login@tecreview.com",
          user_metadata: { user_name: "login_user" },
        },
        session: {
          access_token: "fake.supabase.token",
        },
      },
      error: null,
    });

    mockObtenerMiPerfil.mockResolvedValueOnce({
      idUsuario: 77,
      nombre: "Usuario Aprovisionado",
      correo: "login@tecreview.com",
      rol: "Usuario registrado",
      activo: true,
      fechaRegistro: "2026-10-14T22:00:00",
    });

    const onLoginSuccessMock = vi.fn();
    render(<AuthModal isOpen={true} onClose={() => {}} onLoginSuccess={onLoginSuccessMock} />);

    fireEvent.change(screen.getByPlaceholderText(/ejemplo@tecreview.com/i), {
      target: { value: "login@tecreview.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Entrar a TecReview/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
      expect(mockObtenerMiPerfil).toHaveBeenCalledWith("fake.supabase.token");
    });

    await waitFor(() => {
      expect(onLoginSuccessMock).toHaveBeenCalledTimes(1);
    });

    const sesionCreada = onLoginSuccessMock.mock.calls[0][0];
    expect(sesionCreada.nombre).toBe("Usuario Aprovisionado");
    expect(sesionCreada.rol).toBe("Usuario registrado");
    expect(sesionCreada.idUsuario).toBe(77);
  });

  it("3. Si obtenerMiPerfil falla por conflicto de cuenta histórica, muestra el error y NO invoca onLoginSuccess", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: "sub_uuid_conflict",
          email: "conflicto@tecreview.com",
        },
        session: {
          access_token: "conflict.token",
        },
      },
      error: null,
    });

    mockObtenerMiPerfil.mockRejectedValueOnce(
      new Error("Existe una cuenta previa registrada con el correo conflicto@tecreview.com sin vinculación segura.")
    );

    const onLoginSuccessMock = vi.fn();
    render(<AuthModal isOpen={true} onClose={() => {}} onLoginSuccess={onLoginSuccessMock} />);

    fireEvent.change(screen.getByPlaceholderText(/ejemplo@tecreview.com/i), {
      target: { value: "conflicto@tecreview.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Entrar a TecReview/i }));

    await waitFor(() => {
      expect(mockObtenerMiPerfil).toHaveBeenCalledWith("conflict.token");
    });

    await waitFor(() => {
      expect(screen.getByText(/sin vinculación segura/i)).toBeDefined();
    });

    expect(onLoginSuccessMock).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("4. Durante el retardo de éxito en el login, el botón permanece deshabilitado evitando envíos duplicados (H-05)", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: "sub_uuid_h05",
          email: "h05@tecreview.com",
        },
        session: {
          access_token: "h05.token",
        },
      },
      error: null,
    });

    mockObtenerMiPerfil.mockResolvedValueOnce({
      idUsuario: 80,
      nombre: "Usuario H05",
      correo: "h05@tecreview.com",
      rol: "Usuario registrado",
      activo: true,
      fechaRegistro: "2026-10-14T22:00:00",
    });

    render(<AuthModal isOpen={true} onClose={() => {}} onLoginSuccess={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/ejemplo@tecreview.com/i), {
      target: { value: "h05@tecreview.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "Password123!" },
    });

    const submitBtn = screen.getByRole("button", { name: /Entrar a TecReview/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/¡Inicio de sesión exitoso!/i)).toBeDefined();
    });

    const successBtn = screen.getByRole("button", { name: /Iniciando sesión.../i }) as HTMLButtonElement;
    expect(successBtn.disabled).toBe(true);

    // Intentar disparar clics adicionales no debe generar llamadas redundantes
    fireEvent.click(successBtn);
    expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
    expect(mockObtenerMiPerfil).toHaveBeenCalledTimes(1);
  });
});

describe("AuthModal con CAPTCHA (Cloudflare Turnstile)", () => {
  const SITE_KEY = "site-key-de-prueba";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function completarLogin() {
    fireEvent.change(screen.getByPlaceholderText(/ejemplo@tecreview.com/i), {
      target: { value: "captcha@tecreview.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "Password123!" },
    });
  }

  it("sin site key no muestra el CAPTCHA ni envía captchaToken", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });
    render(<AuthModal isOpen={true} onClose={() => {}} onLoginSuccess={() => {}} />);

    expect(screen.queryByRole("button", { name: /Completar CAPTCHA/i })).toBeNull();
    completarLogin();
    fireEvent.click(screen.getByRole("button", { name: /Entrar a TecReview/i }));

    await waitFor(() => expect(mockSignInWithPassword).toHaveBeenCalledTimes(1));
    expect(mockSignInWithPassword.mock.calls[0][0].options).toEqual({});
  });

  it("no inicia sesión hasta completar el CAPTCHA", async () => {
    render(
      <AuthModal isOpen={true} onClose={() => {}} onLoginSuccess={() => {}} captchaSiteKey={SITE_KEY} />,
    );
    completarLogin();
    fireEvent.click(screen.getByRole("button", { name: /Entrar a TecReview/i }));

    expect(await screen.findByText(/Completa la verificación «No soy un robot»/i)).toBeDefined();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("envía el token a signInWithPassword", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });
    render(
      <AuthModal isOpen={true} onClose={() => {}} onLoginSuccess={() => {}} captchaSiteKey={SITE_KEY} />,
    );
    completarLogin();
    fireEvent.click(screen.getByRole("button", { name: /Completar CAPTCHA/i }));
    fireEvent.click(screen.getByRole("button", { name: /Entrar a TecReview/i }));

    await waitFor(() => expect(mockSignInWithPassword).toHaveBeenCalledTimes(1));
    expect(mockSignInWithPassword.mock.calls[0][0].options).toEqual({
      captchaToken: "token-captcha-prueba",
    });
  });

  it("si Supabase rechaza el CAPTCHA, lo explica y exige uno nuevo", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "captcha protection: request disallowed (timeout-or-duplicate)" },
    });
    render(
      <AuthModal isOpen={true} onClose={() => {}} onLoginSuccess={() => {}} captchaSiteKey={SITE_KEY} />,
    );
    completarLogin();
    fireEvent.click(screen.getByRole("button", { name: /Completar CAPTCHA/i }));
    fireEvent.click(screen.getByRole("button", { name: /Entrar a TecReview/i }));

    expect(await screen.findByText(/La verificación antibots falló o expiró/i)).toBeDefined();

    // El token ya se gastó: un segundo intento sin completar el CAPTCHA se detiene.
    fireEvent.click(screen.getByRole("button", { name: /Entrar a TecReview/i }));
    expect(await screen.findByText(/Completa la verificación «No soy un robot»/i)).toBeDefined();
    expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
  });

  it("envía el token a signUp", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: "usr_captcha" }, session: null },
      error: null,
    });
    render(
      <AuthModal isOpen={true} onClose={() => {}} onLoginSuccess={() => {}} captchaSiteKey={SITE_KEY} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Crear cuenta/i }));
    fireEvent.change(screen.getByPlaceholderText(/Ej. Adrian Gómez/i), { target: { value: "Ana" } });
    fireEvent.change(screen.getByPlaceholderText(/adriang/i), { target: { value: "ana" } });
    fireEvent.change(screen.getByPlaceholderText(/adrian@mail.com/i), {
      target: { value: "ana@example.com" },
    });
    const claves = screen.getAllByPlaceholderText(/••••••••/i);
    fireEvent.change(claves[0], { target: { value: "Password123!" } });
    fireEvent.change(claves[1], { target: { value: "Password123!" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Completar CAPTCHA/i }));
    fireEvent.click(screen.getByRole("button", { name: /Crear mi cuenta/i }));

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));
    expect(mockSignUp.mock.calls[0][0].options.captchaToken).toBe("token-captcha-prueba");
    expect(mockSignUp.mock.calls[0][0].options.emailRedirectTo).toContain("/auth/callback");
  });

  it("envía el token a resetPasswordForEmail", async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null });
    render(
      <AuthModal isOpen={true} onClose={() => {}} onLoginSuccess={() => {}} captchaSiteKey={SITE_KEY} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /¿Olvidaste tu contraseña?/i }));
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: "olvido@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Completar CAPTCHA/i }));
    fireEvent.click(screen.getByRole("button", { name: /Enviar enlace de recuperación/i }));

    await waitFor(() => expect(mockResetPasswordForEmail).toHaveBeenCalledTimes(1));
    expect(mockResetPasswordForEmail.mock.calls[0][0]).toBe("olvido@example.com");
    expect(mockResetPasswordForEmail.mock.calls[0][1].captchaToken).toBe("token-captcha-prueba");
  });
});
