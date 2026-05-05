#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function usage() {
  console.error("Usage: node check_series_plan.js --project <dir>");
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

const parsed = args(process.argv);
if (!parsed.project) usage();

const projectDir = path.resolve(parsed.project);
const errors = [];
const warnings = [];
const series = readJson(path.join(projectDir, "storyboard", "series-plan.json"), errors);
const characters = readJson(path.join(projectDir, "bible", "characters.json"), errors);

if (series) {
  const understanding = series.whole_story_understanding || {};
  for (const key of ["premise", "central_conflict", "emotional_spine", "ending_state"]) {
    if (!understanding[key]) warnings.push(`whole_story_understanding.${key} is empty.`);
  }
  if (!series.chapter_plan?.length) errors.push("series-plan.json must include chapter_plan.");
  const seen = new Set();
  for (const chapter of series.chapter_plan || []) {
    if (!chapter.chapter_id) errors.push("Each chapter must have chapter_id.");
    if (chapter.chapter_id && seen.has(chapter.chapter_id)) errors.push(`Duplicate chapter_id: ${chapter.chapter_id}`);
    seen.add(chapter.chapter_id);
    for (const key of ["title", "source_scope", "story_function"]) {
      if (!chapter[key]) warnings.push(`${chapter.chapter_id || "chapter"} is missing ${key}.`);
    }
    if (!chapter.main_beats?.length) warnings.push(`${chapter.chapter_id || "chapter"} has no main_beats.`);
    if (!chapter.continuity_out?.length) warnings.push(`${chapter.chapter_id || "chapter"} has no continuity_out; later chapters may lose setup.`);
    for (const req of chapter.character_stage_requirements || []) {
      const character = (characters?.characters || []).find((item) => item.id === req.character_id || item.name === req.character_id);
      if (!character) {
        errors.push(`${chapter.chapter_id || "chapter"} references unknown character ${req.character_id}.`);
        continue;
      }
      if (character.stages?.length && !character.stages.some((stage) => stage.id === req.stage_id)) {
        errors.push(`${chapter.chapter_id || "chapter"} references unknown stage ${req.stage_id} for ${req.character_id}.`);
      }
      if (!req.reason) warnings.push(`${chapter.chapter_id || "chapter"} character stage ${req.character_id}/${req.stage_id} has no reason.`);
    }
  }
  const chapters = series.chapter_plan || [];
  for (let i = 1; i < chapters.length; i += 1) {
    if (!chapters[i].continuity_in?.length) warnings.push(`${chapters[i].chapter_id || `chapter ${i + 1}`} has no continuity_in from earlier chapters.`);
  }
}

if (characters) {
  for (const character of characters.characters || []) {
    if (!character.stages?.length) {
      warnings.push(`Character ${character.id || character.name} has no stages; large stories should model age/situation phases.`);
      continue;
    }
    const seenStages = new Set();
    for (const stage of character.stages) {
      if (!stage.id) errors.push(`Character ${character.id || character.name} has a stage without id.`);
      if (stage.id && seenStages.has(stage.id)) errors.push(`Duplicate stage ${stage.id} for character ${character.id || character.name}.`);
      seenStages.add(stage.id);
      if (!stage.story_phase && !stage.age_range && !stage.situation) {
        warnings.push(`Character ${character.id || character.name} stage ${stage.id} needs story_phase, age_range, or situation.`);
      }
    }
  }
}

if (errors.length) {
  console.error("Series plan check failed:");
  for (const err of errors) console.error(`- ${err}`);
  if (warnings.length) {
    console.error("Warnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Series plan check passed.");
if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
