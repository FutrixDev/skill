# Manga Director Workflow

## Intake

When the user gives a story, extract:

- Core premise
- Genre and reader age
- Main character goal
- Emotional tone
- Important relationship
- Setting and time
- Ending type
- Estimated page count
- Whether dialogue is needed

If the story is vague, ask about the strongest missing item first. Ask one question at a time.

## Dynamic Question Priority

1. Page count or length if absent.
2. Genre if tone is unclear.
3. Protagonist identity if the lead is vague.
4. Ending if the story has no final beat.
5. Reading direction if the audience matters.
6. Visual mood if the story can support several looks.
7. Content boundary if age rating is unclear.
8. Dialogue density if the story may be silent or narration-heavy.

Stop asking when the remaining ambiguity can be handled by sensible defaults.

## Confirmation Brief

Before generation, present a short brief:

```text
Format: full-color Japanese manga pages
Pages: 6
Reading: top-to-bottom, rows right-to-left
Lettering: GPT Image2 renders speech bubbles, dialogue, narration, and sound effects directly in the page
Genre: rainy school suspense
Main cast: ...
Color mood: ...
Ending: ...
Output: pages/page_001.png ... page_006.png
Continuity: character sheets first, page 2+ reference previous page and linked panels
Source fidelity: A-level source details are mapped to storyboard panels before image generation
Large story: whole-story chapter split and character stage references are planned before chapter pages
```

Ask for confirmation. Once confirmed, proceed.

## Production Sequence

1. Create project folder.
2. Write story.md.
3. Keep project.json as the versioned manifest for skill version, schema version, output pattern, and quality gates.
4. For large stories, fill `storyboard/series-plan.json` with whole-story understanding and chapter split.
5. Define character stages needed across chapters.
6. Fill `storyboard/source-detail-ledger.json` with A/B/C source details.
7. If page count is too small for A-level details, warn and propose a longer version.
8. Fill story bible.
9. Fill character, location, and color-style bibles.
10. Build character stage reference prompts.
11. Output or save the character prompt preview with target image paths.
12. Generate GPT Image2 character stage reference sheets and save them under `references/characters/`.
13. Plan pages and panels, adding `source_detail_ids`, `character_stages`, character `acting`, and ordered `lettering` to panels.
14. Fill `storyboard/storyboard-coverage.json`.
15. Run series and storyboard coverage checks.
16. Build panel prompts.
17. Output or save the page prompt preview with target image paths.
18. Generate page 1 with GPT Image2 using the shown prompt, stage-specific character reference sheets, bibles, and setup references.
19. Crop or save key panel references from page 1.
20. Output the prompt for page 2, then generate page 2 with GPT Image2 using character stage sheets, page 1, and key panel refs.
21. Repeat prompt-then-image for each page.
22. Run continuity and quality checks.
23. Visually inspect generated pages against the rubric.
24. Revise failed pages only.

## Defaults

- Full-color manga page.
- Standalone numbered image pages.
- Final pages are raster images generated from GPT Image2 prompts, not SVG/HTML/CSS/canvas drawings.
- 4 to 8 pages for short stories unless the user asks otherwise.
- Do not silently force dense prose into too few pages. Warn when A-level source details need more pages.
- 3 to 6 panels per page.
- GPT Image2 renders final speech bubbles, narration boxes, exact dialogue text, and sound effects inside the artwork by default.
- Before any character reference or page image is generated, show or save the exact prompt and the target image path.
- Every panel has ordered lettering data. Use `lettering: []` for silent panels.
- Every visible named character has panel-specific acting notes: expression, eyes, mouth, brows, body language, and emotional intensity.
- Keep each text line short. If a line is long, split it into smaller bubbles before prompting.
- Final page prompts must explicitly preserve Hanzi, digits, English letters, capitalization, spacing, and punctuation from the ordered lettering script.
- Final page prompts must explicitly bind every speech bubble or thought caption to the named speaker. For panels with multiple visible characters, include speaker-specific placement and tail direction.
- Generate stage-specific character reference sheets before final pages. Keep identity stable while changing age, outfit, injury, rank, status, or situation when the story requires it.

## Quality Gate

Run:

```bash
node skills/manga-director/scripts/check_series_plan.js --project <project>
node skills/manga-director/scripts/build_character_prompts.js --project <project>
node skills/manga-director/scripts/print_generation_prompts.js --project <project> --kind characters --out <project>/storyboard/character-generation-prompts.md
node skills/manga-director/scripts/check_storyboard_coverage.js --project <project>
node skills/manga-director/scripts/check_character_acting.js --project <project>
node skills/manga-director/scripts/check_lettering_script.js --project <project>
node skills/manga-director/scripts/build_panel_prompts.js --project <project>
node skills/manga-director/scripts/print_generation_prompts.js --project <project> --kind pages --out <project>/storyboard/page-generation-prompts.md
node skills/manga-director/scripts/check_continuity.js --project <project>
node skills/manga-director/scripts/score_quality.js --project <project>
```

Before image generation, use `storyboard-fidelity-rubric.md` for storyboard scoring. After image generation, inspect the generated pages visually and use `quality-rubric.md` for the final score.
