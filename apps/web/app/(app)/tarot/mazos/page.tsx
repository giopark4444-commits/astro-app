import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { DeckPicker } from "@/components/tarot/deck-picker";
import { DeckManager } from "./deck-manager";
import styles from "./mazos.module.css";

// Subpágina "Mazos" (reorg ajustes→tarot): el mazo preset (DeckPicker) y el
// mazo custom (DeckManager) vivían en Ajustes; se movieron aquí porque es
// donde de verdad se usan. Página server-thin con guard defensivo propio
// (mismo patrón que app/(app)/tarot/page.tsx — AppLayout ya redirige a
// /login sin sesión, esto es solo defensivo); DeckPicker/DeckManager son
// "use client" y no necesitan ningún dato del usuario, así que el resto de
// la página se resuelve entera en el servidor.
export default async function MazosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("tarot");
  const tSettings = await getTranslations("settings");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/tarot" className={styles.back}>
          ← {t("mazosBack")}
        </Link>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1 className={styles.title}>{t("mazosTitle")}</h1>
      </header>

      <section className="card">
        <h2 className={styles.cardEyebrow}>{tSettings("deckPresetTitle")}</h2>
        <DeckPicker />
      </section>

      <section className="card">
        <h2 className={styles.cardEyebrow}>{tSettings("deckTitle")}</h2>
        <DeckManager />
      </section>
    </main>
  );
}
