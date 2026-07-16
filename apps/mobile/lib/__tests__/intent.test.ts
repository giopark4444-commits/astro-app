import { describe, it, expect } from "vitest";
import { draftToIntent, EMPTY_INTENT_DRAFT, saveRemoteIntent, fetchRemoteIntent } from "../intent";

const NOW = "2026-07-16T12:00:00Z";

describe("draftToIntent", () => {
  it("null cuando todo quedó omitido", () => {
    expect(draftToIntent(EMPTY_INTENT_DRAFT, NOW)).toBeNull();
  });
  it("arma el UserIntent con useInAI true y answeredAt", () => {
    expect(draftToIntent({ goals: ["self"], goalNote: " x ", focus: ["love"], relationship: "single" }, NOW))
      .toEqual({ goals: ["self"], goalNote: "x", focus: ["love"], relationship: "single", useInAI: true, answeredAt: NOW });
  });
  it("goalNote vacía no viaja", () => {
    const i = draftToIntent({ goals: ["self"], goalNote: "  ", focus: [], relationship: null }, NOW);
    expect(i && "goalNote" in i && i.goalNote).toBeUndefined();
  });
});

function fakeSupabase(row: unknown, capture: { patch?: unknown } = {}) {
  return {
    from: () => ({
      update: (patch: unknown) => { capture.patch = patch; return { eq: async () => ({ error: null }) }; },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
    }),
  } as never;
}

describe("saveRemoteIntent / fetchRemoteIntent", () => {
  it("guarda el intent como patch de settings", async () => {
    const cap: { patch?: unknown } = {};
    const intent = draftToIntent({ goals: ["self"], goalNote: "", focus: [], relationship: null }, NOW)!;
    await saveRemoteIntent(fakeSupabase(null, cap), "u1", intent);
    expect(cap.patch).toEqual({ intent });
  });
  it("lee y parsea tolerante", async () => {
    const out = await fetchRemoteIntent(fakeSupabase({ intent: { goals: ["self"], focus: [] } }), "u1");
    expect(out?.goals).toEqual(["self"]);
    expect(await fetchRemoteIntent(fakeSupabase({ intent: null }), "u1")).toBeNull();
  });
});
