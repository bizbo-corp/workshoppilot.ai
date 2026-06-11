/**
 * Verify heuristic flow generator (Phase 64, Plan 01)
 *
 * Run: npx tsx scripts/verify-journey-flow-generator.ts
 *
 * Pure-function tests only — NO database imports, NO env reads.
 * (The PRODUCTION database is pointed to by .env.local.)
 *
 * Assertions:
 * - All 7 archetypes are exercised
 * - Feature scope → exactly 3 non-annotation nodes and 2 edges
 * - Two-sided → exactly 1 annotation node, annotation mentions riskier side
 * - Every generated node has a valid uiType and finite position
 * - ARCHETYPE_TO_INTENT[output.flowArchetype] is defined for every case
 */

import {
  heuristicGenerateFlow,
  detectArchetype,
  detectTwoSided,
  extractConceptsForFlow,
  normalizeUiType,
} from '../src/lib/journey-flow/generator';
import { ARCHETYPE_TO_INTENT } from '../src/lib/journey-flow/types';
import type { ConceptData } from '../src/lib/journey-flow/generator';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeConcept(name: string, extra: Partial<ConceptData> = {}): ConceptData {
  return { name, elevatorPitch: `${name} elevator pitch`, usp: `${name} USP`, ...extra };
}

function genericConcepts(n = 2): ConceptData[] {
  return Array.from({ length: n }, (_, i) => makeConcept(`Concept ${i + 1}`));
}

// ---------------------------------------------------------------------------
// Test 1: hub-and-spoke — dashboard input
// ---------------------------------------------------------------------------
console.log('\nTest 1: hub-and-spoke — dashboard/analytics input');
{
  const output = heuristicGenerateFlow({
    concepts: genericConcepts(3),
    challengeContext: 'Build a dashboard with analytics, metrics, and KPI reporting for our data platform.',
    scope: 'journey',
  });

  assert(output.flowArchetype === 'hub-and-spoke', `archetype should be 'hub-and-spoke' (got '${output.flowArchetype}')`);
  assert(output.nodes.filter((n) => !n.isAnnotation).length >= 4, `should have >= 4 nodes (got ${output.nodes.length})`);
  assert(
    output.edges.every((e) => {
      const ids = new Set(output.nodes.map((n) => n.id));
      return ids.has(e.sourceNodeId) && ids.has(e.targetNodeId);
    }),
    'all edges should reference existing node ids'
  );
  // Hub placement: at least one node near x=400, y=160
  const hubNode = output.nodes.find((n) => !n.isAnnotation && Math.abs(n.position.x - 400) < 10 && Math.abs(n.position.y - 160) < 10);
  assert(!!hubNode, `at least one node positioned at hub (400, 160) — found: ${JSON.stringify(output.nodes.filter(n => !n.isAnnotation).map(n => n.position))}`);
  assert(ARCHETYPE_TO_INTENT[output.flowArchetype] !== undefined, 'ARCHETYPE_TO_INTENT maps hub-and-spoke');
}

// ---------------------------------------------------------------------------
// Test 2: single-page-sections — brochure/marketing-site (no funnel keywords)
// ---------------------------------------------------------------------------
console.log('\nTest 2: single-page-sections — brochure/marketing site (no funnel keywords)');
{
  const output = heuristicGenerateFlow({
    concepts: genericConcepts(2),
    challengeContext: 'Launch a marketing brochure website to showcase our brand and promote awareness.',
    scope: 'journey',
  });

  assert(output.flowArchetype === 'single-page-sections', `archetype should be 'single-page-sections' (got '${output.flowArchetype}')`);
  const nonAnnotation = output.nodes.filter((n) => !n.isAnnotation);
  // All nodes share roughly the same x (x=400) with strictly incrementing y
  const allSameX = nonAnnotation.every((n) => n.position.x === 400);
  assert(allSameX, `all nodes should have x=400 (got: ${JSON.stringify(nonAnnotation.map(n => n.position.x))})`);
  // y values should be strictly increasing
  const yValues = nonAnnotation.map((n) => n.position.y);
  const yIncreasing = yValues.every((y, i) => i === 0 || y > yValues[i - 1]);
  assert(yIncreasing, `y values should be strictly increasing (got: ${JSON.stringify(yValues)})`);
  assert(ARCHETYPE_TO_INTENT[output.flowArchetype] !== undefined, 'ARCHETYPE_TO_INTENT maps single-page-sections');
}

// ---------------------------------------------------------------------------
// Test 3: funnel — marketing + sign-up / landing page input
// ---------------------------------------------------------------------------
console.log('\nTest 3: funnel — marketing + landing page + sign-up input');
{
  const output = heuristicGenerateFlow({
    concepts: genericConcepts(1),
    challengeContext: 'Create a landing page with sign-up to test desirability and conversion for our new product.',
    scope: 'journey',
  });

  assert(output.flowArchetype === 'funnel', `archetype should be 'funnel' (got '${output.flowArchetype}')`);
  const nonAnnotation = output.nodes.filter((n) => !n.isAnnotation);
  assert(nonAnnotation.length >= 3 && nonAnnotation.length <= 4, `funnel should have 3-4 nodes (got ${nonAnnotation.length})`);
  assert(ARCHETYPE_TO_INTENT[output.flowArchetype] !== undefined, 'ARCHETYPE_TO_INTENT maps funnel');
}

// ---------------------------------------------------------------------------
// Test 4: loop — habit/log/streak input
// ---------------------------------------------------------------------------
console.log('\nTest 4: loop — habit/log/streak input');
{
  const output = heuristicGenerateFlow({
    concepts: genericConcepts(2),
    challengeContext: 'Build a daily habit tracker that encourages users to log their streak and come back every day.',
    scope: 'journey',
  });

  assert(output.flowArchetype === 'loop', `archetype should be 'loop' (got '${output.flowArchetype}')`);
  // Should have a closing edge: last node back to first
  const nonAnnotation = output.nodes.filter((n) => !n.isAnnotation);
  const firstId = nonAnnotation[0].id;
  const lastId = nonAnnotation[nonAnnotation.length - 1].id;
  const closingEdge = output.edges.find((e) => e.sourceNodeId === lastId && e.targetNodeId === firstId);
  assert(!!closingEdge, `should have closing edge from last node (${lastId}) back to first (${firstId})`);
  assert(ARCHETYPE_TO_INTENT[output.flowArchetype] !== undefined, 'ARCHETYPE_TO_INTENT maps loop');
}

// ---------------------------------------------------------------------------
// Test 5: branching — eligibility/approve-reject input
// ---------------------------------------------------------------------------
console.log('\nTest 5: branching — eligibility/approve/reject input');
{
  const output = heuristicGenerateFlow({
    concepts: genericConcepts(2),
    challengeContext: 'Design an eligibility checker that approves or rejects applicants based on their qualification.',
    scope: 'journey',
  });

  assert(output.flowArchetype === 'branching', `archetype should be 'branching' (got '${output.flowArchetype}')`);
  // Fork: one sourceNodeId appears on two edges with different targets
  const sourceCounts: Record<string, Set<string>> = {};
  for (const edge of output.edges) {
    if (!sourceCounts[edge.sourceNodeId]) sourceCounts[edge.sourceNodeId] = new Set();
    sourceCounts[edge.sourceNodeId].add(edge.targetNodeId);
  }
  const hasFork = Object.values(sourceCounts).some((targets) => targets.size >= 2);
  assert(hasFork, `should have at least one fork (one sourceNodeId with 2+ different targets)`);
  assert(ARCHETYPE_TO_INTENT[output.flowArchetype] !== undefined, 'ARCHETYPE_TO_INTENT maps branching');
}

// ---------------------------------------------------------------------------
// Test 6: single-screen-tool — calculator/utility input
// ---------------------------------------------------------------------------
console.log('\nTest 6: single-screen-tool — calculator/utility input');
{
  const output = heuristicGenerateFlow({
    concepts: [makeConcept('Loan Calculator', { usp: 'Instant loan estimate', elevatorPitch: 'Calculate and convert loan estimates instantly' })],
    challengeContext: 'Build a loan calculator that converts user inputs into instant estimates.',
    scope: 'journey',
  });

  assert(output.flowArchetype === 'single-screen-tool', `archetype should be 'single-screen-tool' (got '${output.flowArchetype}')`);
  const nonAnnotation = output.nodes.filter((n) => !n.isAnnotation);
  assert(nonAnnotation.length === 2, `single-screen-tool should have exactly 2 nodes (got ${nonAnnotation.length})`);
  assert(ARCHETYPE_TO_INTENT[output.flowArchetype] !== undefined, 'ARCHETYPE_TO_INTENT maps single-screen-tool');
}

// ---------------------------------------------------------------------------
// Test 7: linear-sequence — generic web-app (no special keywords)
// ---------------------------------------------------------------------------
console.log('\nTest 7: linear-sequence — generic web-app');
{
  const output = heuristicGenerateFlow({
    concepts: genericConcepts(2),
    challengeContext: 'Build a web application platform for teams to collaborate and integrate their workflows.',
    scope: 'journey',
  });

  assert(output.flowArchetype === 'linear-sequence', `archetype should be 'linear-sequence' (got '${output.flowArchetype}')`);
  const nonAnnotation = output.nodes.filter((n) => !n.isAnnotation);
  assert(nonAnnotation.length >= 4 && nonAnnotation.length <= 6, `linear-sequence should have 4-6 nodes (got ${nonAnnotation.length})`);
  // Nodes should be in a row: incrementing x, same y
  const xValues = nonAnnotation.map((n) => n.position.x);
  const yValues = nonAnnotation.map((n) => n.position.y);
  const xIncreasing = xValues.every((x, i) => i === 0 || x > xValues[i - 1]);
  const sameY = yValues.every((y) => y === 160);
  assert(xIncreasing, `x values should be strictly increasing for linear-sequence (got: ${JSON.stringify(xValues)})`);
  assert(sameY, `all y values should be 160 for linear-sequence (got: ${JSON.stringify(yValues)})`);
  assert(ARCHETYPE_TO_INTENT[output.flowArchetype] !== undefined, 'ARCHETYPE_TO_INTENT maps linear-sequence');
}

// ---------------------------------------------------------------------------
// Test 8: feature scope — exactly 3 non-annotation nodes and 2 edges
// ---------------------------------------------------------------------------
console.log('\nTest 8: feature scope — exactly 3 nodes and 2 edges regardless of concept count');
{
  const output = heuristicGenerateFlow({
    concepts: genericConcepts(5), // many concepts — feature mode must still give exactly 3
    challengeContext: 'Build a project management platform.',
    scope: 'feature',
    selectedConceptName: 'Concept 1',
  });

  const nonAnnotation = output.nodes.filter((n) => !n.isAnnotation);
  assert(nonAnnotation.length === 3, `feature scope should have exactly 3 non-annotation nodes (got ${nonAnnotation.length})`);
  assert(output.edges.length === 2, `feature scope should have exactly 2 edges (got ${output.edges.length})`);
  assert(ARCHETYPE_TO_INTENT[output.flowArchetype] !== undefined, 'ARCHETYPE_TO_INTENT maps feature scope archetype');
}

// ---------------------------------------------------------------------------
// Test 9: two-sided detection — marketplace/buyer/seller
// ---------------------------------------------------------------------------
console.log('\nTest 9: two-sided detection — marketplace + buyer + seller');
{
  const output = heuristicGenerateFlow({
    concepts: [makeConcept('Marketplace'), makeConcept('Buyer Dashboard')],
    challengeContext: 'Build a marketplace platform connecting buyers and sellers for digital goods.',
    scope: 'journey',
  });

  assert(output.isTwoSided === true, 'isTwoSided should be true for marketplace + buyer + seller input');
  const annotationNodes = output.nodes.filter((n) => n.isAnnotation === true);
  assert(annotationNodes.length === 1, `should have exactly 1 annotation node (got ${annotationNodes.length})`);
  // Annotation should mention the riskier side
  const ann = annotationNodes[0];
  assert(
    ann.purpose.includes('supply/provider side') || ann.purpose.includes('demand/consumer side'),
    `annotation purpose should mention riskier side (got: "${ann.purpose.slice(0, 100)}")`
  );
}

// ---------------------------------------------------------------------------
// Test 10: every generated node has valid uiType and finite positions
// ---------------------------------------------------------------------------
console.log('\nTest 10: every node has valid uiType (normalizeUiType(n.uiType) === n.uiType) and finite positions');
{
  const testCases = [
    { concepts: genericConcepts(3), challengeContext: 'Build a dashboard for analytics', scope: 'journey' as const },
    { concepts: genericConcepts(1), challengeContext: 'Marketing landing page to promote and sell our product', scope: 'journey' as const },
    { concepts: genericConcepts(2), challengeContext: 'Build a habit tracking app with daily log and streak', scope: 'journey' as const },
    { concepts: genericConcepts(2), challengeContext: 'Generic web application', scope: 'feature' as const, selectedConceptName: 'Concept 1' },
  ];

  for (const tc of testCases) {
    const output = heuristicGenerateFlow(tc);
    for (const node of output.nodes) {
      assert(
        normalizeUiType(node.uiType) === node.uiType,
        `node '${node.id}' has valid uiType '${node.uiType}'`
      );
      assert(
        isFinite(node.position.x) && isFinite(node.position.y),
        `node '${node.id}' has finite position (${node.position.x}, ${node.position.y})`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Test 11: ARCHETYPE_TO_INTENT defined for every archetype
// ---------------------------------------------------------------------------
console.log('\nTest 11: ARCHETYPE_TO_INTENT defined for all 7 archetypes');
{
  const allArchetypes = [
    'linear-sequence',
    'hub-and-spoke',
    'single-page-sections',
    'funnel',
    'branching',
    'single-screen-tool',
    'loop',
  ] as const;

  for (const a of allArchetypes) {
    assert(ARCHETYPE_TO_INTENT[a] !== undefined, `ARCHETYPE_TO_INTENT['${a}'] is defined`);
  }
}

// ---------------------------------------------------------------------------
// Test 12: extractConceptsForFlow handles different artifact shapes
// ---------------------------------------------------------------------------
console.log('\nTest 12: extractConceptsForFlow — handles _canvas.conceptCards, concepts[], fallback');
{
  const fromCanvas = extractConceptsForFlow({
    _canvas: { conceptCards: [{ conceptName: 'Idea A', elevatorPitch: 'Pitch A' }] },
  });
  assert(fromCanvas.length === 1 && fromCanvas[0].name === 'Idea A', `extracted from _canvas.conceptCards (got ${JSON.stringify(fromCanvas[0]?.name)})`);

  const fromArray = extractConceptsForFlow({ concepts: [{ name: 'Idea B', elevatorPitch: 'Pitch B' }] });
  assert(fromArray.length === 1 && fromArray[0].name === 'Idea B', `extracted from concepts[] (got ${JSON.stringify(fromArray[0]?.name)})`);

  const fromFallback = extractConceptsForFlow({ name: 'Fallback Idea', elevatorPitch: 'Fallback pitch' });
  assert(fromFallback.length === 1, `fallback wraps entire artifact as single concept`);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('[verify-journey-flow-generator] All assertions passed.');
  process.exit(0);
}
