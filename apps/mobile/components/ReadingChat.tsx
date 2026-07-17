// "Conversa esta tirada" (Tarot T3): chat inline al final de TODA tirada
// (ceremonia digital y modo manual). Espejo de apps/web/app/(app)/tarot/
// reading-chat.tsx + patrón de burbujas de app/preguntar.tsx (bubbleRow/
// bubbleUser/bubbleAluna, estados, guard de unmount con requestRef, tokens
// de tema). Diferencia con preguntar.tsx: usa lib/tarot-chat-api.ts
// (sendTarotChat — respuesta ACUMULADA, RN no soporta res.body.getReader(),
// GOTCHA de task-5-interfaces.md §2) y dispara un turno-0 automático al
// montar (messages:[]): la IA abre sola con preguntas puntuales, sin
// burbuja de usuario visible para ese turno invisible.
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { sendTarotChat, type TarotChatMessage } from "../lib/tarot-chat-api";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

export interface ReadingChatCard {
  cardId: string;
  reversed: boolean;
  position: string;
  jumper?: boolean;
}

type Status = "opening" | "idle" | "loading" | "dormant" | "error";

export function ReadingChat({
  spreadId,
  cards,
  question,
  profileId,
}: {
  spreadId: string;
  cards: ReadingChatCard[];
  question?: string;
  profileId?: string;
}) {
  const { session } = useAuth();
  const { t, locale } = useT();
  const { t: tk } = useTheme();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const [messages, setMessages] = useState<TarotChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("opening");
  const requestRef = useRef(0);
  const openedRef = useRef(false);

  // Mismo guard de unmount que preguntar.tsx: si la persona guarda/sale
  // mientras post() está en vuelo, la respuesta tardía no debe aplicar
  // setState sobre una pantalla ya desmontada.
  useEffect(() => {
    return () => {
      requestRef.current += 1;
    };
  }, []);

  async function post(nextMessages: TarotChatMessage[]) {
    if (!session?.access_token) {
      setStatus("dormant");
      return;
    }
    const myRequest = ++requestRef.current;
    try {
      const res = await sendTarotChat({
        accessToken: session.access_token,
        locale,
        spreadId,
        cards,
        ...(question !== undefined ? { question } : {}),
        ...(profileId !== undefined ? { profileId } : {}),
        messages: nextMessages,
      });
      if (requestRef.current !== myRequest) return;
      if (!res.available) {
        setStatus("dormant");
        return;
      }
      setMessages([...nextMessages, { role: "assistant", content: res.text }]);
      setStatus("idle");
    } catch {
      if (requestRef.current !== myRequest) return;
      setStatus("error");
    }
  }

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    setStatus("loading");
    void post([]);
    // Solo al montar: el turno-0 lo dispara la sección, no la persona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || status === "loading" || status === "opening") return;
    const next: TarotChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setStatus("loading");
    await post(next);
  }

  return (
    <View style={styles.wrap} testID="reading-chat">
      <Text style={styles.title} maxFontSizeMultiplier={1.2}>
        {t("tarot.chatSectionTitle")}
      </Text>

      {status === "dormant" ? (
        <View style={styles.dormantWrap}>
          <Text style={styles.cardEyebrow}>{t("tarot.chatDormantTitle")}</Text>
          <Text style={styles.statusNote}>{t("tarot.chatDormantBody")}</Text>
        </View>
      ) : (
        <>
          {messages.map((m, i) => (
            <View
              key={i}
              style={[styles.bubbleRow, m.role === "user" ? styles.bubbleRowUser : styles.bubbleRowAluna]}
            >
              <View style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleAluna]}>
                <Text style={m.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAluna}>
                  {m.content}
                </Text>
              </View>
            </View>
          ))}

          {(status === "loading" || status === "opening") && (
            <Text style={styles.statusNote}>{t("tarot.chatThinking")}</Text>
          )}
          {status === "error" && <Text style={styles.statusNote}>{t("tarot.chatError")}</Text>}

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t("tarot.chatPlaceholder")}
              placeholderTextColor={tk.textFaint}
              onSubmitEditing={send}
              returnKeyType="send"
            />
            <Pressable
              style={[
                styles.sendBtn,
                (!input.trim() || status === "loading" || status === "opening") && styles.sendBtnDisabled,
              ]}
              onPress={send}
              disabled={!input.trim() || status === "loading" || status === "opening"}
              accessibilityRole="button"
              accessibilityLabel={t("tarot.chatSend")}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    wrap: { width: "100%", gap: space.sm, marginTop: space.lg },
    title: { color: t.text, fontSize: typeScale.lg, fontFamily: fonts.serifSemi, marginBottom: space.sm },
    bubbleRow: { flexDirection: "row", marginTop: space.sm },
    bubbleRowUser: { justifyContent: "flex-end" },
    bubbleRowAluna: { justifyContent: "flex-start" },
    bubble: { maxWidth: "88%", paddingVertical: space.sm + 2, paddingHorizontal: space.lg, borderRadius: radius.md },
    bubbleUser: { backgroundColor: t.acc },
    bubbleAluna: { backgroundColor: t.glass, borderWidth: 1, borderColor: t.accHair },
    bubbleTextUser: { color: t.onAcc, fontSize: typeScale.sm, fontFamily: fonts.sansMedium },
    bubbleTextAluna: { color: t.text, fontSize: typeScale.sm, fontFamily: fonts.sans, lineHeight: 20 },
    statusNote: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.serifItalic, marginTop: space.sm, textAlign: "center" },
    cardEyebrow: { color: t.acc, fontSize: typeScale.xs2, letterSpacing: 2, textTransform: "uppercase", fontFamily: fonts.sansSemi, textAlign: "center" },
    dormantWrap: { alignItems: "center", gap: space.xs, paddingVertical: space.md },
    composer: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md },
    input: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill, paddingHorizontal: space.lg, color: t.text, fontSize: typeScale.sm, fontFamily: fonts.sans, backgroundColor: t.panelSoft },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.acc, alignItems: "center", justifyContent: "center" },
    sendBtnDisabled: { opacity: 0.4 },
    sendIcon: { color: t.onAcc, fontSize: typeScale.lg, fontFamily: fonts.sansBold },
  });
}
