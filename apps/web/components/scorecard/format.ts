export function formatScore(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

export function formatUplift(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${Math.round(value * 1000) / 10}%`;
}

export function truncateHash(value: string, head = 12, tail = 8): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
