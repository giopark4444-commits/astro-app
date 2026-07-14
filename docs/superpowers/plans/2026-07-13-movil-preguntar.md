# Móvil — Preguntar (chat con Aluna, paridad web→Expo) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** portar **Preguntar** (chat "Pregúntale a Aluna") al app móvil. Backend YA es Bearer-compatible (`/api/chat` migrado en el build de Compatibilidad). Móvil recibe el texto **acumulado** (sin efecto de tecleo), mismo patrón ya usado por `chart-reading-api.ts` — decisión tomada por precedente real del repo, no por panel de enfoques.

**Architecture:** `lib/chat-api.ts` (fetch con Bearer; detecta `content-type` — `application/json` → `{available:false}`, si no → `res.text()` acumulado) + `app/preguntar.tsx` (una sola pantalla: hilo de mensajes en memoria — no persiste entre sesiones, igual que la web — + composer + 3 sugerencias estáticas cuando el hilo está vacío).

**Tech Stack:** fetch autenticado con Bearer, RN `TextInput`/`ScrollView`, Vitest.

## Global Constraints

- Móvil nunca importa `@aluna/ephemeris` ni `@aluna/core` para cómputo de carta — el contexto astrológico lo arma el servidor.
- Sigue los patrones existentes: `chart-reading-api.ts` (texto acumulado), `compatibilidad.tsx`/`informe.tsx` (máquina de estados + Card/FadeIn), `theme/tokens.ts`.
- i18n es/en en `apps/mobile/lib/strings.ts`, bloque `preguntar`.
- Gate por tarea: `cd apps/web && npx vitest run` (227) y `cd apps/mobile && npx vitest run`, ambas verdes.
- Commits `feat(movil-preguntar):` / `fix(movil-preguntar):`.

## Alcance explícito

**Dentro:** saludo + 3 sugerencias ESTÁTICAS (los mismos 3 ejemplos del mockup, sin derivarlos de la carta real — evita que móvil tenga que computar/leer placements), envío de mensaje, respuesta acumulada (sin streaming visual), estados dormant/error, hilo en memoria (se pierde al salir, igual que la web).

**Fuera:** "Tu cielo ahora" (mini contexto con placements reales — requeriría llamar `/api/chart` desde esta pantalla, scope aparte), efecto de tecleo/streaming visual real, persistencia del hilo entre sesiones, chips-glifo inline citando placements en las respuestas (el servidor no marca estructuralmente qué parte del texto es una cita — sería parseo de texto libre, frágil; se deja para una iteración con mejor contrato de datos).

---

### Task 1: Móvil — `lib/chat-api.ts`

**Files:**
- Create: `apps/mobile/lib/chat-api.ts`
- Create: `apps/mobile/lib/__tests__/chat-api.test.ts`

**Interfaces:**
- Consumes: `apiUrl()` de `./config`.
- Produces: `ChatMessage` (`{role, content}`), `fetchChatReply(params): Promise<{available:false} | {available:true, text:string}>`, `ChatApiError` — consumidos por Task 3.

- [ ] **Step 1: Test que falla** — `apps/mobile/lib/__tests__/chat-api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchChatReply, ChatApiError } from "../chat-api";

vi.mock("../config", () => ({ apiUrl: () => "https://example.test" }));

const originalFetch = global.fetch;

describe("fetchChatReply", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("manda POST con Bearer, profileId, locale y los mensajes", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => "text/plain; charset=utf-8" },
      text: async () => "Tu Sol en Acuario explica...",
    });
    const result = await fetchChatReply({
      accessToken: "t1",
      profileId: "p1",
      locale: "es",
      messages: [{ role: "user", content: "hola" }],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer t1" }),
        body: JSON.stringify({ profileId: "p1", locale: "es", messages: [{ role: "user", content: "hola" }] }),
      }),
    );
    expect(result).toEqual({ available: true, text: "Tu Sol en Acuario explica..." });
  });

  it("available:false cuando el content-type es JSON (dormant)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ available: false }),
    });
    const result = await fetchChatReply({ accessToken: "t1", profileId: "p1", locale: "es", messages: [] });
    expect(result).toEqual({ available: false });
  });

  it("lanza ChatApiError si la respuesta no es ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 401 });
    await expect(fetchChatReply({ accessToken: "t1", profileId: "p1", locale: "es", messages: [] })).rejects.toThrow(ChatApiError);
  });
});
```

- [ ] **Step 2: Verlo fallar** — `cd apps/mobile && npx vitest run lib/__tests__/chat-api.test.ts` → FAIL (`../chat-api` no existe).

- [ ] **Step 3: Implementación** — `apps/mobile/lib/chat-api.ts`:

```ts
// apps/mobile/lib/chat-api.ts
// Cliente de /api/chat ("Pregúntale a Aluna") con Bearer. La web recibe el
// texto en streaming; en RN leemos la respuesta ACUMULADA (sin efecto
// máquina), mismo patrón que chart-reading-api.ts — decisión tomada por
// precedente real del repo, no un patrón nuevo.
import { apiUrl } from "./config";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatReplyResult = { available: false } | { available: true; text: string };

export class ChatApiError extends Error {
  constructor(public status: number) {
    super(`chat_${status}`);
  }
}

export async function fetchChatReply(params: {
  accessToken: string;
  profileId: string;
  locale: "es" | "en";
  messages: ChatMessage[];
}): Promise<ChatReplyResult> {
  const res = await fetch(`${apiUrl()}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify({ profileId: params.profileId, locale: params.locale, messages: params.messages }),
  });
  if (!res.ok) throw new ChatApiError(res.status);
  const contentType = res.headers.get("content-type") ?? "";
  // El único caso donde /api/chat responde JSON es "sin proveedor IA" (dormant)
  // — el éxito SIEMPRE llega como text/plain acumulado. No hace falta parsear
  // el body para distinguir sub-casos: cualquier JSON aquí es "no disponible".
  if (contentType.includes("application/json")) return { available: false };
  const text = await res.text();
  return { available: true, text };
}
```

- [ ] **Step 4: Verlo pasar** — `cd apps/mobile && npx vitest run lib/__tests__/chat-api.test.ts` → PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/chat-api.ts apps/mobile/lib/__tests__/chat-api.test.ts
git commit -m "feat(movil-preguntar): cliente chat-api — fetchChatReply, texto acumulado con Bearer"
```

---

### Task 2: Móvil — strings i18n (`preguntar.*`)

**Files:**
- Modify: `apps/mobile/lib/strings.ts`

- [ ] **Step 1: no aplica TDD.** Añade en `STRINGS.es`, después del bloque `informe: {...}` (del plan de Informe — si ese plan aún no se ejecutó en esta rama, añade después de `compat: {...}`):

```ts
    preguntar: {
      greeting: "Aquí estoy. Pregúntame lo que sea — de tu día, de tu carta, de lo que te inquieta esta noche.",
      placeholder: "Escribe tu pregunta…",
      send: "Enviar",
      thinking: "Aluna está sintiendo tu pregunta…",
      error: "Algo se nubló. Inténtalo de nuevo.",
      dormantTitle: "El oráculo aún duerme",
      dormantBody: "El chat con Aluna se enciende cuando conectes su voz de IA. Mientras, tu carta y tus números ya te hablan en sus secciones.",
      needProfileBody: "Necesitas un perfil con fecha y lugar de nacimiento para conversar con Aluna.",
      suggestion1: "¿Por qué siento tanto?",
      suggestion2: "¿Cómo amo yo?",
      suggestion3: "¿Qué me pide este año?",
    },
```

- [ ] **Step 2: espejo en `STRINGS.en`**, mismo lugar relativo:

```ts
    preguntar: {
      greeting: "Here I am. Ask me anything — about your day, your chart, or what's on your mind tonight.",
      placeholder: "Type your question…",
      send: "Send",
      thinking: "Aluna is sensing your question…",
      error: "Something clouded over. Try again.",
      dormantTitle: "The oracle still sleeps",
      dormantBody: "The chat with Aluna lights up when you connect her AI voice. Meanwhile, your chart and numbers already speak to you in their sections.",
      needProfileBody: "You need a profile with birth date and place to talk with Aluna.",
      suggestion1: "Why do I feel so much?",
      suggestion2: "How do I love?",
      suggestion3: "What does this year ask of me?",
    },
```

- [ ] **Step 3: verifica paridad de claves** es/en (mismo orden, mismo conteo).

- [ ] **Step 4: suite móvil sigue verde.**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/strings.ts
git commit -m "feat(movil-preguntar): strings es/en — bloque preguntar.*"
```

---

### Task 3: Móvil — pantalla `app/preguntar.tsx`

**Files:**
- Create: `apps/mobile/app/preguntar.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `useProfile()`, `useTheme()`, `useT()`, `fetchChatReply`/`ChatMessage`/`ChatApiError` (Task 1).
- Produces: ruta `/preguntar` (push, terminal).

- [ ] **Step 1: no aplica TDD de unidad** (screen RN; su lógica de red ya está testeada en Task 1).

- [ ] **Step 2: implementación completa** — `apps/mobile/app/preguntar.tsx`:

```tsx
import { useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Enso } from "../components/Enso";
import { useAuth } from "../lib/auth-context";
import { useProfile } from "../lib/profile-context";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { fetchChatReply, ChatApiError, type ChatMessage } from "../lib/chat-api";
import { fonts, space, radius, type as typeScale, type ThemeTokens } from "../theme/tokens";

type Turn = ChatMessage;
type Status = "idle" | "loading" | "dormant" | "error";

export default function PreguntarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const { t, locale } = useT();
  const { t: tk } = useTheme();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const requestRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  const back = () => router.back();

  async function send() {
    const content = input.trim();
    if (!content || !session?.access_token || !profile?.id || status === "loading") return;
    const nextTurns: Turn[] = [...turns, { role: "user", content }];
    setTurns(nextTurns);
    setInput("");
    setStatus("loading");
    const myRequest = ++requestRef.current;
    try {
      const res = await fetchChatReply({
        accessToken: session.access_token,
        profileId: profile.id,
        locale,
        messages: nextTurns,
      });
      if (requestRef.current !== myRequest) return;
      if (!res.available) {
        setStatus("dormant");
        return;
      }
      setTurns((prev) => [...prev, { role: "assistant", content: res.text }]);
      setStatus("idle");
    } catch (e) {
      if (requestRef.current !== myRequest) return;
      setStatus(e instanceof ChatApiError ? "error" : "error");
    }
  }

  if (!profile?.id) {
    return (
      <View style={styles.root}>
        <Header t={t} styles={styles} onBack={back} />
        <View style={styles.emptyWrap}>
          <Enso size={44} />
          <Text style={styles.emptyBody}>{t("preguntar.needProfileBody")}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header t={t} styles={styles} onBack={back} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.lg, flexGrow: 1, justifyContent: turns.length === 0 ? "center" : "flex-start" }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {turns.length === 0 ? (
          <View style={styles.emptyCenter}>
            <Enso size={36} />
            <Text style={styles.greeting}>{t("preguntar.greeting")}</Text>
            <View style={styles.suggestions}>
              {[t("preguntar.suggestion1"), t("preguntar.suggestion2"), t("preguntar.suggestion3")].map((s) => (
                <Pressable key={s} style={styles.suggestionChip} onPress={() => setInput(s)} accessibilityRole="button">
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          turns.map((turn, i) => (
            <View key={i} style={[styles.bubbleRow, turn.role === "user" ? styles.bubbleRowUser : styles.bubbleRowAluna]}>
              <View style={[styles.bubble, turn.role === "user" ? styles.bubbleUser : styles.bubbleAluna]}>
                <Text style={turn.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAluna}>{turn.content}</Text>
              </View>
            </View>
          ))
        )}

        {status === "loading" && <Text style={styles.statusNote}>{t("preguntar.thinking")}</Text>}
        {status === "dormant" && (
          <View style={styles.dormantWrap}>
            <Text style={styles.cardEyebrow}>{t("preguntar.dormantTitle")}</Text>
            <Text style={styles.statusNote}>{t("preguntar.dormantBody")}</Text>
          </View>
        )}
        {status === "error" && <Text style={styles.statusNote}>{t("preguntar.error")}</Text>}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: insets.bottom + space.sm }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={t("preguntar.placeholder")}
          placeholderTextColor={tk.textFaint}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || status === "loading") && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!input.trim() || status === "loading"}
          accessibilityRole="button"
          accessibilityLabel={t("preguntar.send")}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Header({ t, styles, onBack }: { t: (k: string) => string; styles: ReturnType<typeof makeStyles>; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={12} style={styles.backBtn}>
        <Text style={styles.backChevron}>‹</Text>
      </Pressable>
      <Text style={styles.eyebrow}>{t("universo.preguntarTitle")}</Text>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingTop: space.xxl, paddingHorizontal: space.lg, gap: space.sm },
    backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    backChevron: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serif },
    eyebrow: { color: t.acc, fontSize: typeScale.xs2, letterSpacing: 3, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    emptyCenter: { alignItems: "center", gap: space.lg, paddingVertical: space.xxxl },
    greeting: { color: t.text, fontSize: typeScale.lg, fontFamily: fonts.serifItalic, textAlign: "center", lineHeight: 24 },
    suggestions: { gap: space.sm, width: "100%" },
    suggestionChip: { borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill, paddingVertical: space.md, paddingHorizontal: space.lg, alignItems: "center" },
    suggestionText: { color: t.text, fontSize: typeScale.md, fontFamily: fonts.sansMedium },
    bubbleRow: { flexDirection: "row", marginTop: space.md },
    bubbleRowUser: { justifyContent: "flex-end" },
    bubbleRowAluna: { justifyContent: "flex-start" },
    bubble: { maxWidth: "82%", paddingVertical: space.sm + 2, paddingHorizontal: space.lg, borderRadius: radius.md },
    bubbleUser: { backgroundColor: t.acc },
    bubbleAluna: { backgroundColor: t.glass, borderWidth: 1, borderColor: t.accHair },
    bubbleTextUser: { color: t.onAcc, fontSize: typeScale.md, fontFamily: fonts.sansMedium },
    bubbleTextAluna: { color: t.text, fontSize: typeScale.md, fontFamily: fonts.sans, lineHeight: 20 },
    statusNote: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.serifItalic, marginTop: space.md, textAlign: "center" },
    cardEyebrow: { color: t.acc, fontSize: typeScale.xs2, letterSpacing: 2, textTransform: "uppercase", fontFamily: fonts.sansSemi, textAlign: "center", marginTop: space.xl },
    dormantWrap: { alignItems: "center", marginTop: space.md },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, paddingHorizontal: space.xxl },
    emptyBody: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans, textAlign: "center", lineHeight: 20 },
    composer: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.accHair },
    input: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill, paddingHorizontal: space.lg, color: t.text, fontSize: typeScale.md, fontFamily: fonts.sans, backgroundColor: t.panelSoft },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.acc, alignItems: "center", justifyContent: "center" },
    sendBtnDisabled: { opacity: 0.4 },
    sendIcon: { color: t.onAcc, fontSize: typeScale.xl, fontFamily: fonts.sansBold },
  });
}
```

- [ ] **Step 3: type-check** — `cd apps/mobile && npx tsc --noEmit` → 0 errores.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/preguntar.tsx
git commit -m "feat(movil-preguntar): pantalla Preguntar — hilo en memoria, sugerencias, dormant/error"
```

---

### Task 4: Móvil — entrada funcional desde el hub "Tu universo"

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: no aplica TDD.** Reemplaza la card "Preguntar" (placeholder "próximamente" del build de Compatibilidad) por una tocable, mismo patrón:

```tsx
          <Pressable onPress={() => router.push("/preguntar")}>
            <Card>
              <Text style={styles.soonTitle}>{t("universo.preguntarTitle")}</Text>
              <Text style={styles.soonBody}>{t("universo.preguntarBody")}</Text>
            </Card>
          </Pressable>
```

Quita su `<SoonBadge .../>`.

- [ ] **Step 2: type-check** — 0 errores.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "feat(movil-preguntar): hub Tu universo — Preguntar deja de ser 'próximamente'"
```

---

## Cierre del plan (Fase 5 — obligatoria)

1. Corre la app de verdad (servidor Next real + `expo export`/bundle) — confirma que enviar un mensaje sin llave de proveedor IA muestra el estado dormant correctamente (esto SÍ se puede probar sin llaves reales: el servidor responde `{available:false}` cuando `resolveReadingProvider()` no encuentra proveedor configurado — comportamiento determinista, no depende de credenciales).
2. Revisión adversarial (Fable 5/high): race conditions en `send()` (mismo patrón de `requestRef` que Compatibilidad — confirmar que está bien aplicado), qué pasa si el usuario manda 2 mensajes rápido, si `profile.id` cambia a mitad de una conversación.
3. No cierres hasta ambas suites verdes + ejecución real observada.
