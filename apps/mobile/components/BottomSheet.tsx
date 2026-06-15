import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, space } from "../theme/tokens";

/**
 * Hoja inferior, equivalente nativo del <BottomSheet/> de la web. Sube desde
 * abajo con un velo oscuro detrás; se cierra tocando fuera o el asa. Contenido
 * desplazable para lecturas largas (la "Esencia").
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!open) return;
    slide.setValue(0);
    Animated.timing(slide, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, slide]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            { maxHeight: height * 0.86, paddingBottom: insets.bottom + space.lg, opacity: slide, transform: [{ translateY }] },
          ]}
        >
          {/* Detener la propagación para que tocar dentro no cierre la hoja */}
          <Pressable onPress={() => {}}>
            <View style={styles.handle} />
            {!!title && <Text style={styles.title}>{title}</Text>}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(4,6,18,0.72)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: radius.lg + 6,
    borderTopRightRadius: radius.lg + 6,
    borderTopWidth: 1,
    borderColor: colors.goldHair,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.goldSoft,
    marginBottom: space.lg,
  },
  title: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 22,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: space.sm,
  },
  body: { paddingTop: space.sm },
});
