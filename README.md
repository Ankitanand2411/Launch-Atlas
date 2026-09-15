# Launch Atlas

Every launch Social Capital Inc. lists publicly, decoded from the posts themselves — a tool that reads any launch post live, and a reading of their nine launches that surfaces one operational insight.

Live: _add your Vercel URL here_ · Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Hypotheses: [HYPOTHESES.md](HYPOTHESES.md) · Build log: [BUILD_LOG.md](BUILD_LOG.md)

## Quick start

```bash
npm install
npm run pipeline      # offline: seed → launches, dry enrichment, offline amplify/claims, analyze
npm run dev           # http://localhost:3000
```

Then fetch the real data (all free, in this order):

```bash
npm run discover      # re-crawl sociallcapital.com/work
npm run amplify       # exact X counts, full captions (no key)
npm run claims        # Wayback captures (no key)
npm run enrich        # needs GROQ_API_KEY in .env — videos, transcripts, hook tags
npm run analyze       # recompute verdicts + headline
```

Check and ship:

```bash
npm test              # 30 tests
npm run build         # production build; `npm run start` serves it
git add -A && git commit -m "Data refresh" && git push
```

## Environment

| Variable | Where | Needed for |
|---|---|---|
| `GROQ_API_KEY` | local `.env` only | `npm run enrich` (Whisper transcripts + Llama hook tags). Free tier is enough. |
| `NEXT_PUBLIC_REPO_URL` | Vercel | footer link to this repo |

Nothing else is required. `ANTHROPIC_API_KEY` and the model-name overrides in `.env.example` are optional. Never commit `.env`.

## Deploy

Push to GitHub, import the repo in Vercel, set `NEXT_PUBLIC_REPO_URL`. Vercel runs `npm run build`; no server, no database. The site is static apart from two read routes (`/api/read`, `/api/anatomy`), which Vercel runs as functions automatically.

## How it works

1. **discover** — the nine launches from sociallcapital.com/work: founder X + LinkedIn links, video, rounded counts, caption → `data/derived/launches.json`
2. **decode** (no network) — exact UTC timestamps from the post IDs: X `ms = (id >> 22) + 1288834974657`, LinkedIn `ms = id >> 22`
3. **amplify** — exact views, reposts, quotes, replies, bookmarks, follower counts and full text from free public endpoints (FxTwitter → X syndication); LinkedIn public page where it renders counts; a manual roster CSV for who amplified → `amplification.json`
4. **claims** — Wayback Machine captures of the company's own description → `claims.json`
5. **enrich** — video download → ffprobe, frames, Whisper transcript, model hook tags (validated; regex fallback) → `enrichment.json`
6. **analyze** — merges everything, computes timing, engagement, amplification shape, roster overlap and the verdicts for hypotheses H1–H9 → `analysis.json`
7. **Next.js** reads the JSON at build time. The insight text is generated from `analysis.json`, never typed.

No paid APIs anywhere. Every fetch is cached under `data/raw/` (gitignored), so re-runs are free. Every number in the UI links to its source.

## The headline

> Social Capital launches like a market open: all 9 hero posts went out Monday to Thursday between 08:03 and 13:20 Eastern — 3 at East-coast breakfast, 5 at East-coast lunch — and every LinkedIn mirror fired within 9 minutes of the X post. It is a synchronised detonation, not a rollout.

Supporting: 8 of 9 posts lead with a capital or traction figure; 8 of 9 come from the founder's personal account; image-led founder stories collect likes while the one stunt hook collects replies. The counter-evidence sits on the same page (`/insight`).

## Pages

| Route | What it shows |
|---|---|
| `/` | Paste a launch, the headline, the launch clock (weekday × US Eastern hour; LinkedIn mirrors as rings), the roster |
| `/launches/[slug]` | One launch: caption with the leading hook, four-zone timing, LinkedIn gap, counts, media, transcript, sources |
| `/patterns` | Nine launches side by side |
| `/network` | Amplification shape from exact counts, and the manual roster's repeat creators |
| `/claims` | The company's public description over time |
| `/analyze` | Read any launch: one post or a founder post plus its amplifiers — timing, counts, hooks, wave, roster, a seven-check reading against the nine; shareable `?ids=` URL |
| `/insight` | Headline, supports, counter-evidence, hypothesis board, next tests, method |

## Limits

Nine launches is a pattern, not a law. Case-page counts are rounded until `amplify` runs; hook tags are regex until `enrich` runs — the UI says which it is showing. Unofficial endpoints can break; each has a fallback and a manual override, and a miss is recorded, never guessed. Public data only; creators appear aggregated by public handle and follower count.

## Built with

Next.js 15, Tailwind v4, Geist, Vitest, ffmpeg, Groq. Built in phases by an AI coding agent with a human setting scope and checking numbers — one commit per phase, see `BUILD_LOG.md` and `docs/ARCHITECTURE.md`.
