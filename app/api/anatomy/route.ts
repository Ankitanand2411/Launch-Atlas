import { NextResponse } from "next/server";
import { parseXStatus, xPostedAt } from "@/lib/decode";
import { clock, weekday, isoNoMs } from "@/lib/time";
import { fetchXMetrics } from "@/lib/amplify/fetch-metrics";
import { regexTags } from "@/lib/enrich/tags";
import { fingerprint } from "@/lib/fingerprint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string; text?: string };
  const parsed = body.url ? parseXStatus(body.url) : null;
  if (!parsed) return NextResponse.json({ error: "Paste a link to a post on x.com, like https://x.com/handle/status/123." }, { status: 400 });
  const postedAt = xPostedAt(parsed.id);
  const { metrics, note } = await fetchXMetrics(parsed.id);
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
