import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ReferralRedeem } from "../referral-redeem";

const refreshMock = vi.fn();
const redeemMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock("@/lib/referrals/actions", () => ({
  redeemReferralCode: (code: string) => redeemMock(code),
}));

function renderRedeem(appliedCode: string | null) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ReferralRedeem appliedCode={appliedCode} />
    </NextIntlClientProvider>,
  );
}

describe("ReferralRedeem", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    redeemMock.mockReset();
  });

  it("con código ya aplicado, lo muestra en vez del input", () => {
    renderRedeem("GIO1234");
    expect(screen.getByText("GIO1234")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("sin código aplicado, muestra el input + botón Aplicar", () => {
    renderRedeem(null);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.settings.referralApply })).toBeInTheDocument();
  });

  it("al aplicar con éxito, limpia el input y refresca la página", async () => {
    redeemMock.mockResolvedValue({ ok: true });
    renderRedeem(null);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "gio1234" } });
    fireEvent.click(screen.getByRole("button", { name: es.settings.referralApply }));
    await waitFor(() => expect(redeemMock).toHaveBeenCalledWith("gio1234"));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(input).toHaveValue("");
  });

  it("si el canje falla, muestra el error de la EXCEPTION con dignidad y NO limpia el input", async () => {
    redeemMock.mockResolvedValue({ ok: false, error: "ya tienes un código aplicado" });
    renderRedeem(null);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "GIO1234" } });
    fireEvent.click(screen.getByRole("button", { name: es.settings.referralApply }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("ya tienes un código aplicado"));
    expect(refreshMock).not.toHaveBeenCalled();
    expect(input).toHaveValue("GIO1234");
  });

  it("el botón está deshabilitado con el input vacío", () => {
    renderRedeem(null);
    expect(screen.getByRole("button", { name: es.settings.referralApply })).toBeDisabled();
  });
});
