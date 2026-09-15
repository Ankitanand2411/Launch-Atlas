import type { XPostMetrics } from "@/lib/types";
import { isoNoMs } from "@/lib/time";

/**
 * FxTwitter (api.fxtwitter.com) — free, unofficial, no key. Returns exact counts, author followers,
 * full text and media variants for a public post. Parsed defensively: every field is optional.
 */
export const FX_BASE = "https://api.fxtwitter.com";

export function fxUrl(id: string): string {
  return `${FX_BASE}/status/${id}`;
}

export function parseFxTwitter(json: unknown, id: string, now = new Date()): XPostMetrics {
  const root = (json ?? {}) as { code?: number; tweet?: Record<string, unknown> };
  const t = root.tweet;
  if (!t || (root.code && root.code !== 200)) throw new Error(`fxtwitter: unexpected payload (code ${root.code ?? "?"})`);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const author = (t.author ?? {}) as Record<string, unknown>;
  const media = (t.media ?? {}) as { videos?: Array<{ url?: string; duration?: number; variants?: Array<{ url?: string; bitrate?: number; content_type?: string }> }> };
  const video = media.videos?.[0];
  const best = video?.variants?.filter((v) => (v.content_type ?? "").includes("mp4") && v.url).sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0]?.url ?? video?.url ?? null;
  const ts = num(t.created_timestamp);
  const quote = (t.quote ?? null) as { id?: string } | null;
  const replyStatus = t.replying_to_status;
  return {
    id,
    url: typeof t.url === "string" ? t.url : `https://x.com/i/status/${id}`,
    text: typeof t.text === "string" ? t.text : null,
    views: num(t.views),
    likes: num(t.likes),
    reposts: num(t.retweets),
    quotes: num(t.quotes),
    replies: num(t.replies),
    bookmarks: num(t.bookmarks),
    authorHandle: typeof author.screen_name === "string" ? author.screen_name : null,
    authorName: typeof author.name === "string" ? author.name : null,
    authorFollowers: num(author.followers),
    createdAtUtc: ts ? isoNoMs(new Date(ts * 1000)) : null,
    bestVideoUrl: best,
    videoDurationS: num(video?.duration),
    videoWidth: num((video as { width?: number } | undefined)?.width),
    videoHeight: num((video as { height?: number } | undefined)?.height),
    replyToId: typeof replyStatus === "string" ? replyStatus : typeof replyStatus === "number" ? String(replyStatus) : null,
    quoteOfId: quote?.id ? String(quote.id) : null,
    source: "fxtwitter",
    fetchedAt: isoNoMs(now),
  };
}
