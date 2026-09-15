# Launch Atlas

Every launch Social Capital Inc. lists on [sociallcapital.com/work](https://www.sociallcapital.com/work), decoded
from the public posts themselves: when it fired, on which platforms, with what hook, and how the room responded —
built to test nine hypotheses and surface one operational insight.

Status: Phases 0–1 complete, Phase 3 first pass live, Phase 2 pipeline written (needs keys + network to run). See BUILD_LOG.md.

## Run
```bash
npm install
npm run pipeline   # seed → launches.json → posts.json + analysis.json (no network needed)
npm run dev        # http://localhost:3000
npm test
```

`npm run discover` (without `--offline`) re-crawls the live site and caches raw HTML under `data/raw/`.

## Enrichment (Phase 2)
```bash
cp .env.example .env          # add GROQ_API_KEY (free tier is enough for nine short videos)
npm run enrich                # downloads the 7 videos, ffprobe, 3 frames each, Whisper transcripts, model hook tags
npm run analyze               # hypotheses now use durations, aspect and model tags
```
Everything caches under `data/raw/` (gitignored) so re-runs are free; `--only gamma` limits to one launch,
`--dry-run` produces a valid file with regex tags and no network. Frames land in `public/frames/` and are committed.
Model output is validated against a strict schema; on two failures the regex tags are used and the reason is recorded
in `enrichment.json` under `notes`. Cost: well under a dollar on Groq for all nine.

## How the numbers are made
- Timestamps are decoded from the post IDs (X snowflake, LinkedIn activity id) — exact to the second, no API.
- Likes and replies come from the X embed on each case page and are platform-rounded ("2.8K"); marked approximate.
- Hook tags are regex over the visible caption until `npm run enrich` has run; then they come from a model over caption + transcript, and every page says which source it is showing.
- N = 9. Counts, medians and ranges only.

## Sources
sociallcapital.com/work and the nine case pages; the X and LinkedIn posts they link to. Public data only.
