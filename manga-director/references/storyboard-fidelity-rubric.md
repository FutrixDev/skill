# Storyboard Fidelity Rubric

Use this rubric when scoring a storyboard or page plan against a prose source. Score out of 100. Do not use this rubric for final rendered pages; use `quality-rubric.md` for final page images.

## Score Categories

| Category | Points | What To Check |
|---|---:|---|
| Source main event coverage | 20 | Major source events appear in the storyboard, with no silent deletion of plot-critical beats. |
| Character motivation and turning points | 20 | The storyboard preserves why characters act, hesitate, choose, fail, or change. Spiritual wounds and irreversible decisions are shown as panel groups, not only summary captions. |
| Key details and recurring objects | 20 | Important objects, environmental details, names, injuries, props, documents, phrases, and callbacks appear or are explicitly merged. |
| Emotional texture and atmosphere | 15 | The source's coldness, pressure, silence, shame, fear, relief, grief, or other emotional layers survive the adaptation. |
| Manga adaptation strength | 15 | Details become visual panels, gestures, inserts, page turns, contrast, border-breaking, or silence instead of plain prose summary. |
| Page count and compression accountability | 10 | The plan flags when the requested page count is too small and explains any A/B detail compression or omission. |

For large stories, also check that chapter splits preserve whole-story setup/payoff and that staged characters name the correct age, status, outfit, injury, or situation reference.

## Hard Rules

- A-level source details must be covered by at least one page/panel.
- B-level source details may be merged, but the merge must be recorded in `storyboard-coverage.json`.
- If an A-level detail is omitted, the storyboard fails regardless of total score.
- Do not let page count force silent deletion of character motivation, moral injury, or recurring object setup.
- If a detail is important because it explains a future version of the character, it should usually be A-level.

## Recommended Report

```text
Total: 76 / 100

| Category | Score | Notes |
|---|---:|---|
| Source main event coverage | 17 / 20 | ... |

Critical omissions:
- ...

Best fix:
- Expand from 8 pages to 12 pages, or split the compressed final page.
```
