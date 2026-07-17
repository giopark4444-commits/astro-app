import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ReferralSection } from "../referral-section";

const writeTextMock = vi.fn();
const summaryMock = vi.fn();

vi.mock("../actions", () => ({
  myReferralSummary: () => summaryMock(),
}));

function renderSection() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ReferralSection />
    </NextIntlClientProvider>,
  );
}

describe("ReferralSection", () => {
  beforeEach(() => {
    writeTextMock.mockReset().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });
    summaryMock.mockReset();
  });

  it("sin código propio, muestra el mensaje sin nombrar a Gio", async () => {
    summaryMock.mockResolvedValue({ ok: true, row: null });
    renderSection();
    await waitFor(() => expect(screen.getByText(es.admin.myReferralEmpty)).toBeInTheDocument());
    expect(screen.queryByText(/gio/i)).not.toBeInTheDocument();
  });

  it("con código propio, muestra código, link y contadores", async () => {
    summaryMock.mockResolvedValue({
      ok: true,
      row: { code: "GIO1234", discount_pct: 10, commission_pct: 30, referred_count: 3, pending_cents: 999, paid_cents: 100 },
    });
    renderSection();
    await waitFor(() => expect(screen.getByText("GIO1234")).toBeInTheDocument());
    expect(screen.getByText(/\?ref=GIO1234/)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("$9.99")).toBeInTheDocument();
    expect(screen.getByText("$1.00")).toBeInTheDocument();
  });

  it("si la migración 0016 no está aplicada, muestra el banner de migración pendiente", async () => {
    summaryMock.mockResolvedValue({ ok: false, error: "boom" });
    renderSection();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(es.admin.migrationPending));
  });

  it("copia el código al portapapeles", async () => {
    summaryMock.mockResolvedValue({
      ok: true,
      row: { code: "GIO1234", discount_pct: 10, commission_pct: 30, referred_count: 0, pending_cents: 0, paid_cents: 0 },
    });
    renderSection();
    await waitFor(() => expect(screen.getByText("GIO1234")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: es.admin.myReferralCopy })[0]!);
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith("GIO1234"));
  });
});
