import Link from "next/link";

export function Crumb({ skillId }: { skillId: string }) {
  return (
    <Link
      href="/"
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontSize: 12,
        color: "var(--mute)",
        marginBottom: 22,
        whiteSpace: "nowrap",
      }}
    >
      ← Marketplace <span style={{ color: "var(--faint)" }}>/ {skillId}</span>
    </Link>
  );
}
