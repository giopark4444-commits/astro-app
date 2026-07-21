import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../messages/es.json";
import { DEFAULT_QUICK_QUESTIONS } from "../../lib/quick-questions";

vi.mock("next/navigation", () => ({ useSearchParams: () => ({ get: () => null }) }));
vi.mock("../../lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: { id: "p1" } }) }));
vi.mock("../../lib/voice", () => ({ useSpeak: () => ({ speakingId: null, toggle: vi.fn(), supported: false }) }));
vi.mock("../../app/(app)/actions", () => ({ saveQuickQuestions: vi.fn().mockResolvedValue(undefined) }));

import { ChatView } from "../../app/(app)/preguntar/chat-view";

const chatCalls: string[] = [];
beforeEach(() => {
  chatCalls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).startsWith("/api/quick-questions")) {
        return new Response(JSON.stringify({ pages: DEFAULT_QUICK_QUESTIONS.es }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (String(url) === "/api/chat/thread") {
        return new Response(JSON.stringify({ threadId: null, messages: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (String(url) === "/api/chat") {
        if (init?.body) chatCalls.push(String(init.body));
        return new Response(JSON.stringify({ available: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }),
  );
});

describe("ChatView + accesos rápidos", () => {
  it("monta los chips y tocar uno envía esa pregunta a /api/chat", async () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <ChatView embedded />
      </NextIntlClientProvider>,
    );
    const first = DEFAULT_QUICK_QUESTIONS.es[0]![0]!;
    const chip = await screen.findByRole("button", { name: first });
    fireEvent.click(chip);
    await waitFor(() => expect(chatCalls.length).toBe(1));
    expect(chatCalls[0]).toContain(first);
  });
});
