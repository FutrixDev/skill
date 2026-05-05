# Manga Director

Manga Director is a Codex skill for turning long-form stories into continuous, numbered, full-color Japanese manga pages using GPT Image2 / Codex image generation.

It is designed for production-style manga generation, not one-shot image prompting. The skill guides Codex through story understanding, chapter planning, character reference creation, storyboard design, prompt preview, image generation, continuity checks, and targeted revisions.

## Example

See an example comic gallery here: [Dylan's Life Comics](https://www.dylanslife.com/comics.html).

## What It Does

- Converts a user story into numbered full-color manga page images.
- Plans long stories across chapters before designing individual pages.
- Preserves source details through a source-detail ledger and storyboard coverage checks.
- Creates stage-specific character reference prompts before page generation.
- Keeps character identity stable across age, outfit, injury, rank, and life-stage changes.
- Designs page and panel storyboards with manga-style composition.
- Supports dynamic paneling, irregular frames, diagonal panels, overlapping panels, and border-breaking character or prop moments.
- Requires character acting notes for every visible named character.
- Defines ordered dialogue, inner monologue, background narration, and sound effects for each panel.
- Binds every speech bubble or thought caption to the correct speaker.
- Requires GPT Image2 to render final lettering natively inside the artwork by default.
- Adds strict text guidance for Hanzi, digits, English letters, capitalization, spacing, and punctuation.
- Outputs the exact prompt and target image path before generating any character reference or manga page image.
- Checks continuity, prompt readiness, character acting, lettering, source coverage, and quality signals with bundled scripts.

## Core Workflow

1. Read the full story and ask only the questions that affect final manga quality.
2. Confirm the production brief: page count, cast, style, reading direction, output path, and constraints.
3. Initialize a project with structured files.
4. For large stories, create a whole-story chapter plan first.
5. Build a source-detail ledger so important prose details are not lost.
6. Fill story, character, location, and color-style bibles.
7. Generate character reference prompts and preview them before image generation.
8. Generate stage-specific character reference sheets.
9. Plan pages and panels with:
   - source detail ids
   - character stages
   - character acting
   - ordered lettering
   - speaker attribution
   - visual continuity notes
10. Build final page prompts.
11. Preview prompts and target output paths before image generation.
12. Generate numbered manga pages.
13. Check continuity and quality.
14. Revise only the failed page or panel when possible.

## Project Layout

```text
<project>/
├── project.json
├── story.md
├── bible/
│   ├── story-bible.json
│   ├── characters.json
│   ├── locations.json
│   └── color-style.json
├── storyboard/
│   ├── series-plan.json
│   ├── source-detail-ledger.json
│   ├── storyboard-coverage.json
│   ├── character-prompts.json
│   ├── page-plan.json
│   ├── panel-prompts.json
│   └── generation-prompts.md
├── references/
│   └── characters/
├── panel_refs/
├── pages/
│   ├── page_001.png
│   └── page_002.png
└── revisions/
```

## Scripts

Run scripts from the skill directory or from a project that references the skill path.

```bash
node scripts/init_project.js --name rain-voice --story story.txt --out ./runs
node scripts/check_series_plan.js --project ./runs/rain-voice
node scripts/build_character_prompts.js --project ./runs/rain-voice
node scripts/check_storyboard_coverage.js --project ./runs/rain-voice
node scripts/check_character_acting.js --project ./runs/rain-voice
node scripts/check_lettering_script.js --project ./runs/rain-voice
node scripts/build_panel_prompts.js --project ./runs/rain-voice
node scripts/print_generation_prompts.js --project ./runs/rain-voice --kind all --out ./runs/rain-voice/storyboard/generation-prompts.md
node scripts/check_continuity.js --project ./runs/rain-voice
node scripts/score_quality.js --project ./runs/rain-voice
node scripts/validate_skill.js
```

## Prompt Preview Rule

Before generating any image, Manga Director must first show or save:

- the exact prompt
- the intended output image path

This applies to both character reference sheets and manga page images.

Use:

```bash
node scripts/print_generation_prompts.js --project <project> --kind all --out <project>/storyboard/generation-prompts.md
```

## Quality Controls

Manga Director includes checks for:

- source detail coverage
- long-story chapter planning
- character stage references
- character acting and facial expression notes
- ordered lettering
- speaker attribution
- native GPT Image2 lettering
- exact planned text in prompts
- previous-page references after page 1
- dynamic manga paneling
- output naming and image readiness

## Non-Negotiable Rules

- Final manga art must be GPT Image2-generated raster images.
- Do not use SVG, HTML, CSS, canvas, Mermaid, or code-drawn placeholders as final comic pages.
- Default output is full-color manga, not black-and-white manga.
- Final pages are standalone numbered images under `pages/`.
- GPT Image2 should render final speech bubbles, narration boxes, dialogue, and sound effects inside the artwork unless the user explicitly requests editable post-lettering.
- Every visible named character needs panel-specific acting notes.
- Every speech bubble must visually belong to the named speaker.
- Every image prompt must be shown or saved before image generation.

## Skill Version

Current skill version: `1.6.4`.

## License

This skill is licensed under the repository's [Apache License 2.0](../LICENSE).
