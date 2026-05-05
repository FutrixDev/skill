const SKILL_VERSION = "1.6.4";
const PROJECT_SCHEMA_VERSION = "1.0.0";
const MIN_PASSING_SCORE = 80;

const OUTPUT = {
  defaultExtension: ".png",
  defaultFolder: "pages",
  characterReferenceFolder: "references/characters",
  pagePattern: "page_001.png"
};

const PROMPT_REQUIREMENTS = [
  {
    id: "gpt_image2_raster",
    label: "GPT Image2 raster generation",
    requiredText: "GPT Image2",
    error: "prompt is missing GPT Image2 generation language"
  },
  {
    id: "no_code_art",
    label: "No code-drawn final art",
    requiredText: "Do not create SVG",
    error: "prompt is missing the no-SVG/no-code-art constraint"
  },
  {
    id: "native_lettering",
    label: "Native GPT Image2 lettering",
    requiredText: "GPT Image2 must render final manga lettering",
    error: "prompt is missing native GPT Image2 lettering language"
  },
  {
    id: "ordered_lettering_script",
    label: "Ordered lettering script",
    requiredText: "Ordered lettering script",
    error: "prompt is missing ordered lettering script guidance"
  },
  {
    id: "exact_character_text",
    label: "Exact Hanzi, digits, and English lettering",
    requiredText: "Hanzi, digits, and English letters must be copied exactly",
    error: "prompt is missing exact Hanzi/digit/English character guidance"
  },
  {
    id: "speaker_attribution",
    label: "Speaker attribution",
    requiredText: "every speech bubble and thought caption must visually belong to the named speaker",
    error: "prompt is missing speaker attribution guidance"
  },
  {
    id: "expressive_character_acting",
    label: "Expressive character acting",
    requiredText: "Character acting: render distinct facial expressions",
    error: "prompt is missing character expression and acting guidance"
  },
  {
    id: "no_blank_bubbles",
    label: "No blank bubbles",
    requiredText: "no blank speech bubbles",
    error: "prompt is missing the no-blank-bubbles constraint"
  },
  {
    id: "dramatic_paneling",
    label: "Dramatic manga paneling",
    requiredText: "Dramatic paneling",
    error: "prompt is missing dramatic paneling guidance"
  },
  {
    id: "border_breaking_art",
    label: "Border-breaking manga art",
    requiredText: "Border-breaking art",
    error: "prompt is missing border-breaking art guidance"
  },
  {
    id: "integrated_narration",
    label: "Integrated narration boxes",
    requiredText: "no plain white rectangular narration cards",
    error: "prompt is missing the integrated narration-box constraint"
  },
  {
    id: "character_preservation",
    label: "Preserve character designs",
    requiredText: "Preserve exact character designs",
    error: "prompt is missing character preservation language"
  },
  {
    id: "character_reference_sheet",
    label: "Character reference sheets",
    requiredText: "Use character reference images",
    error: "prompt is missing character reference image guidance"
  }
];

const NEGATIVE_CONSTRAINTS = [
  "no character redesign",
  "no clothing color changes",
  "no hairstyle changes",
  "no inconsistent eye color",
  "no missing recurring prop",
  "no unreadable panel order",
  "no random/unplanned text",
  "no missing dialogue",
  "no incorrect dialogue text",
  "no dialogue assigned to the wrong speaker",
  "no speech bubble tail pointing to the wrong character",
  "no ambiguous speaker attribution",
  "no blank or neutral faces when emotion is specified",
  "no same expression across all characters",
  "no expression that contradicts the storyboard acting notes",
  "no incorrect Hanzi",
  "no incorrect digits",
  "no incorrect English letters",
  "no changed punctuation",
  "no blank speech bubbles",
  "no post-lettering placeholder space",
  "no plain white rectangular narration cards",
  "no caption boxes that look pasted on",
  "no simple equal-height stacked strip layout",
  "no boring grid-only panel design",
  "no rigid all-rectangular panel grid",
  "no overly straight mechanical panel borders when drama calls for expressive framing",
  "no watermark",
  "no speech bubble covering faces",
  "no SVG/vector/code-generated appearance",
  "no flat placeholder layout"
];

const QUALITY_RUBRIC = [
  {
    id: "generation_compliance",
    label: "GPT Image2 raster generation compliance",
    points: 15
  },
  {
    id: "character_consistency",
    label: "Character and key-object consistency",
    points: 20
  },
  {
    id: "visual_continuity",
    label: "Cross-panel and cross-page visual continuity",
    points: 15
  },
  {
    id: "integrated_lettering",
    label: "Integrated lettering",
    points: 15
  },
  {
    id: "dynamic_page_design",
    label: "Dynamic manga page design",
    points: 20
  },
  {
    id: "visual_finish",
    label: "Visual finish and readability",
    points: 15
  }
];

const STORYBOARD_FIDELITY_RUBRIC = [
  {
    id: "main_event_coverage",
    label: "Source main event coverage",
    points: 20
  },
  {
    id: "character_motivation",
    label: "Character motivation and turning points",
    points: 20
  },
  {
    id: "key_detail_objects",
    label: "Key details and recurring objects",
    points: 20
  },
  {
    id: "emotional_texture",
    label: "Emotional texture and atmosphere",
    points: 15
  },
  {
    id: "manga_adaptation",
    label: "Manga adaptation strength",
    points: 15
  },
  {
    id: "compression_accountability",
    label: "Page count and compression accountability",
    points: 10
  }
];

function numberedPagePath(pageNo, ext = OUTPUT.defaultExtension) {
  return `${OUTPUT.defaultFolder}/page_${String(pageNo).padStart(3, "0")}${ext}`;
}

function characterReferencePath(characterId, kind = "turnaround", ext = OUTPUT.defaultExtension) {
  return `${OUTPUT.characterReferenceFolder}/${characterId}_${kind}${ext}`;
}

function characterStageReferencePath(characterId, stageId, kind = "turnaround", ext = OUTPUT.defaultExtension) {
  return `${OUTPUT.characterReferenceFolder}/${characterId}_${stageId}_${kind}${ext}`;
}

function negativeConstraintsText() {
  return NEGATIVE_CONSTRAINTS.join(", ");
}

module.exports = {
  SKILL_VERSION,
  PROJECT_SCHEMA_VERSION,
  MIN_PASSING_SCORE,
  OUTPUT,
  PROMPT_REQUIREMENTS,
  NEGATIVE_CONSTRAINTS,
  QUALITY_RUBRIC,
  STORYBOARD_FIDELITY_RUBRIC,
  numberedPagePath,
  characterReferencePath,
  characterStageReferencePath,
  negativeConstraintsText
};
