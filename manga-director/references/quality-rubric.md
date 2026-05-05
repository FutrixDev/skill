# Manga Director Quality Rubric

Use this rubric when scoring generated manga pages or chapters. Rubric version: `1.0.0`. Score out of 100. Do not add extra categories unless the user explicitly asks for a custom rubric.

## Score Categories

| Category | Points | What To Check |
|---|---:|---|
| GPT Image2 raster generation compliance | 15 | Final page is a GPT Image2-style raster artwork, not SVG/HTML/CSS/canvas or placeholder graphics. |
| Character and key-object consistency | 20 | Character face, hair, body type, outfit, colors, props, injuries, life-stage design, carried objects, and stage-specific acting baseline stay consistent with the correct character stage reference sheets, bible, and nearby pages. |
| Cross-panel and cross-page visual continuity | 15 | Locations, light direction, time of day, emotional state, facial acting progression, action continuation, and callback references connect cleanly across panels/pages. |
| Integrated lettering | 15 | Speech bubbles, narration boxes, dialogue order, speaker attribution, inner monologue, background narration, and sound effects are rendered naturally by GPT Image2 as part of the page. Text is readable enough, short, and not pasted on. Speech bubbles and thought captions visually belong to the named speaker. Hanzi, digits, English letters, capitalization, spacing, and punctuation follow the ordered lettering script. Narration boxes are style-matched, not plain white labels. |
| Dynamic manga page design | 20 | Paneling uses varied sizes and shapes, anchor panels, close-ups, inserts, expressive gutters, diagonals, irregular frames, overlapping panels, or characters/props breaking borders when appropriate. Avoids simple equal-height stacked strips and rigid all-rectangular grids unless requested. |
| Visual finish and readability | 15 | The page is visually polished, readable, not overcrowded, with clear panel order, strong focal points, expressive faces, readable eyes and mouths, and no major anatomy, cropping, or composition problems. |

## How To Report

Before reporting a final score, run `scripts/score_quality.js --project <dir>` when a project folder exists. The script checks files and prompt signals; the final score still needs visual inspection of generated pages.

Use a compact table with all six categories, then list the top issues and the most useful fix.

Recommended shape:

```text
Total: 72 / 100

| Category | Score | Notes |
|---|---:|---|
| GPT Image2 raster generation compliance | 15 / 15 | ... |
...

Main issues:
- ...

Best fix:
- ...
```

## Important Boundaries

- Do not score "narrative rhythm" as a separate category. If pacing feels weak, explain it under dynamic manga page design or visual readability.
- Do not reward beautiful illustration alone if the page fails as manga.
- Do not punish a simple layout if the user explicitly requested a clean strip format.
- Text mistakes matter. If Hanzi, digits, English letters, capitalization, spacing, or punctuation differ from the ordered lettering script, revise the prompt and regenerate the page or affected panel.
- Speaker mistakes matter. If a bubble tail, placement, or thought caption makes a line look like it belongs to the wrong character, revise the prompt and regenerate the page or affected panel.
- Blank-face acting mistakes matter. If visible characters look emotionally flat despite acting notes, revise the prompt and regenerate the page or affected panel.
