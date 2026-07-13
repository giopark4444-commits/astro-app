import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { settingsToThemeState } from "@/lib/settings";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { ProfilesProvider, type BirthProfile } from "@/lib/profiles/profiles-provider";
import { BottomNav } from "@/components/bottom-nav";
import { TopNav } from "@/components/top-nav";
import { ProfileMenu } from "@/components/profile-menu";
import { persistSettings } from "./actions";
import styles from "./app-shell.module.css";

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

  return (
    <ThemeProvider initialTheme={state.theme} initialMode={state.mode} persist={persistSettings}>
      <ProfilesProvider profiles={profiles}>
        <div className={styles.shell}>
          <header className={styles.header}>
            <span className={styles.brand}>Aluna</span>
            <TopNav />
            {/* wrapper estable: ProfileMenu es un Fragment (botón + BottomSheet
                condicional) — sin esto, al abrir el sheet el backdrop se vuelve
                el :last-child del header y el avatar pierde su alineación en el
                grid desktop (hallazgo de la review de T1) */}
            <div className={styles.menuSlot}><ProfileMenu /></div>
          </header>
          <div className={styles.main}>{children}</div>
          <BottomNav />
        </div>
      </ProfilesProvider>
    </ThemeProvider>
  );
}
