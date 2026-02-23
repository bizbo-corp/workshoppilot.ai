/**
 * Migration Helpers Module
 * Converts Step 2 and Step 4 artifact data to canvas sticky notes
 * Used during the output-to-canvas retrofit to populate the canvas
 */

import type { StakeholderArtifact, SenseMakingArtifact } from '@/lib/schemas/step-schemas';
import type { StickyNote } from '@/stores/canvas-store';
import { distributeCardsOnRing } from './ring-layout';
import { distributeCardsInZone, type EmpathyZone } from './empathy-zones';
import { STEP_CANVAS_CONFIGS } from './step-canvas-config';
import { POST_IT_WIDTH, POST_IT_HEIGHT, ZONE_COLORS } from './canvas-position';

/**
 * Migrate Step 2 stakeholders to ring-based canvas sticky notes
 * @param artifact - Stakeholder artifact from Step 2
 * @returns Array of sticky note objects ready for canvas store
 */
export function migrateStakeholdersToCanvas(
  artifact: Record<string, unknown>,
): Array<Omit<StickyNote, 'id'>> {
  const stakeholderArtifact = artifact as StakeholderArtifact;

  if (!stakeholderArtifact.stakeholders || stakeholderArtifact.stakeholders.length === 0) {
    return [];
  }

  // Calculate importance score for each stakeholder (range: 2-6)
  const scoredStakeholders = stakeholderArtifact.stakeholders.map((s) => {
    const powerScore = s.power === 'high' ? 3 : s.power === 'medium' ? 2 : 1;
    const interestScore = s.interest === 'high' ? 3 : s.interest === 'medium' ? 2 : 1;
    const importance = powerScore + interestScore;

    return { ...s, importance };
  });

  // Assign rings based on importance score
  const ringAssignments: Record<string, typeof scoredStakeholders> = {
    inner: [],
    middle: [],
    outer: [],
  };

  scoredStakeholders.forEach((s) => {
    if (s.importance >= 5) {
      ringAssignments.inner.push(s);
    } else if (s.importance >= 3) {
      ringAssignments.middle.push(s);
    } else {
      ringAssignments.outer.push(s);
    }
  });

  // Get ring config
  const config = STEP_CANVAS_CONFIGS['stakeholder-mapping'];
  const ringConfig = config?.ringConfig;

  if (!ringConfig) {
    throw new Error('Ring config not found for stakeholder-mapping');
  }

  const stickyNotes: Array<Omit<StickyNote, 'id'>> = [];

  // Process each ring
  Object.entries(ringAssignments).forEach(([ringId, stakeholders]) => {
    if (stakeholders.length === 0) return;

    const ring = ringConfig.rings.find((r) => r.id === ringId);
    if (!ring) return;

    // Get positions for all stakeholders in this ring
    const positions = distributeCardsOnRing(
      stakeholders.length,
      ring.radius,
      ringConfig.center,
    );

    // Create sticky notes
    stakeholders.forEach((stakeholder, index) => {
      const text = stakeholder.notes
        ? `${stakeholder.name}\n${stakeholder.notes}`
        : stakeholder.name;

      stickyNotes.push({
        text,
        position: positions[index],
        width: POST_IT_WIDTH,
        height: POST_IT_HEIGHT,
        color: 'yellow',
        cellAssignment: { row: ringId, col: '' },
      });
    });
  });

  return stickyNotes;
}

/**
 * Migrate Step 4 empathy data to zone-based canvas sticky notes
 * @param artifact - Sense making artifact from Step 4
 * @returns Array of sticky note objects ready for canvas store
 */
export function migrateEmpathyToCanvas(
  artifact: Record<string, unknown>,
): Array<Omit<StickyNote, 'id'>> {
  const senseMakingArtifact = artifact as SenseMakingArtifact;

  const stickyNotes: Array<Omit<StickyNote, 'id'>> = [];

  // Get empathy zone config
  const config = STEP_CANVAS_CONFIGS['sense-making'];
  const empathyZoneConfig = config?.empathyZoneConfig;

  if (!empathyZoneConfig) {
    throw new Error('Empathy zone config not found for sense-making');
  }

  // Group items by zone
  const zoneItems: Record<EmpathyZone, string[]> = {
    says: [],
    thinks: [],
    feels: [],
    does: [],
    pains: [],
    gains: [],
  };

  // Distribute themes across 4 quadrant zones round-robin
  if (senseMakingArtifact.themes) {
    const quadrantZones: EmpathyZone[] = ['says', 'thinks', 'feels', 'does'];

    senseMakingArtifact.themes.forEach((theme, themeIndex) => {
      const targetZone = quadrantZones[themeIndex % quadrantZones.length];

      // Add theme name as a card
      zoneItems[targetZone].push(`Theme: ${theme.name}`);

      // Add each evidence item as a separate card
      if (theme.evidence) {
        theme.evidence.forEach((evidence) => {
          zoneItems[targetZone].push(evidence);
        });
      }
    });
  }

  // Map pains array to pains zone
  if (senseMakingArtifact.pains) {
    zoneItems.pains.push(...senseMakingArtifact.pains);
  }

  // Map gains array to gains zone
  if (senseMakingArtifact.gains) {
    zoneItems.gains.push(...senseMakingArtifact.gains);
  }

  // Create sticky notes for each zone
  Object.entries(zoneItems).forEach(([zoneKey, items]) => {
    if (items.length === 0) return;

    const zone = empathyZoneConfig.zones[zoneKey as EmpathyZone];
    if (!zone) return;

    // Get positions for all items in this zone
    const positions = distributeCardsInZone(
      items.length,
      zone.bounds,
      { width: POST_IT_WIDTH, height: POST_IT_HEIGHT },
      15, // padding
    );

    // Create sticky notes
    items.forEach((text, index) => {
      const color = ZONE_COLORS[zoneKey] || 'yellow';

      stickyNotes.push({
        text,
        position: positions[index],
        width: POST_IT_WIDTH,
        height: POST_IT_HEIGHT,
        color,
        cellAssignment: { row: zoneKey, col: '' },
      });
    });
  });

  return stickyNotes;
}
