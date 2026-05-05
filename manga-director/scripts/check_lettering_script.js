#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ALLOWED_TYPES = new Set(["speech", "inner_monologue", "background_narration", "sound_effect"]);
const TEXT_TYPES_REQUIRING_SPEAKER = new Set(["speech", "inner_monologue"]);
const RISKY_INVISIBLE_TEXT = /[\u200B-\u200D\uFEFF]/;
const THREE_PERIODS = /\.{3}/;

function usage() {
  console.error("Usage: node check_lettering_script.js --project <dir>");
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

const parsed = args(process.argv);
if (!parsed.project) usage();

const projectDir = path.resolve(parsed.project);
const pagePlan = readJson(path.join(projectDir, "storyboard", "page-plan.json"));
const errors = [];
const warnings = [];

for (const page of pagePlan.pages || []) {
  for (const panel of page.panels || []) {
    const label = `Page ${page.page} panel ${panel.panel}`;
    const visibleCharacters = new Set(panel.characters || []);
    if (!Object.prototype.hasOwnProperty.call(panel, "lettering")) {
      errors.push(`${label} is missing lettering array. Use lettering: [] for silent panels.`);
      continue;
    }
    if (!Array.isArray(panel.lettering)) {
      errors.push(`${label} lettering must be an array.`);
      continue;
    }
    if ((panel.dialogue || panel.narration || panel.sound_effect) && panel.lettering.length === 0) {
      errors.push(`${label} has legacy dialogue/narration/sound_effect but no structured lettering items.`);
    }
    const orders = new Set();
    for (const item of panel.lettering) {
      const where = `${label} lettering order ${item.order ?? "?"}`;
      if (!Number.isInteger(item.order) || item.order < 1) errors.push(`${where} must have positive integer order.`);
      if (orders.has(item.order)) errors.push(`${label} has duplicate lettering order ${item.order}.`);
      orders.add(item.order);
      if (!ALLOWED_TYPES.has(item.type)) errors.push(`${where} has invalid type ${item.type}.`);
      if (!item.text || !String(item.text).trim()) {
        errors.push(`${where} must include exact visible text.`);
      } else {
        const text = String(item.text);
        if (RISKY_INVISIBLE_TEXT.test(text)) errors.push(`${where} contains invisible Unicode characters that can corrupt lettering.`);
        if (THREE_PERIODS.test(text)) warnings.push(`${where} uses three periods; prefer one explicit ellipsis character or deliberate punctuation in the script.`);
      }
      if (TEXT_TYPES_REQUIRING_SPEAKER.has(item.type) && !item.speaker) {
        errors.push(`${where} type ${item.type} must include speaker.`);
      }
      if (item.type === "speech") {
        const speakerIsVisible = item.speaker && visibleCharacters.has(item.speaker);
        if (speakerIsVisible && !item.tail_to) {
          errors.push(`${where} speech speaker ${item.speaker} is visible, so tail_to must point to that speaker.`);
        }
        if (speakerIsVisible && item.tail_to && item.tail_to !== item.speaker) {
          errors.push(`${where} tail_to=${item.tail_to} conflicts with visible speaker=${item.speaker}.`);
        }
        if (item.speaker && !speakerIsVisible && !/off[-_ ]?panel|off[-_ ]?screen|voice[-_ ]?over/i.test(`${item.placement || ""} ${item.notes || ""}`)) {
          warnings.push(`${where} speaker ${item.speaker} is not listed in panel.characters; mark it as off-panel/voice-over in placement or notes if intentional.`);
        }
        if (speakerIsVisible && item.placement && !String(item.placement).toLowerCase().includes(String(item.speaker).toLowerCase())) {
          warnings.push(`${where} placement does not name visible speaker ${item.speaker}; add speaker-specific placement to avoid wrong bubble attribution.`);
        }
      }
      if (item.type === "inner_monologue") {
        const speakerIsVisible = item.speaker && visibleCharacters.has(item.speaker);
        if (speakerIsVisible && item.placement && !String(item.placement).toLowerCase().includes(String(item.speaker).toLowerCase())) {
          warnings.push(`${where} thought placement does not name visible speaker ${item.speaker}; add speaker-specific placement.`);
        }
      }
      if (!item.placement) warnings.push(`${where} has no placement note.`);
      if (item.text && String(item.text).length > 70) warnings.push(`${where} text is long for native GPT Image2 lettering; split it if possible.`);
    }
    const sorted = [...orders].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i] !== i + 1) {
        warnings.push(`${label} lettering order should usually be continuous from 1; found ${sorted.join(", ")}.`);
        break;
      }
    }
  }
}

if (errors.length) {
  console.error("Lettering script check failed:");
  for (const err of errors) console.error(`- ${err}`);
  if (warnings.length) {
    console.error("Warnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Lettering script check passed.");
if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
