# Dialogue And Lettering Script

Use this reference when planning storyboard panels.

## Rule

Every panel in `storyboard/page-plan.json` must include a `lettering` array. Use an empty array for a silent panel.

Each lettering item must define:

- `order`: reading order inside the panel, starting at 1
- `type`: one of `speech`, `inner_monologue`, `background_narration`, `sound_effect`
- `speaker`: required for `speech` and `inner_monologue`
- `text`: exact visible text
- `placement`: speech bubble, thought caption, integrated narration box, sound effect near object, etc.
- `tail_to`: character id for speech bubble tails when useful
- `priority`: `required` or `optional`
- `speaker_position`: optional visual anchor such as `left character`, `right character`, `foreground`, `back turned figure`, or `off-panel voice`
- `notes`: short visual placement or tone note

## Text Types

- `speech`: dialogue between characters. Keep the speaker and order explicit.
- `inner_monologue`: a character's private thought or self-address.
- `background_narration`: narrator text, time/place explanation, historical context, or background explanation. It must be visually integrated, not a pasted white card.
- `sound_effect`: visible effect text such as impact, footsteps, wind, door, metal, aura, or silence markers.

## Dialogue Order

Order matters. If two people speak in one panel, use two separate lettering items:

```json
[
  {
    "order": 1,
    "type": "speech",
    "speaker": "luqingheng",
    "text": "欠的不是粮，是他们改了册。",
    "placement": "speech bubble above Lu Qingheng",
    "tail_to": "luqingheng",
    "priority": "required"
  },
  {
    "order": 2,
    "type": "speech",
    "speaker": "pursuer",
    "text": "册在庄主手里。",
    "placement": "jagged speech bubble from pursuer",
    "tail_to": "pursuer",
    "priority": "required"
  }
]
```

## Speaker Attribution

Speech and inner monologue must not only have correct text; they must visually belong to the correct person.

For each `speech` item:

- `speaker` is the only character who says the line.
- If the speaker is visible in the panel, `tail_to` must match `speaker`.
- `placement` should name the speaker or their position when more than one character is visible.
- Use `speaker_position` when the panel has two or more characters, back views, similar costumes, or a dramatic wide shot.
- If the speaker is off-panel, say that explicitly in `placement` or `notes`.

Example:

```json
{
  "order": 1,
  "type": "speech",
  "speaker": "shen_qiao_young",
  "text": "因为没有人敢，所以国家会乱。",
  "placement": "speech bubble near left-side Shen Qiao, away from Zhao Li",
  "tail_to": "shen_qiao_young",
  "speaker_position": "left character facing the burning village",
  "priority": "required",
  "notes": "Do not attach the bubble tail to Zhao Li on the right."
}
```

## Boundaries

- Do not leave dialogue to be invented later during image generation.
- Do not combine multiple speakers into one text item.
- Do not let a bubble tail or placement make a line look like it belongs to another visible character.
- Keep text short enough for GPT Image2 to render as native manga lettering.
- Treat each `text` value as character-accurate source material. Chinese Hanzi, Arabic numerals, English letters, capitalization, spaces, and punctuation must be preserved exactly in final prompts.
- Avoid invisible Unicode characters in lettering text. If three periods are intended, decide whether the visible text should be `...` or `…` before prompt generation.
- Use background narration only when it adds story information that cannot be shown clearly in the art.
- If the panel is silent, set `lettering: []` rather than omitting the field.
