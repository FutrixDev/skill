# Prompt Patterns

Use `generation-policy.md` for the current hard rules. If hard rules change, update `scripts/lib/manga_policy.js` first so generated prompts and checks stay in sync.

## Page Prompt Structure

Use this order:

1. Output format and page number.
2. Generation method: GPT Image2 raster artwork.
3. Character reference sheets and visual references to preserve.
4. Page-level story beat.
5. Panel layout and reading direction.
6. Character identity and current state.
7. Character acting: expression, eyes, mouth, brows, posture/body language, emotional intensity.
8. Location, lighting, and color mood.
9. Panel-by-panel content.
10. Dramatic manga page design.
11. Manga rendering style.
12. Ordered lettering script: exact dialogue, dialogue order, speaker attribution, inner monologue, background narration, sound effects, bubble/caption placement, and exact Hanzi/digit/English character handling.
13. Negative constraints.

Every final page prompt must say the output is a GPT Image2-generated raster manga page. Do not ask for SVG, HTML, CSS, canvas, vector markup, or code-generated art.

Before using a final prompt to generate an image, show or save the exact prompt together with the intended output image path. This applies to both character reference sheets and manga pages.

Every final page prompt must also ask GPT Image2 to render manga lettering natively inside the artwork. Do not default to blank bubbles or later text insertion.

Every final page prompt must include an ordered lettering script for each panel. Keep speech, inner monologue, background narration, and sound effects separate.

Every final page prompt must include this text accuracy rule: Hanzi, digits, and English letters must be copied exactly from the ordered lettering script. Preserve Chinese characters, Arabic numerals, Latin letters, capitalization, spacing, and punctuation. Do not substitute similar-looking characters, alter numbers, misspell English words, or add unplanned text.

Every final page prompt must include this speaker attribution rule: every speech bubble and thought caption must visually belong to the named speaker. Place it near that speaker, point the bubble tail at that speaker when a tail is used, and do not attach it to the nearest or most dramatic character if that character is not the named speaker.

Every final page prompt must include character acting notes. For every visible named character, specify expression, eye focus, mouth shape, brow tension, body language, and emotional intensity. Do not rely on generic words like calm, sad, or angry without visible details.

Every final page prompt must ask for dramatic manga paneling and border-breaking art. Avoid plain stacked strips or rigid all-rectangular panel grids unless the user explicitly requested that format.

Every final page prompt must reference the correct character stage sheets for characters appearing on that page. The stage sheet protects identity across age, outfit, injury, rank, and situation changes; previous-page references protect action, lighting, scene state, and emotional continuity.

## Page 1 Prompt Opening

```text
Create page_001 as a GPT Image2-generated full-color Japanese manga raster page with native manga lettering. Use the provided character bible, location bible, and color-style bible as the source of truth. Preserve exact character designs, clothing colors, hairstyle, eye color, props, and scene lighting. Render speech bubbles, narration boxes, exact dialogue text, and sound effects directly inside the artwork. Do not create blank bubbles, post-lettering placeholders, SVG, HTML, CSS, canvas, vector markup, or diagram art.
Use character reference images for every recurring character on this page. If a character has multiple stages, use the exact stage specified by `character_stages`.
```

## Page 2+ Prompt Opening

```text
Create page_002 as a GPT Image2-generated full-color Japanese manga raster page with native manga lettering and a direct continuation of page_001. Use page_001.png and the referenced key panel crops as visual references. Preserve the same character designs, clothing colors, hairstyle, location layout, light source, color mood, props, and emotional state from the previous page. Render speech bubbles, narration boxes, exact dialogue text, and sound effects directly inside the artwork. Do not redesign characters, costumes, props, or location. Do not create blank bubbles, post-lettering placeholders, SVG, HTML, CSS, canvas, vector markup, or diagram art.
Use character reference images for every recurring character on this page. If a character has multiple stages, use the exact stage specified by `character_stages`.
```

## Callback Reference Clause

```text
This page intentionally echoes the earlier panel reference <file>. Keep the object/pose/location recognizable while advancing the story.
```

## Panel Description Pattern

```text
Panel 3, close-up, protagonist's right hand gripping the wet red umbrella handle. Rain droplets on knuckles. The hand trembles slightly. Keep the same sleeve color and umbrella design from page_001_panel_04.
```

## Integrated Lettering

Default:

```text
Render all manga lettering natively inside the image: speech bubbles, narration boxes, exact dialogue text, and sound effects. Place bubbles naturally in the panel composition without covering faces, hands, key props, or action lines.
Text accuracy: Hanzi, digits, and English letters must be copied exactly from the ordered lettering script. Preserve every Chinese character, Arabic numeral, Latin letter, capitalization, spacing, and punctuation mark. Do not substitute similar-looking characters, change numbers, misspell English words, or add unplanned text.
Speaker attribution: every speech bubble and thought caption must visually belong to the named speaker. Place each bubble or thought caption near its speaker, aim the bubble tail at the named speaker when a tail is used, and never attach a line to a different visible character.
Character acting: render distinct facial expressions, eye focus, mouth shape, brow tension, posture, and hand/body reactions for each named character according to the panel acting notes. Avoid blank neutral faces unless the storyboard explicitly calls for numb restraint.
```

Ordered panel lettering:

```text
Ordered lettering script:
1. type=speech speaker=shenqiao tail_to=shenqiao placement=small speech bubble near his lowered face: "现在不能。"
2. type=inner_monologue speaker=shenqiao placement=thin thought caption near the broken pen: "笔也会杀人。"
3. type=background_narration placement=integrated ink-edged narration box: "北原的雪下起来没有声响。"
Speaker attribution map:
1. "现在不能。" belongs only to speaker=shenqiao; render it as a speech bubble near shenqiao. Bubble tail must point to shenqiao. Do not place or point this text at any other character.
2. "笔也会杀人。" belongs only to speaker=shenqiao; render it as a thought caption near shenqiao. Do not place this thought near another character.
```

Character acting example:

```text
Character acting notes: shenqiao: expression=restrained anger under a calm face; eyes=looking past Zhao Li toward the burning village; mouth=tight line after speaking; brows=slightly lowered inner brows; body_language=still shoulders, hand gripping bamboo slips; emotion_intensity=low but tense | zhao_li: expression=laugh fading into unease; eyes=side glance toward Shen Qiao; mouth=half-open, smile collapsing; brows=knitted; body_language=wooden staff lowered from his shoulder; emotion_intensity=medium.
```

Narration boxes:

```text
Render narration boxes as integrated manga design elements, not plain white labels. Match them to the scene: parchment texture for ancient settings, ink-edged boxes for fantasy/wuxia, translucent dark boxes for night scenes, or soft cream manga boxes for quiet modern scenes.
```

Use exact visible text:

```text
Panel 3 lettering:
- Speech bubble, Aoi: "Don't open the door."
- Small sound effect near the handle: "カチャ..."
```

Rules:

- Keep every line short.
- Prefer one short sentence per bubble.
- Keep dialogue order explicit.
- Do not combine multiple speakers in one lettering item.
- Keep speaker attribution explicit. If two characters share a panel, name the speaker's side or visual position in placement.
- A speech bubble tail must not point to a different visible character.
- Keep character acting explicit for every visible named character.
- Avoid blank neutral faces unless the acting notes deliberately specify numbness, shock, or suppressed emotion.
- Use the story's language unless the user asks otherwise.
- Preserve each visible character exactly, including Hanzi, digits, English case, spacing, and punctuation.
- For Japanese manga style, sound effects may be Japanese kana if appropriate.
- Do not ask GPT Image2 to leave blank bubbles unless the user explicitly requests manual lettering.

## Dramatic Paneling

Default page layout:

```text
Use dynamic Japanese manga page composition: varied panel sizes, one large anchor panel, smaller reaction or insert panels, cinematic close-ups, expressive gutters, and occasional diagonal or border-breaking panels where the emotion calls for it. Avoid a simple stack of equal-height horizontal strips.
Border-breaking art: allow important characters, hands, weapons, props, cloth, hair, speed lines, aura, light, smoke, water, or sound effects to intentionally break out of panel borders when it increases drama. Panel borders may be angled, uneven, overlapping, or partially interrupted; keep the top-to-bottom reading order clear.
```

Paneling rules:

- Use panel size to show importance.
- Use close-up inserts to make emotion or clues land.
- Use a large final panel for payoff when a page ends on a reveal.
- Use diagonal panels for motion, pursuit, panic, or spiritual pressure.
- Use tall panels for distance, longing, isolation, or someone walking away.
- Use character or prop breakouts for reveals, attacks, pursuits, emotional pressure, magic/spiritual force, impact, intimacy, and important object moments.
- Let panels tilt, overlap, or interrupt borders when the page needs motion or tension.
- Avoid mechanical three-row layouts unless the scene is intentionally calm and the user accepts that style.
- Avoid every panel being a perfect straight rectangle unless restraint is the deliberate effect.

## Negative Constraints

Use concrete constraints:

- no character redesign
- no clothing color changes
- no hairstyle changes
- no inconsistent eye color
- no missing recurring prop
- no unreadable panel order
- no extra characters
- no distorted hands
- no fake watermark
- no random/unplanned text
- no speech bubble covering face
- no blank speech bubbles
- no post-lettering placeholder space
- no missing dialogue
- no incorrect dialogue text
- no dialogue assigned to the wrong speaker
- no speech bubble tail pointing to the wrong character
- no ambiguous speaker attribution
- no blank or neutral faces when emotion is specified
- no same expression across all characters
- no expression that contradicts the storyboard acting notes
- no incorrect Hanzi
- no incorrect digits
- no incorrect English letters
- no changed punctuation
- no plain white rectangular narration cards
- no caption boxes that look pasted on
- no simple equal-height stacked strip layout
- no boring grid-only panel design
- no rigid all-rectangular panel grid
- no overly straight mechanical panel borders when drama calls for expressive framing
- no SVG/vector/code-generated appearance
- no flat placeholder layout
