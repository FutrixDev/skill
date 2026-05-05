---
name: manga-director
description: Use when the user wants Codex to turn a story into final numbered full-color Japanese manga pages using GPT Image2 / the built-in image generation tool, not SVG or HTML placeholders. 适用于用户要用 GPT Image2 + prompt 生成漫画、彩色日漫、日漫分镜、连贯漫画页、故事转漫画、漫画角色一致性、跨页视觉参考、漫画内置对白和拟声词、分镜返修时。 Handles dynamic story clarification, character/style bibles, page and panel planning, visual reference chaining across pages, integrated manga lettering, image generation, continuity review, and targeted revision.
metadata:
  version: "1.6.4"
  project-schema-version: "1.0.0"
---

# Manga Director

## Purpose

Create finished full-color manga pages from a user's story. This skill is not just for writing prompts: Codex acts as manga director, script editor, storyboard artist, image-generation operator, page compositor, and continuity checker.

Final artwork must be raster images generated with GPT Image2 / Codex's built-in image generation tool. Do not create the final manga pages as SVG, HTML, CSS, canvas, Mermaid, diagram code, or hand-drawn vector placeholders.

Default output is numbered standalone image pages:

```text
pages/page_001.png
pages/page_002.png
pages/page_003.png
```

Do not make a PDF unless the user asks.

For versioning and non-negotiable generation rules, use [generation-policy.md](references/generation-policy.md). Deterministic script constants live in `scripts/lib/manga_policy.js`.

## Operating Rules

- Default style: full-color Japanese manga page, not black-and-white manga.
- Default image path: use GPT Image2 through Codex's image generation capability. If the `imagegen` skill is available, use it for final page generation.
- Never satisfy a manga-generation request by manually drawing SVG/HTML/CSS/canvas pages. These formats may be used only for planning diagrams, rough layout notes, or optional lettering/composition helpers, not as the final comic artwork.
- Final page files must be raster images, normally `.png` or `.jpg`, saved under `pages/page_001.png`, `pages/page_002.png`, etc.
- Default lettering path: GPT Image2 must render speech bubbles, narration boxes, dialogue text, and sound effects as part of the manga page. Do not default to blank bubbles or post-inserting text.
- Keep text short and exact. In the storyboard, define ordered lettering for every panel: character dialogue, dialogue order, inner monologue, background narration, and sound effects. Put every visible text item into the page prompt verbatim.
- Final page prompts must explicitly require exact character rendering for all visible text. Chinese Hanzi, Arabic numerals, English letters, capitalization, spacing, and punctuation must be copied exactly from the ordered lettering script, with no substitutions or invented text.
- Final page prompts must explicitly bind each speech bubble and thought caption to its named speaker. The bubble or thought caption belongs near that speaker, and any speech-bubble tail must point to that speaker, never to a different visible character.
- Storyboards must define character acting for every visible named character: facial expression, eye focus, mouth shape, brow tension, posture/body language, and emotional intensity. Do not let characters default to blank neutral faces unless numb restraint is the intended acting choice.
- Before generating any actual character reference image or manga page image, output the exact prompt first, together with its intended image path. Generate the corresponding image only after the prompt has been shown or saved.
- Use post-lettering only if the user explicitly asks for editable text layers, blank bubbles, or manual typesetting.
- Narration boxes must visually belong to the manga page. Avoid plain white rectangular caption cards; use integrated manga narration boxes, parchment-like boxes, translucent panels, ink-edged boxes, or style-matched caption shapes that fit the scene.
- Default page design must use dramatic manga paneling. Avoid simple evenly stacked horizontal strips unless the user explicitly asks for a clean strip-comic layout.
- Default artistic direction should encourage expressive border-breaking manga composition: important characters, hands, props, clothing, hair, light, aura, smoke, water, speed lines, and sound effects may break panel borders when it heightens the scene. Panel borders do not need to be rigid rectangles; angled, uneven, overlapping, or partially interrupted frames are preferred when they improve drama and still read clearly.
- Default reading flow: page content moves top-to-bottom. Ask the user whether rows read right-to-left or left-to-right if it matters for the audience.
- Use dynamic follow-up questions. Ask only questions that affect the final comic.
- Before image generation, show a short production brief and ask for confirmation.
- After confirmation, proceed without repeatedly asking about small details unless a blocker appears.
- Preserve all project files so later requests can revise one page or panel.
- Treat page text as part of the illustration. The page should look like a natural finished manga page, not art with text pasted on afterward.
- Every new project must include `project.json` with skill version, project schema version, output pattern, generation method, and quality gates.
- For large stories, first understand the whole story and create `storyboard/series-plan.json` before chapter-level storyboards. Chapter splits must preserve setup, payoff, continuity, and emotional progression across the full story.
- Before page planning, create a source detail ledger. Do not jump directly from prose source to storyboard. A-level source details must be mapped to page/panel coverage or the storyboard fails.
- Before final page generation, generate stage-specific main and recurring character reference sheets with GPT Image2 and save them under `references/characters/`. Later page prompts must state which character stage image is used to reduce drift across age, outfit, injury, rank, and situation changes.

## Workflow

1. **Read the story**
   - Identify genre, protagonist, conflict, emotional arc, setting, ending, required page count, and missing details.
   - Use [workflow.md](references/workflow.md) for the full decision flow.

2. **Ask dynamic questions**
   - Ask one question at a time.
   - Stop when remaining uncertainty would not materially change the comic.
   - Typical range: 3 to 8 questions.

3. **Confirm the production brief**
   - Summarize page count, format, reading direction, cast, style, color mood, ending, output folder, and any sensitive constraints.
   - Do not generate images until the user confirms.

4. **Initialize the project**
   - Use `scripts/init_project.js` to create the project directory and structured files.
   - Store the original story in `story.md`.
   - Keep `project.json` as the versioned project manifest.

5. **Plan whole story and chapter split**
   - For long or multi-chapter stories, fill `storyboard/series-plan.json` before individual chapter storyboards.
   - Use [long-story-planning.md](references/long-story-planning.md).
   - Define each chapter's source scope, story function, continuity input/output, estimated page count, and required character stages.
   - Run `scripts/check_series_plan.js` when `series-plan.json` is filled.

6. **Create source detail ledger**
   - Fill `storyboard/source-detail-ledger.json` before writing the page plan.
   - Mark details as A, B, or C using [adaptation-fidelity.md](references/adaptation-fidelity.md).
   - A-level details are main events, character turning points, moral injuries, recurring objects, crucial dialogue, and future callbacks.
   - If the requested page count cannot hold the A-level details, warn the user and propose a longer page count before writing the final storyboard.

7. **Create bibles**
   - `bible/story-bible.json`: plot, genre, page count, pacing.
   - `bible/characters.json`: stable character identity, clothing, color palette, expressions, props.
   - `bible/locations.json`: recurring locations and light sources.
   - `bible/color-style.json`: color manga style, line quality, rendering, page treatment.

8. **Generate character stage reference materials**
   - Use `scripts/build_character_prompts.js` after `bible/characters.json` and `bible/color-style.json` are filled.
   - Before calling image generation, run `scripts/print_generation_prompts.js --project <dir> --kind characters` or otherwise display each character prompt with its target image path.
   - Generate GPT Image2 raster character reference sheets for each required character stage.
   - Save outputs under `references/characters/<character_id>_<stage_id>_turnaround.png`.
   - Keep each generated reference path in the relevant `bible/characters.json` `stages[].reference_images`.

9. **Plan pages and panels**
   - Create `storyboard/page-plan.json` with page beats and panel layouts.
   - Every panel that adapts source material should include `source_detail_ids`.
   - Every page/panel that includes a staged character must include `character_stages`, mapping character id to stage id.
   - Every visible named character in a panel must have `acting` notes: `expression`, `eyes`, `mouth`, `brows`, `body_language`, and `emotion_intensity`.
   - Every panel must include `lettering`. Use [dialogue-lettering.md](references/dialogue-lettering.md) to define ordered speech, inner monologue, background narration, and sound effects. Use `lettering: []` for silent panels.
   - For speech and inner monologue, make the speaker visually unambiguous. Use speaker-specific `placement`, `tail_to`, and `speaker_position` when more than one character appears in the panel.
   - Fill `storyboard/storyboard-coverage.json` to show which source details are covered, merged, or omitted.
   - Use Japanese manga visual language from [manga-visual-language.md](references/manga-visual-language.md).

10. **Build panel/page prompts**
   - Use `scripts/build_panel_prompts.js` after bibles and page plan are filled.
   - Prompts must follow [prompt-patterns.md](references/prompt-patterns.md).
   - Before generating page images, run `scripts/print_generation_prompts.js --project <dir> --kind pages` or otherwise display each page prompt with its target image path.

11. **Use visual reference chaining**
   - Page 1 references the correct character stage reference sheets, location, and style materials.
   - Every page after page 1 must reference the previous finished page.
   - Every page must reference the character stage sheets for characters appearing on that page.
   - If a page continues an action, location, emotion, prop, flashback, or callback from earlier pages, also reference the relevant earlier page or panel crop.
   - Save key panel references under `panel_refs/`.

12. **Generate and compose pages**
   - For every image, follow this order: first output the exact prompt and intended image path, then use GPT Image2 / the built-in image generation tool with that prompt, then save the raster image to the stated path.
   - Generate final raster page images into `pages/`.
   - Let GPT Image2 render final manga lettering natively inside panels: speech bubbles, narration boxes, exact dialogue, and sound effects.
   - Require exact handling of Hanzi, digits, English letters, capitalization, spacing, and punctuation in the final page prompt.
   - Require speaker attribution in the final page prompt: each dialogue line must be visually attached to the named speaker, with tail direction and placement preventing ambiguity.
   - Do not use SVG, HTML, CSS, canvas, or code-native drawing as a substitute for GPT Image2 artwork.
   - Keep prompts, source refs, and revision notes.

13. **Check and revise**
   - Run `scripts/check_series_plan.js` for large stories or multi-chapter projects.
   - Run `scripts/check_storyboard_coverage.js` before image generation.
   - Run `scripts/check_character_acting.js` before image generation.
   - Run `scripts/check_lettering_script.js` before image generation.
   - Run `scripts/check_continuity.js`.
   - Run `scripts/score_quality.js`.
   - Also use [continuity-checklist.md](references/continuity-checklist.md).
   - Use [quality-control.md](references/quality-control.md) for the quality gate and revision loop.
   - When scoring a storyboard against source prose, use [storyboard-fidelity-rubric.md](references/storyboard-fidelity-rubric.md).
   - When scoring a generated manga page, use [quality-rubric.md](references/quality-rubric.md). Do not invent extra scoring dimensions.
   - If a page fails, revise only that page or panel unless the underlying bible is wrong.
   - Use [revision-guide.md](references/revision-guide.md).

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
│   └── panel-prompts.json
├── references/
│   ├── characters/
│   │   └── main_default_turnaround.png
│   ├── character_main.png
│   ├── location_school_rooftop.png
│   └── prop_red_umbrella.png
├── pages/
│   ├── page_001.png
│   └── page_002.png
├── panel_refs/
│   ├── page_001_panel_04.png
│   └── page_002_panel_01.png
└── revisions/
    └── page_002_round_01.json
```

## Scripts

- `scripts/init_project.js --name <slug> --story <file-or-text> --out <dir>` creates the project skeleton.
- `scripts/check_series_plan.js --project <dir>` checks large-story chapter planning and character stage requirements.
- `scripts/build_character_prompts.js --project <dir>` builds GPT Image2 prompts for character reference sheets and records planned reference paths.
- `scripts/build_panel_prompts.js --project <dir>` builds `storyboard/panel-prompts.json` from filled bibles and page plan.
- `scripts/print_generation_prompts.js --project <dir> [--kind characters|pages|all] [--out <file>]` prints or saves prompts with their intended output image paths before image generation.
- `scripts/check_storyboard_coverage.js --project <dir>` checks source-detail coverage before image generation.
- `scripts/check_character_acting.js --project <dir>` checks panel-level facial expression, eye, mouth, and body-language notes for visible characters.
- `scripts/check_lettering_script.js --project <dir>` checks ordered panel lettering, speakers, text, and placement notes.
- `scripts/check_continuity.js --project <dir>` checks missing page refs, missing bibles, prompt coverage, and numbered output gaps.
- `scripts/score_quality.js --project <dir>` scores project readiness and generated-page quality signals against the fixed rubric.
- `scripts/validate_skill.js` checks skill version metadata, project template version, and required UI prompt metadata.

Run scripts with Node:

```bash
node skills/manga-director/scripts/init_project.js --name rain-voice --story story.txt --out ./runs
node skills/manga-director/scripts/check_series_plan.js --project ./runs/rain-voice
node skills/manga-director/scripts/build_character_prompts.js --project ./runs/rain-voice
node skills/manga-director/scripts/build_panel_prompts.js --project ./runs/rain-voice
node skills/manga-director/scripts/print_generation_prompts.js --project ./runs/rain-voice --kind all --out ./runs/rain-voice/storyboard/generation-prompts.md
node skills/manga-director/scripts/check_storyboard_coverage.js --project ./runs/rain-voice
node skills/manga-director/scripts/check_character_acting.js --project ./runs/rain-voice
node skills/manga-director/scripts/check_lettering_script.js --project ./runs/rain-voice
node skills/manga-director/scripts/check_continuity.js --project ./runs/rain-voice
node skills/manga-director/scripts/score_quality.js --project ./runs/rain-voice
node skills/manga-director/scripts/validate_skill.js
```
