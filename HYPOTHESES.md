# Hypotheses

Written before code (Phase 0, 15 Sep 2026). Verdicts are computed by `npm run analyze` and shown on `/insight`;
this file records the intent, the data each needs, and what would change my mind.

| Code | Hypothesis | Data | Test | Falsifier |
|---|---|---|---|---|
| H1 | Hero post comes from the founder's personal account, not the brand account. | case pages | count author type | ≥2 brand accounts |
| H2 | LinkedIn mirror goes live within 15 minutes of the X post. | decoded IDs | max abs delta over pairs | any pair > 15 min |
| H3 | Launches land Mon–Thu, 08:00–13:30 ET, in a breakfast slot and a lunch slot. | decoded IDs | weekday + ET minute | a Friday, or a post outside the window |
| H4 | ~~The caption's first line is a standalone number or dare.~~ Refined after Phase 1 (5/9 as written): a money, valuation, revenue or scale figure appears within the **first three lines**. | captions | figure in lines 1–3 | < 85% of captions |
| H5 | Every hero post is a native 16:9 video in a fixed duration band. | ffprobe | media type, duration | image-led posts (already 2) |
| H6 | Each post bundles ≥2 news hooks (capital, traction, product, story, stunt). | captions + transcripts | hook count | single-hook posts |
| H7 | A repeat core of creators appears across ≥3 launches; their posts arrive in a wave hours later. | amplifier pulls | overlap matrix, delta histogram | no account in ≥3 launches |
| H8 | Stated reach and roster stepped up in discrete jumps alongside a positioning change. | Wayback CDX | claim timeline | claims constant |
| H9 | Stunt hooks produce reply rates far above stat hooks. | metrics + hook tags | reply/like by hook | stunt ≈ launch rates |

## Status after Phase 1 (case pages + ID decoding only)
- H1 supported (8/9; Poly AI is the brand-account exception).
- H2 supported (6/6 mirrors within 8.8 min; median 2.6; LinkedIn went first twice).
- H3 supported (9/9 Mon–Thu, never Wed/Fri; 9/9 in 08:00–13:30 ET; 3 in breakfast, 5 in lunch, 1 outlier).
- H4 rejected as written (5/9 first lines). Refined to "a figure within the first three lines": supported, 8/9 (exception: Icon, whose first three lines name backers but no figure). The refinement is recorded here rather than silently replacing the original.
- H5 mixed (7 videos, 2 image-led founder stories). Duration pending ffprobe.
- H6 supported provisionally (8/9 carry a capital or traction figure; 9/9 stack ≥2 hooks by regex).
- H7, H8 untested. H9 descriptive (stunt 42%, launch ~20%, story ~10%).

## Status after Phase 2 code (data pending a machine with network access)
- `npm run enrich` adds per-video duration/aspect/frames (ffprobe), transcripts (Groq Whisper) and model hook tags
  validated against a strict schema, with regex fallback and a note whenever a step is skipped.
- H5 becomes testable (duration band, aspect). H4/H6/H9 switch from regex to model tags automatically; every summary
  states which source it used.

## Candidate headlines (pick one in Phase 4, after enrichment runs)
1. Synchronised detonation: nine launches, all Mon–Thu between 8:00 and 13:30 Eastern; every LinkedIn mirror within nine minutes of the X post.
2. Money is the launch: 8 of 9 hero posts carry a funding or revenue figure; the product is the second hook, not the first.
3. Two formats, two goals: image-led founder stories collect likes (Airwallex 29.7K, 5% reply rate); stunt-led videos collect replies (Wispr Flow 42%).
