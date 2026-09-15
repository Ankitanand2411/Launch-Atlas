# Launch Atlas — architecture and design notes

Detail moved out of the README so the README stays short. Everything here is current as of the last commit.

## What the brief is really asking

| Vijay wrote | What it tests | How this project answers |
|---|---|---|
| vibe-coded | AI-native in practice | Agent-built end to end; `AGENTS.md`, `BUILD_LOG.md`, one commit per phase |
| web tool | ship something clickable | Static Next.js site, one dynamic route, deploys to Vercel with no database |
| **all** public information | completeness on a narrow slice | Nine launches enumerated by Social Capital itself; every number links to its source |
| **one** operational aspect | scope | Launches (hero post + video); exclusions listed below |
| one **non-obvious** insight about **how** | reasoning from aggregate to process | Nine hypotheses written first; verdicts computed; one headline, generated from the evidence |
| one agent subscription, 4–5 hours | time-boxing | Phases and time in `BUILD_LOG.md`; what was cut and why |

## Free data only

Nothing here uses a paid API or a scraping service. That was a constraint, and it shaped the design:

| Source | What it gives | Access |
|---|---|---|
| sociallcapital.com/work + case pages | the nine launches, founder X + LinkedIn links, video URL, rounded likes/replies, caption | plain fetch, official |
| X post ID | **exact UTC timestamp** — `ms = (id >> 22) + 1288834974657` | arithmetic |
| LinkedIn activity ID | **exact UTC timestamp** — `ms = id >> 22` (verified against paired X posts) | arithmetic |
| FxTwitter (`api.fxtwitter.com`) | exact views, likes, reposts, quotes, replies, bookmarks, follower count, full text, best video variant | free, unofficial, no key |
| X syndication endpoint | text, likes, reply count, video — the JSON behind embedded tweets | free, unofficial, no key |
| LinkedIn public post page | reactions/comments where rendered logged-out | plain fetch, best effort |
| Video file (`video.twimg.com`) | duration, frame size, audio, three frames, transcript | direct download + ffmpeg |
| Groq Whisper + Llama, or Anthropic | transcripts and hook tags | free tier; the only keys in the project, and only for enrichment |
| Wayback Machine CDX API | dated captures of the company's own description | free, official |
| Manual roster (`data/manual/amplifiers.csv`) | who quoted each post, copied from the Quotes tab by hand | human time |

What free costs: the repeat-creator question (H7) has no free API, so it runs on a hand-kept roster, and LinkedIn engagement is best effort. Both are stated on the pages they affect rather than papered over.

## Architecture

**Offline ETL, online read.** Scripts write JSON to `data/derived/`; the Next.js app reads those files at build time. No database, no cron, no serverless media. Re-runs are free because every fetched artefact is cached under `data/raw/` (gitignored).

```
sociallcapital.com/work ─┐
case pages ──────────────┤  discover ──► launches.json
seed (hand-verified) ────┘        │
                                  ▼
post IDs ───────────────── decode (no network) ──► exact UTC timestamps
                                  │
FxTwitter / syndication ── amplify ──► amplification.json   (exact counts, full text, best video)
LinkedIn public page ─────┘       │
manual roster CSV ────────────────┤
                                  ▼
video.twimg.com ─────────── enrich ──► enrichment.json      (ffprobe, frames, Whisper, model hook tags)
Groq / Anthropic ─────────┘       │
                                  ▼
Wayback CDX ─────────────── claims ──► claims.json           (dated positioning claims)
seed (observed claims) ───┘       │
                                  ▼
                            analyze ──► posts.json, analysis.json
                                        (timing, engagement, amplification rows, roster overlap, H1–H9 verdicts)
                                  │
                                  ▼
                  Next.js 15 (static) ── /  /launches/[slug]  /patterns  /network  /claims  /insight
                  two dynamic routes ─── /api/read (many posts → wave, roster, kinds), /api/anatomy (one post) ──► /analyze
```

**Principles**

1. Every source sits behind an adapter with the order official → unofficial → `data/overrides/*.json`, and every row records `sourceAdapter`, `fetchedAt`, `sourceUrl`.
2. Timestamps come from IDs, never from page text. Two verified fixtures guard the decoders in tests.
3. Approximate counts carry an `approx` flag until exact ones replace them; the UI marks them with ≈.
4. Model output is validated against a strict schema; two failures fall back to regex tags of the same shape, with the reason recorded.
5. The insight narrative is **generated from the analysis file**. Wording is fixed; numbers are not. A test checks every integer in the headline exists in the evidence.
6. N = 9. Counts, medians, ranges. No significance tests.

**Hypotheses** (`HYPOTHESES.md`, written before code) and their computed verdicts live on `/insight`. H4 was rejected as first written and refined; the refinement is logged, not hidden.

## Repository layout

```
app/                 Next.js routes (App Router) and the one API route
components/          LaunchClock, Roster, Nav, Verdict
lib/                 decode, time, metrics, types, insight, fingerprint
lib/analyze/         build-posts, timing, engagement, captions, hooks, amplification, claims, hypotheses
lib/enrich/          ffprobe parser, tag schema + validation + prompt, provider clients
lib/amplify/         FxTwitter, syndication and LinkedIn parsers, manual roster
scripts/             discover, amplify, enrich, claims, analyze (+ parse-case-page)
data/seed/           hand-verified launches and observed claims
data/overrides/      hand-entered values that win over any adapter
data/manual/         amplifiers.csv (the free path for who-amplified)
data/derived/        generated JSON the app reads (committed)
data/raw/            cached fetches (gitignored)
public/frames/       sampled video frames (committed once enrichment runs)
tests/               Vitest
AGENTS.md            constraints the agent works under
HYPOTHESES.md        the nine, written before code, with status
DESIGN.md            token system and the review against generic defaults
BUILD_LOG.md         what was done when, by whom
```

## Design

Modern, minimal, and built around one figure. White paper, black ink, Geist Sans, tabular numerals, one highlighter-yellow accent used only for the insight sentence and "supported" verdicts. Tables with rules instead of cards. The clock is the memorable element; the empty Wednesday and Friday rows are the point. Reviewed at 1280 px and 390 px; phones get a 6am–6pm axis because the 24-hour one was illegible. Details in `DESIGN.md`.

## How it was built

By an AI coding agent in phases, with a human setting scope, checking numbers and pushing. Phase 0 wrote the hypotheses before any code; Phase 1 built ingestion and the decoders; Phase 3 the site; Phase 2 enrichment; then the free network and claims layers, the analyze route and the generated insight. One commit per phase, screenshots reviewed at two widths, two bugs caught from screenshots and fixed. Time per phase in `BUILD_LOG.md`.
