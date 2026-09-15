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
