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
