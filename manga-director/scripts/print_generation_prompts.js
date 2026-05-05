#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function usage() {
  console.error("Usage: node print_generation_prompts.js --project <dir> [--kind characters|pages|all] [--out <file>]");
  process.exit(1);
}

function args(argv) {
  const out = { kind: "all" };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) usage();
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) usage();
    out[key.slice(2)] = value;
    i += 1;
  }
  if (!["characters", "pages", "all"].includes(out.kind)) usage();
  return out;
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function section(title, items) {
  if (!items.length) return "";
  return [
    `# ${title}`,
    "",
    ...items.flatMap((item, index) => [
      `## ${index + 1}. ${item.label}`,
      "",
      `Output image: \`${item.output}\``,
      "",
      "Prompt:",
      "",
      "```text",
      item.prompt || "",
      "```",
      ""
    ])
  ].join("\n");
}

const parsed = args(process.argv);
if (!parsed.project) usage();

const projectDir = path.resolve(parsed.project);
const characterPrompts = readJsonIfExists(path.join(projectDir, "storyboard", "character-prompts.json"));
const panelPrompts = readJsonIfExists(path.join(projectDir, "storyboard", "panel-prompts.json"));
const parts = [];

if (parsed.kind === "characters" || parsed.kind === "all") {
  const characters = (characterPrompts?.characters || []).map((item) => ({
    label: `Character ${item.character}${item.stage ? ` / stage ${item.stage}` : ""}`,
    output: item.output,
    prompt: item.prompt
  }));
  if (characters.length) parts.push(section("Character Reference Prompts", characters));
}

if (parsed.kind === "pages" || parsed.kind === "all") {
  const pages = (panelPrompts?.pages || []).map((item) => ({
    label: `Page ${String(item.page).padStart(3, "0")}`,
    output: item.output,
    prompt: item.prompt
  }));
  if (pages.length) parts.push(section("Manga Page Prompts", pages));
}

if (!parts.length) {
  console.error("No prompts found. Run build_character_prompts.js and/or build_panel_prompts.js first.");
  process.exit(1);
}

const text = [
  `Project: ${path.basename(projectDir)}`,
  "",
  "Prompt preview rule: show each prompt before generating its corresponding image. Generate the image only after this prompt has been displayed or saved.",
  "",
  parts.join("\n")
].join("\n");

if (parsed.out) {
  const outFile = path.resolve(parsed.out);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${text}\n`);
  console.log(`Wrote prompt preview to ${outFile}`);
} else {
  console.log(text);
}
