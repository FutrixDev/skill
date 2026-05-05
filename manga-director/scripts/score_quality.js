#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  MIN_PASSING_SCORE,
  PROMPT_REQUIREMENTS,
  QUALITY_RUBRIC,
  numberedPagePath
} = require("./lib/manga_policy");

function usage() {
  console.error("Usage: node score_quality.js --project <dir> [--json] [--fail-under <score>]");
  process.exit(1);
}

function args(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) usage();
    if (key === "--json") {
      out.json = true;
      continue;
    }
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

function clamp(value, max) {
  return Math.max(0, Math.min(max, value));
}

function imageInfo(file) {
  if (!fs.existsSync(file)) return null;
  const buffer = fs.readFileSync(file);
  if (buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return {
      format: "png",
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          format: "jpg",
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5)
        };
      }
      offset += 2 + length;
    }
    return { format: "jpg", width: null, height: null };
  }
  return { format: "unknown", width: null, height: null };
}

function pageTexts(pagePlanPage) {
  const texts = [];
  for (const panel of pagePlanPage?.panels || []) {
    for (const item of panel.lettering || []) {
      if (item.text) texts.push({ key: item.type || "lettering", text: String(item.text) });
    }
    for (const key of ["dialogue", "narration", "sound_effect"]) {
      if (panel[key]) texts.push({ key, text: String(panel[key]) });
    }
  }
  return texts;
}

function actingCoverage(pagePlanPage) {
  let visible = 0;
  let covered = 0;
  for (const panel of pagePlanPage?.panels || []) {
    const acting = panel.acting || panel.character_acting || {};
    for (const character of panel.characters || []) {
      visible += 1;
      const note = acting[character];
      if (!note) continue;
      if (typeof note === "string" && note.trim()) {
        covered += 1;
      } else if (
        note.expression ||
        note.eyes ||
        note.mouth ||
        note.brows ||
        note.body_language ||
        note.emotion_intensity ||
        note.notes
      ) {
        covered += 1;
      }
    }
  }
  return { visible, covered };
}

function missingPromptRequirements(prompt, ids) {
  return PROMPT_REQUIREMENTS
    .filter((req) => ids.includes(req.id))
    .filter((req) => !prompt.includes(req.requiredText))
    .map((req) => req.label);
}

function scorePage(projectDir, manifest, characters, pagePlanPage, promptPage) {
  const prompt = promptPage?.prompt || "";
  const notes = [];
  const categories = {};
  const output = promptPage?.output || numberedPagePath(pagePlanPage.page);
  const outputFile = path.join(projectDir, output);
  const info = imageInfo(outputFile);
  const extOk = /\.(png|jpe?g)$/i.test(output);

  let generation = 15;
  if (!prompt.includes("GPT Image2")) generation -= 5;
  if (!prompt.includes("Do not create SVG")) generation -= 4;
  if (!extOk) generation -= 4;
  if (!info) {
    generation -= 6;
    notes.push(`Output image is not present yet: ${output}`);
  }
  if (manifest?.generation?.code_drawn_final_art_allowed) generation -= 8;
  categories.generation_compliance = clamp(generation, 15);

  let character = 20;
  const knownCharacters = new Set((characters.characters || []).flatMap((c) => [c.id, c.name].filter(Boolean)));
  const usedCharacters = new Set((pagePlanPage.panels || []).flatMap((panel) => panel.characters || []));
  const unknown = [...usedCharacters].filter((id) => !knownCharacters.has(id));
  if (!prompt.includes("Preserve exact character designs")) character -= 6;
  if (!prompt.includes("Use character reference images")) character -= 5;
  if (!knownCharacters.size && usedCharacters.size) character -= 6;
  if (unknown.length) {
    character -= Math.min(8, unknown.length * 3);
    notes.push(`Unknown character ids in page plan: ${unknown.join(", ")}`);
  }
  for (const id of usedCharacters) {
    const characterRecord = (characters.characters || []).find((c) => c.id === id || c.name === id);
    const stageIds = new Set();
    if (pagePlanPage.character_stages?.[characterRecord?.id]) stageIds.add(pagePlanPage.character_stages[characterRecord.id]);
    if (pagePlanPage.character_stages?.[characterRecord?.name]) stageIds.add(pagePlanPage.character_stages[characterRecord.name]);
    for (const panel of pagePlanPage.panels || []) {
      if (!(panel.characters || []).includes(characterRecord?.id) && !(panel.characters || []).includes(characterRecord?.name)) continue;
      if (panel.character_stages?.[characterRecord?.id]) stageIds.add(panel.character_stages[characterRecord.id]);
      if (panel.character_stages?.[characterRecord?.name]) stageIds.add(panel.character_stages[characterRecord.name]);
    }
    if (characterRecord?.stages?.length && stageIds.size === 0) {
      character -= 6;
      notes.push(`Character ${id} has stages but no character_stages mapping on this page.`);
    }
    for (const stageId of stageIds) {
      const stage = characterRecord?.stages?.find((item) => item.id === stageId);
      if (!stage) {
        character -= 4;
        notes.push(`Unknown stage ${stageId} for character ${id}.`);
        continue;
      }
      for (const ref of stage.reference_images || []) {
        if (!promptPage?.must_reference?.includes(ref)) character -= 3;
        if (!fs.existsSync(path.join(projectDir, ref))) {
          character -= 3;
          notes.push(`Character stage reference image is not present yet: ${ref}`);
        }
      }
      if (!stage.reference_images?.length) {
        character -= 5;
        notes.push(`Character ${id} stage ${stageId} has no reference_images.`);
      }
    }
    for (const ref of characterRecord?.reference_images || []) {
      if (!promptPage?.must_reference?.includes(ref)) character -= 3;
      if (!fs.existsSync(path.join(projectDir, ref))) {
        character -= 3;
        notes.push(`Character reference image is not present yet: ${ref}`);
      }
    }
    if (characterRecord && !characterRecord.stages?.length && !characterRecord.reference_images?.length) {
      character -= 6;
      notes.push(`Character ${id} has no reference_images.`);
    }
  }
  if (!pagePlanPage.panels?.some((panel) => panel.continuity_notes)) character -= 2;
  const acting = actingCoverage(pagePlanPage);
  if (acting.visible && acting.covered < acting.visible) {
    character -= Math.min(6, (acting.visible - acting.covered) * 2);
    notes.push(`Missing acting notes for ${acting.visible - acting.covered} visible character appearances.`);
  }
  for (const missing of missingPromptRequirements(prompt, ["expressive_character_acting"])) {
    character -= 4;
    notes.push(`Missing character-acting rule: ${missing}`);
  }
  categories.character_consistency = clamp(character, 20);

  let continuity = 15;
  if (pagePlanPage.page > 1) {
    const previous = numberedPagePath(pagePlanPage.page - 1);
    if (!pagePlanPage.visual_references?.must_reference?.includes(previous)) continuity -= 6;
    if (!promptPage?.must_reference?.includes(previous)) continuity -= 6;
  }
  if (!pagePlanPage.scene) continuity -= 2;
  if (!pagePlanPage.mood) continuity -= 1;
  categories.visual_continuity = clamp(continuity, 15);

  let lettering = 15;
  for (const missing of missingPromptRequirements(prompt, ["native_lettering", "ordered_lettering_script", "exact_character_text", "speaker_attribution", "no_blank_bubbles", "integrated_narration"])) {
    lettering -= 4;
    notes.push(`Missing lettering rule: ${missing}`);
  }
  const texts = pageTexts(pagePlanPage);
  const missingTexts = texts.filter((item) => !prompt.includes(item.text));
  if (missingTexts.length) {
    lettering -= Math.min(8, missingTexts.length * 2);
    notes.push(`Prompt is missing exact planned text: ${missingTexts.map((item) => item.text).join(" | ")}`);
  }
  const longTexts = texts.filter((item) => item.text.length > 70);
  if (longTexts.length) {
    lettering -= Math.min(4, longTexts.length * 2);
    notes.push("Some text lines are long; split them into shorter manga bubbles.");
  }
  categories.integrated_lettering = clamp(lettering, 15);

  let design = 20;
  for (const missing of missingPromptRequirements(prompt, ["dramatic_paneling", "border_breaking_art", "integrated_narration"])) {
    design -= 4;
    notes.push(`Missing page-design rule: ${missing}`);
  }
  const actualPanelCount = pagePlanPage.panels?.length || 0;
  if (pagePlanPage.panel_count && pagePlanPage.panel_count !== actualPanelCount) {
    design -= 3;
    notes.push(`panel_count says ${pagePlanPage.panel_count}, but ${actualPanelCount} panels are planned.`);
  }
  if (actualPanelCount < 3 || actualPanelCount > 6) {
    design -= 3;
    notes.push("Panel count is outside the default 3 to 6 range.");
  }
  if (!pagePlanPage.layout_style || /simple stacked|equal-height/i.test(pagePlanPage.layout_style)) design -= 4;
  if (!/border|break|irregular|diagonal|overlap|斜|破框|不规则/.test(`${pagePlanPage.layout_style || ""} ${pagePlanPage.paneling_notes || ""}`)) {
    design -= 3;
    notes.push("Paneling notes should encourage border-breaking, diagonal, overlapping, or irregular manga frames when appropriate.");
  }
  if (!pagePlanPage.paneling_notes) design -= 3;
  categories.dynamic_page_design = clamp(design, 20);

  let finish = 15;
  if (!info) {
    finish = 0;
  } else {
    if (!["png", "jpg"].includes(info.format)) finish -= 8;
    if (info.width && info.width < 1000) finish -= 3;
    if (info.height && info.height < 1400) finish -= 3;
    if (info.width && info.height && info.height <= info.width) {
      finish -= 3;
      notes.push(`Page image is not portrait-oriented: ${info.width}x${info.height}`);
    }
    notes.push(`Image file detected: ${output} (${info.format}, ${info.width || "?"}x${info.height || "?"})`);
  }
  if (manifest?.quality_control?.require_visual_review_after_generation) {
    notes.push("Visual review is still required after image generation; this script cannot judge faces, hands, or drawing beauty by itself.");
  }
  categories.visual_finish = clamp(finish, 15);

  const total = Object.values(categories).reduce((sum, value) => sum + value, 0);
  return { page: pagePlanPage.page, output, total, categories, notes };
}

function reportMarkdown(result) {
  const lines = [];
  lines.push(`Quality score: ${result.total} / 100`);
  lines.push(`Status: ${result.final_ready ? "pass" : result.missing_images ? "not final - missing generated page images" : "needs revision"}`);
  lines.push("");
  lines.push("| Category | Score |");
  lines.push("|---|---:|");
  for (const category of QUALITY_RUBRIC) {
    lines.push(`| ${category.label} | ${result.category_totals[category.id]} / ${category.points} |`);
  }
  lines.push("");
  lines.push("Page notes:");
  for (const page of result.pages) {
    lines.push(`- Page ${page.page}: ${page.total} / 100`);
    for (const note of page.notes.slice(0, 5)) lines.push(`  - ${note}`);
  }
  return lines.join("\n");
}

const parsed = args(process.argv);
if (!parsed.project) usage();

const projectDir = path.resolve(parsed.project);
const manifest = readJson(path.join(projectDir, "project.json"));
const characters = readJson(path.join(projectDir, "bible", "characters.json"));
const pagePlan = readJson(path.join(projectDir, "storyboard", "page-plan.json"));
const panelPrompts = readJson(path.join(projectDir, "storyboard", "panel-prompts.json"));
const promptByPage = new Map((panelPrompts.pages || []).map((page) => [page.page, page]));
const pages = (pagePlan.pages || []).map((page) => scorePage(projectDir, manifest, characters, page, promptByPage.get(page.page)));

const categoryTotals = {};
for (const category of QUALITY_RUBRIC) {
  const sum = pages.reduce((total, page) => total + page.categories[category.id], 0);
  categoryTotals[category.id] = pages.length ? Math.round(sum / pages.length) : 0;
}
const total = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);
const minimum = Number(parsed["fail-under"] || manifest.quality_control?.minimum_passing_score || MIN_PASSING_SCORE);
const result = {
  project: path.basename(projectDir),
  minimum_passing_score: minimum,
  total,
  missing_images: pages.some((page) => page.notes.some((note) => note.startsWith("Output image is not present yet:"))),
  category_totals: categoryTotals,
  pages
};
result.final_ready = !result.missing_images && result.total >= result.minimum_passing_score;

if (parsed.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(reportMarkdown(result));
}

if (parsed["fail-under"] && !result.final_ready) process.exit(1);
