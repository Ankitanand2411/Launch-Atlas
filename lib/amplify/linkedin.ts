import type { LinkedInPostMetrics } from "@/lib/types";
import { isoNoMs } from "@/lib/time";

/**
 * Public LinkedIn post page (logged out). LinkedIn shows a public rendering for many posts with
 * reaction and comment counts in the markup; it also throws an auth wall after a few requests.
 * Everything here is best effort and every miss is recorded as a note.
 */
export function parseLinkedInPublic(html: string, activityId: string, url: string, now = new Date()): LinkedInPostMetrics {
  const authWall = /authwall|sign in to view|<title>[^<]*Sign Up[^<]*<\/title>/i.test(html) && !/social-actions|reaction/i.test(html);
  const number = (m: RegExpMatchArray | null) => (m ? Number(m[1].replace(/,/g, "")) : null);
  const reactions = number(html.match(/social-actions__reaction-count[^>]*>\s*([\d,]+)/i)) ?? number(html.match(/([\d,]+)\s+(?:reactions|likes)\b/i));
  const comments = number(html.match(/([\d,]+)\s+comments?\b/i));
  const reposts = number(html.match(/([\d,]+)\s+reposts?\b/i));
  const og = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i)?.[1] ?? null;
  const text = og ? og.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim() : null;
  return {
    activityId,
    url,
    text,
    reactions,
    comments,
    reposts,
    source: "linkedin-public",
    fetchedAt: isoNoMs(now),
    note: authWall ? "auth wall — counts unavailable; add data/overrides/linkedin/{id}.json" : undefined,
  };
}
