import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { computeNumerology } from "@aluna/core";

// Primer corte del móvil: prueba el pipeline monorepo → RN. La numerología es
// @aluna/core puro (isomórfico/RN-safe), así que corre nativo sin el servidor.
// La carta (Swiss Ephemeris) irá por la API; el motor nativo NUNCA se importa aquí.
const SAMPLE = { fullName: "Gio Bing Park", birthDate: { year: 1990, month: 2, day: 4 } };

export default function App() {
  const { core } = computeNumerology(SAMPLE);
  const cells = [
    { label: "Expresión", value: core.expression.value },
    { label: "Alma", value: core.soulUrge.value },
    { label: "Personalidad", value: core.personality.value },
    { label: "Madurez", value: core.maturity.value },
  ];

  return (
    <View style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.brand}>Aluna</Text>
        <Text style={styles.eyebrow}>NUMEROLOGÍA</Text>
        <Text style={styles.name}>{SAMPLE.fullName}</Text>

        <View style={styles.hero}>
          <Text style={styles.heroN}>{String(core.lifePath.value)}</Text>
          <Text style={styles.heroLabel}>Camino de Vida</Text>
        </View>

        <View style={styles.grid}>
          {cells.map((c) => (
            <View key={c.label} style={styles.cell}>
              <Text style={styles.cellN}>{String(c.value)}</Text>
              <Text style={styles.cellL}>{c.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const GOLD = "#e7c986";
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0d24" },
  wrap: { padding: 24, paddingTop: 64, alignItems: "center" },
  brand: { color: GOLD, fontSize: 24, letterSpacing: 1, marginBottom: 18 },
  eyebrow: { color: GOLD, fontSize: 11, letterSpacing: 3, marginBottom: 6 },
  name: { color: "#ece7f6", fontSize: 26, fontStyle: "italic", marginBottom: 28, textAlign: "center" },
  hero: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(231,201,134,0.45)",
    marginBottom: 28,
  },
  heroN: { color: GOLD, fontSize: 64, fontWeight: "600", lineHeight: 70 },
  heroLabel: { color: "#ece7f6", fontSize: 14, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 },
  cell: {
    width: 150,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(231,201,134,0.2)",
    borderRadius: 16,
    backgroundColor: "rgba(150,150,190,0.07)",
  },
  cellN: { color: GOLD, fontSize: 30, fontWeight: "600" },
  cellL: { color: "rgba(233,228,245,0.6)", fontSize: 13, marginTop: 4 },
});
