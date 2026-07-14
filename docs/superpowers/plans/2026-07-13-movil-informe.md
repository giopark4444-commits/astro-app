# Móvil — Informe (paridad web→Expo) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** portar **Informe** (informes evolutivos: carta natal + revolución solar) al app móvil. Backend YA es Bearer-compatible (`/api/reports*` usa `authenticateRoute` vía `requirePlus` desde antes de este build) — no requiere cambios de servidor, solo cliente móvil + 2 pantallas.

**Architecture:** `lib/reports-api.ts` (fetch GET/generate/regenerate con Bearer, mismo patrón que `synastry-api.ts`) + `app/informe.tsx` (portada: 2 cards natal/solar con su propia máquina de estados; si el gate de Plus falla en la PRIMERA consulta, la pantalla entera se vuelve el paywall — Plus es de cuenta, no por informe) + `app/informe-lectura.tsx` (pantalla de lectura, recibe `kind`+`year` por `router.push({params})`, renderiza `NatalReport` o `SolarReport` como prosa).

**Tech Stack:** Expo Router (params vía `useLocalSearchParams`), fetch autenticado con Bearer, Vitest.

## Global Constraints

- Móvil nunca importa `@aluna/ephemeris` ni `@aluna/core/reports` — solo llama las rutas Next.
- **Sigue los patrones existentes**: `synastry-api.ts` (cliente fetch), `compatibilidad.tsx` (screen con máquina de estados + FadeIn + Card), `theme/tokens.ts` (space/radius/type/fonts — NO la escala de 4 tamaños de los mockups HTML, esa era del prototipo).
- i18n es/en paridad en `apps/mobile/lib/strings.ts`, bajo un bloque `informe`.
- Gate por tarea: `cd apps/web && npx vitest run` (227 tests) y `cd apps/mobile && npx vitest run` (28 tests), ambas verdes antes de cada commit.
- Commits `feat(movil-informe):` / `fix(movil-informe):`.

## Alcance explícito

**Dentro:** las 2 cards de portada (natal + revolución solar del año actual), los 5 estados de cada una (none/generating/ready/error/dormant), el paywall de cuenta si no hay Plus, la pantalla de lectura completa (intro+4 secciones+cierre para natal; ensayo+10 temas+mantra para solar), botón Actualizar/Generar/Regenerar/Reintentar.

**Fuera:** compra real de Plus (checkout/IAP) — el botón "Ver planes"/"Comenzar mi prueba" en el paywall por ahora solo es un placeholder de UI (`Alert` o no-op) hasta que exista el flujo de pago móvil; polling automático de "generating" (la web tampoco lo tiene — el usuario toca Actualizar, mismo patrón); guardar posición de lectura (mejora del mockup, no crítica para v1).

---

### Task 1: Móvil — `lib/reports-api.ts`

**Files:**
- Create: `apps/mobile/lib/reports-api.ts`
- Create: `apps/mobile/lib/__tests__/reports-api.test.ts`

**Interfaces:**
- Consumes: `apiUrl()` de `./config`.
- Produces: tipos `NatalReport`/`SolarReport`/`ReportStatus` (espejo de `@aluna/core`... en realidad de `apps/web/lib/reports/types.ts`, que NO se exporta desde `@aluna/core` — se redefinen aquí como tipos locales, igual que `synastry-api.ts` redefine los suyos), `fetchReport`, `generateReport`, `regenerateReport`, `ReportsApiError` — consumidos por Task 3 y Task 4.

- [ ] **Step 1: Test que falla** — `apps/mobile/lib/__tests__/reports-api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchReport, generateReport, regenerateReport, ReportsApiError } from "../reports-api";

vi.mock("../config", () => ({ apiUrl: () => "https://example.test" }));

const originalFetch = global.fetch;

describe("reports-api", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetchReport arma la query string y manda Bearer", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", content: { intro: "x" }, model_used: "hermes" }),
    });
    const result = await fetchReport({ accessToken: "t1", kind: "solar_return", locale: "es", year: 2026 });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/api/reports?kind=solar_return&locale=es&year=2026",
      expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer t1" }) }),
    );
    expect(result).toEqual({ status: "ready", content: { intro: "x" }, model_used: "hermes" });
  });

  it("fetchReport natal no manda year en la query", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ status: "none" }) });
    await fetchReport({ accessToken: "t1", kind: "natal", locale: "es", year: null });
    expect(global.fetch).toHaveBeenCalledWith("https://example.test/api/reports?kind=natal&locale=es", expect.anything());
  });

  it("fetchReport lanza ReportsApiError con status 403 (plus_required)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 403 });
    await expect(fetchReport({ accessToken: "t1", kind: "natal", locale: "es", year: null })).rejects.toThrow(ReportsApiError);
  });

  it("generateReport hace POST a /api/reports/generate con el body correcto", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ status: "generating" }) });
    const result = await generateReport({ accessToken: "t1", profileId: "p1", kind: "natal", locale: "es", year: null });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/api/reports/generate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer t1" }),
        body: JSON.stringify({ profileId: "p1", kind: "natal", year: null, locale: "es" }),
      }),
    );
    expect(result).toEqual({ status: "generating" });
  });

  it("regenerateReport hace POST a /api/reports/regenerate", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ status: "generating" }) });
    await regenerateReport({ accessToken: "t1", profileId: "p1", kind: "solar_return", locale: "en", year: 2026 });
    expect(global.fetch).toHaveBeenCalledWith("https://example.test/api/reports/regenerate", expect.objectContaining({ method: "POST" }));
  });
});
```

- [ ] **Step 2: Verlo fallar** — `cd apps/mobile && npx vitest run lib/__tests__/reports-api.test.ts` → FAIL (`../reports-api` no existe).

- [ ] **Step 3: Implementación** — `apps/mobile/lib/reports-api.ts`:

```ts
// apps/mobile/lib/reports-api.ts
// Cliente de /api/reports (informes evolutivos) con Bearer — mismo patrón que
// synastry-api.ts. El backend YA acepta Bearer (requirePlus → authenticateRoute,
// sin cambios de este build). Móvil nunca importa @aluna/ephemeris ni
// @aluna/core/reports; solo llama las rutas Next.
import { apiUrl } from "./config";

export interface NatalReportSection {
  key: string;
  title: string;
  body: string;
}

export interface NatalReport {
  intro: string;
  sections: NatalReportSection[];
  outro: string;
}

export interface SolarReportTheme {
  title: string;
  why: string;
  invitation: string;
}

export interface SolarReport {
  year: number;
  essay: string;
  themes: SolarReportTheme[];
  mantra: string;
}

export type ReportContent = NatalReport | SolarReport;
export type ReportKind = "natal" | "solar_return";

export type ReportStatusResponse =
  | { status: "none" }
  | { status: "ready"; content: ReportContent; model_used: string | null }
  | { status: "generating" }
  | { status: "error"; stale?: boolean }
  | { available: false };

export class ReportsApiError extends Error {
  constructor(public status: number) {
    super(`reports_${status}`);
  }
}

interface ReportParams {
  accessToken: string;
  kind: ReportKind;
  locale: "es" | "en";
  year: number | null;
}

function authHeaders(accessToken: string) {
  return { "content-type": "application/json", authorization: `Bearer ${accessToken}` };
}

export async function fetchReport(params: ReportParams): Promise<ReportStatusResponse> {
  const qs = new URLSearchParams({ kind: params.kind, locale: params.locale });
  if (params.kind === "solar_return" && params.year !== null) qs.set("year", String(params.year));
  const res = await fetch(`${apiUrl()}/api/reports?${qs.toString()}`, { headers: authHeaders(params.accessToken) });
  if (!res.ok) throw new ReportsApiError(res.status);
  return (await res.json()) as ReportStatusResponse;
}

interface MutateParams extends ReportParams {
  profileId: string;
}

async function postReportAction(path: string, params: MutateParams): Promise<ReportStatusResponse> {
  const res = await fetch(`${apiUrl()}/api/reports/${path}`, {
    method: "POST",
    headers: authHeaders(params.accessToken),
    body: JSON.stringify({ profileId: params.profileId, kind: params.kind, year: params.year, locale: params.locale }),
  });
  if (!res.ok) throw new ReportsApiError(res.status);
  return (await res.json()) as ReportStatusResponse;
}

export function generateReport(params: MutateParams): Promise<ReportStatusResponse> {
  return postReportAction("generate", params);
}

export function regenerateReport(params: MutateParams): Promise<ReportStatusResponse> {
  return postReportAction("regenerate", params);
}
```

- [ ] **Step 4: Verlo pasar** — `cd apps/mobile && npx vitest run lib/__tests__/reports-api.test.ts` → PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/reports-api.ts apps/mobile/lib/__tests__/reports-api.test.ts
git commit -m "feat(movil-informe): cliente reports-api — fetchReport/generateReport/regenerateReport con Bearer"
```

---

### Task 2: Móvil — strings i18n (`informe.*`)

**Files:**
- Modify: `apps/mobile/lib/strings.ts`

**Interfaces:**
- Produces: claves `informe.*` en `STRINGS.es`/`STRINGS.en`, consumidas por Task 3/4. (El bloque `universo.informesTitle/informesBody` YA EXISTE del build de Compatibilidad — no se toca.)

- [ ] **Step 1: no aplica TDD** (contenido estático). Inserta en `STRINGS.es`, después del bloque `compat: {...}` que ya existe:

```ts
    informe: {
      title: "Informes evolutivos",
      subtitle: "Lecturas largas nacidas de tu cielo, escritas para releer.",
      natalTitle: "Carta natal",
      natalEyebrow: "Informe natal",
      solarEyebrow: "Revolución Solar {year}",
      solarTitle: "Tu año que empieza",
      none: "Todavía no generaste este informe.",
      generate: "Generar",
      generating: "Generando tu informe… toca Actualizar en un momento.",
      update: "Actualizar",
      error: "Algo salió mal.",
      retry: "Reintentar",
      read: "Leer",
      regenerate: "Regenerar",
      generatedWith: "Generado con {model}",
      dormantTitle: "El oráculo aún duerme",
      dormantBody: "Los informes evolutivos se encienden cuando conectes la voz de IA de Aluna.",
      needProfileTitle: "Crea tu perfil primero",
      needProfileBody: "Necesitas un perfil con fecha y lugar de nacimiento para generar tus informes.",
      paywallTitle: "Los informes evolutivos son parte de",
      paywallBrand: "Aluna Plus",
      paywallBody: "Tu carta natal y tu Revolución Solar completas, capítulo a capítulo. Escritas desde tu cielo, para releer toda la vida.",
      paywallCta: "Ver planes",
      sectionIntro: "Introducción",
      sectionOutro: "Cierre",
      solarEssay: "Ensayo del año",
      solarMantra: "Mantra",
      solarWhy: "Por qué",
      solarInvitation: "Invitación",
    },
```

- [ ] **Step 2: espejo en `STRINGS.en`**, mismo lugar relativo:

```ts
    informe: {
      title: "Evolutionary reports",
      subtitle: "Long readings born from your sky, written to revisit.",
      natalTitle: "Birth chart",
      natalEyebrow: "Natal report",
      solarEyebrow: "Solar Return {year}",
      solarTitle: "Your year ahead",
      none: "You haven't generated this report yet.",
      generate: "Generate",
      generating: "Generating your report… tap Refresh in a moment.",
      update: "Refresh",
      error: "Something went wrong.",
      retry: "Retry",
      read: "Read",
      regenerate: "Regenerate",
      generatedWith: "Generated with {model}",
      dormantTitle: "The oracle still sleeps",
      dormantBody: "Evolutionary reports light up when you connect Aluna's AI voice.",
      needProfileTitle: "Create your profile first",
      needProfileBody: "You need a profile with birth date and place to generate your reports.",
      paywallTitle: "Evolutionary reports are part of",
      paywallBrand: "Aluna Plus",
      paywallBody: "Your birth chart and Solar Return, complete, chapter by chapter. Written from your sky, to reread for life.",
      paywallCta: "See plans",
      sectionIntro: "Introduction",
      sectionOutro: "Closing",
      solarEssay: "Essay of the year",
      solarMantra: "Mantra",
      solarWhy: "Why",
      solarInvitation: "Invitation",
    },
```

- [ ] **Step 3: verifica paridad de claves** — mismo número y orden en ambos locales (inspección manual o `node -e` como en el plan de Compatibilidad).

- [ ] **Step 4: suite móvil sigue verde** — `cd apps/mobile && npx vitest run` → 33/33 (28 + 5 de Task 1).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/strings.ts
git commit -m "feat(movil-informe): strings es/en — bloque informe.*"
```

---

### Task 3: Móvil — pantalla `app/informe.tsx` (portada + paywall)

**Files:**
- Create: `apps/mobile/app/informe.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `useProfile()`, `useTheme()`, `useT()`, `fetchReport`/`generateReport`/`regenerateReport`/`ReportsApiError` (Task 1), `Card`/`FadeIn` de `components/ui`, `useRouter()`.
- Produces: ruta `/informe` (push) — al tocar "Leer" navega a `/informe-lectura` (Task 4) con `router.push({ pathname: "/informe-lectura", params: { kind, year: String(year) } })`.

- [ ] **Step 1: no aplica TDD de unidad** (screen RN, mismo criterio que `compatibilidad.tsx` — su lógica de red ya está testeada en Task 1; se verifica ejecutando la app en Fase 5).

- [ ] **Step 2: implementación completa** — `apps/mobile/app/informe.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, FadeIn } from "../components/ui";
import { Enso } from "../components/Enso";
import { useAuth } from "../lib/auth-context";
import { useProfile } from "../lib/profile-context";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { fetchReport, generateReport, regenerateReport, ReportsApiError, type ReportKind, type ReportStatusResponse } from "../lib/reports-api";
import { fonts, space, radius, type as typeScale, type ThemeTokens } from "../theme/tokens";

type CardState =
  | { s: "loading" }
  | { s: "none" }
  | { s: "generating" }
  | { s: "error" }
  | { s: "dormant" }
  | { s: "ready"; content: unknown; model: string | null };

const CURRENT_YEAR = new Date().getFullYear();

function toCardState(res: ReportStatusResponse): CardState {
  if ("available" in res && res.available === false) return { s: "dormant" };
  if (res.status === "none") return { s: "none" };
  if (res.status === "generating") return { s: "generating" };
  if (res.status === "error") return { s: "error" };
  if (res.status === "ready") return { s: "ready", content: res.content, model: res.model_used };
  return { s: "error" };
}

export default function InformeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const { t: tk } = useTheme();
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const [gate, setGate] = useState<"loading" | "plusRequired" | "ok">("loading");
  const [natal, setNatal] = useState<CardState>({ s: "loading" });
  const [solar, setSolar] = useState<CardState>({ s: "loading" });

  const accessToken = session?.access_token;
  const profileId = profile?.id;

  async function loadNatal() {
    if (!accessToken) return;
    try {
      const res = await fetchReport({ accessToken, kind: "natal", locale, year: null });
      setGate("ok");
      setNatal(toCardState(res));
    } catch (e) {
      if (e instanceof ReportsApiError && e.status === 403) {
        setGate("plusRequired");
        return;
      }
      setNatal({ s: "error" });
    }
  }

  async function loadSolar() {
    if (!accessToken) return;
    try {
      const res = await fetchReport({ accessToken, kind: "solar_return", locale, year: CURRENT_YEAR });
      setSolar(toCardState(res));
    } catch (e) {
      if (!(e instanceof ReportsApiError && e.status === 403)) setSolar({ s: "error" });
    }
  }

  useEffect(() => {
    loadNatal();
    loadSolar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, locale]);

  async function onGenerate(kind: ReportKind) {
    if (!accessToken || !profileId) return;
    const setState = kind === "natal" ? setNatal : setSolar;
    setState({ s: "generating" });
    try {
      const res = await generateReport({ accessToken, profileId, kind, locale, year: kind === "solar_return" ? CURRENT_YEAR : null });
      setState(toCardState(res));
    } catch {
      setState({ s: "error" });
    }
  }

  async function onRegenerate(kind: ReportKind) {
    if (!accessToken || !profileId) return;
    const setState = kind === "natal" ? setNatal : setSolar;
    setState({ s: "generating" });
    try {
      const res = await regenerateReport({ accessToken, profileId, kind, locale, year: kind === "solar_return" ? CURRENT_YEAR : null });
      setState(toCardState(res));
    } catch {
      setState({ s: "error" });
    }
  }

  function onRefresh(kind: ReportKind) {
    if (kind === "natal") loadNatal();
    else loadSolar();
  }

  const back = () => router.back();

  if (!profileId) {
    return (
      <View style={styles.root}>
        <Header t={t} styles={styles} onBack={back} />
        <View style={styles.emptyWrap}>
          <Enso size={44} />
          <Text style={styles.emptyTitle}>{t("informe.needProfileTitle")}</Text>
          <Text style={styles.emptyBody}>{t("informe.needProfileBody")}</Text>
        </View>
      </View>
    );
  }

  if (gate === "plusRequired") {
    return (
      <View style={styles.root}>
        <Header t={t} styles={styles} onBack={back} />
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.xxxl }}>
          <Card>
            <Text style={styles.paywallTitle}>
              {t("informe.paywallTitle")} <Text style={styles.paywallBrand}>{t("informe.paywallBrand")}</Text>
            </Text>
            <Text style={styles.paywallBody}>{t("informe.paywallBody")}</Text>
            <Pressable style={styles.cta} accessibilityRole="button">
              <Text style={styles.ctaText}>{t("informe.paywallCta")}</Text>
            </Pressable>
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header t={t} styles={styles} onBack={back} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: insets.bottom + space.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <Text style={styles.title}>{t("informe.title")}</Text>
          <Text style={styles.subtitle}>{t("informe.subtitle")}</Text>
        </FadeIn>

        <FadeIn delay={60} style={styles.cardGap}>
          <ReportCard
            kind="natal"
            state={natal}
            eyebrow={t("informe.natalEyebrow")}
            title={t("informe.natalTitle")}
            t={t}
            styles={styles}
            onGenerate={() => onGenerate("natal")}
            onRegenerate={() => onRegenerate("natal")}
            onRefresh={() => onRefresh("natal")}
            onRead={() => router.push({ pathname: "/informe-lectura", params: { kind: "natal" } })}
          />
        </FadeIn>

        <FadeIn delay={120} style={styles.cardGap}>
          <ReportCard
            kind="solar_return"
            state={solar}
            eyebrow={t("informe.solarEyebrow").replace("{year}", String(CURRENT_YEAR))}
            title={t("informe.solarTitle")}
            t={t}
            styles={styles}
            onGenerate={() => onGenerate("solar_return")}
            onRegenerate={() => onRegenerate("solar_return")}
            onRefresh={() => onRefresh("solar_return")}
            onRead={() => router.push({ pathname: "/informe-lectura", params: { kind: "solar_return", year: String(CURRENT_YEAR) } })}
          />
        </FadeIn>
      </ScrollView>
    </View>
  );
}

function Header({ t, styles, onBack }: { t: (k: string) => string; styles: ReturnType<typeof makeStyles>; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={12} style={styles.backBtn}>
        <Text style={styles.backChevron}>‹</Text>
      </Pressable>
      <Text style={styles.eyebrow}>{t("universo.informesTitle")}</Text>
    </View>
  );
}

function ReportCard({
  kind,
  state,
  eyebrow,
  title,
  t,
  styles,
  onGenerate,
  onRegenerate,
  onRefresh,
  onRead,
}: {
  kind: ReportKind;
  state: CardState;
  eyebrow: string;
  title: string;
  t: (k: string) => string;
  styles: ReturnType<typeof makeStyles>;
  onGenerate: () => void;
  onRegenerate: () => void;
  onRefresh: () => void;
  onRead: () => void;
}) {
  return (
    <Card accent={state.s === "ready"}>
      <Text style={styles.cardEyebrow}>{eyebrow}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      {state.s === "loading" && <Text style={styles.note}>…</Text>}
      {state.s === "none" && (
        <>
          <Text style={styles.note}>{t("informe.none")}</Text>
          <Pressable style={styles.ctaGhost} onPress={onGenerate} accessibilityRole="button">
            <Text style={styles.ctaGhostText}>{t("informe.generate")}</Text>
          </Pressable>
        </>
      )}
      {state.s === "generating" && (
        <>
          <Text style={styles.note}>{t("informe.generating")}</Text>
          <Pressable style={styles.ctaGhost} onPress={onRefresh} accessibilityRole="button">
            <Text style={styles.ctaGhostText}>{t("informe.update")}</Text>
          </Pressable>
        </>
      )}
      {state.s === "error" && (
        <>
          <Text style={styles.note}>{t("informe.error")}</Text>
          <Pressable style={styles.ctaGhost} onPress={onRegenerate} accessibilityRole="button">
            <Text style={styles.ctaGhostText}>{t("informe.retry")}</Text>
          </Pressable>
        </>
      )}
      {state.s === "dormant" && (
        <>
          <Text style={styles.cardEyebrow}>{t("informe.dormantTitle")}</Text>
          <Text style={styles.note}>{t("informe.dormantBody")}</Text>
        </>
      )}
      {state.s === "ready" && (
        <>
          <View style={styles.rowGap}>
            <Pressable style={[styles.cta, styles.ctaFlex]} onPress={onRead} accessibilityRole="button">
              <Text style={styles.ctaText}>{t("informe.read")}</Text>
            </Pressable>
            <Pressable style={styles.ctaGhost} onPress={onRegenerate} accessibilityRole="button">
              <Text style={styles.ctaGhostText}>{t("informe.regenerate")}</Text>
            </Pressable>
          </View>
          {state.model && <Text style={styles.meta}>{t("informe.generatedWith").replace("{model}", state.model)}</Text>}
        </>
      )}
    </Card>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingTop: space.xxl, paddingHorizontal: space.lg, gap: space.sm },
    backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    backChevron: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serif },
    eyebrow: { color: t.acc, fontSize: typeScale.xs2, letterSpacing: 3, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    title: { color: t.text, fontSize: typeScale.xl3, fontFamily: fonts.serifSemi, marginTop: space.lg },
    subtitle: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans, marginTop: space.sm },
    cardGap: { marginTop: space.xl },
    cardEyebrow: { color: t.acc, fontSize: typeScale.xs2, letterSpacing: 2, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    cardTitle: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifSemi, marginTop: space.xs },
    note: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.serifItalic, marginTop: space.md },
    rowGap: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
    cta: { backgroundColor: t.acc, borderRadius: radius.pill, paddingVertical: space.md, alignItems: "center", paddingHorizontal: space.xl },
    ctaFlex: { flex: 1 },
    ctaText: { color: t.onAcc, fontSize: typeScale.md, fontFamily: fonts.sansSemi },
    ctaGhost: { borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill, paddingVertical: space.md, alignItems: "center", marginTop: space.lg },
    ctaGhostText: { color: t.acc, fontSize: typeScale.md, fontFamily: fonts.sansSemi },
    meta: { color: t.textFaint, fontSize: typeScale.xs, fontFamily: fonts.sans, marginTop: space.sm },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, paddingHorizontal: space.xxl },
    emptyTitle: { color: t.text, fontSize: typeScale.lg, fontFamily: fonts.serifSemi, textAlign: "center" },
    emptyBody: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans, textAlign: "center", lineHeight: 20 },
    paywallTitle: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifItalic, marginTop: space.md },
    paywallBrand: { color: t.acc, fontFamily: fonts.serifSemi },
    paywallBody: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans, marginTop: space.md, lineHeight: 20 },
  });
}
```

Nota: los nombres de token (`space`, `radius`, `type` como `typeScale`, `fonts`) son los MISMOS ya confirmados en el plan de Compatibilidad contra `apps/mobile/theme/tokens.ts` — no repitas la verificación, ya están correctos.

- [ ] **Step 3: type-check** — `cd apps/mobile && npx tsc --noEmit` → 0 errores.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/informe.tsx
git commit -m "feat(movil-informe): pantalla Informe — portada 2 cards + paywall de cuenta"
```

---

### Task 4: Móvil — pantalla `app/informe-lectura.tsx`

**Files:**
- Create: `apps/mobile/app/informe-lectura.tsx`

**Interfaces:**
- Consumes: `useLocalSearchParams<{ kind: string; year?: string }>()`, `fetchReport` (Task 1), `NatalReport`/`SolarReport` (Task 1).
- Produces: ruta `/informe-lectura` (terminal, nada más la consume).

- [ ] **Step 1: no aplica TDD de unidad** (screen RN; verificación en Fase 5).

- [ ] **Step 2: implementación completa** — `apps/mobile/app/informe-lectura.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { fetchReport, type NatalReport, type SolarReport, type ReportKind } from "../lib/reports-api";
import { fonts, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

type State = { s: "loading" } | { s: "error" } | { s: "ready"; natal: NatalReport } | { s: "readySolar"; solar: SolarReport };

export default function InformeLecturaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind: string; year?: string }>();
  const kind = (params.kind === "solar_return" ? "solar_return" : "natal") as ReportKind;
  const year = params.year ? Number(params.year) : null;
  const { session } = useAuth();
  const { t: tk } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const [state, setState] = useState<State>({ s: "loading" });

  useEffect(() => {
    if (!session?.access_token) return;
    let alive = true;
    fetchReport({ accessToken: session.access_token, kind, locale: "es", year })
      .then((res) => {
        if (!alive) return;
        if (res.status === "ready") {
          if (kind === "natal") setState({ s: "ready", natal: res.content as NatalReport });
          else setState({ s: "readySolar", solar: res.content as SolarReport });
        } else {
          setState({ s: "error" });
        }
      })
      .catch(() => {
        if (alive) setState({ s: "error" });
      });
    return () => {
      alive = false;
    };
  }, [session?.access_token, kind, year]);

  const back = () => router.back();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        {state.s === "loading" && <Text style={styles.note}>…</Text>}
        {state.s === "error" && <Text style={styles.note}>{t("informe.error")}</Text>}

        {state.s === "ready" && (
          <>
            <Text style={styles.sectionTitle}>{t("informe.sectionIntro")}</Text>
            <Text style={styles.body}>{state.natal.intro}</Text>
            {state.natal.sections.map((sec) => (
              <View key={sec.key} style={styles.sectionGap}>
                <Text style={styles.sectionTitle}>{sec.title}</Text>
                <Text style={styles.body}>{sec.body}</Text>
              </View>
            ))}
            <View style={styles.sectionGap}>
              <Text style={styles.sectionTitle}>{t("informe.sectionOutro")}</Text>
              <Text style={styles.body}>{state.natal.outro}</Text>
            </View>
          </>
        )}

        {state.s === "readySolar" && (
          <>
            <Text style={styles.sectionTitle}>{t("informe.solarEssay")}</Text>
            <Text style={styles.body}>{state.solar.essay}</Text>
            {state.solar.themes.map((theme, i) => (
              <View key={i} style={styles.sectionGap}>
                <Text style={styles.sectionTitle}>{`${i + 1}. ${theme.title}`}</Text>
                <Text style={styles.body}>{`${t("informe.solarWhy")}: ${theme.why}`}</Text>
                <Text style={styles.body}>{`${t("informe.solarInvitation")}: ${theme.invitation}`}</Text>
              </View>
            ))}
            <View style={styles.sectionGap}>
              <Text style={styles.mantra}>{state.solar.mantra}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingTop: space.xxl, paddingHorizontal: space.lg },
    backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    backChevron: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serif },
    note: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.serifItalic, marginTop: space.xxl, textAlign: "center" },
    sectionTitle: { color: t.acc, fontSize: typeScale.xl, fontFamily: fonts.serifSemi, marginTop: space.xl },
    sectionGap: { marginTop: space.xl },
    body: { color: t.text, fontSize: typeScale.lg, fontFamily: fonts.serif, lineHeight: 24, marginTop: space.sm },
    mantra: { color: t.text, fontSize: typeScale.xl, fontFamily: fonts.serifItalic, textAlign: "center", marginTop: space.xxl },
  });
}
```

- [ ] **Step 3: type-check** — `cd apps/mobile && npx tsc --noEmit` → 0 errores.

- [ ] **Step 4: suite completa** — `cd apps/mobile && npx vitest run` → sigue verde (33/33).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/informe-lectura.tsx
git commit -m "feat(movil-informe): pantalla de lectura — natal (intro+4 secciones+cierre) y solar (ensayo+10 temas+mantra)"
```

---

### Task 5: Móvil — entrada funcional desde el hub "Tu universo"

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: nada nuevo — solo cambia el `onPress` de la card "Informes" que hoy es un placeholder "próximamente".

- [ ] **Step 1: no aplica TDD.** Busca en `apps/mobile/app/(tabs)/index.tsx` el bloque insertado en el build de Compatibilidad (card con `t("universo.informesTitle")` + `SoonBadge`) y reemplázalo por una card tocable, siguiendo el MISMO patrón que la card de Compatibilidad (Pressable + `router.push`):

```tsx
          <Pressable onPress={() => router.push("/informe")} style={styles.cardGapMd}>
            <Card>
              <Text style={styles.soonTitle}>{t("universo.informesTitle")}</Text>
              <Text style={styles.soonBody}>{t("universo.informesBody")}</Text>
            </Card>
          </Pressable>
```

Quita el `<SoonBadge .../>` de esa card específica (ya no es "próximamente"). Deja intacta la card de "Preguntar" (sigue siendo placeholder hasta el plan `2026-07-13-movil-preguntar.md`).

- [ ] **Step 2: type-check** — `cd apps/mobile && npx tsc --noEmit` → 0 errores.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "feat(movil-informe): hub Tu universo — Informes deja de ser 'próximamente'"
```

---

## Cierre del plan (Fase 5 — obligatoria)

1. Corre la app de verdad (o al menos: servidor Next real + `expo export` para bundle, como en el build de Compatibilidad) — confirma que `/informe` con perfil sin Plus muestra el paywall, que con Plus y sin informe generado muestra "Generar", y que "Leer" navega a la lectura con el contenido real.
2. Revisión adversarial (Fable 5/high) sobre: el gate de Plus (¿puede quedar en `"loading"` para siempre si `loadNatal` nunca resuelve?), manejo de `year` en solar (¿qué pasa si cambia el año entre portada y lectura?), race conditions entre generate/refresh como en Compatibilidad.
3. No cierres hasta que ambas suites (227 web + N mobile) estén verdes y el flujo se haya ejecutado de verdad, no solo con tests.
