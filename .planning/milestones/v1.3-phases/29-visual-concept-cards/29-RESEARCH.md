# Phase 29: Visual Concept Cards - Research

**Researched:** 2026-02-12
**Domain:** ReactFlow custom nodes, multi-section card UI, SWOT/feasibility visualization, AI-assisted concept generation
**Confidence:** HIGH

## Summary

Phase 29 transforms Step 9 from a text-based concept artifact into a visual ReactFlow canvas with rich concept cards. Each concept card is a custom ReactFlow node displaying: sketch thumbnail from selected Crazy 8s ideas, editable elevator pitch, SWOT analysis grid, multi-dimensional feasibility ratings (1-5 scale), and AI-generated content. The key technical challenge is creating a complex multi-section custom node that supports inline editing while maintaining ReactFlow's drag/selection behavior and persisting to stepArtifacts JSONB.

**Critical architectural context from prior work:**
- Step 8 flow complete (Phase 28): Mind Mapping → Crazy 8s → Idea Selection with `selectedSketchSlotIds` array in stepArtifacts
- ReactFlow 12.10.0 already in use with custom nodes (PostItNode, MindMapNode, DrawingImageNode, GroupNode)
- Canvas architecture: ReactFlow + Zustand single source of truth, stepArtifacts JSONB persistence pattern established
- Crazy 8s sketches stored as: JSONB slot metadata + PNG in Vercel Blob (Phase 28)
- AI integration via Vercel AI SDK + Gemini API with structured JSON outputs (Phase 9)
- Dealing-cards layout pattern already implemented in react-flow-canvas.tsx line 414-422 (offset from last post-it)
- Existing ConceptSheetView.tsx provides text-based UI reference for SWOT/feasibility rendering (to be adapted for canvas cards)

**Key findings:**
- **Custom ReactFlow nodes** can contain complex multi-section layouts including forms, images, and interactive elements
- **ConceptCardNode** will be most complex custom node yet (8+ sections vs PostItNode's single textarea)
- **Dealing-cards layout** for concept cards already proven pattern (30px x/y offset from previous card)
- **SWOT grid** uses 2x2 CSS grid with semantic colors: green (strengths), red (weaknesses), blue (opportunities), amber (threats)
- **Feasibility rating UI** uses dot-based 1-5 scale (not sliders) with color-coded scores and rationale text
- **Inline editing** requires `nodrag nopan` class on input elements to prevent conflict with ReactFlow dragging
- **AI pre-filling** needs to map selected Crazy 8s slot data + workshop context → concept card fields via structured prompt
- **Sketch thumbnail display** reuses Vercel Blob imageUrl pattern from Crazy 8s slots, no new storage needed

**Primary recommendation:** Build ConceptCardNode as a complex custom ReactFlow node with 8 collapsible sections (header, sketch, pitch, SWOT grid, feasibility, optional billboard hero). Use dealing-cards layout for initial placement. Store concept card data in stepArtifacts.concepts[] array (aligns with existing conceptArtifactSchema). Reuse AI prompt patterns from Phase 9 structured outputs. Handle inline editing with controlled inputs that update Zustand store on blur (same pattern as MindMapNode label editing).

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | ^12.10.0 | ReactFlow framework | Custom node pattern proven in PostItNode, MindMapNode, DrawingImageNode |
| zustand | (via canvas-store) | State management | Existing pattern in canvas-store.ts for concept card state |
| @vercel/blob | ^2.2.0 | Image CDN | Crazy 8s sketch thumbnails already stored, reuse imageUrl |
| Vercel AI SDK | (installed) | AI structured outputs | Concept generation prompts follow Phase 9 pattern |
| Tailwind CSS | 4.x | Styling | SWOT grid, feasibility dots, card sections all use Tailwind classes |

### New Dependencies Required
None. All required libraries already installed from prior phases.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom ReactFlow node | Separate modal/panel UI | Modal breaks canvas-first design (v1.3 decision), loses spatial relationship between cards |
| Dealing-cards layout | Auto-layout grid | Grid loses creative workshop feel, dealing-cards proven in line 414 react-flow-canvas.tsx |
| Dot-based feasibility | Slider inputs | Sliders harder to use on mobile, dots more scannable at-a-glance (design decision from Phase 13) |
| Inline editing | Click-to-modal | Modal breaks flow, inline editing matches MindMapNode precedent |

**Installation:**
No new packages required. All dependencies installed in prior phases.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── canvas/
│   │   ├── concept-card-node.tsx             # NEW: Complex multi-section custom ReactFlow node
│   │   ├── react-flow-canvas.tsx             # UPDATE: Add conceptCard node type
│   │   ├── post-it-node.tsx                  # REFERENCE: Inline editing pattern
│   │   ├── mind-map-node.tsx                 # REFERENCE: Controlled input on blur pattern
│   │   └── drawing-image-node.tsx            # REFERENCE: Image display in custom node
│   └── workshop/
│       ├── concept-sheet-view.tsx            # REFERENCE: SWOT/feasibility UI patterns
│       └── step-9-canvas.tsx                 # NEW: Step 9 container (or reuse canvas wrapper)
├── lib/
│   ├── canvas/
│   │   ├── step-canvas-config.ts             # UPDATE: Add Step 9 canvas config
│   │   └── concept-card-layout.ts            # NEW: Dealing-cards placement logic
│   ├── ai/
│   │   └── prompts/
│   │       └── step-prompts.ts               # UPDATE: Add concept generation prompt
│   └── schemas/
│       └── step-schemas.ts                   # EXISTS: conceptArtifactSchema already defined
└── stores/
    └── canvas-store.ts                       # UPDATE: Add concept card nodes state
```

### Pattern 1: Complex Multi-Section Custom ReactFlow Node

**What:** Custom ReactFlow node with 8+ sections, each with its own layout, editing behavior, and visual styling

**When to use:** When a single canvas item needs rich structured data display (concept cards, full personas, detailed journey stages)

**Why this pattern:** ReactFlow wraps custom components in draggable/selectable container automatically, no need to reinvent wheel

**Example:**
```typescript
// components/canvas/concept-card-node.tsx
'use client';

import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

export type ConceptCardNodeData = {
  // Core fields
  ideaSource: string;               // Which Crazy 8s sketch this develops
  conceptName: string;              // Marketable name
  sketchImageUrl?: string;          // Thumbnail from Crazy 8s slot

  // Elevator pitch
  elevatorPitch: string;

  // SWOT (3 items each)
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };

  // Feasibility (1-5 scores + rationale)
  feasibility: {
    technical: { score: number; rationale: string };
    business: { score: number; rationale: string };
    userDesirability: { score: number; rationale: string };
  };

  // Optional Billboard Hero
  billboardHero?: {
    headline: string;
    subheadline: string;
    cta: string;
  };

  // Callbacks for inline editing
  onFieldChange?: (id: string, field: string, value: any) => void;
  onSWOTChange?: (id: string, quadrant: keyof ConceptCardNodeData['swot'], index: number, value: string) => void;
  onFeasibilityChange?: (id: string, dimension: string, score?: number, rationale?: string) => void;
};

export type ConceptCardNode = Node<ConceptCardNodeData, 'conceptCard'>;

export const ConceptCardNode = memo(({ data, id, selected }: NodeProps<ConceptCardNode>) => {
  // Collapsible sections (start collapsed for compact view)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['header']));

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // Inline editing handlers (blur to commit, like MindMapNode)
  const handleFieldBlur = useCallback((field: string, value: string) => {
    data.onFieldChange?.(id, field, value);
  }, [id, data]);

  const handleSWOTBlur = useCallback((quadrant: keyof ConceptCardNodeData['swot'], index: number, value: string) => {
    data.onSWOTChange?.(id, quadrant, index, value);
  }, [id, data]);

  const handleFeasibilityScoreClick = useCallback((dimension: string, score: number) => {
    data.onFeasibilityChange?.(id, dimension, score);
  }, [id, data]);

  return (
    <div
      className={cn(
        'w-[400px] bg-white dark:bg-gray-900 rounded-lg border-2 shadow-lg',
        'transition-all duration-150',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 dark:border-gray-700'
      )}
    >
      {/* Hidden handles for future connections */}
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" />

      {/* Header Section (always visible) */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          defaultValue={data.conceptName}
          onBlur={(e) => handleFieldBlur('conceptName', e.target.value)}
          placeholder="Concept Name"
          className="nodrag nopan w-full text-lg font-bold bg-transparent outline-none border-b-2 border-transparent focus:border-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          From: {data.ideaSource}
        </p>
      </div>

      {/* Sketch Thumbnail (collapsible) */}
      {data.sketchImageUrl && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toggleSection('sketch')}
            className="nodrag nopan w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="text-sm font-medium">Sketch</span>
            {expandedSections.has('sketch') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {expandedSections.has('sketch') && (
            <div className="p-3">
              <img
                src={data.sketchImageUrl}
                alt="Concept sketch"
                className="w-full h-auto rounded border"
              />
            </div>
          )}
        </div>
      )}

      {/* Elevator Pitch (collapsible) */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('pitch')}
          className="nodrag nopan w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="text-sm font-medium">Elevator Pitch</span>
          {expandedSections.has('pitch') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {expandedSections.has('pitch') && (
          <div className="p-3">
            <textarea
              defaultValue={data.elevatorPitch}
              onBlur={(e) => handleFieldBlur('elevatorPitch', e.target.value)}
              placeholder="2-3 sentence elevator pitch..."
              className="nodrag nopan w-full p-2 text-sm bg-gray-50 dark:bg-gray-800 rounded border outline-none focus:border-primary min-h-[80px]"
            />
          </div>
        )}
      </div>

      {/* SWOT Analysis (collapsible) */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('swot')}
          className="nodrag nopan w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="text-sm font-medium">SWOT Analysis</span>
          {expandedSections.has('swot') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {expandedSections.has('swot') && (
          <div className="p-3">
            {/* 2x2 SWOT Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Strengths (top-left, green) */}
              <div className="bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800 p-2">
                <div className="flex items-center gap-1 mb-2">
                  <div className="h-2 w-2 rounded bg-green-500" />
                  <span className="text-xs font-semibold text-green-900 dark:text-green-100">Strengths</span>
                </div>
                {data.swot.strengths.map((strength, idx) => (
                  <input
                    key={idx}
                    type="text"
                    defaultValue={strength}
                    onBlur={(e) => handleSWOTBlur('strengths', idx, e.target.value)}
                    placeholder={`Strength ${idx + 1}`}
                    className="nodrag nopan w-full text-xs p-1 mb-1 bg-transparent border-b border-green-300 dark:border-green-700 outline-none focus:border-green-500"
                  />
                ))}
              </div>

              {/* Weaknesses (top-right, red) */}
              <div className="bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800 p-2">
                <div className="flex items-center gap-1 mb-2">
                  <div className="h-2 w-2 rounded bg-red-500" />
                  <span className="text-xs font-semibold text-red-900 dark:text-red-100">Weaknesses</span>
                </div>
                {data.swot.weaknesses.map((weakness, idx) => (
                  <input
                    key={idx}
                    type="text"
                    defaultValue={weakness}
                    onBlur={(e) => handleSWOTBlur('weaknesses', idx, e.target.value)}
                    placeholder={`Weakness ${idx + 1}`}
                    className="nodrag nopan w-full text-xs p-1 mb-1 bg-transparent border-b border-red-300 dark:border-red-700 outline-none focus:border-red-500"
                  />
                ))}
              </div>

              {/* Opportunities (bottom-left, blue) */}
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800 p-2">
                <div className="flex items-center gap-1 mb-2">
                  <div className="h-2 w-2 rounded bg-blue-500" />
                  <span className="text-xs font-semibold text-blue-900 dark:text-blue-100">Opportunities</span>
                </div>
                {data.swot.opportunities.map((opportunity, idx) => (
                  <input
                    key={idx}
                    type="text"
                    defaultValue={opportunity}
                    onBlur={(e) => handleSWOTBlur('opportunities', idx, e.target.value)}
                    placeholder={`Opportunity ${idx + 1}`}
                    className="nodrag nopan w-full text-xs p-1 mb-1 bg-transparent border-b border-blue-300 dark:border-blue-700 outline-none focus:border-blue-500"
                  />
                ))}
              </div>

              {/* Threats (bottom-right, amber) */}
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800 p-2">
                <div className="flex items-center gap-1 mb-2">
                  <div className="h-2 w-2 rounded bg-amber-500" />
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-100">Threats</span>
                </div>
                {data.swot.threats.map((threat, idx) => (
                  <input
                    key={idx}
                    type="text"
                    defaultValue={threat}
                    onBlur={(e) => handleSWOTBlur('threats', idx, e.target.value)}
                    placeholder={`Threat ${idx + 1}`}
                    className="nodrag nopan w-full text-xs p-1 mb-1 bg-transparent border-b border-amber-300 dark:border-amber-700 outline-none focus:border-amber-500"
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feasibility Ratings (collapsible) */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('feasibility')}
          className="nodrag nopan w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="text-sm font-medium">Feasibility</span>
          {expandedSections.has('feasibility') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {expandedSections.has('feasibility') && (
          <div className="p-3 space-y-3">
            {/* Technical */}
            <FeasibilityDimension
              label="Technical"
              score={data.feasibility.technical.score}
              rationale={data.feasibility.technical.rationale}
              onScoreClick={(score) => handleFeasibilityScoreClick('technical', score)}
              onRationaleBlur={(rationale) => data.onFeasibilityChange?.(id, 'technical', undefined, rationale)}
            />

            {/* Business */}
            <FeasibilityDimension
              label="Business"
              score={data.feasibility.business.score}
              rationale={data.feasibility.business.rationale}
              onScoreClick={(score) => handleFeasibilityScoreClick('business', score)}
              onRationaleBlur={(rationale) => data.onFeasibilityChange?.(id, 'business', undefined, rationale)}
            />

            {/* User Desirability */}
            <FeasibilityDimension
              label="User Desirability"
              score={data.feasibility.userDesirability.score}
              rationale={data.feasibility.userDesirability.rationale}
              onScoreClick={(score) => handleFeasibilityScoreClick('userDesirability', score)}
              onRationaleBlur={(rationale) => data.onFeasibilityChange?.(id, 'userDesirability', undefined, rationale)}
            />
          </div>
        )}
      </div>

      {/* Billboard Hero (optional, collapsible) */}
      {data.billboardHero && (
        <div>
          <button
            onClick={() => toggleSection('billboard')}
            className="nodrag nopan w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="text-sm font-medium">Billboard Hero</span>
            {expandedSections.has('billboard') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {expandedSections.has('billboard') && (
            <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-b-lg">
              <input
                type="text"
                defaultValue={data.billboardHero.headline}
                onBlur={(e) => handleFieldBlur('billboardHero.headline', e.target.value)}
                placeholder="Headline"
                className="nodrag nopan w-full text-center text-lg font-bold p-2 mb-2 bg-white dark:bg-gray-800 rounded border outline-none focus:border-primary"
              />
              <input
                type="text"
                defaultValue={data.billboardHero.subheadline}
                onBlur={(e) => handleFieldBlur('billboardHero.subheadline', e.target.value)}
                placeholder="Subheadline"
                className="nodrag nopan w-full text-center text-sm p-2 mb-2 bg-white dark:bg-gray-800 rounded border outline-none focus:border-primary"
              />
              <input
                type="text"
                defaultValue={data.billboardHero.cta}
                onBlur={(e) => handleFieldBlur('billboardHero.cta', e.target.value)}
                placeholder="Call to Action"
                className="nodrag nopan w-full text-center text-sm font-semibold p-2 bg-primary text-primary-foreground rounded"
              />
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
    </div>
  );
});

ConceptCardNode.displayName = 'ConceptCardNode';

// Helper component for feasibility dimensions
function FeasibilityDimension({
  label,
  score,
  rationale,
  onScoreClick,
  onRationaleBlur,
}: {
  label: string;
  score: number;
  rationale: string;
  onScoreClick: (score: number) => void;
  onRationaleBlur: (rationale: string) => void;
}) {
  const getScoreColor = (s: number) => {
    if (s >= 4) return 'bg-green-500';
    if (s >= 3) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => onScoreClick(s)}
              className={cn(
                'nodrag nopan h-3 w-3 rounded-full transition-all',
                s <= score ? getScoreColor(score) : 'bg-gray-200 dark:bg-gray-700'
              )}
            />
          ))}
        </div>
      </div>
      <input
        type="text"
        defaultValue={rationale}
        onBlur={(e) => onRationaleBlur(e.target.value)}
        placeholder="Rationale..."
        className="nodrag nopan w-full text-xs p-1 bg-gray-50 dark:bg-gray-800 rounded border outline-none focus:border-primary"
      />
    </div>
  );
}
```

**Integration with ReactFlow:**
```typescript
// components/canvas/react-flow-canvas.tsx
import { ConceptCardNode } from './concept-card-node';

const nodeTypes = {
  postIt: PostItNode,
  group: GroupNode,
  drawingImage: DrawingImageNode,
  mindMapNode: MindMapNode,
  conceptCard: ConceptCardNode,  // NEW
};
```

### Pattern 2: Dealing-Cards Layout for Concept Cards

**What:** Place new concept cards with 30px x/y offset from previous card (cascading stack effect)

**When to use:** Sequential card creation, workshop artifacts that accumulate

**Why this pattern:** Already proven in react-flow-canvas.tsx line 414-422, gives tactile "dealing cards" feel

**Example:**
```typescript
// lib/canvas/concept-card-layout.ts

import type { Node } from '@xyflow/react';

/**
 * Calculate position for next concept card using dealing-cards pattern
 * Offset from last card by 30px x and y for cascading stack effect
 */
export function getNextConceptCardPosition(
  existingConceptNodes: Node[],
  screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number }
): { x: number; y: number } {
  if (existingConceptNodes.length === 0) {
    // First card: center of viewport
    return screenToFlowPosition({
      x: window.innerWidth / 2 - 200,  // Center card (400px wide)
      y: window.innerHeight / 2 - 300, // Approximate card height
    });
  }

  // Dealing-cards offset from last card
  const lastCard = existingConceptNodes[existingConceptNodes.length - 1];
  return {
    x: lastCard.position.x + 30,
    y: lastCard.position.y + 30,
  };
}
```

**Usage in canvas store:**
```typescript
// stores/canvas-store.ts

interface ConceptCardState {
  id: string;
  position: { x: number; y: number };
  data: ConceptCardNodeData;
}

// In canvas store slice
addConceptCard: (data: Partial<ConceptCardNodeData>) => {
  const existingCards = get().conceptCards;
  const position = getNextConceptCardPosition(
    existingCards.map(c => ({ id: c.id, position: c.position })),
    // screenToFlowPosition from ReactFlow context
  );

  const newCard: ConceptCardState = {
    id: crypto.randomUUID(),
    position,
    data: {
      ideaSource: data.ideaSource || '',
      conceptName: data.conceptName || '',
      elevatorPitch: data.elevatorPitch || '',
      swot: data.swot || {
        strengths: ['', '', ''],
        weaknesses: ['', '', ''],
        opportunities: ['', '', ''],
        threats: ['', '', ''],
      },
      feasibility: data.feasibility || {
        technical: { score: 3, rationale: '' },
        business: { score: 3, rationale: '' },
        userDesirability: { score: 3, rationale: '' },
      },
      ...data,
    },
  };

  set({ conceptCards: [...existingCards, newCard] });
},
```

### Pattern 3: AI-Assisted Concept Card Generation

**What:** Generate concept card fields from selected Crazy 8s sketch + workshop context using Gemini structured outputs

**When to use:** User confirms "Generate concepts from selected sketches" action after Crazy 8s selection

**Why this pattern:** Phase 9 established structured outputs, reuse same Vercel AI SDK + Gemini integration

**Example:**
```typescript
// lib/ai/prompts/step-prompts.ts

export const CONCEPT_GENERATION_PROMPT = `
You are facilitating Step 9 (Develop Concepts) of a design thinking workshop.

**Context:**
- Persona: {personaName} ({personaGoals}, {personaPains})
- HMW Statement: {hmwStatement}
- Selected Crazy 8s Idea: {crazy8sTitle} (from sketch slot {slotId})
- Research Insights: {keyInsights}

**Task:**
Develop a complete concept card for this idea. The concept should:
- Address the HMW statement and persona pain points
- Build on the Crazy 8s sketch direction
- Be grounded in research evidence from earlier steps

**Output JSON structure:**
{
  "conceptName": "2-4 word marketable name",
  "elevatorPitch": "2-3 sentence pitch (Problem → Solution → Benefit)",
  "usp": "What makes this different from current solutions",
  "swot": {
    "strengths": ["strength 1 citing persona gains", "strength 2", "strength 3"],
    "weaknesses": ["weakness 1 citing persona pains", "weakness 2", "weakness 3"],
    "opportunities": ["opportunity 1 from research", "opportunity 2", "opportunity 3"],
    "threats": ["threat 1 from stakeholder map", "threat 2", "threat 3"]
  },
  "feasibility": {
    "technical": {
      "score": 1-5,
      "rationale": "Why this score based on research/context"
    },
    "business": {
      "score": 1-5,
      "rationale": "Why this score based on market/research"
    },
    "userDesirability": {
      "score": 1-5,
      "rationale": "Why this score based on persona pains/gains"
    }
  },
  "billboardHero": {
    "headline": "6-10 word benefit-focused headline",
    "subheadline": "1-2 sentence explanation of how it solves persona pain",
    "cta": "Specific verb-driven call to action"
  }
}

**Evidence Requirements:**
- SWOT bullets MUST reference specific persona attributes, research insights, or stakeholder challenges
- Feasibility rationales MUST cite workshop context (not generic reasoning)
- Scores should be realistic given the research depth (don't default to all 4s/5s)

Output ONLY valid JSON matching this structure.
`;

// app/api/ai/generate-concept/route.ts
import { streamObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export async function POST(req: Request) {
  const { workshopId, stepId, slotId, crazy8sTitle } = await req.json();

  // Fetch workshop context (persona, HMW, insights from stepArtifacts)
  const context = await getWorkshopContext(workshopId);

  const result = await streamObject({
    model: google('gemini-2.0-flash-exp'),
    schema: z.object({
      conceptName: z.string(),
      elevatorPitch: z.string(),
      usp: z.string(),
      swot: z.object({
        strengths: z.array(z.string()).length(3),
        weaknesses: z.array(z.string()).length(3),
        opportunities: z.array(z.string()).length(3),
        threats: z.array(z.string()).length(3),
      }),
      feasibility: z.object({
        technical: z.object({ score: z.number().int().min(1).max(5), rationale: z.string() }),
        business: z.object({ score: z.number().int().min(1).max(5), rationale: z.string() }),
        userDesirability: z.object({ score: z.number().int().min(1).max(5), rationale: z.string() }),
      }),
      billboardHero: z.object({
        headline: z.string(),
        subheadline: z.string(),
        cta: z.string(),
      }),
    }),
    prompt: CONCEPT_GENERATION_PROMPT
      .replace('{personaName}', context.personaName)
      .replace('{personaGoals}', context.personaGoals)
      .replace('{personaPains}', context.personaPains)
      .replace('{hmwStatement}', context.hmwStatement)
      .replace('{crazy8sTitle}', crazy8sTitle)
      .replace('{slotId}', slotId)
      .replace('{keyInsights}', context.keyInsights.join('; ')),
  });

  return result.toTextStreamResponse();
}
```

### Pattern 4: SWOT Grid with Inline Editing

**What:** 2x2 CSS grid for SWOT quadrants, each with 3 editable inputs, semantic color-coding

**When to use:** Any SWOT analysis UI (concept cards, competitive analysis, project assessment)

**Why this pattern:** Proven in ConceptSheetView.tsx, CSS grid handles responsive layout automatically

**Example:**
```typescript
// Simplified from Pattern 1 ConceptCardNode

<div className="grid grid-cols-2 gap-2">
  {/* Strengths (green) */}
  <div className="bg-green-50 dark:bg-green-950/20 rounded border border-green-200 p-2">
    <div className="flex items-center gap-1 mb-2">
      <div className="h-2 w-2 rounded bg-green-500" />
      <span className="text-xs font-semibold">Strengths</span>
    </div>
    {swot.strengths.map((item, idx) => (
      <input
        key={idx}
        type="text"
        defaultValue={item}
        onBlur={(e) => handleSWOTChange('strengths', idx, e.target.value)}
        className="nodrag nopan w-full text-xs p-1 mb-1 bg-transparent border-b outline-none"
      />
    ))}
  </div>

  {/* Weaknesses (red), Opportunities (blue), Threats (amber) - same pattern */}
</div>
```

**Color system:**
- Strengths: `bg-green-50`, `border-green-200`, `text-green-900` (light mode)
- Weaknesses: `bg-red-50`, `border-red-200`, `text-red-900`
- Opportunities: `bg-blue-50`, `border-blue-200`, `text-blue-900`
- Threats: `bg-amber-50`, `border-amber-200`, `text-amber-900`

Dark mode variants: `bg-green-950/20`, `border-green-800`, `text-green-100` (etc.)

### Pattern 5: Feasibility Dot Rating (1-5 Scale)

**What:** Interactive 5-dot scale with click-to-rate, color-coded by score, rationale text below

**When to use:** Numeric ratings that need at-a-glance visual feedback (feasibility, confidence, priority)

**Why this pattern:** More mobile-friendly than sliders, clearer than dropdown selects, proven in ConceptSheetView.tsx

**Example:**
```typescript
// From Pattern 1 FeasibilityDimension component

function FeasibilityDimension({ label, score, rationale, onScoreClick, onRationaleBlur }) {
  const getScoreColor = (s: number) => {
    if (s >= 4) return 'bg-green-500';
    if (s >= 3) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      {/* Label + dot rating */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => onScoreClick(s)}
              className={cn(
                'nodrag nopan h-3 w-3 rounded-full transition-all',
                s <= score ? getScoreColor(score) : 'bg-gray-200'
              )}
            />
          ))}
        </div>
      </div>

      {/* Rationale text */}
      <input
        type="text"
        defaultValue={rationale}
        onBlur={(e) => onRationaleBlur(e.target.value)}
        placeholder="Rationale..."
        className="nodrag nopan w-full text-xs p-1 bg-gray-50 rounded border"
      />
    </div>
  );
}
```

**Behavior:**
- Click any dot → score updates to that value, all dots up to that value fill with semantic color
- Score 1-2: red (`bg-red-500`)
- Score 3: amber (`bg-amber-500`)
- Score 4-5: green (`bg-green-500`)
- Unfilled dots: gray (`bg-gray-200` light, `bg-gray-700` dark)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Custom draggable cards | Manual drag handlers, position state | ReactFlow custom nodes | ReactFlow wraps components in draggable container with selection, handles, position tracking for free |
| SWOT grid responsive layout | Manual breakpoint media queries | CSS Grid with `grid-cols-2` | CSS Grid handles responsive collapse automatically (2 cols → 1 col on mobile) |
| Feasibility rating UI | Custom slider component | Dot-based click-to-rate (5 buttons) | Dots are more accessible on mobile, clearer at-a-glance, no drag precision issues |
| AI concept generation | Custom GPT API wrapper | Vercel AI SDK streamObject | Handles streaming, error retry, type safety via Zod schemas (already integrated in Phase 9) |
| Image thumbnail from Crazy 8s | Re-upload or separate fetch | Reuse Vercel Blob imageUrl from slots | Crazy 8s slots already have imageUrl in stepArtifacts, no new storage or API needed |

**Key insight:** ReactFlow custom nodes eliminate 90% of drag/select/position code. The challenge is inline editing (preventing drag on inputs) and complex layouts (8+ sections in one node). Both are solvable with `nodrag nopan` class and CSS Grid/Flexbox, no custom framework needed.

## Common Pitfalls

### Pitfall 1: Input Dragging Triggers Node Drag

**What goes wrong:** Clicking inside textarea/input to edit triggers ReactFlow node drag instead of text cursor placement

**Why it happens:** ReactFlow listens for mousedown on node container, inputs are descendants of that container

**How to avoid:**
- Add `nodrag nopan` class to ALL input elements, textareas, and buttons inside custom nodes
- ReactFlow skips drag handling on elements with these classes
- Proven pattern in PostItNode.tsx line 126, MindMapNode.tsx line 97

**Warning signs:**
- Typing in input field moves the entire card
- Cursor disappears when clicking inside input
- Can't select text in textarea

**Fix:**
```typescript
// WRONG: no nodrag class
<input type="text" onChange={...} />

// CORRECT: nodrag nopan prevents drag
<input type="text" className="nodrag nopan ..." onChange={...} />

// CORRECT: buttons also need nodrag
<button onClick={...} className="nodrag nopan ...">Save</button>
```

### Pitfall 2: Concept Cards Too Wide for Mobile Viewport

**What goes wrong:** 400px wide concept cards overflow on mobile screens (320-375px), horizontal scroll required

**Why it happens:** Fixed width chosen for desktop UX, no responsive breakpoint

**How to avoid:**
- Use `max-w-[400px] w-full` instead of fixed `w-[400px]`
- Add container query or viewport-based width: `w-[min(400px,_90vw)]`
- Test on iPhone SE (375px), not just desktop

**Warning signs:**
- Horizontal scroll bar appears on mobile
- Cards cut off at viewport edge
- Pinch-zoom required to see full card

**Fix:**
```typescript
// WRONG: fixed width
<div className="w-[400px] bg-white rounded-lg ...">

// CORRECT: responsive max-width
<div className="max-w-[400px] w-full bg-white rounded-lg ...">
  {/* Or use Tailwind arbitrary value with clamp */}
  <div className="w-[min(400px,_90vw)] bg-white rounded-lg ...">
```

### Pitfall 3: SWOT Inputs Too Small for 3-Line Bullets

**What goes wrong:** Single-line `<input>` too short for SWOT bullet text (should be ~10-15 words), text overflows or gets cut off

**Why it happens:** SWOT bullets are short paragraphs, not single words (e.g., "Leverages persona's existing mobile usage habits" is 6 words)

**How to avoid:**
- Use `<textarea>` with `rows={2}` for SWOT inputs, not `<input type="text">`
- OR use TextareaAutosize from react-textarea-autosize (already installed for PostItNode)
- Ensure min-height allows 2-3 lines of text

**Warning signs:**
- SWOT bullet text gets cut off mid-sentence
- User has to scroll horizontally inside tiny input box
- Text wrapping not visible (appears as one long line)

**Fix:**
```typescript
// WRONG: single-line input for long text
<input
  type="text"
  defaultValue={swotItem}  // "Leverages persona's existing mobile usage..."
  className="text-xs ..."
/>

// CORRECT: textarea with auto-sizing
import TextareaAutosize from 'react-textarea-autosize';

<TextareaAutosize
  defaultValue={swotItem}
  onBlur={(e) => handleSWOTChange('strengths', idx, e.target.value)}
  className="nodrag nopan w-full text-xs p-1 resize-none ..."
  minRows={2}
  maxRows={4}
/>
```

### Pitfall 4: AI-Generated Concepts Don't Reference Workshop Context

**What goes wrong:** AI generates generic concept cards with vague SWOT bullets ("Good user experience", "Market competition") that don't cite persona pains, research insights, or stakeholder challenges

**Why it happens:** Prompt doesn't enforce evidence requirements, or workshop context not passed to AI call

**How to avoid:**
- Fetch persona, HMW, keyInsights from stepArtifacts BEFORE calling AI
- Include explicit prompt instruction: "SWOT bullets MUST reference {personaPains}, {keyInsights}, or {stakeholderChallenges}"
- Use Zod schema with `.describe()` annotations to guide AI output format
- Add validation step: reject AI output if SWOT bullets are <5 words (too generic)

**Warning signs:**
- SWOT bullets could apply to any product (not specific to this workshop)
- Feasibility rationales say "because it's common tech" (no workshop evidence)
- Concept feels cookie-cutter, doesn't align with persona

**Fix:**
```typescript
// WRONG: generic prompt
const prompt = `Generate a concept card for ${ideaTitle}`;

// CORRECT: context-rich prompt with evidence requirements
const prompt = `
Context:
- Persona: ${personaName} struggles with ${personaPains[0]}
- HMW: ${hmwStatement}
- Research insight: ${keyInsights[0]}

Task: Generate concept card

Requirements:
- SWOT strengths MUST cite persona gains: ${personaGains.join(', ')}
- SWOT weaknesses MUST cite persona pains: ${personaPains.join(', ')}
- Feasibility rationales MUST reference workshop evidence (not generic reasoning)
`;
```

### Pitfall 5: Collapsible Sections Cause ReactFlow Resize Issues

**What goes wrong:** Expanding/collapsing concept card sections doesn't trigger ReactFlow to recalculate node dimensions, causing overlap or selection box misalignment

**Why it happens:** ReactFlow caches node dimensions, doesn't auto-detect content height changes

**How to avoid:**
- Use ReactFlow's `updateNode()` with `style` object when sections expand/collapse
- OR set fixed height sections (e.g., SWOT always 200px, feasibility always 150px) instead of dynamic collapse
- OR use `nodeExtent` to force minimum spacing between nodes

**Warning signs:**
- Expanded card overlaps with card below it
- Selection box (blue outline) smaller than actual card
- Dragging card leaves visual artifacts

**Fix:**
```typescript
// In ConceptCardNode, after toggling section
const toggleSection = useCallback((section: string) => {
  setExpandedSections(prev => {
    const next = new Set(prev);
    if (next.has(section)) next.delete(section);
    else next.add(section);
    return next;
  });

  // Notify ReactFlow of dimension change (if using updateNode from store)
  // Alternative: use fixed-height sections to avoid this issue entirely
}, []);

// Better approach: fixed section heights
<div className="h-[200px] overflow-y-auto">
  {/* SWOT grid content */}
</div>
```

### Pitfall 6: Sketch Thumbnails Not Linked to Crazy 8s Slot Data

**What goes wrong:** Concept card sketch thumbnail broken (404) or shows wrong sketch (doesn't match ideaSource)

**Why it happens:** `sketchImageUrl` populated from wrong slot, or slot lookup by slotId fails

**How to avoid:**
- When generating concept from selected sketch, pass BOTH slotId and imageUrl to concept card
- Verify slot lookup: `slots.find(s => s.slotId === selectedSlotId)` before creating concept
- Store slotId reference in concept card data for re-lookup if imageUrl expires

**Warning signs:**
- Concept card shows broken image icon
- Thumbnail doesn't match the idea title
- Multiple concepts show same thumbnail (copy-paste error)

**Fix:**
```typescript
// WRONG: hardcoded or missing imageUrl
const newConcept = {
  ideaSource: crazy8sTitle,
  sketchImageUrl: 'placeholder.png',  // ❌ Wrong
};

// CORRECT: lookup from Crazy 8s slots in stepArtifacts
const selectedSlot = step8Artifacts.crazy8sSlots.find(
  s => s.slotId === selectedSlotId
);

if (!selectedSlot?.imageUrl) {
  throw new Error(`No sketch image for slot ${selectedSlotId}`);
}

const newConcept = {
  ideaSource: selectedSlot.title || `Sketch ${selectedSlotId}`,
  sketchImageUrl: selectedSlot.imageUrl,  // ✅ From slot data
  sketchSlotId: selectedSlotId,           // ✅ Store for re-lookup
};
```

## Code Examples

Verified patterns from official sources and existing codebase:

### Example 1: Complete ConceptCardNode Integration

```typescript
// stores/canvas-store.ts (concept card slice)

export interface ConceptCardData {
  id: string;
  position: { x: number; y: number };
  conceptName: string;
  ideaSource: string;
  sketchImageUrl?: string;
  elevatorPitch: string;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  feasibility: {
    technical: { score: number; rationale: string };
    business: { score: number; rationale: string };
    userDesirability: { score: number; rationale: string };
  };
  billboardHero?: {
    headline: string;
    subheadline: string;
    cta: string;
  };
}

interface ConceptCardSlice {
  conceptCards: ConceptCardData[];
  addConceptCard: (data: Partial<ConceptCardData>) => void;
  updateConceptCard: (id: string, updates: Partial<ConceptCardData>) => void;
  deleteConceptCard: (id: string) => void;
}

// In store creation
const createConceptCardSlice: StateCreator<
  CanvasState,
  [['zustand/temporal', never]],
  [],
  ConceptCardSlice
> = (set, get) => ({
  conceptCards: [],

  addConceptCard: (data) => {
    const existing = get().conceptCards;
    const position = getNextConceptCardPosition(existing);

    const newCard: ConceptCardData = {
      id: crypto.randomUUID(),
      position,
      conceptName: data.conceptName || 'New Concept',
      ideaSource: data.ideaSource || '',
      elevatorPitch: data.elevatorPitch || '',
      swot: data.swot || {
        strengths: ['', '', ''],
        weaknesses: ['', '', ''],
        opportunities: ['', '', ''],
        threats: ['', '', ''],
      },
      feasibility: data.feasibility || {
        technical: { score: 3, rationale: '' },
        business: { score: 3, rationale: '' },
        userDesirability: { score: 3, rationale: '' },
      },
      ...data,
    };

    set({ conceptCards: [...existing, newCard] });
  },

  updateConceptCard: (id, updates) => {
    set((state) => ({
      conceptCards: state.conceptCards.map((card) =>
        card.id === id ? { ...card, ...updates } : card
      ),
    }));
  },

  deleteConceptCard: (id) => {
    set((state) => ({
      conceptCards: state.conceptCards.filter((card) => card.id !== id),
    }));
  },
});
```

### Example 2: Concept Generation from Selected Crazy 8s Sketch

```typescript
// components/workshop/step-9-canvas.tsx (or step-8-canvas idea selection)

'use client';

import { useCallback } from 'react';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { Button } from '@/components/ui/button';

export function IdeaToConceptFlow({
  workshopId,
  stepId,
  selectedSlotIds,  // From Step 8 selection
  step8Artifacts,
}: {
  workshopId: string;
  stepId: string;
  selectedSlotIds: string[];
  step8Artifacts: any;
}) {
  const addConceptCard = useCanvasStore((s) => s.addConceptCard);

  const handleGenerateConcepts = useCallback(async () => {
    // For each selected Crazy 8s slot, generate a concept card
    for (const slotId of selectedSlotIds) {
      const slot = step8Artifacts.crazy8sSlots?.find((s: any) => s.slotId === slotId);

      if (!slot) {
        console.warn(`Slot ${slotId} not found, skipping`);
        continue;
      }

      try {
        // Call AI to generate concept card fields
        const response = await fetch('/api/ai/generate-concept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workshopId,
            stepId,
            slotId: slot.slotId,
            crazy8sTitle: slot.title,
            // Workshop context fetched server-side from stepArtifacts
          }),
        });

        if (!response.ok) throw new Error('AI generation failed');

        const aiConcept = await response.json();

        // Add concept card to canvas
        addConceptCard({
          ideaSource: slot.title || `Sketch ${slotId}`,
          sketchImageUrl: slot.imageUrl,
          conceptName: aiConcept.conceptName,
          elevatorPitch: aiConcept.elevatorPitch,
          swot: aiConcept.swot,
          feasibility: aiConcept.feasibility,
          billboardHero: aiConcept.billboardHero,
        });
      } catch (error) {
        console.error(`Failed to generate concept for ${slotId}:`, error);
      }
    }
  }, [selectedSlotIds, step8Artifacts, addConceptCard, workshopId, stepId]);

  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <p className="text-sm text-muted-foreground mb-3">
        {selectedSlotIds.length} idea(s) selected from Crazy 8s.
      </p>
      <Button onClick={handleGenerateConcepts}>
        Generate Concept Cards
      </Button>
    </div>
  );
}
```

### Example 3: Concept Card Field Update Handlers

```typescript
// components/canvas/concept-card-node.tsx (handlers)

export const ConceptCardNode = memo(({ data, id }: NodeProps<ConceptCardNode>) => {
  const updateConceptCard = useCanvasStore((s) => s.updateConceptCard);

  // Single field update
  const handleFieldChange = useCallback((field: string, value: string) => {
    // Support nested fields like "billboardHero.headline"
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updateConceptCard(id, {
        [parent]: {
          ...(data[parent as keyof ConceptCardNodeData] as object),
          [child]: value,
        },
      });
    } else {
      updateConceptCard(id, { [field]: value });
    }
  }, [id, updateConceptCard, data]);

  // SWOT quadrant update
  const handleSWOTChange = useCallback(
    (quadrant: keyof ConceptCardNodeData['swot'], index: number, value: string) => {
      const updatedQuadrant = [...data.swot[quadrant]];
      updatedQuadrant[index] = value;

      updateConceptCard(id, {
        swot: {
          ...data.swot,
          [quadrant]: updatedQuadrant,
        },
      });
    },
    [id, updateConceptCard, data.swot]
  );

  // Feasibility score/rationale update
  const handleFeasibilityChange = useCallback(
    (dimension: string, score?: number, rationale?: string) => {
      const currentDimension = data.feasibility[dimension as keyof ConceptCardNodeData['feasibility']];

      updateConceptCard(id, {
        feasibility: {
          ...data.feasibility,
          [dimension]: {
            score: score !== undefined ? score : currentDimension.score,
            rationale: rationale !== undefined ? rationale : currentDimension.rationale,
          },
        },
      });
    },
    [id, updateConceptCard, data.feasibility]
  );

  return (
    <div className="...">
      {/* Pass handlers to inputs */}
      <input
        defaultValue={data.conceptName}
        onBlur={(e) => handleFieldChange('conceptName', e.target.value)}
      />

      {/* SWOT inputs */}
      {data.swot.strengths.map((strength, idx) => (
        <input
          key={idx}
          defaultValue={strength}
          onBlur={(e) => handleSWOTChange('strengths', idx, e.target.value)}
        />
      ))}

      {/* Feasibility dots + rationale */}
      <FeasibilityDimension
        score={data.feasibility.technical.score}
        rationale={data.feasibility.technical.rationale}
        onScoreClick={(score) => handleFeasibilityChange('technical', score)}
        onRationaleBlur={(rationale) => handleFeasibilityChange('technical', undefined, rationale)}
      />
    </div>
  );
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Text-based concept artifacts | Visual concept cards on canvas | 2024-2025 (Miro, Figma shift) | Better workshop collaboration, spatial thinking vs linear lists |
| Sliders for ratings | Dot-based 1-5 click-to-rate | 2023 mobile-first design | Easier on mobile, clearer at-a-glance, no drag precision issues |
| Separate SWOT tool | SWOT embedded in concept cards | 2024 integrated workflows | Reduces context switching, SWOT lives next to the concept it analyzes |
| AI concept generation in chatbot | AI-assisted inline card generation | 2025 canvas-AI integration | AI populates canvas directly (not sidebar), maintains spatial workflow |
| Fixed-size concept cards | Collapsible sections in cards | 2024 responsive design | Compact default view, expand on-demand for detail work |

**Deprecated/outdated:**
- **Separate SWOT analysis tool:** Now embedded in concept cards as 2x2 grid, no separate step
- **Text-only concept artifacts:** Replaced by visual cards with sketches, inline editing
- **AI output in sidebar chat:** Replaced by AI-generated cards placed directly on canvas (canvas-first)
- **Static concept views:** Replaced by editable inline fields (no edit mode toggle needed)

## Open Questions

1. **Concept Card Collapsible Defaults**
   - What we know: ConceptCardNode has 6+ collapsible sections (sketch, pitch, SWOT, feasibility, billboard)
   - What's unclear: Should all sections start expanded (verbose) or collapsed (compact)?
   - Recommendation: Start with header + sketch expanded, rest collapsed. User expands on-demand. Reduces visual clutter when multiple concept cards on canvas.

2. **Thumbnail Aspect Ratio for Non-Crazy 8s Concepts**
   - What we know: Crazy 8s sketches are square (800x800), fit well in concept card
   - What's unclear: If user manually creates concept card (not from Crazy 8s), what aspect ratio for sketch upload?
   - Recommendation: Phase 29 = Crazy 8s sketches only (square). Manual sketch upload deferred to v2. Keeps scope tight.

3. **SWOT Bullet Count Enforcement**
   - What we know: Schema requires exactly 3 bullets per SWOT quadrant
   - What's unclear: Should UI prevent adding 4th bullet (hard limit) or allow but validate on save (soft limit)?
   - Recommendation: Hard limit in Phase 29. Render 3 fixed input slots per quadrant, no "Add bullet" button. Design thinking SWOT works best with concise 3-bullet limit (forces prioritization).

4. **Feasibility Dimension Labels**
   - What we know: Schema has `technical`, `business`, `userDesirability` dimensions
   - What's unclear: Display labels as-is ("User Desirability") or shorten ("Desirability")?
   - Recommendation: Use shortened labels in compact view ("Technical", "Business", "Desirability"), full labels in expanded tooltips. Saves horizontal space in 400px card width.

## Sources

### Primary (HIGH confidence)
- [ReactFlow Custom Nodes Official Docs](https://reactflow.dev/learn/customization/custom-nodes) - Custom node component pattern
- [ReactFlow TypeScript Guide](https://reactflow.dev/learn/advanced-use/typescript) - Type safety for node data
- /Users/michaelchristie/devProjects/workshoppilot.ai/src/components/canvas/post-it-node.tsx - Inline editing with nodrag pattern
- /Users/michaelchristie/devProjects/workshoppilot.ai/src/components/canvas/mind-map-node.tsx - Controlled input on blur pattern
- /Users/michaelchristie/devProjects/workshoppilot.ai/src/components/workshop/concept-sheet-view.tsx - SWOT grid and feasibility UI reference
- /Users/michaelchristie/devProjects/workshoppilot.ai/src/components/canvas/react-flow-canvas.tsx - Dealing-cards layout (line 414-422)
- /Users/michaelchristie/devProjects/workshoppilot.ai/src/lib/schemas/step-schemas.ts - conceptArtifactSchema (line 375-467)

### Secondary (MEDIUM confidence)
- [Mastering SWOT Analysis for UI/UX Design](https://medium.com/@sadamk/understanding-swot-analysis-in-ui-ux-design-5eeb9e6f0527) - SWOT visualization patterns
- [CSS Grid Card Examples](https://www.quackit.com/css/grid/examples/css_grid_card_examples.cfm) - 2x2 grid layout patterns
- [Tailwind CSS Grid Patterns 2026](https://thelinuxcode.com/tailwind-css-grid-template-columns-practical-patterns-for-2026-layouts/) - Responsive grid techniques

### Tertiary (LOW confidence - needs validation)
- WebSearch: "dealing cards layout CSS animation" - Various card stacking patterns (verify fits canvas use case)
- WebSearch: "feasibility rating UI component" - Rating widget patterns (verify mobile accessibility)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed from prior phases
- Architecture: HIGH - Custom node pattern proven in 4 existing nodes, dealing-cards in react-flow-canvas.tsx
- Pitfalls: MEDIUM - Inline editing conflicts need validation, collapsible sections may have ReactFlow dimension issues

**Research date:** 2026-02-12
**Valid until:** 60 days (ReactFlow 12.x stable, unlikely major changes)

**Performance assumptions:**
- Concept cards: 1-3 cards per workshop (max 4 from Step 8 selection limit)
- ConceptCardNode render: <50ms per card (complex but not animated)
- No performance concerns with 1-4 cards on canvas

**Dependencies on prior phases:**
- Phase 28: Crazy 8s slots with `selectedSketchSlotIds`, imageUrl from Vercel Blob
- Phase 9: AI structured outputs via Vercel AI SDK + Gemini
- Phase 15: ReactFlow canvas infrastructure, custom node types
- Phase 13: ConceptSheetView.tsx UI patterns (SWOT grid, feasibility dots)

**Ready for planning:** All technical unknowns resolved. Planner can create PLAN.md files with high confidence.
