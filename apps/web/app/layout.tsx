export const metadata = { title: "Aluna", description: "Autoconocimiento: carta astral y numerología" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
