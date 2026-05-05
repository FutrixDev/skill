#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  SKILL_VERSION,
  PROJECT_SCHEMA_VERSION,
  MIN_PASSING_SCORE,
  OUTPUT
} = require("./lib/manga_policy");

function usage() {
  console.error("Usage: node init_project.js --name <slug> --story <file-or-text> --out <dir>");
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

function readStory(value) {
  const candidate = path.resolve(value);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return fs.readFileSync(candidate, "utf8").trim();
  }
  return value.trim();
}

function copyTemplate(templateDir, name, dest) {
  fs.copyFileSync(path.join(templateDir, name), dest);
}

function writeProjectManifest(templateDir, projectDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(templateDir, "project.json"), "utf8"));
  manifest.project_schema_version = PROJECT_SCHEMA_VERSION;
  manifest.skill_version = SKILL_VERSION;
  manifest.created_at = new Date().toISOString();
  manifest.output.folder = OUTPUT.defaultFolder;
  manifest.output.page_pattern = OUTPUT.pagePattern;
  manifest.output.default_extension = OUTPUT.defaultExtension;
  manifest.quality_control.minimum_passing_score = MIN_PASSING_SCORE;
  fs.writeFileSync(path.join(projectDir, "project.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

const parsed = args(process.argv);
if (!parsed.name || !parsed.story || !parsed.out) usage();

const skillRoot = path.resolve(__dirname, "..");
const templateDir = path.join(skillRoot, "assets", "templates");
const projectDir = path.resolve(parsed.out, parsed.name);
const story = readStory(parsed.story);

if (!story) {
  console.error("Story is empty.");
  process.exit(1);
}

for (const dir of [
  projectDir,
  path.join(projectDir, "bible"),
  path.join(projectDir, "storyboard"),
  path.join(projectDir, "references"),
  path.join(projectDir, "references", "characters"),
  path.join(projectDir, "pages"),
  path.join(projectDir, "panel_refs"),
  path.join(projectDir, "revisions")
]) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(path.join(projectDir, "story.md"), `${story}\n`);
writeProjectManifest(templateDir, projectDir);
copyTemplate(templateDir, "story-bible.json", path.join(projectDir, "bible", "story-bible.json"));
copyTemplate(templateDir, "characters.json", path.join(projectDir, "bible", "characters.json"));
copyTemplate(templateDir, "locations.json", path.join(projectDir, "bible", "locations.json"));
copyTemplate(templateDir, "color-style.json", path.join(projectDir, "bible", "color-style.json"));
copyTemplate(templateDir, "series-plan.json", path.join(projectDir, "storyboard", "series-plan.json"));
copyTemplate(templateDir, "page-plan.json", path.join(projectDir, "storyboard", "page-plan.json"));
copyTemplate(templateDir, "panel-prompt.json", path.join(projectDir, "storyboard", "panel-prompts.json"));
copyTemplate(templateDir, "source-detail-ledger.json", path.join(projectDir, "storyboard", "source-detail-ledger.json"));
copyTemplate(templateDir, "storyboard-coverage.json", path.join(projectDir, "storyboard", "storyboard-coverage.json"));

console.log(`Created manga project: ${projectDir}`);
console.log("Next: fill bible/*.json, storyboard/source-detail-ledger.json, storyboard/page-plan.json, and storyboard/storyboard-coverage.json.");
