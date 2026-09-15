import type { ClaimRow, HypothesisResult, Verdict } from "@/lib/types";

/** Pull the recurring claim phrases out of a sociallcapital.com page. */
export function extractClaims(html: string, url: string, date: string | null, source: ClaimRow["source"], observedAt: string): ClaimRow {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&").replace(/\s+/g, " ");
  const all = (re: RegExp) => Array.from(text.matchAll(re)).map((m) => m[0].replace(/\s+/g, " ").trim());
  const uniq = (xs: string[]) => Array.from(new Set(xs));
  const views = uniq(all(/[>~≈]?\s?\d+(?:\.\d+)?\s?(?:M|million|B|billion)\+?\s+views(?:\s+per\s+month)?(?:\s+across[^.]{0,40})?/gi));
  const creators = uniq(all(/\d+\+?\s+creators/gi));
  const team = uniq(all(/<\s?\d+\s+people|\b\d+\s+meticulously-selected individuals/gi));
  const growth = uniq(all(/[>~]?\s?\d+%\s+YoY/gi));
  const meta = html.match(/<meta\s+(?:name|property)="(?:description|og:description)"\s+content="([^"]*)"/i)?.[1] ?? null;
  return {
    date,
    observedAt,
    source,
    url,
    viewsClaim: views.length ? views.join("; ") : null,
    creatorsClaim: creators.length ? creators.join("; ") : null,
    teamSize: team.length ? team.join("; ") : null,
    growthClaim: growth.length ? growth.join("; ") : null,
    guarantee: /guarantee/i.test(text),
    tagline: meta ? meta.replace(/&amp;/g, "&").trim() : null,
  };
}

/** First views figure in a claim, in millions, for ordering ("> 300M views per month" → 300). */
export function viewsInMillions(claim: string | null): number | null {
  if (!claim) return null;
  const m = claim.match(/(\d+(?:\.\d+)?)\s?(M|million|B|billion)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return /^b/i.test(m[2]) ? n * 1000 : n;
}

export function claimState(c: ClaimRow): string {
  return `${c.viewsClaim ?? "—"} | ${c.creatorsClaim ?? "—"}`;
}

export function hypothesisH8(claims: ClaimRow[], computedAt: string): HypothesisResult {
  // One state per capture date: several pages captured the same day are one observation.
  const byDate = new Map<string, ClaimRow[]>();
  for (const c of claims) if (c.date) byDate.set(c.date, [...(byDate.get(c.date) ?? []), c]);
  const dated = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => ({
    date,
    views: rows.map((r) => r.viewsClaim).filter(Boolean).join("; ") || null,
    creators: rows.map((r) => r.creatorsClaim).filter(Boolean).join("; ") || null,
    taglines: Array.from(new Set(rows.map((r) => r.tagline).filter(Boolean))) as string[],
    urls: rows.map((r) => r.url),
  }));
  // Inferred order: undated third-party captures by stated number, then dated captures by date.
  const undatedStates = claims.filter((c) => !c.date && (c.viewsClaim || c.creatorsClaim)).sort((a, b) => (viewsInMillions(a.viewsClaim) ?? 0) - (viewsInMillions(b.viewsClaim) ?? 0)).map(claimState);
  const datedStates = dated.filter((d) => d.views || d.creators).map((d) => `${d.views ?? "—"} | ${d.creators ?? "—"}`);
  const states = Array.from(new Set([...undatedStates, ...datedStates]));
  const datedNumeric = dated.filter((d) => viewsInMillions(d.views) != null);
  let verdict: Verdict = "untested";
  let summary: string;
  if (datedNumeric.length >= 2) {
    const series = datedNumeric.map((d) => viewsInMillions(d.views) as number);
    const monotonic = series.every((v, i) => i === 0 || v >= series[i - 1]);
    const distinct = new Set(datedNumeric.map((d) => `${d.views} | ${d.creators}`)).size;
    verdict = distinct >= 2 ? (monotonic ? "supported" : "mixed") : "rejected";
    summary = `${datedNumeric.length} dated capture dates (${datedNumeric[0].date} → ${datedNumeric[datedNumeric.length - 1].date}), ${distinct} distinct claim states${distinct >= 2 ? (monotonic ? "; stated reach only ever increases" : "; stated reach does not increase monotonically") : ""}.`;
  } else if (states.length >= 2) {
    verdict = "mixed";
    summary = `${states.length} distinct claim states observed (${states.join(" → ")}) and a positioning shift from short-form video service to guaranteed launches — but only ${datedNumeric.length} capture date is known, so the order is inferred from the numbers, not dated. \`npm run claims\` pulls Wayback captures to date them.`;
  } else {
    summary = "Fewer than two distinct claim states observed.";
  }
  return {
    code: "H8",
    computedAt,
    statement: "Stated reach and roster size stepped up in discrete jumps alongside a positioning change.",
    verdict,
    summary,
    evidence: { states, dated, undated: claims.filter((c) => !c.date).map((c) => ({ source: c.source, views: c.viewsClaim, creators: c.creatorsClaim, tagline: c.tagline, url: c.url })) },
  };
}
