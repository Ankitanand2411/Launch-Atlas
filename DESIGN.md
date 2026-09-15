# Design

Brief: modern, minimalist. Audience: a small content/GTM team that hires for taste, reading on a phone first.
Job: make the cross-launch pattern legible in one screen and make one insight land.
Subject: a forensic reading of nine public launch posts.

## Tokens
- Color — paper `#FFFFFF`, ink `#000000`, ink-2 `#61616B`, rule `#E5E5E2`, surface `#F3F3F1`,
  mark-x `#000000`, mark-li `#0A66C2`, highlight `#FFE95C`.
- Type — Geist Sans only. Display 44/52 (mobile 32/38) weight 500, tracking −0.02em. Section 22/28 weight 500.
  Body 16/26. Small 13/18. Tabular numerals wherever a number appears. Measure ≤ 68ch.
- Layout — left-aligned; 1120px container; the hero is a figure, not a headline with stat tiles: a clock of
  weekday rows against a 24-hour Eastern axis with the nine launches as marks (X filled, LinkedIn ring).
  Tables with rules below; no cards.
- Motion — one moment: the clock marks pop in once, staggered over half a second. Disabled under
  prefers-reduced-motion. Nothing else animates on load.

## Principles
- Evidence first: every number links to its source; approximate counts are marked.
- One accent, one job: highlight yellow marks the insight sentence and "supported" verdicts, nothing else.
- Structure carries meaning: the empty Wednesday and Friday rows on the clock are the point.

## Review against the generic default
Monochrome + Geist is what "modern minimal" means today, and the brief asks for it. What keeps it from
reading as a template: the hero is a data figure rather than headline + KPI tiles; the single accent is a
highlighter (an annotation metaphor for reading public posts) rather than a brand color; there are no cards,
eyebrow labels, monospace data labels, arrows in links, or middle-dot separators. Rejected on purpose:
cream paper with serif and clay accent; dark mode with acid green; broadsheet hairlines; the SaaS card kit.
