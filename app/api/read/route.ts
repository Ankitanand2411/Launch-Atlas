import { NextResponse } from "next/server";
import { fetchXMetrics, pool } from "@/lib/amplify/fetch-metrics";
import { extractIds, idsFromUrls, readLaunch } from "@/lib/read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_POSTS = 60;

/** POST { text?: string; urls?: string[]; hero?: string } → LaunchReading */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { text?: string; urls?: string[]; hero?: string };
  const fromText = body.text ? extractIds(body.text).map((id) => ({ id, handle: null as string | null })) : [];
  const fromUrls = body.urls ? idsFromUrls(body.urls) : [];
  const merged = [...fromUrls, ...fromText].filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i);
  if (!merged.length) return NextResponse.json({ error: "Paste at least one link to a post on x.com, like https://x.com/handle/status/123. One per line is easiest." }, { status: 400 });
  if (merged.length > MAX_POSTS) return NextResponse.json({ error: `That is ${merged.length} posts; the limit is ${MAX_POSTS} per reading.` }, { status: 400 });
  const fetched = await pool(merged, 5, async ({ id, handle }) => {
    const { metrics, note } = await fetchXMetrics(id);
    return { id, handleFromUrl: handle, metrics, note };
  });
  const reading = readLaunch(fetched, body.hero);
  return NextResponse.json(reading);
}
