#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  SKILL_VERSION,
  numberedPagePath,
  negativeConstraintsText
} = require("./lib/manga_policy");

function usage() {
  console.error("Usage: node build_panel_prompts.js --project <dir>");
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

function requiredPageRef(page) {
  if (page.page <= 1) return [];
  const previous = numberedPagePath(page.page - 1);
  const current = page.visual_references?.must_reference || [];
  return current.includes(previous) ? current : [previous, ...current];
}

function characterRefsForPage(characters, page) {
  const ids = new Set((page.panels || []).flatMap((panel) => panel.characters || []));
  const all = characters.characters || [];
  const refs = [];
  for (const character of all) {
    const id = character.id || character.name;
    if (!ids.has(character.id) && !ids.has(character.name)) continue;
    const stageIds = new Set();
    if (page.character_stages?.[id]) stageIds.add(page.character_stages[id]);
    if (page.character_stages?.[character.name]) stageIds.add(page.character_stages[character.name]);
    for (const panel of page.panels || []) {
      if (!(panel.characters || []).includes(id) && !(panel.characters || []).includes(character.name)) continue;
      if (panel.character_stages?.[id]) stageIds.add(panel.character_stages[id]);
      if (panel.character_stages?.[character.name]) stageIds.add(panel.character_stages[character.name]);
    }
    if (character.stages?.length && stageIds.size) {
      for (const stageId of stageIds) {
        const stage = character.stages.find((item) => item.id === stageId);
        refs.push(...(stage?.reference_images || []));
      }
    } else if (character.stages?.length) {
      for (const stage of character.stages) refs.push(...(stage.reference_images || []));
    } else {
      refs.push(...(character.reference_images || []));
    }
  }
  return refs;
}

function characterSummary(characters, ids, stageMap = {}) {
  if (!ids || ids.length === 0) return "";
  const all = characters.characters || [];
  const selected = all.filter((c) => ids.includes(c.id) || ids.includes(c.name));
  return selected.map((c) => {
    const id = c.id || c.name;
    const stageId = stageMap[id] || stageMap[c.name];
    const stage = c.stages?.find((item) => item.id === stageId);
    const stageAppearance = stage?.appearance_overrides || {};
    const colors = (stage?.outfit?.fixed_colors?.length ? stage.outfit.fixed_colors : c.default_outfit?.fixed_colors)?.join(", ") || "fixed outfit colors from bible";
    const outfit = stage?.outfit?.description || c.default_outfit?.description || "";
    const stageText = stage ? ` stage ${stage.id} (${stage.label || stage.story_phase || "stage-specific reference"})` : "";
    return `${c.name || c.id}${stageText}: ${stageAppearance.face || c.face}; ${stageAppearance.hair || c.hair}; ${stageAppearance.eyes || c.eyes}; outfit ${outfit}; colors ${colors}`;
  }).join(" | ");
}

function legacyLettering(panel) {
  const items = [];
  if (panel.dialogue) {
    items.push({
      order: items.length + 1,
      type: "speech",
      speaker: (panel.characters || [])[0] || "",
      text: panel.dialogue,
      placement: "natural manga speech bubble",
      tail_to: (panel.characters || [])[0] || "",
      priority: "required"
    });
  }
  if (panel.narration) {
    items.push({
      order: items.length + 1,
      type: "background_narration",
      speaker: "",
      text: panel.narration,
      placement: "integrated style-matched narration box",
      tail_to: "",
      priority: "required"
    });
  }
  if (panel.sound_effect) {
    items.push({
      order: items.length + 1,
      type: "sound_effect",
      speaker: "",
      text: panel.sound_effect,
      placement: "visible manga sound effect near the action",
      tail_to: "",
      priority: "required"
    });
  }
  return items;
}

function letteringScript(panel) {
  const items = Array.isArray(panel.lettering) ? panel.lettering : legacyLettering(panel);
  if (!items.length) {
    return "Ordered lettering script: silent panel, no visible dialogue, inner monologue, narration, or sound effect text.";
  }
  const lines = items
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((item) => {
      const speaker = item.speaker ? ` speaker=${item.speaker}` : "";
      const tail = item.tail_to ? ` tail_to=${item.tail_to}` : "";
      const placement = item.placement ? ` placement=${item.placement}` : "";
      const priority = item.priority ? ` priority=${item.priority}` : "";
      return `${item.order}. type=${item.type}${speaker}${tail}${placement}${priority}: "${item.text}"`;
    });
  return `Ordered lettering script: render these exact visible text items in this order as native manga lettering: ${lines.join(" | ")}.`;
}

function characterAccuracyInstruction() {
  return "Text accuracy: Hanzi, digits, and English letters must be copied exactly from the ordered lettering script. Preserve every Chinese character, Arabic numeral, Latin letter, capitalization, spacing, and punctuation mark. Do not substitute similar-looking characters, simplify or invent characters, change numbers, misspell English words, or add unplanned text.";
}

function speakerAttributionInstruction() {
  return "Speaker attribution: every speech bubble and thought caption must visually belong to the named speaker. Place each bubble or thought caption near its speaker, aim the bubble tail at the named speaker when a tail is used, and never attach a line to the nearest, largest, or more dramatic character if that character is not the named speaker.";
}

function speakerAttributionScript(panel) {
  const items = Array.isArray(panel.lettering) ? panel.lettering : legacyLettering(panel);
  const speechItems = items
    .filter((item) => item.type === "speech" || item.type === "inner_monologue")
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!speechItems.length) return "";
  const lines = speechItems.map((item) => {
    const kind = item.type === "inner_monologue" ? "thought caption" : "speech bubble";
    const tail = item.type === "speech" ? ` Bubble tail must point to ${item.tail_to || item.speaker}.` : "";
    const position = item.speaker_position ? ` Speaker visual position: ${item.speaker_position}.` : "";
    return `${item.order}. "${item.text}" belongs only to speaker=${item.speaker}; render it as a ${kind} near ${item.speaker}.${tail}${position} Do not place or point this text at any other character.`;
  });
  return `Speaker attribution map: ${lines.join(" | ")}`;
}

function characterActingInstruction() {
  return "Character acting: render distinct facial expressions, eye focus, mouth shape, brow tension, posture, and hand/body reactions for each named character according to the panel acting notes. Avoid blank neutral faces unless the storyboard explicitly calls for numb restraint; even restraint should show subtle eye, mouth, or posture detail.";
}

function actingScript(panel) {
  const acting = panel.acting || panel.character_acting || {};
  const lines = [];
  for (const character of panel.characters || []) {
    const note = acting[character] || {};
    if (typeof note === "string") {
      if (note.trim()) lines.push(`${character}: expression=${note.trim()}`);
      continue;
    }
    const parts = [];
    if (note.expression) parts.push(`expression=${note.expression}`);
    if (note.eyes) parts.push(`eyes=${note.eyes}`);
    if (note.mouth) parts.push(`mouth=${note.mouth}`);
    if (note.brows) parts.push(`brows=${note.brows}`);
    if (note.body_language) parts.push(`body_language=${note.body_language}`);
    if (note.emotion_intensity) parts.push(`emotion_intensity=${note.emotion_intensity}`);
    if (note.notes) parts.push(`notes=${note.notes}`);
    if (parts.length) lines.push(`${character}: ${parts.join("; ")}`);
  }
  if (!lines.length) return "";
  return `Character acting notes: ${lines.join(" | ")}.`;
}

function pagePrompt(projectName, storyBible, characters, locations, style, page) {
  const pageNo = String(page.page).padStart(3, "0");
  const refs = Array.from(new Set([...requiredPageRef(page), ...characterRefsForPage(characters, page)]));
  const callbacks = page.visual_references?.callback_reference || [];
  const opening = page.page === 1
    ? `Create page_${pageNo} as a GPT Image2-generated full-color Japanese manga raster page with native manga lettering. Use the character bible, location bible, and color-style bible as the source of truth.`
    : `Create page_${pageNo} as a GPT Image2-generated full-color Japanese manga raster page with native manga lettering and a direct continuation of page_${String(page.page - 1).padStart(3, "0")}. Use the previous finished page and referenced key panel crops as visual references.`;

  const panelText = (page.panels || []).map((panel) => {
    const stageMap = { ...(page.character_stages || {}), ...(panel.character_stages || {}) };
    const chars = characterSummary(characters, panel.characters || [], stageMap);
    const stageLine = Object.keys(stageMap).length ? `Character stage references: ${Object.entries(stageMap).map(([character, stage]) => `${character}=${stage}`).join(", ")}.` : "";
    return [
      `Panel ${panel.panel}: ${panel.type || "story panel"}, ${panel.shot || "medium shot"}.`,
      panel.description || "",
      chars ? `Characters: ${chars}.` : "",
      stageLine,
      actingScript(panel),
      letteringScript(panel),
      speakerAttributionScript(panel),
      panel.source_detail_ids?.length ? `Source detail ids: ${panel.source_detail_ids.join(", ")}.` : "",
      panel.continuity_notes ? `Continuity: ${panel.continuity_notes}.` : ""
    ].filter(Boolean).join(" ");
  }).join("\n");

  return [
    opening,
    "Generation method: use GPT Image2 / Codex built-in image generation for final artwork. Do not create SVG, HTML, CSS, canvas, vector markup, Mermaid, or code-generated placeholder art.",
    "Use character reference images for every recurring character on this page. Use the exact character stage reference named in each panel when a character has multiple age, outfit, injury, status, or life-phase designs. Treat the stage-specific character reference sheets as the fixed source for face, hair, body type, outfit silhouette, outfit colors, accessories, injuries, emotional baseline, and recurring props.",
    "Lettering method: GPT Image2 must render final manga lettering directly inside the page: speech bubbles, narration boxes, exact dialogue text, and sound effects. Do not leave blank bubbles or reserve empty post-lettering space unless the user explicitly requested manual lettering.",
    "Ordered lettering script: follow each panel's lettering order exactly. Keep speech, inner monologue, background narration, and sound effects distinct and visually integrated.",
    characterAccuracyInstruction(),
    speakerAttributionInstruction(),
    characterActingInstruction(),
    `Project: ${projectName}.`,
    `Format: numbered standalone full-color manga page, ${storyBible.reading_flow?.page_progression || "top-to-bottom"} page movement, rows ${storyBible.reading_flow?.row_direction || "right-to-left"}.`,
    `Story beat: ${page.beat || ""}`,
    `Scene: ${page.scene || ""}`,
    `Mood: ${page.mood || ""}`,
    `Must reference: ${refs.length ? refs.join(", ") : "character, location, and style references"}.`,
    callbacks.length ? `Callback references: ${callbacks.join(", ")}.` : "",
    `Location continuity: ${(locations.locations || []).map((l) => `${l.name || l.id}: ${l.description}; ${l.light_source}; ${l.color_temperature}`).join(" | ")}`,
    `Style: ${style.style_name}; ${style.line_art}; ${style.rendering}; ${style.page_treatment}.`,
    `Panel layout: ${page.layout || "top-to-bottom manga page layout"}.`,
    `Dramatic paneling: ${page.layout_style || style.paneling || "dynamic Japanese manga page composition with varied panel sizes, one anchor panel, close-up inserts, expressive gutters, irregular panel shapes, diagonal cuts, and expressive border-breaking panels where emotion calls for it"}. ${page.paneling_notes || "Avoid a simple stack of equal-height horizontal strips unless explicitly requested."}`,
    "Border-breaking art: allow important characters, hands, weapons, props, cloth, hair, speed lines, aura, light, smoke, water, or sound effects to intentionally break out of panel borders when it increases drama. Panel borders may be angled, uneven, overlapping, or partially interrupted; keep the top-to-bottom reading order clear.",
    `Narration box style: ${style.narration_boxes || "integrated style-matched manga narration boxes, not plain white rectangular labels"}. Match captions to the scene material and mood.`,
    panelText,
    "Preserve exact character designs from the character reference sheets, and preserve clothing colors, hairstyles, eye colors, recurring props, scene layout, light source, and emotional state from referenced pages.",
    `Negative constraints: ${negativeConstraintsText()}.`
  ].filter(Boolean).join("\n");
}

const parsed = args(process.argv);
if (!parsed.project) usage();

const projectDir = path.resolve(parsed.project);
const storyBible = readJson(path.join(projectDir, "bible", "story-bible.json"));
const characters = readJson(path.join(projectDir, "bible", "characters.json"));
const locations = readJson(path.join(projectDir, "bible", "locations.json"));
const style = readJson(path.join(projectDir, "bible", "color-style.json"));
const pagePlan = readJson(path.join(projectDir, "storyboard", "page-plan.json"));

const result = {
  project: path.basename(projectDir),
  skill_version: SKILL_VERSION,
  generated_at: new Date().toISOString(),
  pages: (pagePlan.pages || []).map((page) => ({
    page: page.page,
    output: numberedPagePath(page.page),
    must_reference: Array.from(new Set([...requiredPageRef(page), ...characterRefsForPage(characters, page)])),
    callback_reference: page.visual_references?.callback_reference || [],
    prompt: pagePrompt(path.basename(projectDir), storyBible, characters, locations, style, page)
  }))
};

fs.writeFileSync(path.join(projectDir, "storyboard", "panel-prompts.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(`Wrote ${result.pages.length} page prompts to ${path.join(projectDir, "storyboard", "panel-prompts.json")}`);
