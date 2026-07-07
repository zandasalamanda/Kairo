import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Aether — Map the way. Build the day.";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0b0d",
          color: "#f2f3f5",
        }}
      >
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: 9999,
            background: "radial-gradient(circle at 34% 26%, #fdf3e0 0%, #e6b877 46%, #22190c 100%)",
            boxShadow: "0 0 90px rgba(230,184,119,0.55)",
          }}
        />
        <div style={{ marginTop: 48, fontSize: 84, fontWeight: 600, letterSpacing: "-0.03em" }}>Aether</div>
        <div style={{ marginTop: 14, fontSize: 32, color: "#9a9ea8" }}>Map the way. Build the day.</div>
      </div>
    ),
    { ...size }
  );
}
