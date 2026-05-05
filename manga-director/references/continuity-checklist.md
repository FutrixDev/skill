# Continuity Checklist

## Required Files

- `story.md`
- `project.json`
- `bible/story-bible.json`
- `bible/characters.json`
- `bible/locations.json`
- `bible/color-style.json`
- `storyboard/series-plan.json`
- `storyboard/source-detail-ledger.json`
- `storyboard/storyboard-coverage.json`
- `storyboard/page-plan.json`
- `storyboard/character-prompts.json`
- `storyboard/panel-prompts.json`

## Generation Method

- Final page art must be generated with GPT Image2 / Codex image generation.
- Final outputs must be raster images such as `.png` or `.jpg`.
- SVG, HTML, CSS, canvas, Mermaid, or other code-drawn pages do not count as finished manga pages.
- GPT Image2 should render the final lettering by default: speech bubbles, narration boxes, dialogue, and sound effects.
- Manual post-lettering is only acceptable when the user explicitly asks for editable text or blank bubbles.

## Visual Continuity

Check every generated page:

- Main and recurring characters have GPT Image2-generated reference sheets before page generation.
- Main and recurring characters have stage-specific reference sheets when age, outfit, rank, injury, status, or life situation changes.
- Every page prompt references the correct character stage sheets for characters appearing on that page.
- Every page/panel with a staged character names the stage id it uses.
- Character face, hair, eyes, and body type match the character card.
- Character facial expression, gaze, mouth shape, brow tension, and body language match panel acting notes.
- Characters do not default to the same blank or neutral expression unless the storyboard calls for restraint or numbness.
- Clothing shape and colors stay stable unless the story changes them.
- Props persist when carried between panels or pages.
- Injuries, wet clothes, dirt, tears, light effects, and damage persist.
- Scene layout remains recognizable across pages.
- Time of day and light source do not jump without story reason.
- Emotional state continues from the previous page.
- Page 2+ references the previous page.
- Callback pages reference the relevant earlier page or panel crop.

## Source Fidelity

- A-level source details are mapped to page/panel coverage before image generation.
- B-level source details are either covered or listed with a merge/deletion reason.
- Important character motives, hesitations, moral injuries, recurring objects, and future callbacks are not replaced by vague summary captions.
- If page count is too low for the ledger, revise the page count or get explicit user approval for a compressed version.
- For large stories, each chapter has a clear continuity input/output in `series-plan.json`.

## Manga Readability

- Panel order is clear.
- Panel lettering order is clear.
- Dialogue, inner monologue, background narration, and sound effects are defined before prompt generation.
- Speech bubbles and thought captions clearly belong to the named speaker; tails and placement do not point to another visible character.
- Panel sizes support story importance.
- Speech bubbles, narration boxes, and sound effects are part of the artwork.
- Dialogue text matches the prompt exactly enough to read naturally.
- Bubbles are placed naturally and do not look pasted on.
- Narration boxes match the scene style and do not look like plain white labels.
- Page layout uses manga drama: varied panel sizes, inserts, close-ups, or anchor panels when appropriate.
- Important figures, hands, props, effects, or sound effects can break panel borders when it increases drama.
- Panel frames may be angled, uneven, overlapping, or partially interrupted when the reading order remains clear.
- The page is not just equal-height horizontal strips unless intentionally requested.
- The page is not a rigid all-rectangular grid unless restraint is an intentional effect.
- Faces and hands are not hidden by bubbles.
- The final panel gives a reason to continue.

## Scoring Rule

When the user asks to score a storyboard against the source, use `storyboard-fidelity-rubric.md`. When the user asks to score a manga page or chapter image, use `quality-rubric.md`.

Do not add independent categories outside that rubric. If a concern relates to pacing or story flow, fold it into the page-design or readability score instead of creating a separate "narrative rhythm" category.

Run `scripts/score_quality.js --project <dir>` before reporting a score. Treat its output as a structured pre-check; if page images exist, visually inspect them before giving the final human score.
Run `scripts/check_storyboard_coverage.js --project <dir>` before reporting storyboard fidelity when a project folder exists.

## When a Page Fails

- If only one panel fails, revise that panel or page.
- If the whole page fails, revise the page prompt with stronger visual references.
- If multiple pages fail in the same way, update the relevant bible first.
