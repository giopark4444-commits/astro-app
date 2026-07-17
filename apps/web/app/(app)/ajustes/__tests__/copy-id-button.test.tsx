import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { CopyIdButton } from "../copy-id-button";

const writeTextMock = vi.fn();

function renderButton() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <CopyIdButton value="abc-123" />
    </NextIntlClientProvider>,
  );
}

describe("CopyIdButton", () => {
  beforeEach(() => {
    writeTextMock.mockReset().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });
  });

  it("copia el valor al portapapeles y muestra feedback temporal", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: es.settings.copyId }));
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith("abc-123"));
    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent(es.settings.copied));
    act(() => vi.advanceTimersByTime(1600));
    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent(es.settings.copyId));
    vi.useRealTimers();
  });

  it("si el portapapeles falla, no rompe (falla en silencio)", async () => {
    writeTextMock.mockRejectedValue(new Error("denied"));
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: es.settings.copyId }));
    await waitFor(() => expect(writeTextMock).toHaveBeenCalled());
    expect(screen.getByRole("button")).toHaveTextContent(es.settings.copyId);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
