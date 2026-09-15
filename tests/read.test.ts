import { describe, expect, it } from "vitest";
import { extractIds, idsFromUrls, readLaunch, classify } from "@/lib/read";
import type { XPostMetrics } from "@/lib/types";

const base = (id: string, over: Partial<XPostMetrics> = {}): XPostMetrics => ({
  id, url: `https://x.com/u/status/${id}`, text: "post", views: 1000, likes: 100, reposts: 10, quotes: 5, replies: 20, bookmarks: null,
  authorHandle: "u", authorName: "U", authorFollowers: 5000, createdAtUtc: null, bestVideoUrl: null, videoDurationS: null,
  videoWidth: null, videoHeight: null, replyToId: null, quoteOfId: null, source: "fxtwitter", fetchedAt: "now", ...over,
});

// Gamma hero id (13:50:42Z). Later ids are the same snowflake + N minutes.
const HERO = 1987880600661889356n;
const later = (min: number) => String(HERO + BigInt(Math.round(min * 60000)) * (1n << 22n));

describe("extracting ids", () => {
  it("finds ids in urls, bare numbers and messy text, dropping duplicates", () => {
    const text = `https://x.com/a/status/${later(0)}\nhttps://twitter.com/b/status/${later(5)}?s=20, ${later(5)} and ${later(9)}`;
    expect(extractIds(text)).toEqual([later(0), later(5), later(9)]);
    expect(idsFromUrls([`https://x.com/a/status/${later(0)}`, later(1)])).toEqual([{ id: later(0), handle: "a" }, { id: later(1), handle: null }]);
  });
});

describe("reading a launch", () => {
  it("picks the earliest post as hero, places amplifiers by minutes after, and classifies kinds", () => {
    const heroId = later(0);
    const r = readLaunch([
      { id: later(45), handleFromUrl: "c", metrics: base(later(45), { authorHandle: "c", quoteOfId: heroId, authorFollowers: 120000 }), note: null },
      { id: heroId, handleFromUrl: "founder", metrics: base(heroId, { authorHandle: "founder", views: 50000, likes: 2800, replies: 405 }), note: null },
      { id: later(12), handleFromUrl: "b", metrics: base(later(12), { authorHandle: "b", replyToId: heroId }), note: null },
      { id: later(600), handleFromUrl: "d", metrics: null, note: "miss" },
    ]);
    expect(r.hero.id).toBe(heroId);
    expect(r.hero.kind).toBe("hero");
    expect(r.amplifiers.map((a) => a.kind)).toEqual(["reply", "quote", "standalone"]);
    expect(r.amplifiers.map((a) => a.minutesAfterHero)).toEqual([12, 45, 600]);
    expect(r.kinds).toEqual({ quote: 1, reply: 1, standalone: 1 });
    expect(r.waveMedianMin).toBe(45);
    expect(r.roster[0]).toMatchObject({ handle: "c", tier: "100K–1M", posts: 1 });
    expect(r.totals.views).toBe(52000);
    expect(r.fingerprint.max).toBeGreaterThan(0);
    expect(r.notes.some((n) => n.includes("no endpoint data"))).toBe(true);
  });
  it("reads a single post with no amplifiers", () => {
    const r = readLaunch([{ id: later(0), handleFromUrl: "founder", metrics: null, note: null }]);
    expect(r.amplifiers).toHaveLength(0);
    expect(r.quoteShare).toBeNull();
    expect(r.hero.et).toBe("08:50");
  });
  it("classifies from endpoint relationship fields", () => {
    expect(classify(base("1", { quoteOfId: "9" }), "9", false)).toBe("quote");
    expect(classify(base("1", { replyToId: "9" }), "9", false)).toBe("reply");
    expect(classify(null, "9", false)).toBe("standalone");
    expect(classify(null, "9", true)).toBe("hero");
  });
});
