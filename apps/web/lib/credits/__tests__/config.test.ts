import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  chatPremiumCost,
  readingPremiumCost,
  monthlyRefillCredits,
  freeDailyChatCap,
  CREDIT_PACKS,
  packById,
  packProductId,
  packByProductId,
} from "../config";

// Las 4 env vars de costos/topes + las 3 de producto Dodo de los packs —
// se limpian antes y después de cada test para que no se filtren entre casos.
const ENV_KEYS = [
  "ALUNA_CREDIT_COST_CHAT",
  "ALUNA_CREDIT_COST_READING",
  "ALUNA_PLUS_MONTHLY_CREDITS",
  "ALUNA_FREE_DAILY_CHAT_CAP",
  "DODO_PRODUCT_CREDITS_100",
  "DODO_PRODUCT_CREDITS_300",
  "DODO_PRODUCT_CREDITS_1000",
];

function clearEnv() {
  for (const key of ENV_KEYS) delete process.env[key];
}

beforeEach(clearEnv);
afterEach(clearEnv);

describe("costos y topes: defaults sin env", () => {
  it("chatPremiumCost() default 1", () => {
    expect(chatPremiumCost()).toBe(1);
  });

  it("readingPremiumCost() default 3", () => {
    expect(readingPremiumCost()).toBe(3);
  });

  it("monthlyRefillCredits() default 60", () => {
    expect(monthlyRefillCredits()).toBe(60);
  });

  it("freeDailyChatCap() default 5", () => {
    expect(freeDailyChatCap()).toBe(5);
  });
});

describe("costos y topes: override por env (leído en el momento, no en el import)", () => {
  it("ALUNA_CREDIT_COST_CHAT=2 -> chatPremiumCost() === 2", () => {
    process.env.ALUNA_CREDIT_COST_CHAT = "2";
    expect(chatPremiumCost()).toBe(2);
  });

  it("ALUNA_CREDIT_COST_READING=10 -> readingPremiumCost() === 10", () => {
    process.env.ALUNA_CREDIT_COST_READING = "10";
    expect(readingPremiumCost()).toBe(10);
  });

  it("ALUNA_PLUS_MONTHLY_CREDITS=120 -> monthlyRefillCredits() === 120", () => {
    process.env.ALUNA_PLUS_MONTHLY_CREDITS = "120";
    expect(monthlyRefillCredits()).toBe(120);
  });

  it("ALUNA_FREE_DAILY_CHAT_CAP=0 -> freeDailyChatCap() === 0 (valor explícito, no cae al default)", () => {
    process.env.ALUNA_FREE_DAILY_CHAT_CAP = "0";
    expect(freeDailyChatCap()).toBe(0);
  });

  it("valor de env no numérico -> cae al default", () => {
    process.env.ALUNA_CREDIT_COST_CHAT = "no-es-un-numero";
    expect(chatPremiumCost()).toBe(1);
  });

  it("cambia entre llamadas si el env cambia (no se cachea en el import)", () => {
    process.env.ALUNA_CREDIT_COST_CHAT = "2";
    expect(chatPremiumCost()).toBe(2);
    process.env.ALUNA_CREDIT_COST_CHAT = "7";
    expect(chatPremiumCost()).toBe(7);
  });
});

describe("CREDIT_PACKS / packById", () => {
  it("tiene los 3 packs esperados en orden", () => {
    expect(CREDIT_PACKS.map((p) => p.id)).toEqual(["pack100", "pack300", "pack1000"]);
  });

  it('packById("pack300").credits === 300', () => {
    expect(packById("pack300")?.credits).toBe(300);
  });

  it('packById("pack100").credits === 100', () => {
    expect(packById("pack100")?.credits).toBe(100);
  });

  it('packById("pack1000").credits === 1000', () => {
    expect(packById("pack1000")?.credits).toBe(1000);
  });

  it("packById con id desconocido -> null", () => {
    expect(packById("pack999")).toBeNull();
  });
});

describe("packProductId / packByProductId", () => {
  it("packProductId sin el env seteado -> null", () => {
    const pack = packById("pack100")!;
    expect(packProductId(pack)).toBeNull();
  });

  it("packProductId con el env seteado -> el valor del env", () => {
    process.env.DODO_PRODUCT_CREDITS_100 = "prod_abc123";
    const pack = packById("pack100")!;
    expect(packProductId(pack)).toBe("prod_abc123");
  });

  it("packByProductId encuentra el pack cuyo env coincide", () => {
    process.env.DODO_PRODUCT_CREDITS_300 = "prod_xyz789";
    expect(packByProductId("prod_xyz789")?.id).toBe("pack300");
  });

  it("packByProductId sin ningún env seteado -> null", () => {
    expect(packByProductId("prod_xyz789")).toBeNull();
  });

  it("packByProductId con un productId que no matchea ningún env -> null", () => {
    process.env.DODO_PRODUCT_CREDITS_300 = "prod_xyz789";
    expect(packByProductId("otro-id-cualquiera")).toBeNull();
  });
});
