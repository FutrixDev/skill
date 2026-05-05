#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  SKILL_VERSION,
  characterReferencePath,
  characterStageReferencePath
} = require("./lib/manga_policy");

function usage() {
  console.error("Usage: node build_character_prompts.js --project <dir>");
  process.exit(1);
}

function args(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) usage();
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) usage();
    out[key.slice(2)] = value;
    i += 1;
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function characterPrompt(character, style, stage = null) {
  const id = character.id || "character";
  const name = character.name || id;
  const stageLabel = stage ? `${stage.label || stage.id} stage` : "default stage";
  const stageAppearance = stage?.appearance_overrides || {};
  const outfit = stage?.outfit?.description || character.default_outfit?.description || "use the character bible outfit";
  const colors = (stage?.outfit?.fixed_colors?.length ? stage.outfit.fixed_colors : character.default_outfit?.fixed_colors)?.join(", ") || "fixed outfit colors from character bible";
  const props = (stage?.recurring_props?.length ? stage.recurring_props : (character.recurring_props || character.props || [])).join(", ") || "no recurring props unless listed in the story";
  return [
    `Create a GPT Image2-generated full-color Japanese manga character reference sheet for ${name}, ${stageLabel}.`,
    "This is production reference material for later comic pages, not a final story page.",
    `Character identity: ${character.role || "story character"}, age ${stage?.age_range || character.age || "as described by the story"}, story phase ${stage?.story_phase || "default"}, situation ${stage?.situation || "normal continuity state"}.`,
    `Stable base: ${character.face || "stable face structure"}, ${character.hair || "stable hairstyle"}, ${character.eyes || "stable eye color"}, ${character.body || "stable body type"}.`,
    `Stage-specific appearance: ${stageAppearance.face || "same base face"}; ${stageAppearance.hair || "same base hair"}; ${stageAppearance.eyes || "same base eyes"}; ${stageAppearance.body || "same base body"}; injuries/scars ${stageAppearance.scars_or_injuries || "none unless specified"}.`,
    `Stage outfit: ${outfit}; fixed colors: ${colors}.`,
    `Personality and expression range: ${character.personality || "as described by the story"}; stage emotional baseline: ${stage?.emotional_baseline || "as described by the story"}; signature expressions: ${(character.signature_expressions || []).join(", ") || "neutral, serious, surprised"}.`,
    `Recurring props: ${props}.`,
    `Style: ${style.style_name || "full-color Japanese manga"}; ${style.line_art || "clean expressive manga line art"}; ${style.rendering || "anime-style cel shading"}.`,
    "Layout: one clean reference sheet with front view, three-quarter view, side view, back view, three expression close-ups, outfit color swatches, and recurring prop close-up if any.",
    "No dialogue, no speech bubbles, no narration, no story panel borders, no watermark.",
    "Preserve exact character design details for this stage in future manga pages: base identity, stage age, hair state, eye color, body type, outfit shape, outfit colors, accessories, injuries, and props."
  ].join("\n");
}

const parsed = args(process.argv);
if (!parsed.project) usage();

const projectDir = path.resolve(parsed.project);
const characterFile = path.join(projectDir, "bible", "characters.json");
const characters = readJson(characterFile);
const style = readJson(path.join(projectDir, "bible", "color-style.json"));
fs.mkdirSync(path.join(projectDir, "references", "characters"), { recursive: true });

const prompts = {
  project: path.basename(projectDir),
  skill_version: SKILL_VERSION,
  generated_at: new Date().toISOString(),
  characters: (characters.characters || []).flatMap((character) => {
    const id = character.id || character.name;
    if (character.stages?.length) {
      return character.stages.map((stage) => {
        const output = characterStageReferencePath(id, stage.id || "stage");
        stage.reference_images = Array.from(new Set([...(stage.reference_images || []), output]));
        return {
          character: id,
          stage: stage.id || "stage",
          output,
          prompt: characterPrompt(character, style, stage)
        };
      });
    }
    const output = characterReferencePath(id);
    character.reference_images = Array.from(new Set([...(character.reference_images || []), output]));
    return [{
      character: id,
      stage: "default",
      output,
      prompt: characterPrompt(character, style)
    }];
  })
};

writeJson(characterFile, characters);
writeJson(path.join(projectDir, "storyboard", "character-prompts.json"), prompts);
console.log(`Wrote ${prompts.characters.length} character prompts to ${path.join(projectDir, "storyboard", "character-prompts.json")}`);
