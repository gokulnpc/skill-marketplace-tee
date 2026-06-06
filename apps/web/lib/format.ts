export function pct(v: number): string {
  return `${Math.round(v * 1000) / 10}%`;
}

export function upl(v: number): string {
  return `${v >= 0 ? "+" : ""}${Math.round(v * 1000) / 10}%`;
}

export function short(s: string | undefined, head = 10, tail = 8): string {
  if (!s) return "";
  return s.length > head + tail + 3 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s;
}
