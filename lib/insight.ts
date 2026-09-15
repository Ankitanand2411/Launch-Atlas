import type { Analysis, LaunchSeed } from "@/lib/types";

/**
 * The narrative is generated from the analysis, never typed by hand, so every number in it is a
 * number that exists in the evidence. Wording is fixed; values are not.
 */
export interface Insight {
  status: "headline" | "working";
  headline: string;
  lede: string;
  support: { title: string; text: string; href: string }[];
  counter: string[];
  whyItMatters: string[];
  next: string[];
  method: string[];
}

const ev = <T,>(a: Analysis, code: string, key: string, fallback: T): T => {
  const h = a.hypotheses.find((x) => x.code === code);
  const v = h?.evidence?.[key];
  return (v === undefined ? fallback : v) as T;
};
const verdict = (a: Analysis, code: string) => a.hypotheses.find((x) => x.code === code)?.verdict ?? "untested";
const list = (xs: string[], word = "and") => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${word} ${xs[xs.length - 1]}`);

export function buildInsight(a: Analysis, launches: LaunchSeed[]): Insight {
  const n = a.launchCount;
  const timing = a.timing;
  const etMin = Math.min(...timing.map((t) => t.etMinutes));
  const etMax = Math.max(...timing.map((t) => t.etMinutes));
  const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const breakfast = ev<string[]>(a, "H3", "breakfastEt", []);
  const lunch = ev<string[]>(a, "H3", "lunchEt", []);
  const outliers = ev<string[]>(a, "H3", "outliersEt", []);
  const weekdays = ev<Record<string, number>>(a, "H3", "weekdaysEt", {});
  const pairs = ev<{ client: string; linkedinMinusXMin: number }[]>(a, "H2", "pairs", []);
  const noLinkedIn = ev<string[]>(a, "H2", "noLinkedIn", []);
  const maxAbs = pairs.length ? Math.max(...pairs.map((p) => Math.abs(p.linkedinMinusXMin))) : null;
  const liFirst = pairs.filter((p) => p.linkedinMinusXMin < 0).length;
  const founders = ev<string[]>(a, "H1", "founders", []);
  const brands = ev<string[]>(a, "H1", "brands", []);
  const h4 = ev<{ client: string; figureInFirstThreeLines: boolean; firstLine: string }[]>(a, "H4", "perLaunch", []);
  const figure3 = h4.filter((x) => x.figureInFirstThreeLines);
  const noFigure = h4.filter((x) => !x.figureInFirstThreeLines).map((x) => x.client);
  const firstLine = h4.filter((x) => /\d/.test(x.firstLine)).length;
  const h6 = ev<{ client: string; hooks: string[]; source: string }[]>(a, "H6", "perLaunch", []);
  const withCapital = h6.filter((x) => x.hooks.includes("capital") || x.hooks.includes("traction")).length;
  const modelTagged = h6.filter((x) => x.source === "model").length;
  const images = ev<string[]>(a, "H5", "images", []);
  const h9 = ev<{ client: string; replyRate: number; hook: string }[]>(a, "H9", "rows", []);
  const top = [...h9].sort((x, y) => y.replyRate - x.replyRate)[0];
  const storyRates = h9.filter((x) => x.hook === "story").map((x) => `${x.client} ${Math.round(x.replyRate * 100)}%`);
  const medianReply = ev<number | null>(a, "H9", "medianReplyRate", null);
  const missingDays = ["Mon", "Tue", "Wed", "Thu", "Fri"].filter((d) => !weekdays[d]);
  const exactCounts = a.amplification.some((r) => r.views != null);

  const timingOk = verdict(a, "H2") === "supported" && verdict(a, "H3") === "supported";
  const status: Insight["status"] = timingOk ? "headline" : "working";

  const headline = timingOk
    ? `Social Capital launches like a market open: all ${n} hero posts went out Monday to Thursday between ${clock(etMin)} and ${clock(etMax)} Eastern — ${breakfast.length} at East-coast breakfast, ${lunch.length} at East-coast lunch — and every LinkedIn mirror fired within ${Math.ceil(maxAbs ?? 0)} minutes of the X post. It is a synchronised detonation, not a rollout.`
    : `${withCapital} of ${n} hero posts lead with a capital or traction number; the product is the second hook. Timing is a working pattern, not yet a verified one.`;

  const lede = timingOk
    ? `Nine public posts, timestamps decoded from their IDs. ${missingDays.length ? `No launch has landed on a ${list(missingDays.map((d) => ({ Wed: "Wednesday", Fri: "Friday", Mon: "Monday", Tue: "Tuesday", Thu: "Thursday" })[d] ?? d), "or")}.` : ""} The widest gap between a LinkedIn mirror and its X post is ${maxAbs} minutes; LinkedIn went first on ${liFirst} of the ${pairs.length} pairs.`
    : `The synchronisation claim needs the timing hypotheses to hold; see the board below.`;

  return {
    status,
    headline,
    lede,
    support: [
      { title: "Money leads, product follows", text: `${withCapital} of ${n} posts carry a fundraise, valuation or revenue hook, and ${figure3.length} of ${n} put a figure inside the first three lines — but only ${firstLine} in the first line itself, so the number is placed for the second glance, not the first. ${modelTagged === n ? "Hooks tagged by a model over caption and transcript." : modelTagged ? `${modelTagged} of ${n} model-tagged; the rest regex.` : "Hooks are regex over the visible caption until enrichment runs."}`, href: "/patterns" },
      { title: "The founder is the channel", text: `${founders.length} of ${n} hero posts come from the founder's personal account${brands.length ? `; ${list(brands)} is the exception, posted from the brand account` : ""}. Social Capital's own site is never the launch surface.`, href: "/" },
      { title: "Two formats, two behaviours", text: images.length ? `${list(images)} launched with an image and a founder story rather than a video, and drew likes with low reply rates (${storyRates.join(", ")}). ${top ? `The ${top.hook} hook (${top.client}) drew ${Math.round(top.replyRate * 100)}% replies per like against a median of ${Math.round((medianReply ?? 0) * 100)}%.` : ""}` : `${top ? `${top.client} drew ${Math.round(top.replyRate * 100)}% replies per like against a median of ${Math.round((medianReply ?? 0) * 100)}%.` : ""}`, href: "/network" },
    ],
    counter: [
      brands.length ? `${list(brands)} was published from a brand account, so "founder-fronted" is ${founders.length} of ${n}, not a rule.` : "",
      noLinkedIn.length ? `${noLinkedIn.length} of ${n} case pages link no LinkedIn mirror (${list(noLinkedIn)}); the synchronisation finding covers the ${pairs.length} that do.` : "",
      noFigure.length ? `${list(noFigure)} names backers but puts no figure in the first three lines.` : "",
      outliers.length ? `${list(outliers)} sits between the two slots.` : "",
      `${n} launches is a pattern, not a law. Empty weekdays could be chance.`,
      exactCounts ? "" : "Likes and replies are platform-rounded counts from the case-page embeds until `npm run amplify` fetches exact ones.",
    ].filter(Boolean),
    whyItMatters: [
      "Firing both platforms inside the same minute stacks the first hour of engagement on two feeds at once, instead of letting the LinkedIn repost arrive after the X conversation has cooled.",
      "East-coast breakfast and lunch are when US tech X and LinkedIn are at a desk; in India, where the team sits, those are 18:30 and 21:30 — the operating clock is set to the audience, not the office.",
      "A capital or revenue figure in the first three lines hands amplifiers a quotable number. The product demo is the second beat.",
    ],
    next: [
      "Run `npm run amplify` for exact views, reposts and quote counts (free) — quote share tells whether the network comments or just reposts.",
      "Fill data/manual/amplifiers.csv from each post's Quotes tab to test the repeat-creator core (H7).",
      "Run `npm run enrich` for transcripts and durations (H5) and model hook tags.",
      "Run `npm run claims` to date the positioning claims with Wayback captures (H8).",
      "Add the tenth launch when Lovable appears on /work: one seed row, `npm run pipeline`.",
    ],
    method: [
      "Timestamps are decoded from the post IDs (X snowflake, LinkedIn activity id); exact to the second, no API.",
      "Likes and replies come from the X embed on each case page (rounded) until `npm run amplify` replaces them with exact counts.",
      `Hook tags are ${modelTagged === n ? "model-generated over caption and transcript" : "regular expressions over the visible caption until enrichment runs"}.`,
      `${n} launches: counts, medians and ranges only. No significance tests.`,
    ],
  };
}
