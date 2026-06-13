import "./globals.css";
import { Cormorant_Garamond, Quicksand } from "next/font/google";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cormorant" });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-quicksand" });

export const metadata = { title: "Aluna", description: "Autoconocimiento: carta astral y numerología" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // data-theme/data-mode aquí son el DEFAULT estático pre-hidratación (look base de
  // Observatorio para páginas sin sesión como login/signup). El modo real del usuario
  // —incluida la resolución de "auto" (DEFAULT_MODE) a claro/oscuro— lo aplica el
  // ThemeProvider en cliente dentro de (app)/layout.
  return (
    <html lang="es" data-theme="observatory" data-mode="dark" className={`${cormorant.variable} ${quicksand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
