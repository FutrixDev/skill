# Quality Control

Use this process before delivering generated manga pages.

## Required Checks

1. Run `scripts/check_continuity.js --project <dir>`.
2. Run `scripts/check_series_plan.js --project <dir>` for large stories or multi-chapter projects.
3. Run `scripts/check_storyboard_coverage.js --project <dir>` before image generation when adapting from prose.
4. Run `scripts/check_character_acting.js --project <dir>` before image generation.
5. Run `scripts/check_lettering_script.js --project <dir>` before image generation.
6. Run `scripts/print_generation_prompts.js --project <dir> --kind all --out <dir>/storyboard/generation-prompts.md` before image generation.
7. Run `scripts/score_quality.js --project <dir>`.
8. If page images exist, visually inspect each generated page before scoring it as final.
9. Use `storyboard-fidelity-rubric.md` for storyboard/source fidelity and `quality-rubric.md` for final page images.

## Passing Bar

- Default passing score: `80 / 100`.
- Revise any storyboard with missing A-level source details.
- Revise any large-story plan without chapter continuity or required character stages.
- Revise any storyboard panel where visible named characters lack facial acting notes.
- Revise any storyboard panel missing ordered lettering data or speaker-specific speech placement.
- Do not generate an image until its prompt and target output path have been shown or saved.
- Revise any page with a total score below 80.
- Revise any page that uses code-drawn final art, lacks required character reference sheets, has blank or repeated neutral faces despite acting notes, has blank speech bubbles, pasted-looking captions, dialogue attached to the wrong speaker, wrong Hanzi/digits/English letters/punctuation, missing previous-page references, rigid all-rectangular grids, or simple stacked strips when drama is expected.

## What The Script Can And Cannot Judge

`score_quality.js` checks project files, prompts, page references, acting prompt signals, exact planned text, output names, and image dimensions.

It cannot fully judge character faces, expressions, hands, lettering beauty, or visual drama. After images are generated, Codex must still inspect the pages visually and apply `quality-rubric.md`.

## Revision Loop

- If one page fails, revise that page prompt and regenerate only that page.
- If several pages fail for the same reason, update the bible or shared style notes first, then rebuild prompts.
- If text looks pasted on, strengthen the native lettering and narration-box instructions instead of switching to manual post-lettering.
