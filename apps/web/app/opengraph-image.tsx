import { ImageResponse } from "next/og";

export const alt = "Aluna — tu mapa de autoconocimiento";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// OG image: fondo noche de Observatorio (mismo gradiente que --bg en
// tokens.css) + el glifo "enso" de la marca en oro + wordmark "Aluna" +
// tagline. Versión de marca buena-suficiente generada con next/og — Gio la
// reemplaza con arte "Luna en Enso" real.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 90px",
          background:
            "radial-gradient(circle at 50% 0%, #28316b 0%, #121737 45%, #0a0d24 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 200,
            height: 200,
            borderRadius: 9999,
            background: "rgba(231, 201, 134, 0.10)",
            border: "1px solid rgba(231, 201, 134, 0.35)",
            marginRight: 64,
          }}
        >
          <svg
            width="112"
            height="112"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#e7c986"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16.5 5.5a8 8 0 1 0 3 7.5" />
            <path d="M19 4.5a4 4 0 0 0 0 6 5 5 0 0 1 0-6Z" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: 128,
              fontFamily: "Georgia, serif",
              color: "#ece7f6",
              letterSpacing: 1,
            }}
          >
            <span style={{ color: "#e7c986" }}>A</span>
            <span>luna</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontFamily: "Georgia, serif",
              color: "rgba(233, 228, 245, 0.65)",
              marginTop: 18,
            }}
          >
            Tu mapa de autoconocimiento
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
