import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon: el glifo "enso" de la marca (ver components/icon.tsx, name="enso")
// en oro sobre fondo noche. Versión de marca buena-suficiente generada con
// next/og — Gio la reemplaza con arte "Luna en Enso" real.
export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e7c986"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5.5 20 12 5l6.5 15" />
          <path d="M8.4 13.6a4.2 2.6 0 0 0 7.2 0" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
