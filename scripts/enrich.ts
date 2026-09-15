/**
 * Phase 2 — enrich.
 * For each launch: download the hero video, probe it, sample frames, transcribe (Groq Whisper),
 * and tag hooks with a model over caption + transcript. Writes data/derived/enrichment.json.
 * Every step caches under data/raw and is skipped when its artifact exists.
 *
 *   npm run enrich                       # full run; needs GROQ_API_KEY (and/or ANTHROPIC_API_KEY)
 *   npm run enrich -- --only gamma       # one launch
 *   npm run enrich -- --dry-run          # no network: probe/transcribe skipped, regex tags, valid output file
 *   flags: --skip-download --skip-transcribe --skip-tag --vision (send frames to Anthropic for founderOnCamera)
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parseFfprobe } from "@/lib/enrich/ffprobe";
import { regexTags, validateTags, extractJson, TAGGING_SYSTEM } from "@/lib/enrich/tags";
import { transcribeWithGroq, chatJsonWithGroq, chatJsonWithAnthropic, pickProvider } from "@/lib/enrich/providers";
import { parseXStatus } from "@/lib/decode";
import type { Enrichment, HookTags, LaunchSeed, Transcript, VideoProbe } from "@/lib/types";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const DRY = flag("--dry-run");
const FRAME_TIMES = [0.5, 3, 10];

const launches: LaunchSeed[] = JSON.parse(fs.readFileSync(path.join(ROOT, "data/derived/launches.json"), "utf8"));
const outPath = path.join(ROOT, "data/derived/enrichment.json");
const previous: Enrichment[] = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : [];
for (const d of ["data/raw/videos", "data/raw/transcripts", "data/raw/tags", "public/frames"]) fs.mkdirSync(path.join(ROOT, d), { recursive: true });

function loadOverrideText(xUrl: string): string | null {
  const x = parseXStatus(xUrl);
  if (!x) return null;
  const file = path.join(ROOT, "data/overrides/x", `${x.id}.json`);
  if (!fs.existsSync(file)) return null;
  const o = JSON.parse(fs.readFileSync(file, "utf8")) as { text?: string };
  return o.text?.trim() || null;
}

async function download(url: string, dest: string, notes: string[]): Promise<boolean> {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return true;
  if (DRY || flag("--skip-download")) { notes.push("video not downloaded (dry run or --skip-download)"); return false; }
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 launch-atlas/0.1" } });
  if (!res.ok) { notes.push(`video download failed: HTTP ${res.status}`); return false; }
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return true;
}

function probe(file: string, url: string): VideoProbe {
  const json = execFileSync("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", file], { encoding: "utf8" });
  return parseFfprobe(json, url);
}

function frames(file: string, slug: string, durationS: number): string[] {
  const out: string[] = [];
  for (const t of FRAME_TIMES) {
    if (t >= durationS) continue;
    const dest = path.join(ROOT, "public/frames", `${slug}-${t}.jpg`);
    if (!fs.existsSync(dest)) execFileSync("ffmpeg", ["-v", "quiet", "-y", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "4", dest]);
    out.push(`/frames/${slug}-${t}.jpg`);
  }
  return out;
}

async function transcribe(file: string, slug: string, notes: string[]): Promise<Transcript | null> {
  const cache = path.join(ROOT, "data/raw/transcripts", `${slug}.json`);
  if (fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, "utf8"));
  if (DRY || flag("--skip-transcribe")) { notes.push("not transcribed (dry run or --skip-transcribe)"); return null; }
  const t = await transcribeWithGroq(file);
  fs.writeFileSync(cache, JSON.stringify(t, null, 2));
  return t;
}

async function tag(l: LaunchSeed, caption: string, captionIsFull: boolean, transcript: Transcript | null, framePaths: string[], notes: string[]): Promise<HookTags> {
  const cache = path.join(ROOT, "data/raw/tags", `${l.slug}.json`);
  if (fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, "utf8"));
  if (DRY || flag("--skip-tag")) { notes.push("hooks tagged by regex (dry run or --skip-tag)"); return regexTags(caption); }
  const provider = pickProvider();
  const user = [
    `Client: ${l.client}. Posted by ${l.authorType === "brand" ? "the brand account" : "the founder"} @${l.authorHandle}. Media: ${l.mediaType}.`,
    `Caption (${captionIsFull ? "full" : "excerpt, truncated at 'Show more'"}):\n"""\n${caption}\n"""`,
    transcript ? `Video transcript (${transcript.model}):\n"""\n${transcript.text.slice(0, 6000)}\n"""` : "No transcript available.",
    framePaths.length ? "Three frames from the video are attached (0.5 s, 3 s, 10 s). Set founderOnCamera from them." : "No frames attached; founderOnCamera must be null.",
  ].join("\n\n");
  for (let attempt = 1; attempt <= 2; attempt++) {
    const reply = provider === "anthropic" ? await chatJsonWithAnthropic(TAGGING_SYSTEM, user, framePaths) : await chatJsonWithGroq(TAGGING_SYSTEM, user);
    try {
      const v = validateTags(extractJson(reply.text), reply.model);
      if (v.ok) { fs.writeFileSync(cache, JSON.stringify(v.tags, null, 2)); return v.tags; }
      notes.push(`tag attempt ${attempt} rejected: ${v.problems.join("; ")}`);
    } catch (e) { notes.push(`tag attempt ${attempt} unparsable: ${(e as Error).message}`); }
  }
  notes.push("model tagging failed twice; regex fallback used");
  return regexTags(caption);
}

async function main() {
  const results: Enrichment[] = [];
  for (const l of launches) {
    if (only && l.slug !== only) { const prev = previous.find((p) => p.slug === l.slug); if (prev) results.push(prev); continue; }
    const notes: string[] = [];
    const fullText = loadOverrideText(l.xUrl);
    const caption = fullText ?? l.captionExcerpt;
    let video: VideoProbe | null = null;
    let framePaths: string[] = [];
    let framePublic: string[] = [];
    let transcript: Transcript | null = null;

    if (l.videoUrl) {
      const file = path.join(ROOT, "data/raw/videos", `${l.slug}.mp4`);
      if (await download(l.videoUrl, file, notes)) {
        try { video = probe(file, l.videoUrl); } catch (e) { notes.push(`ffprobe failed: ${(e as Error).message}`); }
        if (video) {
          try { framePublic = frames(file, l.slug, video.durationS); framePaths = framePublic.map((p) => path.join(ROOT, "public", p)); } catch (e) { notes.push(`frames failed: ${(e as Error).message}`); }
          if (video.hasAudio) { try { transcript = await transcribe(file, l.slug, notes); } catch (e) { notes.push(`transcription failed: ${(e as Error).message}`); } }
          else notes.push("video has no audio track; nothing to transcribe");
        }
      }
    } else notes.push(`no video: ${l.mediaType}-led post`);

    const tags = await tag(l, caption, fullText != null || !l.captionTruncated, transcript, flag("--vision") ? framePaths : [], notes);
    results.push({ slug: l.slug, video, frames: framePublic, transcript, tags, fullText, enrichedAt: new Date().toISOString(), notes });
    console.log(`${l.slug.padEnd(12)} video=${video ? `${video.durationS}s ${video.width}x${video.height}` : "—"}  transcript=${transcript ? `${transcript.text.split(/\s+/).length}w` : "—"}  tags=${tags.source}:${tags.primaryHook}[${tags.hooks.join(",")}]${notes.length ? `  (${notes.length} note${notes.length > 1 ? "s" : ""})` : ""}`);
  }
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2) + "\n");
  console.log(`\nwrote ${path.relative(ROOT, outPath)} (${results.length} launches)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
