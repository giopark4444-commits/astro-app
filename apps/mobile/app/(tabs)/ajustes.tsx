import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Enso } from "../../components/Enso";
import { SoonBadge } from "../../components/ui";
import { useProfile } from "../../lib/profile-context";
import { formatPlace } from "../../lib/geocode";
import { colors, fonts, radius, space } from "../../theme/tokens";

const GENDER_LABEL: Record<string, string> = {
  feminine: "Femenino",
  masculine: "Masculino",
  neutral: "Neutro",
};
const prettyDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  if (!y || !m || !d) return iso;
  return `${d} de ${MES[m - 1]} de ${y}`;
};

export default function AjustesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, reset } = useProfile();

  function confirmReset() {
    Alert.alert(
      "¿Tejer otro mapa?",
      "Esto borra el perfil actual de este dispositivo y vuelve al inicio ceremonial.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Empezar de nuevo",
          style: "destructive",
          onPress: async () => {
            await reset();
            router.replace("/onboarding");
          },
        },
      ],
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Enso size={24} />
          <Text style={styles.title}>Ajustes</Text>
        </View>

        {profile && (
          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Tu perfil</Text>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Row label="Nacimiento" value={prettyDate(profile.birthDate)} />
            <Row label="Hora" value={profile.timeKnown && profile.birthTime ? profile.birthTime : "Sin definir"} />
            <Row label="Lugar" value={profile.place ? formatPlace(profile.place) : "—"} />
            <Row label="Género" value={profile.gender ? (GENDER_LABEL[profile.gender] ?? profile.gender) : "—"} last />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Sistemas</Text>
          <SystemRow name="Numerología" status="disponible" on />
          <SystemRow name="Carta Astral" status="pronto" />
          <SystemRow name="Ba Zi / Saju" status="pronto" />
          <SystemRow name="Lecturas de Aluna (IA)" status="pronto" last />
        </View>

        <Pressable style={styles.reset} onPress={confirmReset}>
          <Text style={styles.resetText}>Tejer otro mapa</Text>
        </Pressable>

        <Text style={styles.footNote}>Aluna · para jugar y explorar</Text>
        <Text style={styles.version}>Todo se calcula en tu dispositivo. Sin conexión a un servidor.</Text>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function SystemRow({ name, status, on, last }: { name: string; status: string; on?: boolean; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={[styles.rowLabel, styles.systemName]}>{name}</Text>
      {on ? <Text style={styles.systemOn}>{status}</Text> : <SoonBadge label={status} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  scroll: { paddingHorizontal: space.xl },

  head: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.xxl },
  title: { color: colors.text, fontSize: 30, fontFamily: fonts.serif, fontStyle: "italic" },

  card: {
    borderWidth: 1,
    borderColor: colors.goldHair,
    borderRadius: radius.lg,
    backgroundColor: colors.panelSoft,
    padding: space.xl,
    marginBottom: space.lg,
  },
  cardEyebrow: { color: colors.gold, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: space.md, fontFamily: fonts.sans },
  profileName: { color: colors.text, fontSize: 24, fontFamily: fonts.serif, fontStyle: "italic", marginBottom: space.lg },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.goldHair,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { color: colors.textDim, fontSize: 14, fontFamily: fonts.sans },
  rowValue: { color: colors.text, fontSize: 14, fontFamily: fonts.sans, flexShrink: 1, textAlign: "right", marginLeft: space.lg },
  systemName: { color: colors.text, fontSize: 15 },
  systemOn: { color: colors.gold, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", fontFamily: fonts.sans },

  reset: {
    borderWidth: 1,
    borderColor: colors.goldHair,
    borderRadius: radius.pill,
    paddingVertical: space.lg,
    alignItems: "center",
    marginTop: space.md,
  },
  resetText: { color: colors.gold, fontSize: 15, letterSpacing: 0.5, fontFamily: fonts.sans },

  footNote: { color: colors.textDim, fontSize: 13, textAlign: "center", marginTop: space.xxl, fontFamily: fonts.serif, fontStyle: "italic" },
  version: { color: colors.textFaint, fontSize: 12, textAlign: "center", marginTop: space.sm, lineHeight: 18, fontFamily: fonts.sans },
});
