import { NextResponse } from "next/server";
import { parseXStatus, xPostedAt } from "@/lib/decode";
import { clock, weekday, isoNoMs } from "@/lib/time";
import { fxUrl, parseFxTwitter } from "@/lib/amplify/fxtwitter";
import { syndicationUrl, parseSyndication } from "@/lib/amplify/syndication";
import { regexTags } from "@/lib/enrich/tags";
import { fingerprint } from "@/lib/fingerprint";
import type { XPostMetrics } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchMetrics(id: string): Promise<{ metrics: XPostMetrics | null; note: string | null }> {
  const headers = { "user-agent": "Mozilla/5.0 (compatible; launch-atlas/0.1)", accept: "application/json" };
  try {
    const r = await fetch(fxUrl(id), { headers, signal: AbortSignal.timeout(8000) });
    if (r.ok) return { metrics: parseFxTwitter(await r.json(), id), note: null };
  } catch { /* fall through */ }
  try {
    const r = await fetch(syndicationUrl(id), { headers, signal: AbortSignal.timeout(8000) });
    if (r.ok) return { metrics: parseSyndication(await r.json(), id), note: "Counts from the syndication endpoint: no views or reposts." };
  } catch { /* fall through */ }
  return { metrics: null, note: "Neither free endpoint answered; timing is decoded from the ID, text and counts are unavailable." };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string; text?: string };
  const parsed = body.url ? parseXStatus(body.url) : null;
  if (!parsed) return NextResponse.json({ error: "Paste a link to a post on x.com, like https://x.com/handle/status/123." }, { status: 400 });
  const postedAt = xPostedAt(parsed.id);
  const { metrics, note } = await fetchMetrics(parsed.id);
  const text = metrics?.text ?? body.text ?? "";
  return NextResponse.json({
    id: parsed.id,
    handle: metrics?.authorHandle ?? parsed.handle,
    decoded: { postedAtUtc: isoNoMs(postedAt), weekdayEt: weekday(postedAt, "et"), et: clock(postedAt, "et"), utc: clock(postedAt, "utc"), pt: clock(postedAt, "pt"), ist: clock(postedAt, "ist") },
    metrics,
    text: text || null,
    tags: text ? regexTags(text) : null,
    fingerprint: fingerprint({ postedAtUtc: isoNoMs(postedAt), text, likes: metrics?.likes ?? null, replies: metrics?.replies ?? null, brandAccount: null }),
    note,
  });
}
