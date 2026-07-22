import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { settingsToThemeState } from "@/lib/settings";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { ProfilesProvider, type BirthProfile } from "@/lib/profiles/profiles-provider";
import { NavOrderProvider } from "@/lib/admin/nav-order-provider";
import { resolveNavOrder, type NavKey } from "@/lib/admin/nav-order";
import { BottomNav } from "@/components/bottom-nav";
import { TopNav } from "@/components/top-nav";
import { SettingsLink } from "@/components/settings-link";
import { Icon } from "@/components/icon";
import { persistSettings } from "./actions";
import styles from "./app-shell.module.css";

// Orden de la nav (brief admin-panel T3, corregido en review Fable): app_config
// puede no existir todavía (migración 0015 sin aplicar) o simplemente no traer
// la key — en ambos casos devolvemos `null` ("nadie ha guardado nada todavía")
// en vez de DEFAULT_NAV_ORDER, para que el shell de abajo deje a cada nav en
// su propio orden histórico hasta que /admin guarde de verdad.
async function fetchNavOrder(supabase: Awaited<ReturnType<typeof createClient>>): Promise<NavKey[] | null> {
  try {
    const { data, error } = await supabase.from("app_config").select("value").eq("key", "nav_order").maybeSingle();
    return resolveNavOrder(data as { value: unknown } | null, error);
  } catch {
    return null;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("settings").select("theme, light_mode, language").eq("user_id", user.id).maybeSingle();
  const state = settingsToThemeState(row ?? {});

  const { data: profileRows } = await supabase
    .from("birth_profiles")
    .select("id, name, birth_date, birth_time, time_known, place_name, latitude, longitude, time_zone, gender")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  const profiles = (profileRows ?? []) as BirthProfile[];
  if (profiles.length === 0) redirect("/onboarding");

  const navOrder = await fetchNavOrder(supabase);

  // Sin fila guardada (navOrder null): NO pasamos `order` (cada nav cae en su
  // propio default hardcodeado) y NO montamos NavOrderProvider (hub-view cae
  // en el default de useNavOrder(), igual de inerte). Recién con un guardado
  // real en /admin este árbol empieza a reordenar algo.
  const shell = (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/hoy" className={styles.brand} aria-label="Aluna — inicio">
          <Icon name="enso" size={20} />
          <span>Aluna</span>
        </Link>
        <TopNav {...(navOrder ? { order: navOrder } : {})} />
        {/* wrapper estable: se conserva aunque ya no monte el BottomSheet de
            ProfileMenu (jubilado, brief ajustes-web T1) — mismo nombre de
            clase, mismo layout de grid desktop, sin re-litigar ese hallazgo. */}
        <div className={styles.menuSlot}><SettingsLink /></div>
      </header>
      <div className={styles.main}>{children}</div>
      <BottomNav {...(navOrder ? { order: navOrder } : {})} />
    </div>
  );

  return (
    <ThemeProvider initialTheme={state.theme} initialMode={state.mode} persist={persistSettings}>
      <ProfilesProvider profiles={profiles}>
        {navOrder ? <NavOrderProvider order={navOrder}>{shell}</NavOrderProvider> : shell}
      </ProfilesProvider>
    </ThemeProvider>
  );
}
