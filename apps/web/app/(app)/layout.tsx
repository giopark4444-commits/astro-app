import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { settingsToThemeState } from "@/lib/settings";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { BottomNav } from "@/components/bottom-nav";
import { persistSettings } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase.from("settings").select("theme, light_mode, language").eq("user_id", user.id).maybeSingle();
  const state = settingsToThemeState(row ?? {});

  return (
    <ThemeProvider initialTheme={state.theme} initialMode={state.mode} persist={persistSettings}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <div style={{ flex: 1 }}>{children}</div>
        <BottomNav />
      </div>
    </ThemeProvider>
  );
}
