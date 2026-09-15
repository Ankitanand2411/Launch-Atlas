import type { XPostMetrics } from "@/lib/types";
import { isoNoMs } from "@/lib/time";

/**
 * X syndication endpoint (cdn.syndication.twimg.com/tweet-result) — the JSON behind embedded tweets.
 * Free, unofficial, no key. Gives text, likes, reply count and media, but not views or reposts.
 * The token is the well-known derivation used by embed libraries.
 */
export function syndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

export function syndicationUrl(id: string): string {
  return `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${syndicationToken(id)}&lang=en`;
}

export function parseSyndication(json: unknown, id: string, now = new Date()): XPostMetrics {
  const t = (json ?? {}) as Record<string, unknown>;
  if (t.__typename && t.__typename !== "Tweet") throw new Error(`syndication: ${String(t.__typename)}`);
  if (!t.text && !t.id_str) throw new Error("syndication: empty payload");
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const user = (t.user ?? {}) as Record<string, unknown>;
  const video = (t.video ?? null) as { variants?: Array<{ type?: string; src?: string }>; durationMs?: number } | null;
  const best = video?.variants?.filter((v) => (v.type ?? "").includes("mp4") && v.src).pop()?.src ?? null;
  const created = typeof t.created_at === "string" ? new Date(t.created_at) : null;
  const quoted = (t.quoted_tweet ?? null) as { id_str?: string } | null;
  return {
    id,
    url: `https://x.com/${typeof user.screen_name === "string" ? user.screen_name : "i"}/status/${id}`,
    text: typeof t.text === "string" ? t.text : null,
    views: null,
    likes: num(t.favorite_count),
    reposts: null,
    quotes: null,
    replies: num(t.conversation_count),
    bookmarks: null,
    authorHandle: typeof user.screen_name === "string" ? user.screen_name : null,
    authorName: typeof user.name === "string" ? user.name : null,
    authorFollowers: null,
    createdAtUtc: created && !Number.isNaN(created.getTime()) ? isoNoMs(created) : null,
    bestVideoUrl: best,
    videoDurationS: video?.durationMs ? Math.round(video.durationMs / 100) / 10 : null,
    videoWidth: null,
    videoHeight: null,
    replyToId: typeof t.in_reply_to_status_id_str === "string" ? t.in_reply_to_status_id_str : null,
    quoteOfId: quoted?.id_str ?? null,
    source: "syndication",
    fetchedAt: isoNoMs(now),
  };
}
