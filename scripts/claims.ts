/**
 * Bonus — claims (free, official).
 * Lists Wayback Machine captures of sociallcapital.com (CDX API), fetches each distinct capture,
 * extracts the recurring claims (views, creators, team size, growth, guarantee, tagline) and merges
 * them with data/seed/claims.seed.json. Writes data/derived/claims.json.
 *
 *   npm run claims                 # live: CDX + captures (cached under data/raw/wayback)
 *   npm run claims -- --offline    # seed only
 */
import fs from "node:fs";
import path from "node:path";
import { extractClaims } from "@/lib/analyze/claims";
import type { ClaimRow } from "@/lib/types";

const ROOT = process.cwd();
const OFFLINE = process.argv.includes("--offline");
const SEED: ClaimRow[] = JSON.parse(fs.readFileSync(path.join(ROOT, "data/seed/claims.seed.json"), "utf8"));
const OUT = path.join(ROOT, "data/derived/claims.json");
const RAW = path.join(ROOT, "data/raw/wayback");
const PAGES = ["sociallcapital.com/", "sociallcapital.com/work"];
const today = new Date().toISOString().slice(0, 10);
fs.mkdirSync(RAW, { recursive: true });

async function cdx(page: string): Promise<Array<{ ts: string; original: string }>> {
  const url = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(page)}&output=json&fl=timestamp,original,digest,statuscode&filter=statuscode:200&collapse=digest`;
  const res = await fetch(url, { headers: { "user-agent": "launch-atlas/0.1" } });
  if (!res.ok) throw new Error(`CDX HTTP ${res.status}`);
  const rows = (await res.json()) as string[][];
  return rows.slice(1).map((r) => ({ ts: r[0], original: r[1] }));
}

async function capture(ts: string, original: string): Promise<string> {
  const file = path.join(RAW, `${ts}-${original.replace(/[^a-z0-9]+/gi, "_")}.html`);
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  const res = await fetch(`https://web.archive.org/web/${ts}id_/${original}`, { headers: { "user-agent": "launch-atlas/0.1" } });
  if (!res.ok) throw new Error(`capture HTTP ${res.status}`);
  const html = await res.text();
  fs.writeFileSync(file, html);
  return html;
}

async function main() {
  const rows: ClaimRow[] = [...SEED];
  if (!OFFLINE) {
    for (const page of PAGES) {
      let list: Array<{ ts: string; original: string }> = [];
      try { list = await cdx(page); console.log(`${page}: ${list.length} distinct captures`); } catch (e) { console.warn(`${page}: CDX failed (${(e as Error).message})`); continue; }
      for (const { ts, original } of list) {
        const date = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
        try {
          const html = await capture(ts, original);
          const c = extractClaims(html, `https://web.archive.org/web/${ts}/${original}`, date, "wayback", today);
          if (c.viewsClaim || c.creatorsClaim || c.tagline) rows.push(c);
          console.log(`  ${date} views=${c.viewsClaim ?? "—"} creators=${c.creatorsClaim ?? "—"} guarantee=${c.guarantee}`);
        } catch (e) { console.warn(`  ${date}: ${(e as Error).message}`); }
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  } else console.log("offline: seed only");
  // Sort dated first (ascending), then undated by source.
  rows.sort((a, b) => (a.date && b.date ? a.date.localeCompare(b.date) : a.date ? -1 : b.date ? 1 : a.source.localeCompare(b.source)));
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 2) + "\n");
  console.log(`wrote ${path.relative(ROOT, OUT)} (${rows.length} rows)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
