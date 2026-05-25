import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #2f66e5 0%, #1f54cf 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "7px",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer gem silhouette */}
          <path d="M6 3h12l4 6-10 13L2 9Z" fill="white" fillOpacity="0.95" />
          {/* Inner facet */}
          <path d="M11 3 8 9l4 13 4-13-3-6" fill="white" fillOpacity="0.4" />
          {/* Girdle line */}
          <line x1="2" y1="9" x2="22" y2="9" stroke="white" strokeOpacity="0.5" strokeWidth="1.2" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
