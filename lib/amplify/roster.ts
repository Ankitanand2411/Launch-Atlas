import type { RosterEntry, RosterOverlap } from "@/lib/types";

/**
 * Manual amplifier roster: data/manual/amplifiers.csv
 * launch_slug,platform,handle,followers,kind,url,posted_at_utc
 * The free path for H7 — copy handles from a post's Quotes tab while logged in. Aggregated only.
 */
export function parseRosterCsv(csv: string): RosterEntry[] {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const need = ["launch_slug", "platform", "handle", "kind"];
  for (const k of need) if (idx(k) < 0) throw new Error(`amplifiers.csv: missing column ${k}`);
  return lines.slice(1).map((line): RosterEntry => {
    const cells = line.split(",").map((c) => c.trim());
    const get = (k: string) => (idx(k) >= 0 ? cells[idx(k)] ?? "" : "");
    const followers = get("followers") ? Number(get("followers").replace(/[^\d]/g, "")) : NaN;
    const kind = get("kind").toLowerCase();
    const platform: RosterEntry["platform"] = get("platform").toLowerCase() === "linkedin" ? "linkedin" : "x";
    return {
      launchSlug: get("launch_slug"),
      platform,
      handle: get("handle").replace(/^@/, ""),
      followers: Number.isFinite(followers) ? followers : null,
      kind: (["quote", "reply", "repost", "standalone"].includes(kind) ? kind : "standalone") as RosterEntry["kind"],
      url: get("url") || null,
      postedAtUtc: get("posted_at_utc") || null,
    };
  }).filter((e) => e.launchSlug && e.handle);
}

export function tierOf(followers: number | null): string {
  if (followers == null) return "unknown";
  if (followers < 10_000) return "<10K";
  if (followers < 100_000) return "10K–100K";
  if (followers < 1_000_000) return "100K–1M";
  return "1M+";
}

export function overlap(entries: RosterEntry[]): RosterOverlap {
  const byHandle = new Map<string, { platform: RosterEntry["platform"]; launches: Set<string>; followers: number | null }>();
  for (const e of entries) {
    const key = `${e.platform}:${e.handle.toLowerCase()}`;
    const cur = byHandle.get(key) ?? { platform: e.platform, launches: new Set<string>(), followers: e.followers };
    cur.launches.add(e.launchSlug);
    if (cur.followers == null && e.followers != null) cur.followers = e.followers;
    byHandle.set(key, cur);
  }
  const repeat = Array.from(byHandle.entries())
    .filter(([, v]) => v.launches.size >= 2)
    .map(([k, v]) => ({ handle: k.split(":")[1], platform: v.platform, launches: Array.from(v.launches).sort(), followers: v.followers }))
    .sort((a, b) => b.launches.length - a.launches.length);
  const byTier: Record<string, number> = {};
  for (const [, v] of byHandle) byTier[tierOf(v.followers)] = (byTier[tierOf(v.followers)] ?? 0) + 1;
  return { entries: entries.length, creators: byHandle.size, repeat, byTier };
}
