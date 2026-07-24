import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatLibraryView } from "./chat-library-view";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Defensivo (AppLayout ya redirige a /login sin sesión): mismo patrón que
  // app/(app)/tarot/page.tsx y app/(app)/perfil/page.tsx. No hace falta pasar
  // userId al cliente: la lista/detalle de hilos se piden vía fetch a
  // /api/chat/threads*, que se autentica solo por cookie de sesión.
  if (!user) redirect("/login");

  return <ChatLibraryView />;
}
