#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  SKILL_VERSION,
  PROJECT_SCHEMA_VERSION,
  MIN_PASSING_SCORE
} = require("./lib/manga_policy");

const skillRoot = path.resolve(__dirname, "..");
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(skillRoot, rel), "utf8");
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

function requireIncludes(file, text, message) {
  if (!read(file).includes(text)) errors.push(message || `${file} must include ${text}`);
}

const skillMd = read("SKILL.md");
if (!skillMd.includes(`version: "${SKILL_VERSION}"`)) {
  errors.push(`SKILL.md metadata version must be ${SKILL_VERSION}.`);
}
if (!skillMd.includes(`project-schema-version: "${PROJECT_SCHEMA_VERSION}"`)) {
  errors.push(`SKILL.md project schema version must be ${PROJECT_SCHEMA_VERSION}.`);
}

const projectTemplate = readJson("assets/templates/project.json");
if (projectTemplate.skill_version !== SKILL_VERSION) {
  errors.push(`assets/templates/project.json skill_version must be ${SKILL_VERSION}.`);
}
if (projectTemplate.project_schema_version !== PROJECT_SCHEMA_VERSION) {
  errors.push(`assets/templates/project.json project_schema_version must be ${PROJECT_SCHEMA_VERSION}.`);
}
if (projectTemplate.quality_control?.minimum_passing_score !== MIN_PASSING_SCORE) {
  errors.push(`assets/templates/project.json minimum_passing_score must be ${MIN_PASSING_SCORE}.`);
}

requireIncludes("references/generation-policy.md", `Current skill version: \`${SKILL_VERSION}\`.`);
requireIncludes("references/generation-policy.md", `Current project schema version: \`${PROJECT_SCHEMA_VERSION}\`.`);
requireIncludes("agents/openai.yaml", "$manga-director", "agents/openai.yaml default_prompt must mention $manga-director.");
requireIncludes("SKILL.md", "scripts/build_character_prompts.js", "SKILL.md must mention build_character_prompts.js.");
requireIncludes("SKILL.md", "scripts/print_generation_prompts.js", "SKILL.md must mention print_generation_prompts.js.");
requireIncludes("SKILL.md", "scripts/check_storyboard_coverage.js", "SKILL.md must mention check_storyboard_coverage.js.");
requireIncludes("SKILL.md", "scripts/check_lettering_script.js", "SKILL.md must mention check_lettering_script.js.");
requireIncludes("SKILL.md", "scripts/check_series_plan.js", "SKILL.md must mention check_series_plan.js.");
requireIncludes("SKILL.md", "scripts/score_quality.js", "SKILL.md must mention score_quality.js.");
requireIncludes("SKILL.md", "project.json", "SKILL.md must mention project.json.");
requireIncludes("SKILL.md", "source-detail-ledger.json", "SKILL.md must mention source-detail-ledger.json.");
requireIncludes("SKILL.md", "series-plan.json", "SKILL.md must mention series-plan.json.");
requireIncludes("SKILL.md", "character_stages", "SKILL.md must mention character_stages.");
requireIncludes("SKILL.md", "lettering", "SKILL.md must mention lettering.");
requireIncludes("SKILL.md", "Chinese Hanzi", "SKILL.md must mention exact Chinese Hanzi handling.");
requireIncludes("SKILL.md", "speaker attribution", "SKILL.md must mention speaker attribution.");
requireIncludes("SKILL.md", "check_character_acting.js", "SKILL.md must mention check_character_acting.js.");
requireIncludes("SKILL.md", "acting", "SKILL.md must mention acting notes.");
requireIncludes("SKILL.md", "Before generating any actual character reference image or manga page image", "SKILL.md must include prompt preview before image generation rule.");
requireIncludes("references/generation-policy.md", "Character Stage References", "generation-policy.md must include character stage reference rules.");
requireIncludes("references/generation-policy.md", "Source Fidelity", "generation-policy.md must include source fidelity rules.");
requireIncludes("references/generation-policy.md", "Hanzi, digits, English letters", "generation-policy.md must include exact text character rules.");
requireIncludes("references/generation-policy.md", "bind each speech bubble", "generation-policy.md must include speaker attribution rules.");
requireIncludes("references/generation-policy.md", "Character Acting", "generation-policy.md must include character acting rules.");
requireIncludes("references/generation-policy.md", "Prompt preview is required", "generation-policy.md must include prompt preview rule.");
requireIncludes("references/long-story-planning.md", "Character Stages", "long-story-planning.md must include character stage rules.");
requireIncludes("references/character-acting.md", "Manga Acting Principles", "character-acting.md must include manga acting principles.");
requireIncludes("references/dialogue-lettering.md", "Dialogue Order", "dialogue-lettering.md must include dialogue order rules.");
requireIncludes("references/dialogue-lettering.md", "Speaker Attribution", "dialogue-lettering.md must include speaker attribution rules.");
requireIncludes("references/prompt-patterns.md", "Hanzi, digits, and English letters must be copied exactly", "prompt-patterns.md must include exact text accuracy prompt language.");
requireIncludes("references/prompt-patterns.md", "every speech bubble and thought caption must visually belong to the named speaker", "prompt-patterns.md must include speaker attribution prompt language.");
requireIncludes("references/prompt-patterns.md", "show or save the exact prompt", "prompt-patterns.md must include prompt preview language.");
requireIncludes("references/storyboard-fidelity-rubric.md", "Source main event coverage", "storyboard-fidelity-rubric.md must define source coverage scoring.");

if (errors.length) {
  console.error("Skill validation failed:");
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log(`Skill validation passed for manga-director ${SKILL_VERSION}.`);
