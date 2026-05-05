#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  STORYBOARD_FIDELITY_RUBRIC
} = require("./lib/manga_policy");

function usage() {
  console.error("Usage: node check_storyboard_coverage.js --project <dir> [--json] [--fail-under <score>]");
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

function detailMap(ledger) {
  return new Map((ledger.details || []).map((detail) => [detail.id, detail]));
}

function panelExists(pagePlan, pageNo, panelNo) {
  const page = (pagePlan.pages || []).find((item) => item.page === pageNo);
  if (!page) return false;
  if (panelNo === undefined || panelNo === null || panelNo === "") return true;
  return (page.panels || []).some((panel) => panel.panel === panelNo);
}

function pageCapacity(pagePlan) {
  return (pagePlan.pages || []).reduce((sum, page) => sum + ((page.panels || []).length || page.panel_count || 0), 0);
}

function coverageByDetail(coverage) {
  const map = new Map();
  for (const item of coverage.coverage || []) {
    if (!item.detail_id) continue;
    if (!map.has(item.detail_id)) map.set(item.detail_id, []);
    map.get(item.detail_id).push(item);
  }
  return map;
}

function omissionByDetail(coverage) {
  const map = new Map();
  for (const item of coverage.omissions || []) {
    if (item.detail_id) map.set(item.detail_id, item);
  }
  return map;
}

function score(projectDir) {
  const ledger = readJson(path.join(projectDir, "storyboard", "source-detail-ledger.json"));
  const coverage = readJson(path.join(projectDir, "storyboard", "storyboard-coverage.json"));
  const pagePlan = readJson(path.join(projectDir, "storyboard", "page-plan.json"));
  const details = ledger.details || [];
  const byId = detailMap(ledger);
  const covered = coverageByDetail(coverage);
  const omitted = omissionByDetail(coverage);
  const notes = [];
  const critical = [];
  const categories = {};

  const aDetails = details.filter((detail) => detail.level === "A");
  const bDetails = details.filter((detail) => detail.level === "B");
  const cDetails = details.filter((detail) => detail.level === "C");
  const coveredA = aDetails.filter((detail) => covered.has(detail.id));
  const coveredB = bDetails.filter((detail) => covered.has(detail.id));
  const accountedB = bDetails.filter((detail) => covered.has(detail.id) || omitted.has(detail.id));
  const capacity = pageCapacity(pagePlan);

  for (const detail of aDetails) {
    if (!covered.has(detail.id)) {
      critical.push(`A-level source detail is not covered: ${detail.id} (${detail.source_summary || detail.category || "no summary"})`);
    }
  }

  for (const detail of bDetails) {
    if (!covered.has(detail.id) && !omitted.has(detail.id)) {
      notes.push(`B-level source detail has no coverage or omission reason: ${detail.id}`);
    }
  }

  for (const entry of coverage.coverage || []) {
    if (!byId.has(entry.detail_id)) {
      notes.push(`Coverage references unknown detail id: ${entry.detail_id}`);
      continue;
    }
    if (!panelExists(pagePlan, entry.page, entry.panel)) {
      notes.push(`Coverage target does not exist: ${entry.detail_id} page ${entry.page} panel ${entry.panel}`);
    }
  }

  for (const omission of coverage.omissions || []) {
    const detail = byId.get(omission.detail_id);
    if (!detail) {
      notes.push(`Omission references unknown detail id: ${omission.detail_id}`);
      continue;
    }
    if (detail.level === "A") {
      critical.push(`A-level source detail is listed as omitted: ${detail.id}`);
    }
    if (!omission.reason || !omission.replacement) {
      notes.push(`Omission needs both reason and replacement: ${detail.id}`);
    }
  }

  const eventDetails = details.filter((detail) => detail.category === "main_event");
  const eventCovered = eventDetails.filter((detail) => covered.has(detail.id));
  categories.main_event_coverage = eventDetails.length
    ? clamp(Math.round((eventCovered.length / eventDetails.length) * 20), 20)
    : 20;

  const motivationDetails = details.filter((detail) => ["motivation", "turning_point", "moral_injury"].includes(detail.category));
  const motivationCovered = motivationDetails.filter((detail) => covered.has(detail.id));
  categories.character_motivation = motivationDetails.length
    ? clamp(Math.round((motivationCovered.length / motivationDetails.length) * 20), 20)
    : 20;

  const objectDetails = details.filter((detail) => ["object", "dialogue", "future_callback"].includes(detail.category));
  const objectCovered = objectDetails.filter((detail) => covered.has(detail.id));
  categories.key_detail_objects = objectDetails.length
    ? clamp(Math.round((objectCovered.length / objectDetails.length) * 20), 20)
    : 20;

  const textureDetails = details.filter((detail) => ["setting", "world_pressure", "atmosphere", "relationship"].includes(detail.category));
  const textureCovered = textureDetails.filter((detail) => covered.has(detail.id));
  categories.emotional_texture = textureDetails.length
    ? clamp(Math.round((textureCovered.length / textureDetails.length) * 15), 15)
    : 15;

  let mangaAdaptation = 15;
  const missingVisualEvidence = details.filter((detail) => ["A", "B"].includes(detail.level) && (!detail.required_visual_evidence || detail.required_visual_evidence.length === 0));
  if (missingVisualEvidence.length) {
    mangaAdaptation -= Math.min(6, missingVisualEvidence.length);
    notes.push(`A/B details missing required_visual_evidence: ${missingVisualEvidence.map((detail) => detail.id).join(", ")}`);
  }
  const textOnlyCoverage = (coverage.coverage || []).filter((entry) => /caption|summary|旁白|概括/i.test(entry.adaptation_note || ""));
  if (textOnlyCoverage.length) {
    mangaAdaptation -= Math.min(5, textOnlyCoverage.length);
    notes.push("Some coverage relies on summary/caption language; consider visual panel evidence.");
  }
  categories.manga_adaptation = clamp(mangaAdaptation, 15);

  let compression = 10;
  if (aDetails.length > Math.max(1, (pagePlan.pages || []).length) * 5) {
    compression -= 4;
    notes.push(`A-level detail count (${aDetails.length}) is dense for ${(pagePlan.pages || []).length} pages; consider more pages or explicit compression notes.`);
  }
  if (details.length > capacity * 2) {
    compression -= 3;
    notes.push(`Source detail count (${details.length}) is high for storyboard capacity (${capacity} panels).`);
  }
  const unaccountedB = bDetails.length - accountedB.length;
  if (unaccountedB > 0) compression -= Math.min(4, unaccountedB);
  if (cDetails.length && !coverage.omissions) compression -= 1;
  categories.compression_accountability = clamp(compression, 10);

  const total = STORYBOARD_FIDELITY_RUBRIC.reduce((sum, category) => sum + (categories[category.id] || 0), 0);
  return {
    project: path.basename(projectDir),
    total,
    passed: critical.length === 0 && total >= 80,
    categories,
    counts: {
      details: details.length,
      a_details: aDetails.length,
      b_details: bDetails.length,
      covered_a: coveredA.length,
      covered_b: coveredB.length,
      page_count: (pagePlan.pages || []).length,
      panel_capacity: capacity
    },
    critical,
    notes
  };
}

function report(result) {
  const lines = [];
  lines.push(`Storyboard fidelity score: ${result.total} / 100`);
  lines.push(`Status: ${result.passed ? "pass" : "needs revision"}`);
  lines.push("");
  lines.push("| Category | Score |");
  lines.push("|---|---:|");
  for (const category of STORYBOARD_FIDELITY_RUBRIC) {
    lines.push(`| ${category.label} | ${result.categories[category.id]} / ${category.points} |`);
  }
  lines.push("");
  lines.push(`Counts: ${result.counts.details} source details, ${result.counts.a_details} A-level, ${result.counts.covered_a} A-level covered, ${result.counts.page_count} pages, ${result.counts.panel_capacity} panels.`);
  if (result.critical.length) {
    lines.push("");
    lines.push("Critical omissions:");
    for (const item of result.critical) lines.push(`- ${item}`);
  }
  if (result.notes.length) {
    lines.push("");
    lines.push("Notes:");
    for (const item of result.notes) lines.push(`- ${item}`);
  }
  return lines.join("\n");
}

const parsed = args(process.argv);
if (!parsed.project) usage();

const projectDir = path.resolve(parsed.project);
const result = score(projectDir);
if (parsed.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(report(result));
}

const failUnder = parsed["fail-under"] ? Number(parsed["fail-under"]) : null;
if ((failUnder && result.total < failUnder) || result.critical.length) process.exit(1);
