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
            <path d="M12.0 1.5 L9.83 7.5 L3.79 5.45 L7.13 10.89 L1.76 14.34 L8.09 15.12 L7.44 21.46 L12.0 17.0 L16.56 21.46 L15.91 15.12 L22.24 14.34 L16.87 10.89 L20.21 5.45 L14.17 7.5 Z" />
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
