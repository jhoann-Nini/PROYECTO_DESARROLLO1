// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import AuthCallbackPage from "./page";

// Mocks de next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock del cliente de Supabase
const mockExchangeCodeForSession = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      getSession: mockGetSession,
    },
  }),
}));

describe("Página de Callback de Autenticación (/auth/callback)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("1. Debe mostrar estado de error si la URL contiene parámetros de error de Supabase", async () => {
    mockSearchParams = new URLSearchParams({
      error: "access_denied",
      error_description: "Email link is invalid or has expired",
    });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Error de Confirmación")).toBeDefined();
    });

    expect(
      screen.getByText(/El enlace de confirmación ha expirado/i),
    ).toBeDefined();
    expect(screen.queryByText("¡Confirmación Exitosa!")).toBeNull();
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("2. Debe procesar el código PKCE con éxito y mostrar confirmación exitosa", async () => {
    mockSearchParams = new URLSearchParams({
      code: "pkce_valid_auth_code_123",
    });

    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          access_token: "mock-token",
          user: { id: "usr_123", email: "test@example.com" },
        },
      },
      error: null,
    });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("pkce_valid_auth_code_123");
    });

    await waitFor(() => {
      expect(screen.getByText("¡Confirmación Exitosa!")).toBeDefined();
    });

    expect(
      screen.getByText(/¡Tu correo ha sido confirmado con éxito!/i),
    ).toBeDefined();
  });

  it("3. Debe mostrar mensaje de error si el intercambio de código PKCE falla", async () => {
    mockSearchParams = new URLSearchParams({
      code: "invalid_code",
    });

    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid code or code verifier not found" },
    });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("invalid_code");
    });

    await waitFor(() => {
      expect(screen.getByText("Error de Confirmación")).toBeDefined();
    });

    expect(
      screen.getByText(/El enlace de confirmación no es válido o ya fue utilizado/i),
    ).toBeDefined();
    expect(screen.queryByText("¡Confirmación Exitosa!")).toBeNull();
  });

  it("3b. Debe marcar éxito si exchangeCodeForSession falla pero getSession() ya posee una sesión activa (resiliencia H-03 ante detectSessionInUrl)", async () => {
    mockSearchParams = new URLSearchParams({
      code: "already_exchanged_code",
    });

    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: "code verifier not found" },
    });

    // Simular que el cliente de Supabase ya procesó la sesión mediante detectSessionInUrl
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "auto-exchanged-access-token",
          user: { id: "usr_pkce_auto", email: "auto@example.com" },
        },
      },
      error: null,
    });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("already_exchanged_code");
      expect(mockGetSession).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("¡Confirmación Exitosa!")).toBeDefined();
    });

    expect(
      screen.getByText(/¡Tu correo ha sido confirmado con éxito!/i),
    ).toBeDefined();
    expect(screen.queryByText("Error de Confirmación")).toBeNull();
  });

  it("4. Debe detectar sesión activa existente y marcar éxito", async () => {
    mockSearchParams = new URLSearchParams();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "existing-token",
          user: { id: "usr_active", email: "active@example.com" },
        },
      },
      error: null,
    });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("¡Confirmación Exitosa!")).toBeDefined();
    });

    expect(screen.getByText(/¡Sesión confirmada!/i)).toBeDefined();
  });

  it("5. Debe mostrar error si no se reciben código, error ni sesión activa", async () => {
    mockSearchParams = new URLSearchParams();
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Error de Confirmación")).toBeDefined();
    });

    expect(
      screen.getByText(/No se encontraron credenciales ni código de confirmación/i),
    ).toBeDefined();
    expect(screen.queryByText("¡Confirmación Exitosa!")).toBeNull();
  });
});
