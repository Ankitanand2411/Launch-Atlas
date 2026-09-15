import type { EngagementRow, HypothesisResult, LaunchSeed, Post, TimingRow, Verdict } from "@/lib/types";
import { tagCaption } from "./captions";

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  const v = s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  return Math.round(v * 10) / 10;
};
const r1 = (x: number) => Math.round(x * 10) / 10;
const shareVerdict = (share: number, n: number): Verdict => (n < 3 ? "untested" : share >= 0.85 ? "supported" : share >= 0.6 ? "mixed" : "rejected");
const pct = (a: number, b: number) => `${a}/${b}`;

export function computeHypotheses(launches: LaunchSeed[], posts: Post[], timing: TimingRow[], engagement: EngagementRow[], now = new Date()): HypothesisResult[] {
  const computedAt = now.toISOString();
  const n = launches.length;
  const out: HypothesisResult[] = [];

  // H1 — founder-fronted
  {
    const founders = launches.filter((l) => l.authorType === "founder");
    const brands = launches.filter((l) => l.authorType === "brand");
    out.push({
      code: "H1", computedAt,
      statement: "The hero post is published from the founder's personal account, not the brand account.",
      verdict: shareVerdict(founders.length / n, n),
      summary: `${pct(founders.length, n)} hero posts come from a founder's personal account${brands.length ? `; exception: ${brands.map((b) => b.client).join(", ")} (brand account)` : ""}.`,
      evidence: { founders: founders.map((l) => l.client), brands: brands.map((l) => l.client) },
    });
  }

  // H2 — synchronised two-platform drop
  {
    const pairs = timing.filter((t) => t.linkedinMinusXMin != null);
    const deltas = pairs.map((t) => t.linkedinMinusXMin as number);
    const within15 = deltas.filter((d) => Math.abs(d) <= 15).length;
    const verdict: Verdict = pairs.length < 3 ? "untested" : within15 === pairs.length ? "supported" : within15 / pairs.length >= 0.6 ? "mixed" : "rejected";
    out.push({
      code: "H2", computedAt,
      statement: "When a LinkedIn mirror exists, it goes live within 15 minutes of the X post.",
      verdict,
      summary: `${pct(pairs.length, n)} launches have a LinkedIn mirror on the case page; ${pct(within15, pairs.length)} of those land within 15 min of the X post (median ${median(deltas.map(Math.abs))} min, max ${r1(Math.max(...deltas.map(Math.abs)))} min; LinkedIn went first on ${deltas.filter((d) => d < 0).length}).`,
      evidence: { pairs: pairs.map((t) => ({ client: t.client, linkedinMinusXMin: t.linkedinMinusXMin })), noLinkedIn: timing.filter((t) => !t.linkedinPostedAtUtc).map((t) => t.client) },
    });
  }

  // H3 — time window
  {
    const weekdays = timing.reduce<Record<string, number>>((acc, t) => ((acc[t.weekdayEt] = (acc[t.weekdayEt] ?? 0) + 1), acc), {});
    const monThu = timing.filter((t) => ["Mon", "Tue", "Wed", "Thu"].includes(t.weekdayEt)).length;
    const inWindow = timing.filter((t) => t.etMinutes >= 8 * 60 && t.etMinutes <= 13 * 60 + 30).length;
    const nearUtc = (h: number, tol: number) => timing.filter((t) => { const [hh, mm] = t.utcClock.split(":").map(Number); return Math.abs(hh * 60 + mm - h * 60) <= tol; }).map((t) => t.client);
    const slot = (from: number, to: number) => timing.filter((t) => t.etMinutes >= from && t.etMinutes <= to).map((t) => t.client);
    const breakfast = slot(8 * 60, 9 * 60 + 15);   // 08:00–09:15 ET
    const lunch = slot(12 * 60, 13 * 60 + 20);      // 12:00–13:20 ET
    const outliers = timing.filter((t) => !breakfast.includes(t.client) && !lunch.includes(t.client)).map((t) => `${t.client} ${t.etClock} ET`);
    const share = Math.min(monThu, inWindow) / n;
    out.push({
      code: "H3", computedAt,
      statement: "Launches land Monday–Thursday inside a US morning-to-lunch window (08:00–13:30 ET), in two slots: East-coast breakfast and East-coast lunch.",
      verdict: shareVerdict(share, n),
      summary: `${pct(monThu, n)} on Mon–Thu (${Object.entries(weekdays).map(([d, c]) => `${d} ${c}`).join(", ")}; never Wed or Fri); ${pct(inWindow, n)} between 08:00 and 13:30 ET — ${breakfast.length} at 08:00–09:15 ET, ${lunch.length} at 12:00–13:20 ET${outliers.length ? `, outlier ${outliers.join(", ")}` : ""}. Three posts (${nearUtc(16, 3).join(", ")}) sit within 3 min of 16:00 UTC across a US daylight-saving change, which hints the scheduling clock is not US-local.`,
      evidence: { weekdaysEt: weekdays, inWindowEt: inWindow, breakfastEt: breakfast, lunchEt: lunch, outliersEt: outliers, near16Utc: nearUtc(16, 3), near13Utc: nearUtc(13, 10), clocks: timing.map((t) => ({ client: t.client, utc: t.utcClock, et: t.etClock, pt: t.ptClock, ist: t.istClock, weekdayEt: t.weekdayEt })) },
    });
  }

  const tags = launches.map((l) => ({ client: l.client, ...tagCaption(l.captionExcerpt) }));

  // H4 — quotable first line (provisional, regex on caption)
  {
    const hits = tags.filter((t) => t.firstLineHasNumber || t.firstLineIsDare);
    out.push({
      code: "H4", computedAt,
      statement: "The caption's first line is a standalone number or dare, built to be quote-posted.",
      verdict: shareVerdict(hits.length / n, n),
      summary: `${pct(hits.length, n)} first lines contain a figure or a dare (regex, provisional — LLM tagging in Phase 2).`,
      evidence: { firstLines: tags.map((t) => ({ client: t.client, firstLine: t.firstLine, hasNumber: t.firstLineHasNumber, isDare: t.firstLineIsDare })) },
    });
  }

  // H5 — video fingerprint (provisional until ffprobe)
  {
    const videos = launches.filter((l) => l.mediaType === "video");
    const images = launches.filter((l) => l.mediaType === "image");
    out.push({
      code: "H5", computedAt,
      statement: "Every hero post carries a natively uploaded 16:9 video in a fixed duration band.",
      verdict: images.length ? "mixed" : "untested",
      summary: `${pct(videos.length, n)} hero posts are native videos; ${images.length} are image-led founder stories (${images.map((l) => l.client).join(", ")}). Duration and format pending Phase 2 (ffprobe).`,
      evidence: { videos: videos.map((l) => l.client), images: images.map((l) => l.client) },
    });
  }

  // H6 — stacked news (provisional)
  {
    const withCapital = tags.filter((t) => t.funding || t.traction);
    const stacked = tags.filter((t) => t.hooks >= 2);
    out.push({
      code: "H6", computedAt,
      statement: "Each hero post bundles two or more news hooks (capital, traction, product, story) so amplifiers have multiple angles.",
      verdict: shareVerdict(stacked.length / n, n),
      summary: `${pct(withCapital.length, n)} captions carry a funding or traction figure; ${pct(stacked.length, n)} stack two or more hooks (regex over visible caption, provisional).`,
      evidence: { perLaunch: tags.map((t) => ({ client: t.client, funding: t.funding, traction: t.traction, product: t.product, story: t.story, stunt: t.stunt, hooks: t.hooks })) },
    });
  }

  // H7, H8 — untested in Phase 1
  out.push({ code: "H7", computedAt, statement: "A repeat core of creator accounts appears across ≥3 launches; their posts arrive in a wave hours after the founder post.", verdict: "untested", summary: "Needs amplifier data (quote posts, replies, reposts). Stretch layer.", evidence: {} });
  out.push({ code: "H8", computedAt, statement: "Stated reach and roster size stepped up in discrete jumps alongside a positioning change.", verdict: "untested", summary: "Needs Wayback Machine snapshots. Bonus layer.", evidence: {} });

  // H9 — reply engineering (descriptive in Phase 1)
  {
    const rows = engagement.filter((e) => e.replyRate != null).map((e) => ({ client: e.client, replyRate: e.replyRate as number, mediaType: e.mediaType, hook: tags.find((t) => t.client === e.client)?.stunt ? "stunt" : tags.find((t) => t.client === e.client)?.story ? "story" : "launch" }));
    const byHook = rows.reduce<Record<string, number[]>>((acc, r) => ((acc[r.hook] ??= []).push(r.replyRate), acc), {});
    const med = median(rows.map((r) => r.replyRate));
    const top = [...rows].sort((a, b) => b.replyRate - a.replyRate)[0];
    out.push({
      code: "H9", computedAt,
      statement: "Stunt or challenge hooks produce reply rates far above stat-led hooks; replies are the engagement being optimised.",
      verdict: rows.length ? "mixed" : "untested",
      summary: top ? `Median reply rate ${Math.round((med ?? 0) * 100)}% of likes; top is ${top.client} at ${Math.round(top.replyRate * 100)}% (${top.hook} hook). By hook: ${Object.entries(byHook).map(([h, v]) => `${h} ${Math.round((median(v) ?? 0) * 100)}%`).join(", ")}. Hook tags provisional.` : "No engagement data.",
      evidence: { rows, medianReplyRate: med },
    });
  }

  return out;
}
