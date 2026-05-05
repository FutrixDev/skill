# Revision Guide

## Revision Levels

### Panel-Level

Use when one panel has a wrong expression, prop, pose, bubble position, dialogue, narration, or sound effect.

### Page-Level

Use when layout, color mood, reading order, or page-wide continuity is wrong.

### Bible-Level

Use only when the stable character, location, or style definition is wrong.

## Revision Prompt Pattern

```text
Revise page_002 only using GPT Image2 / Codex image generation. Keep the same overall page layout and all correct panels. Use page_001.png, page_002.png, and page_001_panel_05.png as references. Fix panel 1 so it directly continues the previous page: the protagonist should still hold the red umbrella in the right hand, school uniform should remain blue-gray, hair should remain wet and shoulder-length, and the hallway lighting should remain cold fluorescent. Render the speech bubble text directly in the artwork and keep the exact text: "That's... me?" Do not leave blank bubbles, do not add post-lettering placeholders, and do not change other characters or the page color mood. Do not redraw this as SVG, HTML, CSS, canvas, vector markup, or placeholder art.
```

## Record Revisions

Save a revision note:

```json
{
  "page": 2,
  "round": 1,
  "problem": "umbrella disappeared and uniform changed color",
  "reference_files": ["pages/page_001.png", "panel_refs/page_001_panel_05.png"],
  "instruction": "restore umbrella and blue-gray uniform"
}
```
