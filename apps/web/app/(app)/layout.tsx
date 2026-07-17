import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { settingsToThemeState } from "@/lib/settings";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { ProfilesProvider, type BirthProfile } from "@/lib/profiles/profiles-provider";
import { NavOrderProvider } from "@/lib/admin/nav-order-provider";
import { DEFAULT_NAV_ORDER, sanitizeNavOrder, type NavKey } from "@/lib/admin/nav-order";
import { BottomNav } from "@/components/bottom-nav";
import { TopNav } from "@/components/top-nav";
import { SettingsLink } from "@/components/settings-link";
import { persistSettings } from "./actions";
import styles from "./app-shell.module.css";

// Orden de la nav (brief admin-panel T3): app_config puede no existir todavía
// (migración 0015 sin aplicar) o simplemente no traer la key — en ambos casos
// el default es exactamente el orden de siempre, así que nadie nota nada.
async function fetchNavOrder(supabase: Awaited<ReturnType<typeof createClient>>): Promise<NavKey[]> {
  try {
    const { data } = await supabase.from("app_config").select("value").eq("key", "nav_order").maybeSingle();
    return sanitizeNavOrder((data as { value: unknown } | null)?.value);
  } catch {
    return [...DEFAULT_NAV_ORDER];
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

  return (
    <ThemeProvider initialTheme={state.theme} initialMode={state.mode} persist={persistSettings}>
      <ProfilesProvider profiles={profiles}>
        <NavOrderProvider order={navOrder}>
          <div className={styles.shell}>
            <header className={styles.header}>
              <span className={styles.brand}>Aluna</span>
              <TopNav order={navOrder} />
              {/* wrapper estable: se conserva aunque ya no monte el BottomSheet de
                  ProfileMenu (jubilado, brief ajustes-web T1) — mismo nombre de
                  clase, mismo layout de grid desktop, sin re-litigar ese hallazgo. */}
              <div className={styles.menuSlot}><SettingsLink /></div>
            </header>
            <div className={styles.main}>{children}</div>
            <BottomNav order={navOrder} />
          </div>
        </NavOrderProvider>
      </ProfilesProvider>
    </ThemeProvider>
  );
}
