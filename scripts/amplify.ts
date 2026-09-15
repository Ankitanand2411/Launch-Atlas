/**
 * Stretch — amplify (free sources only).
 * For each launch: exact X counts, full text, follower count and best video variant via FxTwitter,
 * falling back to the X syndication endpoint; LinkedIn public page counts where the page renders them;
 * plus the manual roster in data/manual/amplifiers.csv. Writes data/derived/amplification.json.
 *
 *   npm run amplify                # live (no keys; unofficial endpoints, so a miss is recorded, never fatal)
 *   npm run amplify -- --offline   # write the file from caches/overrides only
 *   npm run amplify -- --only gamma
 */
import fs from "node:fs";
import path from "node:path";
import { parseXStatus, parseLinkedInActivityId } from "@/lib/decode";
import { fxUrl, parseFxTwitter } from "@/lib/amplify/fxtwitter";
import { syndicationUrl, parseSyndication } from "@/lib/amplify/syndication";
import { parseLinkedInPublic } from "@/lib/amplify/linkedin";
import { isoNoMs } from "@/lib/time";
import type { AmplificationRecord, LaunchSeed, LinkedInPostMetrics, XPostMetrics } from "@/lib/types";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const OFFLINE = args.includes("--offline");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const UA = "Mozilla/5.0 (compatible; launch-atlas/0.1; public-data research)";
const launches: LaunchSeed[] = JSON.parse(fs.readFileSync(path.join(ROOT, "data/derived/launches.json"), "utf8"));
const OUT = path.join(ROOT, "data/derived/amplification.json");
const previous: AmplificationRecord[] = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : [];
for (const d of ["data/raw/x", "data/raw/linkedin"]) fs.mkdirSync(path.join(ROOT, d), { recursive: true });

const readJson = <T,>(file: string): T | null => (fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as T) : null);

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function xMetrics(id: string, notes: string[]): Promise<XPostMetrics | null> {
  const cache = path.join(ROOT, "data/raw/x", `${id}.json`);
  const cached = readJson<XPostMetrics>(cache);
  if (cached) return cached;
  if (OFFLINE) { notes.push("X counts: offline, no cache"); return null; }
  try {
    const m = parseFxTwitter(await getJson(fxUrl(id)), id);
    fs.writeFileSync(cache, JSON.stringify(m, null, 2));
    return m;
  } catch (e) { notes.push(`fxtwitter failed: ${(e as Error).message}`); }
  try {
    const m = parseSyndication(await getJson(syndicationUrl(id)), id);
    fs.writeFileSync(cache, JSON.stringify(m, null, 2));
    notes.push("X counts from syndication endpoint: no views or reposts available");
    return m;
  } catch (e) { notes.push(`syndication failed: ${(e as Error).message}`); }
  return null;
}

async function linkedinMetrics(url: string, notes: string[]): Promise<LinkedInPostMetrics | null> {
  const id = parseLinkedInActivityId(url);
  if (!id) return null;
  const override = readJson<Partial<LinkedInPostMetrics> & { likes?: number; replies?: number; reposts?: number; text?: string }>(path.join(ROOT, "data/overrides/linkedin", `${id}.json`));
  if (override) {
    return { activityId: id, url, text: override.text ?? null, reactions: override.reactions ?? override.likes ?? null, comments: override.comments ?? override.replies ?? null, reposts: override.reposts ?? null, source: "override", fetchedAt: override.fetchedAt ?? isoNoMs(new Date()) };
  }
  const cache = path.join(ROOT, "data/raw/linkedin", `${id}.html`);
  let html = fs.existsSync(cache) ? fs.readFileSync(cache, "utf8") : null;
  if (!html) {
    if (OFFLINE) { notes.push("LinkedIn counts: offline, no cache or override"); return null; }
    try {
      const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "follow" });
      html = await res.text();
      if (!res.ok) notes.push(`LinkedIn page HTTP ${res.status}`);
      fs.writeFileSync(cache, html);
    } catch (e) { notes.push(`LinkedIn fetch failed: ${(e as Error).message}`); return null; }
  }
  const m = parseLinkedInPublic(html, id, url);
  if (m.note) notes.push(`LinkedIn: ${m.note}`);
  return m;
}

async function main() {
  const out: AmplificationRecord[] = [];
  for (const l of launches) {
    if (only && l.slug !== only) { const prev = previous.find((p) => p.slug === l.slug); if (prev) out.push(prev); continue; }
    const notes: string[] = [];
    const x = parseXStatus(l.xUrl);
    const xm = x ? await xMetrics(x.id, notes) : null;
    const lm = l.linkedinUrl ? await linkedinMetrics(l.linkedinUrl, notes) : null;
    out.push({ slug: l.slug, x: xm, linkedin: lm, notes });
    console.log(`${l.slug.padEnd(12)} x=${xm ? `${xm.source} views=${xm.views ?? "—"} likes=${xm.likes ?? "—"} reposts=${xm.reposts ?? "—"} quotes=${xm.quotes ?? "—"} replies=${xm.replies ?? "—"} followers=${xm.authorFollowers ?? "—"}` : "—"}  li=${lm ? `${lm.reactions ?? "—"}/${lm.comments ?? "—"}` : "—"}${notes.length ? `  (${notes.join("; ")})` : ""}`);
    if (!OFFLINE) await new Promise((r) => setTimeout(r, 600));
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nwrote ${path.relative(ROOT, OUT)} (${out.length} launches)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
