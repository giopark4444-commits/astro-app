import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../../messages/es.json";
import { OnboardingFlow } from "../onboarding-flow";

vi.mock("../actions", () => ({
  createBirthProfile: vi.fn(),
}));

vi.mock("../place-autocomplete", () => ({
  PlaceAutocomplete: () => null,
}));

function renderFlow() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <OnboardingFlow />
    </NextIntlClientProvider>,
  );
}

describe("OnboardingFlow — pasos de intención", () => {
  it("omitir metas salta la afirmación y aterriza en foco", () => {
    renderFlow();

    expect(screen.getByText(es.onboarding.intentGoalsTitle)).toBeInTheDocument();
    fireEvent.click(screen.getByText(es.onboarding.intentSkip));

    expect(screen.getByText(es.onboarding.intentFocusTitle)).toBeInTheDocument();
    expect(screen.queryByText(es.onboarding.intentAffirmTitle)).not.toBeInTheDocument();
  });

  it("elegir una meta y avanzar muestra la afirmación con esa línea", () => {
    renderFlow();

    expect(screen.getByText(es.onboarding.intentGoalsTitle)).toBeInTheDocument();
    fireEvent.click(screen.getByText(es.onboarding.intentGoalSelf));
    fireEvent.click(screen.getByText(es.onboarding.next));

    expect(screen.getByText(es.onboarding.intentAffirmTitle)).toBeInTheDocument();
    expect(screen.getByText(es.onboarding.intentAffirmSelf)).toBeInTheDocument();
  });

  it("Enter en un input avanza al siguiente paso cuando el actual está completo", () => {
    renderFlow();

    fireEvent.keyDown(screen.getByPlaceholderText(es.onboarding.intentGoalNotePlaceholder), { key: "Enter" });

    expect(screen.getByText(es.onboarding.intentFocusTitle)).toBeInTheDocument();
  });

  it("Enter sobre un chip no avanza (el chip usa Enter para activarse)", () => {
    renderFlow();

    fireEvent.keyDown(screen.getByText(es.onboarding.intentGoalSelf), { key: "Enter" });

    expect(screen.getByText(es.onboarding.intentGoalsTitle)).toBeInTheDocument();
  });
});
