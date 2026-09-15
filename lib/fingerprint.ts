import { weekday, minutesOfDay } from "@/lib/time";
import { regexTags } from "@/lib/enrich/tags";
import { replyRate } from "@/lib/metrics";

export interface FingerprintCheck { label: string; pass: boolean | null; detail: string }
export interface Fingerprint { score: number; max: number; checks: FingerprintCheck[] }

/** How closely a launch post matches the pattern read off the nine. Playful, not a classifier. */
export function fingerprint(input: { postedAtUtc: string; text: string; likes: number | null; replies: number | null; brandAccount?: boolean | null }): Fingerprint {
  const d = new Date(input.postedAtUtc);
  const day = weekday(d, "et");
  const min = minutesOfDay(d, "et");
  const tags = regexTags(input.text ?? "");
  const rr = replyRate(input.replies, input.likes);
  const checks: FingerprintCheck[] = [
    { label: "Monday to Thursday", pass: ["Mon", "Tue", "Wed", "Thu"].includes(day), detail: `${day} in US Eastern` },
    { label: "08:00–13:30 Eastern", pass: min >= 8 * 60 && min <= 13 * 60 + 30, detail: `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")} ET` },
    { label: "Figure in the first three lines", pass: tags.figureInFirstThreeLines, detail: tags.capitalFigures.length ? tags.capitalFigures.slice(0, 3).join("; ") : "none found" },
    { label: "Capital or traction hook", pass: tags.hooks.includes("capital") || tags.hooks.includes("traction"), detail: tags.hooks.join(", ") },
    { label: "Two or more hooks", pass: tags.hooks.filter((h) => h !== "other").length >= 2, detail: `${tags.hooks.filter((h) => h !== "other").length} hooks, leads with ${tags.primaryHook}` },
    { label: "Reply rate in the 5–45% band", pass: rr == null ? null : rr >= 0.05 && rr <= 0.45, detail: rr == null ? "no counts" : `${Math.round(rr * 100)}% replies per like` },
    { label: "Personal account, not brand", pass: input.brandAccount == null ? null : !input.brandAccount, detail: input.brandAccount == null ? "unknown" : input.brandAccount ? "brand account" : "personal account" },
  ];
  const scored = checks.filter((c) => c.pass != null);
  return { score: scored.filter((c) => c.pass).length, max: scored.length, checks };
}
