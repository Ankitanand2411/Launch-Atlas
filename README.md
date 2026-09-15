# Launch Atlas

Every launch Social Capital Inc. lists on [sociallcapital.com/work](https://www.sociallcapital.com/work), decoded
from the public posts themselves: when it fired, on which platforms, with what hook, and how the room responded —
built to test nine hypotheses and surface one operational insight.

Status: Phase 1 complete (ingestion + analysis). Phases 2–5 in progress. See BUILD_LOG.md.

## Run
```bash
npm install
npm run pipeline   # seed → launches.json → posts.json + analysis.json (no network needed)
npm run dev        # http://localhost:3000
npm test
```

`npm run discover` (without `--offline`) re-crawls the live site and caches raw HTML under `data/raw/`.

## How the numbers are made
- Timestamps are decoded from the post IDs (X snowflake, LinkedIn activity id) — exact to the second, no API.
- Likes and replies come from the X embed on each case page and are platform-rounded ("2.8K"); marked approximate.
- Hook tags in Phase 1 are regex over the visible caption; Phase 2 replaces them with transcript + LLM extraction.
- N = 9. Counts, medians and ranges only.

## Sources
sociallcapital.com/work and the nine case pages; the X and LinkedIn posts they link to. Public data only.
