# Generation Policy

This is the shared policy source for final manga pages.

## Versioning

- Current skill version: `1.6.4`.
- Current project schema version: `1.0.0`.
- Every new manga project must include `project.json`.
- `project.json` records the skill version, project schema version, generation method, output pattern, and quality gates.
- If an older project has a different skill version, keep its files and migrate only the fields needed for the current request.

## Source Fidelity

- Before page planning, create `storyboard/source-detail-ledger.json`.
- For large stories, create `storyboard/series-plan.json` before chapter-level storyboards.
- Before image generation, create `storyboard/storyboard-coverage.json`.
- A-level source details must be mapped to at least one page/panel.
- Dense prose should not be silently compressed into too few pages. Warn the user and propose a longer version when needed.

## Large Story Planning

- Understand the full story before planning any chapter pages.
- Chapter splits must preserve setup, payoff, emotional progression, unresolved threads, recurring objects, and character changes.
- Every chapter should record continuity going in and out.
- If chapter 1 sets up an object, wound, relationship, or rule needed later, keep it in the chapter plan even if it does not pay off immediately.

## Final Artwork

- Final pages must be raster images generated with GPT Image2 / Codex built-in image generation.
- Valid final outputs are normally `.png` or `.jpg` files under `pages/`.
- Do not use SVG, HTML, CSS, canvas, Mermaid, or other code-drawn pages as final manga art.
- Prompt preview is required before any actual image generation. For each character reference or manga page image, first output the exact prompt and intended image path, then generate that image from the shown prompt.

## Character Stage References

- Generate main and recurring character reference sheets before final comic pages.
- Before generating each character reference sheet, output the character prompt and its target `references/characters/...png` path.
- For large stories, generate one sheet per important character stage, not just one sheet per character.
- Save stage sheets under `references/characters/<character_id>_<stage_id>_turnaround.png`.
- Each staged character used in a page must have `stages[].reference_images` in `bible/characters.json`.
- Every page and panel should identify which character stage is used.
- Page 2+ still references the previous finished page; character stage sheets prevent identity drift, while previous pages preserve scene, lighting, emotion, and action continuity.

## Lettering

- Default lettering mode is `gpt-image2-native`.
- GPT Image2 must render speech bubbles, narration boxes, dialogue, and sound effects directly inside the artwork.
- Storyboard panels must define ordered lettering before image generation: speech, inner monologue, background narration, and sound effects.
- Dialogue between characters must be split into separate ordered items by speaker.
- Do not leave blank bubbles or reserve empty space for manual text unless the user explicitly asks for editable post-lettering.
- Put exact visible text in the page prompt.
- Final page prompts must explicitly state that Hanzi, digits, English letters, capitalization, spacing, and punctuation are copied exactly from the ordered lettering script. Do not allow similar-looking character substitutions, changed numbers, misspelled English words, or invented extra text.
- Final page prompts must explicitly bind each speech bubble and thought caption to the named speaker. If a panel contains multiple visible characters, the bubble position and tail direction must prevent the line from being read as another character's speech.

## Character Acting

- Every visible named character in a panel must have acting notes before final prompt generation.
- Acting notes must describe facial expression, eyes, mouth, brows, posture/body language, and emotional intensity for that exact panel.
- Final page prompts must ask GPT Image2 to render distinct facial acting rather than blank neutral faces.
- Quiet, restrained, or numb characters still need visible micro-expression: gaze, mouth tension, posture, hand pressure, or breath.

## Page Design

- Default output is full-color Japanese manga pages.
- Use dynamic page composition: varied panel sizes, anchor panels, close-up inserts, expressive gutters, diagonals, irregular frames, and border-breaking when story emotion calls for it.
- Encourage important characters, hands, weapons, props, clothing, hair, light, aura, smoke, water, speed lines, and sound effects to break panel borders when it improves drama.
- Panel borders do not need to be rigid rectangles. Angled, uneven, overlapping, or partially interrupted frames are preferred when the page remains readable.
- Avoid equal-height stacked strips unless the user explicitly asks for that quiet layout.
- Narration boxes must look integrated into the art style, not like pasted plain white labels.

## Shared Script Rules

The deterministic script source is `scripts/lib/manga_policy.js`.

When updating hard rules, update that file first, then adjust docs only if the human-facing workflow changed.

Use `scripts/print_generation_prompts.js` to print or save prompt previews from `storyboard/character-prompts.json` and `storyboard/panel-prompts.json`.
