# Adaptation Fidelity

Use this reference before writing page plans from a prose story. For long or multi-chapter stories, create `series-plan.json` first, then create the source detail ledger for each chapter or adaptation scope.

## Source Detail Ledger

Before page planning, create `storyboard/source-detail-ledger.json`.

Extract source details into three levels:

- `A`: must appear in the storyboard. These are main events, character turning points, moral injuries, recurring objects, crucial dialogue, and details that explain who the character becomes.
- `B`: should appear, but may be merged with a nearby panel if the merge is recorded.
- `C`: optional texture. Use these when page count allows, but do not let them crowd out A/B details.

Useful categories:

- `main_event`
- `motivation`
- `turning_point`
- `moral_injury`
- `relationship`
- `object`
- `setting`
- `world_pressure`
- `dialogue`
- `future_callback`
- `atmosphere`

## Coverage Rule

Every A-level detail needs at least one matching page/panel in `storyboard-coverage.json`.

Every B-level detail must be either:

- covered by a page/panel, or
- listed in `omissions` with a concrete merge or deletion reason.

## Page Count Warning

If A-level details exceed available page capacity, warn before writing the storyboard.

As a rough rule:

- A dense prose chapter usually needs one page for every 3 to 5 A-level details.
- A moral turning point should get a panel group, not a single caption.
- A final montage should not carry unrelated setup, climax, consequence, and farewell in one page unless the user explicitly accepts heavy compression.

## Large Story Scope

When the source spans multiple chapters or a character changes across years/statuses, the ledger should identify which chapter and character stage each detail belongs to. A detail that seems small in chapter 1 may be A-level if it sets up a later object, wound, relationship, law, oath, or personality trait.

## What Not To Do

- Do not turn source details into vague summaries such as "the hero suffers" or "the village is poor" without visual evidence.
- Do not delete the reason behind a character's action.
- Do not reduce a morally important hesitation to a single action panel.
- Do not keep only beautiful atmosphere while dropping the social or political pressure that caused the scene.
