# Launch Atlas

**Every launch Social Capital Inc. lists publicly, decoded from the posts themselves — built to test nine hypotheses and surface one operational insight about how the company launches.**

Live: _add your Vercel URL here_ · Built for Social Capital's "technical generalist" application (item #3: aggregate public information about one operational aspect of what we do and uncover one non-obvious insight).

---

## The idea

Social Capital Inc. ([sociallcapital.com](https://www.sociallcapital.com)) runs product launches on X and LinkedIn for companies like Deel, Gamma, Cartesia, Airwallex and Wispr Flow. They list nine of those launches on their work page. Each one is anchored by a single **hero post** — usually the founder's, usually carrying a native video — which their creator network then amplifies.

Those nine hero posts are public. So is a surprising amount of what they encode: the exact second they were published (hidden in the post ID), the same for their LinkedIn mirrors, the caption structure, the media format, and the shape of the response. Read across nine launches instead of one, the operating pattern shows.

Launch Atlas is two things. A **tool**: paste any launch post, or the founder's post plus the creators who amplified it, and it reads the launch live — exact timing, today's numbers, hooks, the amplification wave, the creator roster, and a score against Social Capital's playbook. And a **reading** of Social Capital's own nine launches with that tool: the aspect is **launches** (the hero video and the post that carries it, with amplification as a property of the video); the method is to write down what you expect before you look, collect everything public, compute the verdicts, and let one finding stand as the headline.

**The headline** (generated from the data, not typed — see `/insight`):

> Social Capital launches like a market open: all 9 hero posts went out Monday to Thursday between 08:03 and 13:20 Eastern — 3 at East-coast breakfast, 5 at East-coast lunch — and every LinkedIn mirror fired within 9 minutes of the X post. It is a synchronised detonation, not a rollout.

Supporting patterns: 8 of 9 posts lead with a capital or traction figure (the product is the second hook); 8 of 9 come from the founder's personal account; image-led founder stories collect likes while the one stunt hook collects replies. The counter-evidence is on the same page.

---

## What the brief is really asking

| Vijay wrote | What it tests | How this project answers |
|---|---|---|
| vibe-coded | AI-native in practice | Agent-built end to end; `AGENTS.md`, `BUILD_LOG.md`, one commit per phase |
| web tool | ship something clickable | Static Next.js site, one dynamic route, deploys to Vercel with no database |
| **all** public information | completeness on a narrow slice | Nine launches enumerated by Social Capital itself; every number links to its source |
| **one** operational aspect | scope | Launches (hero post + video); exclusions listed below |
| one **non-obvious** insight about **how** | reasoning from aggregate to process | Nine hypotheses written first; verdicts computed; one headline, generated from the evidence |
| one agent subscription, 4–5 hours | time-boxing | Phases and time in `BUILD_LOG.md`; what was cut and why |

---

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

---

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

---

## Pages

| Route | What it shows |
|---|---|
| `/` | **Paste a launch** (the front door), then the headline, the **launch clock** (weekday rows × US Eastern hour; X marks numbered in date order, LinkedIn mirrors as rings at their own minute; Wednesday and Friday drawn empty on purpose) and the roster keyed to the clock |
| `/launches/[slug]` | One launch: caption with the leading hook marked, figures quoted, four-zone timing, LinkedIn gap, exact or ≈ counts, media facts, frames, timestamped transcript, sources |
| `/patterns` | Nine launches side by side — the pattern is in the columns |
| `/network` | Amplification shape from exact counts (quote share, likes per 1K views, followers) and the manual roster's repeat creators |
| `/claims` | The company's public description over time: reach, roster, team size, growth, guarantee |
| `/analyze` | **Read a launch.** Paste one post, or a founder's post plus every creator post that amplified it. For each: exact time from the ID, counts and followers from the free endpoints, quote/reply/standalone, hooks. For the set: the wave (minutes after the founder), quote vs reply split, creator roster with follower tiers, totals, and the hero's seven-check reading against the nine. Every reading has a shareable `?ids=` URL |
| `/insight` | The headline, what supports it, what cuts against it, why a launch team would care, the hypothesis board, what to test next, method and limits |

---

## Running it

```bash
npm install
npm run pipeline        # seed → launches, dry enrichment, offline amplify/claims, analyze  (no network, no keys)
npm run dev             # http://localhost:3000
npm test                # 30 tests: decoders, parsers, validators, hypothesis logic, insight generation
```

Then, on a machine with normal internet, the free upgrades — in this order:

```bash
npm run discover        # re-crawl sociallcapital.com/work (adds a tenth launch when it appears)
npm run amplify         # exact X counts, full captions, best video variant; LinkedIn counts where public
npm run claims          # Wayback captures → dated positioning claims
cp .env.example .env    # add GROQ_API_KEY (free tier) for the next step
npm run enrich          # videos → ffprobe, frames, Whisper transcripts, model hook tags
npm run analyze         # recompute everything; verdicts and the headline update themselves
```

Flags: `--only <slug>`, `--offline`, `--dry-run`, `--skip-download|--skip-transcribe|--skip-tag`, `--vision` (frames → founderOnCamera via Anthropic).

**Deploy:** push to GitHub, import in Vercel, set `NEXT_PUBLIC_REPO_URL`. No other configuration; the site is static apart from the two read routes.

---

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

---

## Design

Modern, minimal, and built around one figure. White paper, black ink, Geist Sans, tabular numerals, one highlighter-yellow accent used only for the insight sentence and "supported" verdicts. Tables with rules instead of cards. The clock is the memorable element; the empty Wednesday and Friday rows are the point. Reviewed at 1280 px and 390 px; phones get a 6am–6pm axis because the 24-hour one was illegible. Details in `DESIGN.md`.

---

## Limits, exclusions, ground rules

- **Nine launches** is a pattern, not a law; empty weekdays could be chance. A tenth launch (Lovable is named in the job post but not yet on /work) is one seed row away.
- **Excluded on purpose:** brand-account content, paid ads, creator content outside launch windows, LinkedIn beyond the founder's mirror, anything requiring login.
- **Case-page counts are rounded** ("2.8K") until `npm run amplify` replaces them with exact figures; the UI marks them.
- **Hook tags are regex** until `npm run enrich` runs; every page says which it is showing.
- **Unofficial endpoints break.** Each has a fallback and a manual override; a miss is recorded, never guessed.
- **Public data only.** The crawler follows the nine links Social Capital publishes; creators appear aggregated with public handle and follower count only; raw fetches stay out of the repository.

---

## How it was built

By an AI coding agent in phases, with a human setting scope, checking numbers and pushing. Phase 0 wrote the hypotheses before any code; Phase 1 built ingestion and the decoders; Phase 3 the site; Phase 2 enrichment; then the free network and claims layers, the analyze route and the generated insight. One commit per phase, screenshots reviewed at two widths, two bugs caught from screenshots and fixed. Time per phase in `BUILD_LOG.md`.
