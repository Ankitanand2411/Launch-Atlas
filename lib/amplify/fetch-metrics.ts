import { fxUrl, parseFxTwitter } from "./fxtwitter";
import { syndicationUrl, parseSyndication } from "./syndication";
import type { XPostMetrics } from "@/lib/types";

const HEADERS = { "user-agent": "Mozilla/5.0 (compatible; launch-atlas/0.1)", accept: "application/json" };

/** Free endpoints only: FxTwitter first, X syndication second. Never throws; a miss returns null with a note. */
export async function fetchXMetrics(id: string, timeoutMs = 8000): Promise<{ metrics: XPostMetrics | null; note: string | null }> {
  try {
    const r = await fetch(fxUrl(id), { headers: HEADERS, signal: AbortSignal.timeout(timeoutMs) });
    if (r.ok) return { metrics: parseFxTwitter(await r.json(), id), note: null };
  } catch { /* fall through */ }
  try {
    const r = await fetch(syndicationUrl(id), { headers: HEADERS, signal: AbortSignal.timeout(timeoutMs) });
    if (r.ok) return { metrics: parseSyndication(await r.json(), id), note: "Counts from the syndication endpoint: no views, reposts or follower count." };
  } catch { /* fall through */ }
  return { metrics: null, note: "Neither free endpoint answered; timing is decoded from the ID, text and counts are unavailable." };
}

/** Run promises with a small concurrency cap so a paste of 40 links doesn't fire 40 requests at once. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  });
  await Promise.all(workers);
  return out;
}
