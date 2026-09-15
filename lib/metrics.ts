/**
 * Parse compact engagement counts as X renders them ("2.8K", "29.7K", "1.5M", "405").
 * Returns the number and whether it is approximate (rounded by the platform).
 */
export function parseCompact(input: string | null | undefined): { value: number; approx: boolean } | null {
  if (!input) return null;
  const s = input.trim().replace(/,/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)\s*([KMB])?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = (m[2] ?? "").toUpperCase();
  const mult = unit === "K" ? 1e3 : unit === "M" ? 1e6 : unit === "B" ? 1e9 : 1;
  return { value: Math.round(n * mult), approx: unit !== "" };
}

export function replyRate(replies: number | null, likes: number | null): number | null {
  if (replies == null || likes == null || likes === 0) return null;
  return Math.round((replies / likes) * 1000) / 1000;
}

export function formatCompact(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}
