import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "7px",
        }}
      >
        {/* Gem / diamond shape built from SVG paths matching lucide's Gem icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer gem silhouette */}
          <path d="M6 3h12l4 6-10 13L2 9Z" fill="#FAC515" />
          {/* Inner facet lines — slightly darker gold for depth */}
          <path d="M11 3 8 9l4 13 4-13-3-6" fill="#c49a10" />
          {/* Girdle line */}
          <line x1="2" y1="9" x2="22" y2="9" stroke="#0a0a0a" strokeWidth="1.2" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
