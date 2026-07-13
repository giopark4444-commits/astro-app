import "./globals.css";
import { Cormorant_Garamond, Quicksand } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { FOUC_SCRIPT } from "@/lib/theme/fouc-script";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cormorant" });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-quicksand" });

export const metadata = { title: "Aluna", description: "Autoconocimiento: carta astral y numerología" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  // data-theme/data-mode aquí son el DEFAULT estático pre-hidratación (look base de
  // Observatorio para páginas sin sesión como login/signup). El modo real del usuario
  // —incluida la resolución de "auto" (DEFAULT_MODE)— lo aplica el ThemeProvider en
  // cliente dentro de (app)/layout.
  return (
    <html lang={locale} data-theme="observatory" data-mode="dark" className={`${cormorant.variable} ${quicksand.variable}`}>
      {/* Anti-FOUC: corre antes del primer paint (está en <head>) y sobreescribe
          data-theme/data-mode con la cookie del usuario, resolviendo "auto" con matchMedia. */}
      <head><script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} /></head>
      <body><NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider></body>
    </html>
  );
}
