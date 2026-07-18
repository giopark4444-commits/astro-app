import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { PerfilChatPanel } from "../perfil-chat-panel";
import perfilStyles from "../perfil.module.css";
import chatStyles from "../../preguntar/chat.module.css";

// PerfilChatPanel monta <ChatView embedded />, que depende de useProfiles y de
// useSearchParams (mismos mocks que preguntar/__tests__/chat-view.test.tsx).
const { mockActive } = vi.hoisted(() => ({
  mockActive: { current: { id: "profile-1" } as { id: string } | null },
}));
vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: mockActive.current }) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("") }));

function jsonResponse() {
  // available:false → estado "dormant" del chat (sin llave), como en producción.
  return { ok: true, headers: { get: () => "application/json" }, json: async () => ({ available: false }) };
}

beforeEach(() => {
  mockActive.current = { id: "profile-1" };
  global.fetch = vi.fn(async () => jsonResponse()) as unknown as typeof fetch;
});

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <PerfilChatPanel />
    </NextIntlClientProvider>,
  );
}

describe("PerfilChatPanel", () => {
  it("muestra el título del panel (profile.chatTitle) y monta el ChatView en modo embebido", () => {
    const { container } = renderPanel();

    // Título del panel — cae en el namespace `profile` (la página de perfil ya
    // usa ese namespace; no existe uno `perfil`).
    expect(screen.getByText(es.profile.chatTitle)).toBeInTheDocument();

    // ChatView montado en modo embebido: usa el contenedor `wrapEmbedded` (no el
    // `wrap` de página con starfield/cabecera). No se puede distinguir por texto
    // porque es.chat.title === es.profile.chatTitle ("Pregúntale a Aluna").
    expect(container.querySelector(`.${CSS.escape(chatStyles.wrapEmbedded!)}`)).not.toBeNull();
    expect(container.querySelector(`.${CSS.escape(chatStyles.wrap!)}`)).toBeNull();
  });

  it("usa las clases correctas del CSS module: chatPanel (raíz) y cardH2 (título <span>)", () => {
    const { container } = renderPanel();

    const panel = container.querySelector(`.${CSS.escape(perfilStyles.chatPanel!)}`);
    expect(panel).not.toBeNull();

    const title = screen.getByText(es.profile.chatTitle);
    expect(title.tagName).toBe("SPAN");
    expect(title.className).toContain(perfilStyles.cardH2!);
    expect(title.parentElement).toBe(panel); // el título es hijo directo del panel
  });
});

// page.tsx es un server component `async` (usa el cliente Supabase de servidor y
// getLocale): no se puede renderizar en jsdom con RTL. Verificamos entonces la
// FUENTE del componente para proteger el anidamiento (deskCols > leftCol) y el
// orden de las 5 secciones, más el panel de chat en interpCol. El orden de
// aparición de los tokens en el cuerpo del `return` codifica el anidamiento.
describe("PerfilPage — estructura maestro-detalle (verificada sobre la fuente)", () => {
  // vitest corre con cwd = apps/web (raíz del vitest.config); leemos la fuente
  // por ruta relativa a ese cwd. (No usamos import.meta.url: la resolución de
  // `new URL` sobre la ruta con el route-group `(app)` falla bajo el transform.)
  const src = readFileSync(resolve(process.cwd(), "app/(app)/perfil/page.tsx"), "utf8");
  const body = src.slice(src.indexOf("return ("));

  it("envuelve las 5 secciones en deskCols > leftCol (mismo orden) y añade interpCol > PerfilChatPanel", () => {
    const order = [
      "styles.deskCols",
      "styles.leftCol",
      "PerfilHero",
      "LifetimePreview",
      "Personas",
      "styles.diarioGrid",
      "Manifestations",
      "Journal",
      "styles.interpCol",
      "PerfilChatPanel",
    ];
    let last = -1;
    for (const token of order) {
      const idx = body.indexOf(token);
      expect(idx, `token presente: ${token}`).toBeGreaterThan(-1);
      expect(idx, `token en orden: ${token}`).toBeGreaterThan(last);
      last = idx;
    }
  });
});
