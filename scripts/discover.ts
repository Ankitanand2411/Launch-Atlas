/**
 * Phase 1 — discover.
 * Crawls sociallcapital.com/work and every case page, caches raw HTML in data/raw/socap,
 * merges the parse over data/seed/launches.seed.json and writes data/derived/launches.json.
 *
 *   npm run discover            # live crawl (needs network to sociallcapital.com)
 *   npm run discover -- --offline   # use the hand-verified seed only
 */
import fs from "node:fs";
import path from "node:path";
import { parseCasePage, parseWorkIndex, mergeWithSeed } from "./lib/parse-case-page";
import type { LaunchSeed } from "@/lib/types";

const ROOT = process.cwd();
const SEED = path.join(ROOT, "data/seed/launches.seed.json");
const RAW = path.join(ROOT, "data/raw/socap");
const OUT = path.join(ROOT, "data/derived/launches.json");
const BASE = "https://www.sociallcapital.com";
const UA = "launch-atlas/0.1 (+public-data research; contact via repo)";

const offline = process.argv.includes("--offline");
const seed: LaunchSeed[] = JSON.parse(fs.readFileSync(SEED, "utf8"));

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function write(launches: LaunchSeed[]) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(launches, null, 2) + "\n");
  console.log(`wrote ${launches.length} launches → ${path.relative(ROOT, OUT)}`);
}

async function main() {
  if (offline) {
    console.log("offline: using data/seed/launches.seed.json");
    write(seed);
    return;
  }
  fs.mkdirSync(RAW, { recursive: true });
  const indexHtml = await get(`${BASE}/work`);
  fs.writeFileSync(path.join(RAW, "work.html"), indexHtml);
  const index = parseWorkIndex(indexHtml);
  console.log(`index: ${index.length} launches`);

  const launches: LaunchSeed[] = [];
  for (const item of index) {
    const url = `${BASE}/work/${item.slug}`;
    try {
      const html = await get(url);
      fs.writeFileSync(path.join(RAW, `${item.slug}.html`), html);
      const parsed = parseCasePage(html);
      const seedItem = seed.find((s) => s.slug === item.slug);
      const merged = mergeWithSeed(parsed, seedItem, item.slug, url);
      if (!merged.month || merged.month === "unknown") merged.month = item.month ?? "unknown";
      launches.push(merged);
      console.log(`  ${item.slug}: x=${!!parsed.xUrl} li=${!!parsed.linkedinUrl} video=${!!parsed.videoUrl} likes=${parsed.likesCompact ?? "-"} replies=${parsed.repliesCompact ?? "-"}`);
    } catch (err) {
      const seedItem = seed.find((s) => s.slug === item.slug);
      if (seedItem) {
        console.warn(`  ${item.slug}: fetch failed (${(err as Error).message}); using seed`);
        launches.push(seedItem);
      } else {
        console.warn(`  ${item.slug}: fetch failed and no seed; skipped`);
      }
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  // Seeds for launches that vanished from the index are kept, flagged.
  for (const s of seed) if (!launches.some((l) => l.slug === s.slug)) launches.push({ ...s, notes: `${s.notes ?? ""} Not on /work index at crawl time.`.trim() });
  write(launches);
}

main().catch((e) => { console.error(e); process.exit(1); });
