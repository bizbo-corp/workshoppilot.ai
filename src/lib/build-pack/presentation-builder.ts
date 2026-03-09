import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import type { AllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import type { PresentationSummary } from '@/lib/ai/prompts/presentation-generation';

// ── Design tokens (matching Workshop Output Template.pptx) ─────────────
const C = {
  bg: 'EEEEEE',        // Light gray slide background (lt2 from template)
  black: '000000',      // Title text (dk1)
  darkGray: '595959',   // Body/secondary text (dk2)
  white: 'FFFFFF',
  imageBorder: 'D6D7D2', // Warm gray border (used on validate slide)
};

// Template uses EB Garamond Medium for titles, Arial for body
const F = { title: 'EB Garamond', body: 'Arial' };

// Layout positions from template (in inches, converted from EMU)
const L = {
  titleX: 0.34,       // 311,700 EMU
  titleY: 0.49,       // 445,025 EMU
  titleW: 9.32,       // 8,520,600 EMU
  titleH: 0.63,       // 572,700 EMU
  bodyX: 0.34,
  bodyY: 1.26,        // 1,152,475 EMU
  bodyW: 9.32,
  bodyH: 3.74,        // 3,416,400 EMU
  slideNumX: 9.26,    // 8,472,458 EMU
  slideNumY: 5.10,    // 4,663,217 EMU
  slideNumW: 0.60,
  slideNumH: 0.43,
};

let slideNum = 0;

/** Step key -> display title (matching template slide titles) */
const STEP_TITLES: Record<string, string> = {
  challenge: 'Challenge',
  stakeholderMapping: 'Stakeholders',
  userResearch: 'User Research',
  senseMaking: 'Research Sense-making',
  persona: 'Persona Development',
  journeyMapping: 'Journey Mapping',
  reframe: 'Reframing Challenge',
  ideation: 'Ideation',
  concept: 'Concept Development',
  validate: 'Validate',
};

const STEP_ORDER = [
  'challenge',
  'stakeholderMapping',
  'userResearch',
  'senseMaking',
  'persona',
  'journeyMapping',
  'reframe',
  'ideation',
  'concept',
  'validate',
];

// Load logo at runtime from public directory (avoids inline base64 truncation)
let logoBase64: string | null = null;
try {
  const logoPath = path.join(process.cwd(), 'public', 'workshoppilot-logo.png');
  const logoBuffer = fs.readFileSync(logoPath);
  logoBase64 = `image/png;base64,${logoBuffer.toString('base64')}`;
} catch {
  // Logo not found — will fall back to text placeholder
}

/**
 * Build a PPTX buffer matching the Workshop Output Template design.
 * Clean slides: #EEEEEE bg, EB Garamond titles, image in body area.
 */
export async function buildPresentation(
  stepImages: Record<string, string>,
  summaries: Record<string, string>,
  conceptName: string,
  summary: PresentationSummary,
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.author = 'WorkshopPilot.ai';
  pptx.company = 'WorkshopPilot.ai';
  pptx.subject = `${conceptName} — Design Thinking Workshop`;
  pptx.title = conceptName;
  pptx.layout = 'LAYOUT_16x9';

  slideNum = 0;

  // 1. Title slide
  addTitleSlide(pptx, conceptName);

  // 2. Executive summary (text-only)
  addExecSummarySlide(pptx, summary.executiveSummary);

  // 3. Challenge slide (text-only — HMW statement)
  if (summaries.challenge) {
    addChallengeSlide(pptx, summaries.challenge);
  }

  // 4-12. Step slides — image-based, only for steps with captured images
  // Skip challenge since it's already a text slide
  for (const stepKey of STEP_ORDER) {
    if (stepKey === 'challenge') continue;
    const imageData = stepImages[stepKey];
    if (!imageData) continue;

    const title = STEP_TITLES[stepKey] || stepKey;
    addImageSlide(pptx, title, imageData);
  }

  const output = await pptx.write({ outputType: 'nodebuffer' });
  return output as Buffer;
}

/**
 * Legacy build function for backward compatibility.
 */
export async function buildPresentationLegacy(
  artifacts: AllWorkshopArtifacts,
  summary: PresentationSummary,
): Promise<Buffer> {
  const concept = artifacts.concept as Record<string, unknown> | null;
  const concepts = (concept?.concepts as Array<Record<string, unknown>>) || [];
  const primaryConcept = concepts[0] || concept || {};
  const conceptName = (primaryConcept.name as string) || (primaryConcept.conceptName as string) || (concept?.name as string) || 'Product';
  const summaries = generateSummariesFromArtifacts(artifacts);
  return buildPresentation({}, summaries, conceptName, summary);
}

// ── Helpers ────────────────────────────────────────────────────────────
function addSlideNumber(slide: PptxGenJS.Slide) {
  slideNum++;
  slide.addText(`${slideNum}`, {
    x: L.slideNumX,
    y: L.slideNumY,
    w: L.slideNumW,
    h: L.slideNumH,
    fontSize: 10,
    fontFace: F.body,
    color: C.darkGray,
    align: 'right',
  });
}

// ── Title Slide ────────────────────────────────────────────────────────
// Template: centered title (52pt), subtitle below, logo bottom-left
function addTitleSlide(pptx: PptxGenJS, name: string) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };

  // Center title
  slide.addText(name, {
    x: L.titleX,
    y: 0.81,    // 744,575 EMU
    w: L.titleW,
    h: 2.24,    // 2,052,600 EMU
    fontSize: 52,
    fontFace: F.title,
    color: C.black,
    align: 'center',
    valign: 'bottom',
  });

  // Subtitle
  slide.addText('Design Thinking Workshop', {
    x: L.titleX,
    y: 3.10,    // 2,834,125 EMU
    w: L.titleW,
    h: 0.87,    // 792,600 EMU
    fontSize: 28,
    fontFace: F.body,
    color: C.darkGray,
    align: 'center',
    valign: 'top',
  });

  // WorkshopPilot logo bottom-left
  if (logoBase64) {
    slide.addImage({
      data: logoBase64,
      x: 0.40,
      y: 4.68,
      w: 2.35,
      h: 0.38,
    });
  } else {
    slide.addText('WorkshopPilot.ai', {
      x: 0.40,
      y: 4.68,
      w: 2.35,
      h: 0.38,
      fontSize: 14,
      fontFace: F.body,
      color: C.darkGray,
    });
  }

  addSlideNumber(slide);
}

// ── Executive Summary ──────────────────────────────────────────────────
// Template: title + body text, no images, no fact cards
function addExecSummarySlide(pptx: PptxGenJS, summaryText: string) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };

  // Title
  slide.addText('Executive Summary', {
    x: L.titleX,
    y: L.titleY,
    w: L.titleW,
    h: L.titleH,
    fontSize: 28,
    fontFace: F.title,
    color: C.black,
    valign: 'top',
  });

  // Body text
  slide.addText(summaryText, {
    x: L.bodyX,
    y: L.bodyY,
    w: L.bodyW,
    h: L.bodyH,
    fontSize: 14,
    fontFace: F.body,
    color: C.darkGray,
    lineSpacingMultiple: 1.15,
    valign: 'top',
  });

  addSlideNumber(slide);
}

// ── Challenge Slide (text-only) ─────────────────────────────────────────
function addChallengeSlide(pptx: PptxGenJS, challengeText: string) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };

  slide.addText('Challenge', {
    x: L.titleX,
    y: L.titleY,
    w: L.titleW,
    h: L.titleH,
    fontSize: 28,
    fontFace: F.title,
    color: C.black,
    valign: 'top',
  });

  slide.addText(challengeText, {
    x: L.bodyX,
    y: L.bodyY,
    w: L.bodyW,
    h: L.bodyH,
    fontSize: 18,
    fontFace: F.body,
    color: C.black,
    valign: 'top',
    lineSpacingMultiple: 1.15,
  });

  addSlideNumber(slide);
}

// ── Image Slide ─────────────────────────────────────────────────────────
// Template: title at top + large centered image in body area. No overlays.
function addImageSlide(pptx: PptxGenJS, title: string, imageData: string) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };

  // Title
  slide.addText(title, {
    x: L.titleX,
    y: L.titleY,
    w: L.titleW,
    h: L.titleH,
    fontSize: 28,
    fontFace: F.title,
    color: C.black,
    valign: 'top',
  });

  // Image centered in body area
  // Template images vary in size but typically fill ~9.2" wide x 4.17" tall
  // and are centered horizontally, positioned just below the title
  const imgW = 9.18;   // ~8,396,308 EMU (from user research slide)
  const imgH = 4.17;   // ~3,820,976 EMU (consistent across template)
  const imgX = (10 - imgW) / 2; // Center horizontally
  const imgY = 1.15;   // Just below title

  slide.addImage({
    data: imageData,
    x: imgX,
    y: imgY,
    w: imgW,
    h: imgH,
  });

  addSlideNumber(slide);
}

// ── Summary generation from artifacts ──────────────────────────────────
export function generateSummariesFromArtifacts(artifacts: AllWorkshopArtifacts): Record<string, string> {
  const summaries: Record<string, string> = {};

  if (artifacts.challenge) {
    const c = artifacts.challenge as Record<string, unknown>;
    // Use HMW statement for challenge slide (matches template)
    summaries.challenge = (c.hmwStatement as string) || (c.problemStatement as string) || '';
  }

  if (artifacts.stakeholderMapping) {
    const s = artifacts.stakeholderMapping as Record<string, unknown>;
    const stakeholders = (s.stakeholders as Array<{ name: string }>) || [];
    summaries.stakeholderMapping = `${stakeholders.length} stakeholders identified across core, direct, and indirect rings`;
  }

  if (artifacts.userResearch) {
    const u = artifacts.userResearch as Record<string, unknown>;
    const insights = (u.insights as Array<{ finding: string }>) || [];
    summaries.userResearch = insights.length > 0 ? `${insights.length} key insights from user research` : '';
  }

  if (artifacts.senseMaking) {
    const sm = artifacts.senseMaking as Record<string, unknown>;
    const themes = (sm.themes as Array<{ name: string }>) || [];
    summaries.senseMaking = themes.length > 0 ? `Key themes: ${themes.slice(0, 3).map(t => t.name).join(', ')}` : '';
  }

  if (artifacts.persona) {
    const p = artifacts.persona as Record<string, unknown>;
    summaries.persona = [p.name as string, p.role as string].filter(Boolean).join(' — ');
  }

  if (artifacts.journeyMapping) {
    const j = artifacts.journeyMapping as Record<string, unknown>;
    const stages = (j.stages as Array<Record<string, unknown>>) || [];
    const dipStage = stages.find(s => s.isDip);
    summaries.journeyMapping = dipStage
      ? `${stages.length} stages mapped — key pain point at "${dipStage.name}"`
      : `${stages.length} journey stages mapped`;
  }

  if (artifacts.reframe) {
    const r = artifacts.reframe as Record<string, unknown>;
    const hmwStatements = (r.hmwStatements as Array<{ fullStatement?: string }>) || [];
    summaries.reframe = hmwStatements[0]?.fullStatement?.slice(0, 120) || '';
  }

  if (artifacts.ideation) {
    const id = artifacts.ideation as Record<string, unknown>;
    const clusters = (id.clusters as Array<{ theme: string; ideas: unknown[] }>) || [];
    const totalIdeas = clusters.reduce((sum, c) => sum + (c.ideas?.length || 0), 0);
    summaries.ideation = `${totalIdeas} ideas across ${clusters.length} themes`;
  }

  if (artifacts.concept) {
    const c = artifacts.concept as Record<string, unknown>;
    const concepts = (c.concepts as Array<Record<string, unknown>>) || [];
    const primary = concepts[0] || c;
    const name = (primary.name as string) || (primary.conceptName as string) || '';
    const pitch = (primary.elevatorPitch as string) || '';
    summaries.concept = pitch ? `${name}: ${pitch.slice(0, 100)}` : name;
  }

  if (artifacts.validate) {
    const v = artifacts.validate as Record<string, unknown>;
    const confidence = v.confidenceAssessment as Record<string, unknown> | undefined;
    if (confidence?.score) {
      summaries.validate = `Confidence score: ${confidence.score}/10`;
    }
  }

  return summaries;
}
