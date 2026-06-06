import type { ReactNode } from "react";

export type IconName =
  | "shield"
  | "lock"
  | "check"
  | "arrow"
  | "search"
  | "upload"
  | "chip"
  | "key"
  | "doc"
  | "eye"
  | "eyeoff"
  | "coin"
  | "spark"
  | "seal"
  | "bolt"
  | "grid"
  | "list"
  | "copy";

export function Icon({
  name,
  size = 16,
  stroke = 1.6,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
}) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const paths: Record<IconName, ReactNode> = {
    shield: <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" {...p} />,
    lock: (
      <>
        <rect x="5" y="11" width="14" height="9" rx="2" {...p} />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" {...p} />
      </>
    ),
    check: <path d="M5 12.5l4.5 4.5L19 7" {...p} />,
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" {...p} />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" {...p} />
        <path d="M20 20l-4-4" {...p} />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4M7 9l5-5 5 5" {...p} />
        <path d="M5 20h14" {...p} />
      </>
    ),
    chip: (
      <>
        <rect x="6" y="6" width="12" height="12" rx="2" {...p} />
        <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" {...p} />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="12" r="3.5" {...p} />
        <path d="M11.5 12H21l-2 2 2 2M16 12v3" {...p} />
      </>
    ),
    doc: (
      <>
        <path d="M7 3h7l4 4v14H7z" {...p} />
        <path d="M14 3v4h4M10 13h6M10 17h6" {...p} />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" {...p} />
        <circle cx="12" cy="12" r="2.5" {...p} />
      </>
    ),
    eyeoff: (
      <path
        d="M3 3l18 18M10.5 6.2A9.6 9.6 0 0 1 12 6c6.5 0 10 6 10 6a16 16 0 0 1-3.2 3.7M6.2 8.2A16 16 0 0 0 2 12s3.5 6 10 6a9.5 9.5 0 0 0 3-.5"
        {...p}
      />
    ),
    coin: (
      <>
        <circle cx="12" cy="12" r="8" {...p} />
        <path d="M12 8v8M9.5 10.5h3.2a1.5 1.5 0 0 1 0 3h-3" {...p} />
      </>
    ),
    spark: <path d="M12 3v6M12 15v6M3 12h6M15 12h6" {...p} />,
    seal: (
      <>
        <circle cx="12" cy="10" r="6" {...p} />
        <path d="M9 15l-1 6 4-2 4 2-1-6" {...p} />
        <path d="M9.5 10l1.7 1.7L15 8" {...p} />
      </>
    ),
    bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" {...p} />,
    grid: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" {...p} />
        <rect x="13" y="4" width="7" height="7" rx="1.5" {...p} />
        <rect x="4" y="13" width="7" height="7" rx="1.5" {...p} />
        <rect x="13" y="13" width="7" height="7" rx="1.5" {...p} />
      </>
    ),
    list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" {...p} />,
    copy: (
      <>
        <rect x="9" y="9" width="11" height="11" rx="2" {...p} />
        <path d="M5 15V5a2 2 0 0 1 2-2h8" {...p} />
      </>
    ),
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      {paths[name]}
    </svg>
  );
}
