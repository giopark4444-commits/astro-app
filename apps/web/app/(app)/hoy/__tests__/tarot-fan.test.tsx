import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { drawCards, mulberry32, dailySeed } from "@aluna/core";
import es from "@/messages/es.json";
import { TAROT_CARDS_ES } from "@/lib/content/tarot-es";
import { TarotFan, TAROT_FAN_SIZE } from "../tarot-fan";

// Task 6: el abanico de tarot del dashboard — N dorsos boca abajo, barajados
// DETERMINISTA por (día civil + perfil). Tocar un dorso lo voltea (flip 3D) y
// revela su carta (imagen + nombre + esencia). Elegir la MISMA posición el
// mismo día para el mismo perfil revela SIEMPRE la misma carta.

// Fecha civil local del cliente — misma fórmula que el componente (y que
// tarot-view / horoscopo): Intl en-CA en la tz resuelta → "YYYY-MM-DD".
function todayLocalDate(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "utc";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Recompone la baraja del día EXACTAMENTE como el componente para derivar qué
// carta cae bajo cada posición (semilla = dailySeed(profileId, fecha)).
function expectedFanNames(profileId: string): string[] {
  const rng = mulberry32(dailySeed(profileId, todayLocalDate()));
  return drawCards(TAROT_FAN_SIZE, rng, { reversals: true }).map(
    (d) => TAROT_CARDS_ES[d.card.id]!.name,
  );
}

function renderFan(profileId: string) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <TarotFan profileId={profileId} />
    </NextIntlClientProvider>,
  );
}

describe("TarotFan", () => {
  beforeEach(() => {
    // El mazo se resuelve por useDeckAssets (GET /api/tarot/deck). Sin red el
    // hook cae a RWS (su try/catch NO hace setState en el fallo) — así el test
    // no toca la red y evita un update asíncrono post-montaje. El abanico usa
    // el ctx RWS inicial; sus URLs no se cargan en jsdom, no nos importan aquí.
    global.fetch = vi.fn(async () => {
      throw new Error("no network in test");
    }) as unknown as typeof fetch;
  });

  it("monta N dorsos boca abajo, sin ninguna carta revelada todavía", () => {
    renderFan("profile-1");

    // Un botón por posición del abanico (el CTA es un <Link>, no cuenta).
    expect(screen.getAllByRole("button")).toHaveLength(TAROT_FAN_SIZE);

    // Nada revelado: la pista invita a elegir y ningún nombre de carta se ve aún.
    expect(screen.getByText(es.hoy.tarotFanHint)).toBeInTheDocument();
    for (const name of expectedFanNames("profile-1")) {
      expect(screen.queryByText(name)).not.toBeInTheDocument();
    }
  });

  it("al tocar un dorso lo voltea y revela el nombre de SU carta (la de esa posición)", () => {
    renderFan("profile-1");
    const names = expectedFanNames("profile-1");

    const slots = screen.getAllByRole("button");
    fireEvent.click(slots[0]!);

    // El nombre de la carta bajo la posición 0 aparece en el detalle.
    expect(screen.getByText(names[0]!)).toBeInTheDocument();
    // La pista ("elige una carta") desaparece una vez revelada una.
    expect(screen.queryByText(es.hoy.tarotFanHint)).not.toBeInTheDocument();
  });

  it("determinismo: el mismo perfil el mismo día revela la MISMA carta bajo una posición, entre montajes", () => {
    const names = expectedFanNames("profile-1");

    const first = renderFan("profile-1");
    fireEvent.click(screen.getAllByRole("button")[3]!);
    expect(screen.getByText(names[3]!)).toBeInTheDocument();
    first.unmount();

    const second = renderFan("profile-1");
    fireEvent.click(screen.getAllByRole("button")[3]!);
    expect(screen.getByText(names[3]!)).toBeInTheDocument();
    second.unmount();
  });

  it("la baraja depende del perfil: perfiles distintos revelan cartas distintas", () => {
    const namesA = expectedFanNames("profile-A");
    const namesB = expectedFanNames("profile-B");
    // Existe alguna posición donde ambas barajas difieren (semilla incluye el perfil).
    const idx = namesA.findIndex((n, i) => n !== namesB[i]);
    expect(idx).toBeGreaterThanOrEqual(0);

    const a = renderFan("profile-A");
    fireEvent.click(screen.getAllByRole("button")[idx]!);
    expect(screen.getByText(namesA[idx]!)).toBeInTheDocument();
    a.unmount();

    const b = renderFan("profile-B");
    fireEvent.click(screen.getAllByRole("button")[idx]!);
    expect(screen.getByText(namesB[idx]!)).toBeInTheDocument();
    b.unmount();
  });

  it("CTA a la tirada completa apunta a /tarot", () => {
    renderFan("profile-1");
    expect(
      screen.getByRole("link", { name: new RegExp(es.hoy.tarotFanCta) }),
    ).toHaveAttribute("href", "/tarot");
  });
});
