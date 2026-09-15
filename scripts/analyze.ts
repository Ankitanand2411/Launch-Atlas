/**
 * Phase 1 — analyze.
 * Reads data/derived/launches.json, decodes timestamps from IDs, applies overrides,
 * computes timing, engagement and hypothesis verdicts, and writes
 * data/derived/posts.json and data/derived/analysis.json.
 */
import fs from "node:fs";
import path from "node:path";
import { buildPosts } from "@/lib/analyze/build-posts";
import { buildTiming } from "@/lib/analyze/timing";
import { buildEngagement } from "@/lib/analyze/engagement";
import { computeHypotheses } from "@/lib/analyze/hypotheses";
import type { Analysis, LaunchSeed } from "@/lib/types";

const ROOT = process.cwd();
const IN = path.join(ROOT, "data/derived/launches.json");
const launches: LaunchSeed[] = JSON.parse(fs.readFileSync(IN, "utf8"));

const posts = buildPosts(launches, ROOT);
const timing = buildTiming(launches, posts);
const engagement = buildEngagement(launches, posts);
const hypotheses = computeHypotheses(launches, posts, timing, engagement);

const analysis: Analysis = { generatedAt: new Date().toISOString(), launchCount: launches.length, timing, engagement, hypotheses };
fs.writeFileSync(path.join(ROOT, "data/derived/posts.json"), JSON.stringify(posts, null, 2) + "\n");
fs.writeFileSync(path.join(ROOT, "data/derived/analysis.json"), JSON.stringify(analysis, null, 2) + "\n");

console.log("\nTiming (X hero post; LinkedIn delta where a mirror exists)");
console.table(timing.map((t) => ({ client: t.client, date: t.xPostedAtUtc.slice(0, 10), dow: t.weekdayEt, utc: t.utcClock, et: t.etClock, pt: t.ptClock, ist: t.istClock, "li−x min": t.linkedinMinusXMin ?? "—" })));
console.log("Engagement");
console.table(engagement.map((e) => ({ client: e.client, likes: e.likes, replies: e.replies, "reply/like": e.replyRate != null ? `${Math.round(e.replyRate * 100)}%` : "—", media: e.mediaType, author: e.authorType })));
console.log("Hypotheses");
for (const h of hypotheses) console.log(`${h.code} ${h.verdict.padEnd(9)} ${h.summary}`);
console.log(`\nwrote data/derived/posts.json (${posts.length} posts) and data/derived/analysis.json`);
