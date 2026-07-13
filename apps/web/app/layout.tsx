import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Quicksand } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { FOUC_SCRIPT } from "@/lib/theme/fouc-script";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cormorant" });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-quicksand" });

// Voz Aluna, es (locale por defecto). La imagen OG la aporta app/opengraph-image.tsx
// (Task 3) y los íconos app/icon.tsx — Next los enlaza automáticamente, no hace
// falta declararlos aquí en openGraph.images/icons.
const description =
  "Tu mapa de autoconocimiento: carta astral, numerología y Ba Zi/Saju (los cuatro pilares chinos y coreanos), en un solo lugar.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"),
  title: { default: "Aluna", template: "%s · Aluna" },
  description,
  applicationName: "Aluna",
  openGraph: {
    title: "Aluna",
    description,
    type: "website",
    siteName: "Aluna",
    locale: "es_ES",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f1330" },
    { media: "(prefers-color-scheme: light)", color: "#fdf3ec" },
  ],
};

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
