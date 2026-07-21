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
          <path d="M12.0 1.5 L9.83 7.5 L3.79 5.45 L7.13 10.89 L1.76 14.34 L8.09 15.12 L7.44 21.46 L12.0 17.0 L16.56 21.46 L15.91 15.12 L22.24 14.34 L16.87 10.89 L20.21 5.45 L14.17 7.5 Z" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
