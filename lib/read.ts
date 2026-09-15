/**
 * Read a launch from one or many X posts: the hero (earliest), the wave of amplifying posts in minutes
 * after it, quote vs reply vs standalone, the creator roster, totals, and the hero's score against the nine.
 * Pure functions; the API route does the fetching.
 */
import { parseXStatus, xPostedAt } from "@/lib/decode";
import { clock, weekday, isoNoMs } from "@/lib/time";
import { regexTags } from "@/lib/enrich/tags";
import { fingerprint, type Fingerprint } from "@/lib/fingerprint";
import { tierOf } from "@/lib/amplify/roster";
import type { HookTags, XPostMetrics } from "@/lib/types";

export type PostKind = "hero" | "quote" | "reply" | "standalone";

export interface PostReading {
  id: string;
  url: string;
  handle: string | null;
  postedAtUtc: string;
  weekdayEt: string;
  et: string;
  utc: string;
  ist: string;
  minutesAfterHero: number;
  kind: PostKind;
  metrics: XPostMetrics | null;
  text: string | null;
  tags: HookTags | null;
  note: string | null;
}

export interface LaunchReading {
  hero: PostReading;
  posts: PostReading[];
  amplifiers: PostReading[];
  totals: { posts: number; views: number | null; likes: number | null; reposts: number | null; replies: number | null };
  kinds: Record<Exclude<PostKind, "hero">, number>;
  quoteShare: number | null;
  waveMedianMin: number | null;
  waveP90Min: number | null;
  roster: { handle: string; followers: number | null; tier: string; posts: number; kinds: PostKind[]; firstMinutesAfterHero: number }[];
  fingerprint: Fingerprint;
  notes: string[];
}

/** Pull every X status id out of free text (one per line, commas, or a paragraph). Order kept, duplicates dropped. */
export function extractIds(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(/(?:twitter|x)\.com\/[A-Za-z0-9_]{1,15}\/status\/(\d{15,25})|(?<![\d])(\d{18,20})(?![\d])/g)) {
    const id = m[1] ?? m[2];
    if (id && !seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
}

const sum = (xs: Array<number | null>) => (xs.some((x) => x != null) ? xs.reduce<number>((a, b) => a + (b ?? 0), 0) : null);
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return Math.round((s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) * 10) / 10; };
const p90 = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return Math.round(s[Math.min(s.length - 1, Math.floor(0.9 * (s.length - 1)))] * 10) / 10; };

export function classify(m: XPostMetrics | null, heroId: string, isHero: boolean): PostKind {
  if (isHero) return "hero";
  if (m?.quoteOfId) return "quote";
  if (m?.replyToId) return "reply";
  return "standalone";
}

export function readLaunch(inputs: Array<{ id: string; handleFromUrl: string | null; metrics: XPostMetrics | null; note: string | null; textFallback?: string | null }>, heroId?: string): LaunchReading {
  if (!inputs.length) throw new Error("no posts");
  const decoded = inputs.map((i) => ({ ...i, postedAt: i.metrics?.createdAtUtc ? new Date(i.metrics.createdAtUtc) : xPostedAt(i.id) }));
  const hero = heroId ? decoded.find((d) => d.id === heroId) ?? decoded[0] : [...decoded].sort((a, b) => a.postedAt.getTime() - b.postedAt.getTime())[0];
  const notes: string[] = [];

  const posts: PostReading[] = decoded.map((d) => {
    const text = d.metrics?.text ?? d.textFallback ?? null;
    const isHero = d.id === hero.id;
    return {
      id: d.id,
      url: d.metrics?.url ?? `https://x.com/${d.handleFromUrl ?? "i"}/status/${d.id}`,
      handle: d.metrics?.authorHandle ?? d.handleFromUrl,
      postedAtUtc: isoNoMs(d.postedAt),
      weekdayEt: weekday(d.postedAt, "et"),
      et: clock(d.postedAt, "et"),
      utc: clock(d.postedAt, "utc"),
      ist: clock(d.postedAt, "ist"),
      minutesAfterHero: Math.round(((d.postedAt.getTime() - hero.postedAt.getTime()) / 60000) * 10) / 10,
      kind: classify(d.metrics, hero.id, isHero),
      metrics: d.metrics,
      text,
      tags: text ? regexTags(text) : null,
      note: d.note,
    };
  }).sort((a, b) => a.minutesAfterHero - b.minutesAfterHero);

  const heroPost = posts.find((p) => p.kind === "hero")!;
  const amplifiers = posts.filter((p) => p.kind !== "hero");
  const kinds = { quote: 0, reply: 0, standalone: 0 } as Record<Exclude<PostKind, "hero">, number>;
  for (const a of amplifiers) kinds[a.kind as Exclude<PostKind, "hero">]++;
  const commentary = kinds.quote + kinds.reply;
  const quoteShare = amplifiers.length ? Math.round((kinds.quote / amplifiers.length) * 1000) / 1000 : null;
  if (amplifiers.some((a) => !a.metrics)) notes.push(`${amplifiers.filter((a) => !a.metrics).length} amplifying post(s) had no endpoint data; classified as standalone by default.`);
  if (commentary === 0 && amplifiers.length) notes.push("No post was identifiable as a quote or reply; the endpoint may not have returned relationship fields.");

  const byHandle = new Map<string, { followers: number | null; posts: number; kinds: Set<PostKind>; first: number }>();
  for (const a of amplifiers) {
    const h = (a.handle ?? "unknown").toLowerCase();
    const cur = byHandle.get(h) ?? { followers: a.metrics?.authorFollowers ?? null, posts: 0, kinds: new Set<PostKind>(), first: a.minutesAfterHero };
    cur.posts++; cur.kinds.add(a.kind); cur.first = Math.min(cur.first, a.minutesAfterHero);
    if (cur.followers == null && a.metrics?.authorFollowers != null) cur.followers = a.metrics.authorFollowers;
    byHandle.set(h, cur);
  }
  const roster = Array.from(byHandle.entries()).map(([handle, v]) => ({ handle, followers: v.followers, tier: tierOf(v.followers), posts: v.posts, kinds: Array.from(v.kinds), firstMinutesAfterHero: v.first })).sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1));

  const waves = amplifiers.map((a) => a.minutesAfterHero).filter((m) => m >= 0);
  return {
    hero: heroPost,
    posts,
    amplifiers,
    totals: { posts: posts.length, views: sum(posts.map((p) => p.metrics?.views ?? null)), likes: sum(posts.map((p) => p.metrics?.likes ?? null)), reposts: sum(posts.map((p) => p.metrics?.reposts ?? null)), replies: sum(posts.map((p) => p.metrics?.replies ?? null)) },
    kinds,
    quoteShare,
    waveMedianMin: median(waves),
    waveP90Min: p90(waves),
    roster,
    fingerprint: fingerprint({ postedAtUtc: heroPost.postedAtUtc, text: heroPost.text ?? "", likes: heroPost.metrics?.likes ?? null, replies: heroPost.metrics?.replies ?? null, brandAccount: null }),
    notes,
  };
}

export function idsFromUrls(urls: string[]): Array<{ id: string; handle: string | null }> {
  const out: Array<{ id: string; handle: string | null }> = [];
  const seen = new Set<string>();
  for (const u of urls) {
    const parsed = parseXStatus(u);
    const id = parsed?.id ?? (/^\d{15,25}$/.test(u.trim()) ? u.trim() : null);
    if (id && !seen.has(id)) { seen.add(id); out.push({ id, handle: parsed?.handle ?? null }); }
  }
  return out;
}
