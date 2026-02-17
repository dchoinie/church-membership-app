import { ImageResponse } from "next/og";

export const alt = "Simple Church Tools – Church Management Made Simple";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 16,
              background: "rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
            }}
          >
            ⛪
          </div>
          <span style={{ fontWeight: 700 }}>Simple Church Tools</span>
        </div>
        <div
          style={{
            fontSize: 36,
            color: "rgba(255, 255, 255, 0.9)",
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          Church Management Made Simple
        </div>
        <div
          style={{
            fontSize: 24,
            color: "rgba(255, 255, 255, 0.7)",
            marginTop: 24,
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          Members, Giving, Attendance & Reports
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
