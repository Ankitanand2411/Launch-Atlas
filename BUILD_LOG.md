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

## 2026-09-15 — Phase 2, enrichment pipeline (code; ≈60 min)
- `scripts/enrich.ts`: per launch → download video → ffprobe (duration, frame, fps, audio, aspect) → three frames
  (0.5 s, 3 s, 10 s, 640 px wide, committed under public/frames) → Groq Whisper `verbose_json` transcript → model hook
  tags (Groq Llama JSON mode or Anthropic messages; `--vision` attaches frames for founderOnCamera). Each step caches
  and is skipped when its artifact exists; every skip or failure is recorded in `notes` on the record.
- Strict validation of model output (`validateTags`); two failed attempts fall back to regex tags in the same shape.
- Hypotheses now read enrichment: H5 gains duration band + aspect; H4/H6/H9 switch to model tags when present and say so.
- H4 refined after being rejected as written (5/9 first lines) → figure within the first three lines, 8/9. Logged in HYPOTHESES.md.
- UI: launch page shows hooks with the leading hook marked, figures quoted, CTA, transcript (collapsible, timestamped),
  length/frame/audio facts and frame strip when present; patterns adds Length and Leads-with columns and states the tag source.
- 22 tests passing; static build unchanged (15 routes). Ran `enrich --dry-run` here (sandbox has no route to
  video.twimg.com or api.groq.com); the real run happens on the human's machine.
- Commits rewritten to the human's GitHub handle with Co-Authored-By: Claude trailers; origin set to
  github.com/Ankitanand2411/Launch-Atlas. Push requires the human's credentials.

## 2026-09-16 — Phase 4, insight (≈40 min)
- `lib/insight.ts` generates the headline, lede, three supports, counter-evidence, why-it-matters, next tests and
  method from analysis.json. Wording fixed, numbers computed; a test checks every integer in the headline exists in the
  evidence. Headline: the synchronised-detonation timing finding (H2 + H3 supported); money-first is the fallback.
- `/insight` rebuilt around it; home page shows the generated headline with a link.

## 2026-09-16 — Stretch: network, claims, analyze — free data only (≈90 min)
- Constraint from the human: no paid APIs. Network layer redesigned around free sources: FxTwitter → X syndication for
  exact counts, full text, follower counts and best video variant; LinkedIn public page best effort; manual roster CSV
  for the repeat-creator question. `scripts/amplify.ts`; exact counts replace case-page approximations in posts.json.
- H7 reframed (quote share + roster). `/network` page with honest empty states that say exactly which free command fills them.
- Claims: seed of observed positioning states (live site, two third-party captures, LinkedIn company tagline) +
  `scripts/claims.ts` over the Wayback CDX API. H8 logic initially called two same-day pages a time series → fixed to
  group by capture date. `/claims` page.
- `/analyze` + `/api/anatomy`: paste any X post → timing decoded from the ID, free-endpoint counts when they answer,
  regex hooks, seven-check fingerprint against the nine. Verified the route decodes correctly from the sandbox even
  with both endpoints unreachable.
- Nav extended to six sections; 30 tests passing; build static apart from the API route.

## 2026-09-16 — Phase 5, ship (≈30 min)
- README rewritten: the idea, the decoded brief, free-data table, architecture diagram, pages, running order,
  layout, design, limits, build process. CLAUDE.md and HYPOTHESES.md updated.
- Remaining for the human: push, deploy to Vercel, run amplify → claims → enrich → analyze, add the live URL to the README.

## 2026-09-16 — The tool becomes the front door (≈75 min)
- Human's call: the site read as a report; a tool aggregates when you point it at something. Rebuilt around "paste a launch".
- `lib/read.ts`: from one or many X posts, pick the hero (earliest), place every other post in minutes after it, classify
  quote / reply / standalone from the endpoint's relationship fields, build the creator roster with follower tiers,
  totals, quote share, wave median and p90, and the hero's fingerprint. Pure and tested.
- `/api/read` (many posts, concurrency-capped free-endpoint fetches) alongside `/api/anatomy`; shared `fetchXMetrics`.
- `/analyze` → "Read a launch": textarea for many links, example chips, wave strip (square-root time axis, dots sized
  by followers), roster table, hero anatomy and score; every reading gets a shareable `?ids=` URL that re-runs on load.
- Home page opens with the paste box; the nine become "read the same way".
- Screenshot review with an absurd input (three launches months apart) exposed colliding tick labels, raw-minute medians
  and a false "Video: none" when the endpoint had not answered. All three fixed.
- 34 tests; build static apart from the two read routes.
