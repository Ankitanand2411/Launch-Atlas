import { describe, expect, it } from "vitest";
import { parseFxTwitter } from "@/lib/amplify/fxtwitter";
import { parseSyndication, syndicationToken } from "@/lib/amplify/syndication";
import { parseLinkedInPublic } from "@/lib/amplify/linkedin";
import { parseRosterCsv, overlap } from "@/lib/amplify/roster";
import { extractClaims, viewsInMillions, hypothesisH8 } from "@/lib/analyze/claims";
import { fingerprint } from "@/lib/fingerprint";
import { buildInsight } from "@/lib/insight";
import analysis from "@/data/derived/analysis.json";
import launches from "@/data/derived/launches.json";
import type { Analysis, LaunchSeed } from "@/lib/types";

describe("free X endpoints", () => {
  it("parses a FxTwitter payload defensively", () => {
    const m = parseFxTwitter({ code: 200, tweet: { url: "https://x.com/a/status/1", text: "hi", author: { screen_name: "a", name: "A", followers: 1234 }, replies: 5, retweets: 7, likes: 90, views: 1000, created_timestamp: 1762782642, media: { videos: [{ url: "v.mp4", duration: 94, variants: [{ url: "lo.mp4", bitrate: 100, content_type: "video/mp4" }, { url: "hi.mp4", bitrate: 900, content_type: "video/mp4" }] }] } } }, "1");
    expect(m.likes).toBe(90); expect(m.reposts).toBe(7); expect(m.quotes).toBeNull(); expect(m.authorFollowers).toBe(1234);
    expect(m.bestVideoUrl).toBe("hi.mp4"); expect(m.createdAtUtc).toBe("2025-11-10T13:50:42Z"); expect(m.source).toBe("fxtwitter");
    expect(() => parseFxTwitter({ code: 404, message: "NOT_FOUND" }, "1")).toThrow();
  });
  it("derives the syndication token and parses the payload", () => {
    expect(syndicationToken("1987880600661889356")).toMatch(/^[a-z0-9]+$/);
    const m = parseSyndication({ __typename: "Tweet", text: "t", favorite_count: 2812, conversation_count: 405, created_at: "2025-11-10T13:50:42.000Z", user: { screen_name: "thisisgrantlee", name: "Grant" } }, "1987880600661889356");
    expect(m.likes).toBe(2812); expect(m.replies).toBe(405); expect(m.views).toBeNull(); expect(m.source).toBe("syndication");
  });
});

describe("LinkedIn public page", () => {
  it("reads counts when present and flags the auth wall when not", () => {
    const ok = parseLinkedInPublic('<meta property="og:description" content="Today we raised"> <span data-test-id="social-actions__reaction-count">1,234</span> <a>56 Comments</a>', "7", "u");
    expect(ok.reactions).toBe(1234); expect(ok.comments).toBe(56); expect(ok.text).toBe("Today we raised"); expect(ok.note).toBeUndefined();
    const wall = parseLinkedInPublic("<title>Sign Up | LinkedIn</title><div class=authwall></div>", "7", "u");
    expect(wall.note).toMatch(/auth wall/);
  });
});

describe("manual roster", () => {
  const csv = `# comment\nlaunch_slug,platform,handle,followers,kind,url,posted_at_utc\ngamma,x,@alice,45000,quote,,\ndeel,x,alice,45000,quote,,\nwispr-flow,X,Alice,,reply,,\ncartesia,linkedin,bob,2000000,repost,,`;
  it("parses rows and finds repeat creators", () => {
    const entries = parseRosterCsv(csv);
    expect(entries).toHaveLength(4);
    const o = overlap(entries);
    expect(o.creators).toBe(2);
    expect(o.repeat[0]).toMatchObject({ handle: "alice", launches: ["deel", "gamma", "wispr-flow"], followers: 45000 });
    expect(o.byTier["1M+"]).toBe(1);
  });
});

describe("claims", () => {
  it("extracts recurring claims from a page", () => {
    const c = extractClaims('<meta name="description" content="Social Capital Inc. is building the distribution infrastructure for generational companies."><p>A distribution network reaching &gt; 300M views per month across X and LinkedIn.</p><p>We guarantee a viral launch. &lt; 20 people. &gt; 1000% YoY. 500+ creators</p>', "u", "2026-01-01", "wayback", "2026-09-15");
    expect(c.viewsClaim).toMatch(/300M views per month/); expect(c.creatorsClaim).toBe("500+ creators"); expect(c.teamSize).toBe("< 20 people"); expect(c.growthClaim).toBe("> 1000% YoY"); expect(c.guarantee).toBe(true);
    expect(viewsInMillions("~500 million views")).toBe(500); expect(viewsInMillions("1.2B views")).toBe(1200); expect(viewsInMillions(null)).toBeNull();
  });
  it("does not treat same-day captures as a time series", () => {
    const rows = [{ date: "2026-09-15", url: "a", viewsClaim: "300M views per month" }, { date: "2026-09-15", url: "b", viewsClaim: "500 million views" }].map((r) => ({ observedAt: "2026-09-15", source: "live-site" as const, creatorsClaim: null, teamSize: null, growthClaim: null, guarantee: null, tagline: null, ...r }));
    expect(hypothesisH8(rows, "now").verdict).not.toBe("supported");
    const dated = [...rows, { date: "2025-06-01", observedAt: "2026-09-15", source: "wayback" as const, url: "c", viewsClaim: "200M views", creatorsClaim: "300+ creators", teamSize: null, growthClaim: null, guarantee: null, tagline: null }];
    expect(hypothesisH8(dated, "now").verdict).toBe("supported");
  });
});

describe("fingerprint and insight", () => {
  it("scores a post that matches the nine highly and a Friday-night post low", () => {
    const hi = fingerprint({ postedAtUtc: "2025-11-10T13:50:42Z", text: "We raised $100M.\n\nToday we launch Sonic.", likes: 1000, replies: 150 });
    const lo = fingerprint({ postedAtUtc: "2025-11-14T23:30:00Z", text: "gm", likes: 10, replies: 9 });
    expect(hi.score).toBeGreaterThanOrEqual(5); expect(lo.score).toBeLessThanOrEqual(1);
  });
  it("generates the insight from the analysis without hand-typed numbers", () => {
    const ins = buildInsight(analysis as unknown as Analysis, launches as unknown as LaunchSeed[]);
    expect(ins.headline.length).toBeGreaterThan(40);
    expect(ins.support).toHaveLength(3);
    // Every integer in the headline must be traceable to the analysis file.
    const nums = Array.from(ins.headline.matchAll(/\b\d+\b/g)).map((m) => Number(m[0]));
    const blob = JSON.stringify(analysis);
    for (const n of nums) expect(blob.includes(String(n)) || n === Math.ceil(Math.max(...(analysis as unknown as Analysis).timing.map((t) => Math.abs(t.linkedinMinusXMin ?? 0))))).toBe(true);
  });
});
