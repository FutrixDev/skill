# Character Acting

Use this reference when planning panels with visible characters.

## Rule

Every visible named character in `storyboard/page-plan.json` must have panel-level `acting` notes. The notes should describe what the face and body are doing in this exact panel, not the character's general personality.

Use this structure:

```json
"acting": {
  "shen_qiao_young": {
    "expression": "restrained anger under a calm face",
    "eyes": "looking past Zhao Li toward the burning village, focused and heavy",
    "mouth": "small tight line, barely open after speaking",
    "brows": "slightly lowered inner brows",
    "body_language": "still shoulders, one hand gripping bamboo slips",
    "emotion_intensity": "low but tense",
    "notes": "Do not make him blank; the restraint should show in the eyes."
  }
}
```

## What To Define

- `expression`: the readable emotional mask or visible feeling.
- `eyes`: gaze direction, eye shape, tears, glare, avoidance, focus, emptiness, shock, or softness.
- `mouth`: open shout, tight line, half smile, trembling lips, clenched teeth, silent breath, etc.
- `brows`: raised, knitted, lowered, asymmetrical, relaxed, hidden by hair, etc.
- `body_language`: shoulders, hands, stance, leaning, recoil, stillness, grip, step, or collapse.
- `emotion_intensity`: low, medium, high, suppressed, explosive, numb, mixed, or shifting.
- `notes`: short instruction that prevents a common wrong read.

## Manga Acting Principles

- Give different characters different reactions to the same event.
- Use close-up inserts for eyes, mouth, hands, or objects when emotion matters.
- A quiet character still needs visible acting: gaze, mouth tension, posture, or hand pressure.
- Avoid generic labels such as `sad`, `angry`, or `calm` without visual details.
- Do not repeat the same face across a whole page unless the story intentionally shows numbness, shock, or ritual restraint.
- When a character says one thing but feels another, describe the surface expression and the hidden emotion.

## Common Failures

- Everyone has the same neutral face.
- Dialogue says anger or fear, but the face is calm.
- A silent panel has no visible reaction.
- The body pose is dramatic but the face is blank.
- The prompt describes personality rather than the exact panel expression.
