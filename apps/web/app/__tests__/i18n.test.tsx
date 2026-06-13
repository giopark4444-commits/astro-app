import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import es from "../../messages/es.json";

function Nav() { const t = useTranslations("nav"); return <span>{t("numeros")}</span>; }

describe("i18n catalogs", () => {
  it("renderiza la etiqueta en español", () => {
    render(<NextIntlClientProvider locale="es" messages={es}><Nav /></NextIntlClientProvider>);
    expect(screen.getByText("Números")).toBeInTheDocument();
  });
  it("es y en tienen las mismas claves en todas las secciones", async () => {
    const en = (await import("../../messages/en.json")).default;
    for (const section of Object.keys(es) as (keyof typeof es)[]) {
      expect(Object.keys(es[section]).sort()).toEqual(Object.keys((en as typeof es)[section]).sort());
    }
  });
});
