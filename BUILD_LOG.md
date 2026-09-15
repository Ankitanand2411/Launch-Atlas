# Build log

Times are IST. Agent: Claude (claude.ai) driving the build in a sandbox; the human sets scope, verifies numbers, and pushes.

## 2026-09-15 — Phase 0, recon and scoping (≈30 min)
- Researched Social Capital Inc.: X + LinkedIn launch shop, nine public launches on /work, hero post per launch.
- Fetched all nine case pages; recorded founder, X and LinkedIn URLs, media, video URL, likes, replies, caption excerpt.
- Verified the ID → timestamp decoders against the embed times on two launches. Wrote HYPOTHESES.md before code.
- Decisions: JSON files instead of Postgres (N = 9, zero cloud state); Next.js 15 + Tailwind v4 + Geist; tests with Vitest.

## 2026-09-15 — Phase 1, ingestion core (≈60 min)
- Seed for nine launches; case-page parser with synthetic fixture; live crawler with offline fallback and raw cache.
- Decoders, time-zone helpers (DST-aware), compact-metric parser, override loader, timing/engagement builders.
- Hypothesis engine computes H1–H9 from what Phase 1 can see; provisional regex tags for captions.
- 15 unit tests passing. `npm run pipeline` produces posts.json (15 posts) and analysis.json.
- Human overrides: none yet. Agent fixed one bug (work-index label has no separator between client and month).

## 2026-09-15 — Phase 3, first pass: app shell and four pages (≈60 min)
- Next.js 15 (App Router), Tailwind v4 tokens from DESIGN.md, Geist Sans via the `geist` package (no font fetch at build).
- Pages: `/` (clock hero + numbered chronological roster), `/launches/[slug]` (anatomy: caption, hooks, four-zone timing,
  LinkedIn gap, engagement with ≈ for rounded counts, media, sources), `/patterns` (matrix with hook dots), `/insight`
  (hypothesis board with computed verdicts, method and limits).
- Screenshots reviewed at 1280 and 390 px. Two fixes from review: marks within ~20 min overlapped (Wispr Flow hid
  PlayerZero) → symmetric lane clustering; the 24-hour axis was illegible on phones → a 6am–6pm variant for small screens.
- Roster hides date and likes below 640 px so day, Eastern time and LinkedIn gap stay on one line.
- Build is fully static: 15 prerendered routes. Tests: 15 passing.
- Human overrides: none. Next: Phase 2 (video download, ffprobe, Groq Whisper, LLM hook tags) on a machine with network
  access to video.twimg.com and api.groq.com, then Phase 4 (pick and verify the headline).
