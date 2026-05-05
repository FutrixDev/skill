#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  SKILL_VERSION,
  PROJECT_SCHEMA_VERSION,
  PROMPT_REQUIREMENTS,
  numberedPagePath
} = require("./lib/manga_policy");

function usage() {
  console.error("Usage: node check_continuity.js --project <dir>");
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

function readJson(file, errors) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    errors.push(`Invalid or missing JSON: ${file}`);
    return null;
  }
}

function exists(file) {
  return fs.existsSync(file);
}

const parsed = args(process.argv);
if (!parsed.project) usage();
const projectDir = path.resolve(parsed.project);
const errors = [];
const warnings = [];

const required = [
  "project.json",
  "story.md",
  "bible/story-bible.json",
  "bible/characters.json",
  "bible/locations.json",
  "bible/color-style.json",
  "storyboard/series-plan.json",
  "storyboard/source-detail-ledger.json",
  "storyboard/storyboard-coverage.json",
  "storyboard/page-plan.json",
  "storyboard/character-prompts.json",
  "storyboard/panel-prompts.json"
];

for (const rel of required) {
  if (!exists(path.join(projectDir, rel))) errors.push(`Missing required file: ${rel}`);
}

const pagePlan = readJson(path.join(projectDir, "storyboard", "page-plan.json"), errors);
const panelPrompts = readJson(path.join(projectDir, "storyboard", "panel-prompts.json"), errors);
const characters = readJson(path.join(projectDir, "bible", "characters.json"), errors);
const manifest = readJson(path.join(projectDir, "project.json"), errors);

if (manifest) {
  if (manifest.skill_name !== "manga-director") errors.push("project.json skill_name should be manga-director.");
  if (manifest.skill_version && manifest.skill_version !== SKILL_VERSION) {
    warnings.push(`Project was initialized with manga-director ${manifest.skill_version}; current skill is ${SKILL_VERSION}.`);
  }
  if (manifest.project_schema_version !== PROJECT_SCHEMA_VERSION) {
    warnings.push(`Project schema is ${manifest.project_schema_version || "missing"}; current schema is ${PROJECT_SCHEMA_VERSION}.`);
  }
  if (manifest.generation?.engine && !manifest.generation.engine.includes("GPT Image2")) {
    errors.push("project.json generation.engine must specify GPT Image2 / Codex built-in image generation.");
  }
  if (!["generate-stage-specific-character-reference-images-before-pages", "generate-main-character-reference-images-before-pages"].includes(manifest.generation?.character_reference_mode)) {
    errors.push("project.json generation.character_reference_mode should require character reference images before pages.");
  }
  if (manifest.generation?.lettering_mode !== "gpt-image2-native") {
    errors.push("project.json generation.lettering_mode should be gpt-image2-native unless the user explicitly requested post-lettering.");
  }
}

if (pagePlan?.pages?.length) {
  const pageNumbers = pagePlan.pages.map((p) => p.page).sort((a, b) => a - b);
  for (let i = 0; i < pageNumbers.length; i += 1) {
    if (pageNumbers[i] !== i + 1) errors.push(`Page plan should be numbered continuously from 1; found page ${pageNumbers[i]} at position ${i + 1}`);
  }

  for (const page of pagePlan.pages) {
    if (!page.beat) warnings.push(`Page ${page.page} has no beat.`);
    if (!page.panels?.length) errors.push(`Page ${page.page} has no panels.`);
    if (page.page > 1) {
      const previous = numberedPagePath(page.page - 1);
      const refs = page.visual_references?.must_reference || [];
      if (!refs.includes(previous)) {
        errors.push(`Page ${page.page} must reference previous page: ${previous}`);
      }
    }
    const usedCharacterIds = new Set((page.panels || []).flatMap((panel) => panel.characters || []));
    for (const id of usedCharacterIds) {
      const character = (characters?.characters || []).find((c) => c.id === id || c.name === id);
      if (!character) {
        errors.push(`Page ${page.page} uses unknown character: ${id}`);
        continue;
      }
      const stageIds = new Set();
      if (page.character_stages?.[character.id]) stageIds.add(page.character_stages[character.id]);
      if (page.character_stages?.[character.name]) stageIds.add(page.character_stages[character.name]);
      for (const panel of page.panels || []) {
        if (!(panel.characters || []).includes(character.id) && !(panel.characters || []).includes(character.name)) continue;
        if (panel.character_stages?.[character.id]) stageIds.add(panel.character_stages[character.id]);
        if (panel.character_stages?.[character.name]) stageIds.add(panel.character_stages[character.name]);
      }
      if (character.stages?.length && stageIds.size === 0) {
        errors.push(`Page ${page.page} uses staged character ${id} without a character_stages mapping.`);
      }
      for (const stageId of stageIds) {
        const stage = character.stages?.find((item) => item.id === stageId);
        if (!stage) {
          errors.push(`Page ${page.page} uses unknown stage ${stageId} for character ${id}.`);
          continue;
        }
        if (!stage.reference_images?.length) {
          errors.push(`Character ${id} stage ${stageId} has no reference_images; generate stage-specific character reference sheets before page generation.`);
        }
        for (const ref of stage.reference_images || []) {
          if (!exists(path.join(projectDir, ref))) warnings.push(`Character stage reference image not found yet: ${ref}`);
        }
      }
      if (!character.stages?.length && !character.reference_images?.length) {
        errors.push(`Character ${id} has no reference_images; generate character reference sheets before page generation.`);
      }
      for (const ref of character.reference_images || []) {
        if (!exists(path.join(projectDir, ref))) warnings.push(`Character reference image not found yet: ${ref}`);
      }
    }
  }
}

if (panelPrompts?.pages?.length) {
  for (const page of panelPrompts.pages) {
    for (const requirement of PROMPT_REQUIREMENTS) {
      if (!page.prompt?.includes(requirement.requiredText)) {
        errors.push(`Page ${page.page} ${requirement.error}.`);
      }
    }
    if (page.page > 1) {
      const previous = numberedPagePath(page.page - 1);
      if (!page.must_reference?.includes(previous)) {
        errors.push(`Page ${page.page} generated prompt is missing previous page reference ${previous}.`);
      }
    }
    for (const ref of page.must_reference || []) {
      if (ref.startsWith("references/characters/") && !exists(path.join(projectDir, ref))) {
        warnings.push(`Prompt references character image not found yet: ${ref}`);
      }
    }
    const outputPath = path.join(projectDir, page.output || "");
    if (!exists(outputPath)) warnings.push(`Output image not found yet: ${page.output}`);
  }
}

if (errors.length) {
  console.error("Continuity check failed:");
  for (const err of errors) console.error(`- ${err}`);
  if (warnings.length) {
    console.error("Warnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Continuity check passed.");
if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
