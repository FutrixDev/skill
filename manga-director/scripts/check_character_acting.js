#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function usage() {
  console.error("Usage: node check_character_acting.js --project <dir>");
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

function hasAnyActing(note) {
  if (!note) return false;
  if (typeof note === "string") return Boolean(note.trim());
  return Boolean(
    note.expression ||
    note.eyes ||
    note.mouth ||
    note.brows ||
    note.body_language ||
    note.emotion_intensity ||
    note.notes
  );
}

const parsed = args(process.argv);
if (!parsed.project) usage();

const projectDir = path.resolve(parsed.project);
const pagePlan = readJson(path.join(projectDir, "storyboard", "page-plan.json"));
const errors = [];
const warnings = [];

for (const page of pagePlan.pages || []) {
  for (const panel of page.panels || []) {
    const label = `Page ${page.page} panel ${panel.panel}`;
    const characters = panel.characters || [];
    if (!characters.length) continue;

    const acting = panel.acting || panel.character_acting;
    if (!acting || typeof acting !== "object" || Array.isArray(acting)) {
      errors.push(`${label} has visible characters but no acting object.`);
      continue;
    }

    const expressions = [];
    for (const character of characters) {
      const note = acting[character];
      const where = `${label} character ${character}`;
      if (!hasAnyActing(note)) {
        errors.push(`${where} is missing acting notes.`);
        continue;
      }
      if (typeof note === "string") {
        expressions.push(note.trim());
        warnings.push(`${where} uses a string acting note; prefer structured expression/eyes/mouth/body_language fields.`);
        continue;
      }
      if (!note.expression) errors.push(`${where} must define expression.`);
      if (!note.eyes) warnings.push(`${where} should define eye focus or eye shape.`);
      if (!note.mouth) warnings.push(`${where} should define mouth shape.`);
      if (!note.body_language) warnings.push(`${where} should define posture or body language.`);
      if (note.expression) expressions.push(String(note.expression).trim());
      const expressionText = `${note.expression || ""} ${note.eyes || ""} ${note.mouth || ""} ${note.body_language || ""}`;
      if (/neutral|blank|calm|平静|面无表情/i.test(expressionText) && !/restraint|restrained|suppressed|numb|克制|压抑|麻木|伪装/i.test(expressionText)) {
        warnings.push(`${where} appears neutral; make sure this is intentional and visually specific.`);
      }
    }

    if (characters.length > 1 && expressions.length > 1 && new Set(expressions).size === 1) {
      warnings.push(`${label} gives multiple characters the same expression; vary facial acting unless the mirrored emotion is intentional.`);
    }
  }
}

if (errors.length) {
  console.error("Character acting check failed:");
  for (const err of errors) console.error(`- ${err}`);
  if (warnings.length) {
    console.error("Warnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Character acting check passed.");
if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
