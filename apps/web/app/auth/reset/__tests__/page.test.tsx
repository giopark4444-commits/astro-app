import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import ResetPasswordPage from "../page";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const getSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
const updateUserMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: () => getSessionMock(),
      onAuthStateChange: (cb: unknown) => onAuthStateChangeMock(cb),
      updateUser: (attrs: unknown) => updateUserMock(attrs),
    },
  }),
}));

function renderPage() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ResetPasswordPage />
    </NextIntlClientProvider>,
  );
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    getSessionMock.mockReset();
    onAuthStateChangeMock.mockClear();
    updateUserMock.mockReset();
  });

  it("sin sesión de recovery (navegación directa) muestra el estado inválido, no un crash", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    await act(async () => {
      renderPage();
    });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(es.auth.errResetLink);
    });
    expect(screen.getByRole("link", { name: es.auth.forgotPassword })).toHaveAttribute("href", "/auth/forgot");
    expect(screen.queryByPlaceholderText(es.auth.newPassword)).not.toBeInTheDocument();
  });

  it("con sesión de recovery muestra el formulario de nueva contraseña", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    await act(async () => {
      renderPage();
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(es.auth.newPassword)).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(es.auth.confirmPassword)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.auth.updatePassword })).toBeInTheDocument();
  });

  it("contraseñas que no coinciden muestran errPasswordMatch y no llaman a updateUser", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    await act(async () => {
      renderPage();
    });
    await waitFor(() => screen.getByPlaceholderText(es.auth.newPassword));
    fireEvent.change(screen.getByPlaceholderText(es.auth.newPassword), { target: { value: "password1" } });
    fireEvent.change(screen.getByPlaceholderText(es.auth.confirmPassword), { target: { value: "password2" } });
    fireEvent.click(screen.getByRole("button", { name: es.auth.updatePassword }));
    expect(await screen.findByRole("alert")).toHaveTextContent(es.auth.errPasswordMatch);
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("al actualizar la contraseña con éxito redirige a /hoy (ya logueado)", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    updateUserMock.mockResolvedValue({ error: null });
    await act(async () => {
      renderPage();
    });
    await waitFor(() => screen.getByPlaceholderText(es.auth.newPassword));
    fireEvent.change(screen.getByPlaceholderText(es.auth.newPassword), { target: { value: "password1" } });
    fireEvent.change(screen.getByPlaceholderText(es.auth.confirmPassword), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: es.auth.updatePassword }));
    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith({ password: "password1" });
      expect(replaceMock).toHaveBeenCalledWith("/hoy");
    });
  });

  it("si updateUser falla muestra errResetLink", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    updateUserMock.mockResolvedValue({ error: { message: "expired" } });
    await act(async () => {
      renderPage();
    });
    await waitFor(() => screen.getByPlaceholderText(es.auth.newPassword));
    fireEvent.change(screen.getByPlaceholderText(es.auth.newPassword), { target: { value: "password1" } });
    fireEvent.change(screen.getByPlaceholderText(es.auth.confirmPassword), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: es.auth.updatePassword }));
    expect(await screen.findByRole("alert")).toHaveTextContent(es.auth.errResetLink);
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
