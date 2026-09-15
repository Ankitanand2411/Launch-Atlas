# Launch Atlas

Aggregates all public information about Social Capital Inc.'s launches (sociallcapital.com/work) — the
hero post on X and its LinkedIn mirror, the video, and how the post travelled — and tests a fixed set of
hypotheses (HYPOTHESES.md) to surface one operational insight about how the company launches.

## Constraints
- Offline ETL (`scripts/`) writes JSON to `data/derived/`; the Next.js app only reads those files at build
  time. No database, no cron, no serverless media processing.
- Every source sits behind an adapter with the order: official → unofficial → `data/overrides/*.json`.
  Every row records `sourceAdapter`, `fetchedAt`, `sourceUrl`. Raw responses go to `data/raw/` (gitignored).
- Timestamps come from IDs, never from page text: X `ms = (id >> 22) + 1288834974657`; LinkedIn
  `ms = id >> 22`. Fixtures live in `tests/decode.test.ts`; keep them passing.
- Engagement counts from the case-page embeds are platform-rounded ("2.8K"); carry the `approx` flag through.
- LLM use (Phase 2): Groq Whisper for transcripts; strict-JSON extraction at temperature 0.1; insight
  narratives may only cite numbers present in evidence tables.
- N = 9. Report counts, medians, ranges. Never p-values. State caveats in the UI.
- Design (DESIGN.md): Geist Sans only, white paper, black ink, one highlighter-yellow accent used solely
  for the insight and "supported" verdicts. No cards, no all-caps labels, no monospace data labels,
  no arrows in link text, no middle-dot separators, no page-load animation except the clock marks.
- Commit after every phase with a descriptive message; append a dated entry to BUILD_LOG.md.

## Commands
- `npm run discover -- --offline`  seed → data/derived/launches.json (no network)
- `npm run discover`               live crawl of sociallcapital.com/work (+ raw HTML cache)
- `npm run enrich`                 download videos, ffprobe, frames, Groq Whisper, model hook tags → enrichment.json
  (`--dry-run` for no network; `--only <slug>`; `--vision` sends frames to Anthropic)
- `npm run amplify`                free exact X counts (FxTwitter → syndication), LinkedIn public counts, manual roster → amplification.json
- `npm run claims`                 Wayback CDX captures → dated positioning claims → claims.json (`--offline` = seed only)
- `npm run analyze`                decode, merge overrides, read enrichment/amplification/claims, compute rows + H1–H9
- `npm run pipeline`               discover (offline) + enrich (dry) + amplify (offline) + claims (offline) + analyze

## Rules that shaped the stretch layers
- No paid APIs or scraping services anywhere. Free unofficial endpoints get a fallback and a note on failure.
- The insight narrative (lib/insight.ts) is generated from analysis.json; never type a number into it.
- `npm test` · `npm run dev` · `npm run build`

## Out of scope
Auth, user accounts, chat UI, scheduling, brand-account content, paid ads, creator content outside launch windows.
