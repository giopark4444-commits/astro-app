import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Ícono de app iOS: mismo glifo "enso" de la marca que app/icon.tsx, con más
// aire alrededor (iOS aplica su propia máscara/esquinas, sin borderRadius
// aquí). Versión de marca buena-suficiente generada con next/og — Gio la
// reemplaza con arte "Luna en Enso" real.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f1330",
        }}
      >
        <svg
          width="104"
          height="104"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e7c986"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16.5 5.5a8 8 0 1 0 3 7.5" />
          <path d="M19 4.5a4 4 0 0 0 0 6 5 5 0 0 1 0-6Z" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
