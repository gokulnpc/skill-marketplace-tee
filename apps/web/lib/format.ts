/** Raw scores may reach 1.0 internally; never present as a perfect 100% in the UI. */
const DISPLAY_SCORE_MAX = 0.999;

export function displayScore(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v <= 0) return 0;
  return Math.min(v, DISPLAY_SCORE_MAX);
}

export function pct(v: number): string {
  return `${Math.round(displayScore(v) * 1000) / 10}%`;
}

export function upl(v: number): string {
  return `${v >= 0 ? "+" : ""}${Math.round(v * 1000) / 10}%`;
}

export function short(s: string | undefined, head = 10, tail = 8): string {
  if (!s) return "";
  return s.length > head + tail + 3 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s;
}
