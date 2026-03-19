'use client';

/**
 * Static step renderers for presentation capture.
 * Each component renders a step at 1200x800px using canvas data,
 * designed to be captured as JPEG images with html-to-image.
 */

import { StickyNoteDiv } from './sticky-note';

// Common types for canvas data
interface StickyNoteData {
  id: string;
  text: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  color?: string;
  cellAssignment?: { row: string; col: string };
  cluster?: string;
  templateKey?: string;
  templateLabel?: string;
}

interface PersonaTemplateData {
  id: string;
  name?: string;
  age?: string;
  job?: string;
  archetype?: string;
  archetypeRole?: string;
  empathySays?: string;
  empathyThinks?: string;
  empathyFeels?: string;
  empathyDoes?: string;
  empathyPains?: string;
  empathyGains?: string;
  narrative?: string;
  quote?: string;
}

interface HmwCardData {
  id: string;
  cardState?: string;
  givenThat?: string;
  persona?: string;
  immediateGoal?: string;
  deeperGoal?: string;
  fullStatement?: string;
}

interface ConceptCardData {
  id: string;
  conceptName: string;
  ideaSource?: string;
  elevatorPitch?: string;
  usp?: string;
  swot?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  feasibility?: {
    technical: { score: number; rationale: string };
    business: { score: number; rationale: string };
    userDesirability: { score: number; rationale: string };
  };
}

interface MindMapNodeData {
  id: string;
  label: string;
  themeColor: string;
  themeBgColor: string;
  isRoot: boolean;
  level: number;
}

interface GridColumnData {
  id: string;
  label: string;
  width: number;
}

// Step data interface passed to each renderer
export interface StepData {
  artifact: Record<string, unknown>;
  canvas: Record<string, unknown> | null;
}

// Container dimensions
const W = 1200;
const H = 800;

// Common wrapper
function CaptureFrame({ children, bg = '#ffffff' }: { children: React.ReactNode; bg?: string }) {
  return (
    <div
      style={{
        width: W,
        height: H,
        backgroundColor: bg,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {children}
    </div>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ backgroundColor: '#1B2A4A', padding: '16px 32px', minHeight: subtitle ? 72 : 56 }}>
      <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{title}</div>
      {subtitle && <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

// ── Step 1: Challenge ─────────────────────────────────────────────────
export function ChallengeRenderer({ data }: { data: StepData }) {
  const a = data.artifact;
  const fields = [
    { label: 'Problem Statement', value: (a.problemStatement as string) || '', color: '#EF4444' },
    { label: 'Target User', value: (a.targetUser as string) || '', color: '#3B82F6' },
    { label: 'Desired Outcome', value: (a.desiredOutcome as string) || '', color: '#059669' },
  ];

  return (
    <CaptureFrame>
      <StepHeader title="Challenge Definition" subtitle="Step 1" />
      <div style={{ padding: '24px 32px' }}>
        {fields.map((f) => (
          <div key={f.label} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: f.color, marginBottom: 6 }}>{f.label}</div>
            <div style={{ fontSize: 14, color: '#0F1B33', lineHeight: 1.5 }}>{f.value}</div>
          </div>
        ))}
        {typeof a.hmwStatement === 'string' && a.hmwStatement && (
          <div style={{ backgroundColor: '#F5F6FA', borderRadius: 8, padding: '14px 20px', marginTop: 16 }}>
            <div style={{ fontSize: 14, color: '#1B2A4A', fontWeight: 600, fontStyle: 'italic' }}>
              HMW: {a.hmwStatement}
            </div>
          </div>
        )}
      </div>
    </CaptureFrame>
  );
}

// ── Step 2: Stakeholder Map ───────────────────────────────────────────
export function StakeholderMapRenderer({ data }: { data: StepData }) {
  const stickyNotes = ((data.canvas?.stickyNotes as StickyNoteData[]) || []).filter(n => n.text?.trim());

  // Ring config from step-canvas-config
  const rings = [
    { radius: 1080, color: '#a3b18a', label: 'Least Important' },
    { radius: 780, color: '#8a9a5b', label: '' },
    { radius: 480, color: '#6b7f4e', label: 'Most Important' },
  ];

  // Canvas center is (0,0). We need to scale and offset to fit in 1200x800.
  // Map area: use left 700px for rings visualization
  const viewCx = 350;
  const viewCy = 450;
  const ringScale = 0.28; // Scale rings to fit

  return (
    <CaptureFrame>
      <StepHeader title="Stakeholder Map" subtitle="Step 2" />
      <div style={{ position: 'relative', width: '100%', height: H - 72 }}>
        {/* SVG rings */}
        <svg width={700} height={H - 72} style={{ position: 'absolute', left: 0, top: 0 }}>
          {rings.map((ring, i) => (
            <g key={i}>
              <circle
                cx={viewCx}
                cy={viewCy - 50}
                r={ring.radius * ringScale}
                fill={ring.color}
                opacity={0.15}
              />
              <circle
                cx={viewCx}
                cy={viewCy - 50}
                r={ring.radius * ringScale}
                fill="none"
                stroke={ring.color}
                strokeWidth={1.5}
                strokeDasharray={i === 2 ? 'none' : '6 3'}
              />
            </g>
          ))}
          <text x={viewCx} y={viewCy - 46} textAnchor="middle" fontSize={11} fontWeight={600} fill="#4a5a3e">
            Most Important
          </text>
        </svg>

        {/* Sticky notes positioned over rings */}
        {stickyNotes.map((note) => (
          <StickyNoteDiv
            key={note.id}
            text={note.text}
            color={note.color || 'yellow'}
            x={note.position.x}
            y={note.position.y}
            width={note.width}
            height={note.height}
            scale={ringScale}
            offsetX={viewCx / ringScale}
            offsetY={(viewCy - 50) / ringScale}
          />
        ))}

        {/* Right side: stakeholder list from artifact */}
        <div style={{ position: 'absolute', right: 24, top: 16, width: 460 }}>
          {renderStakeholderList(data.artifact)}
        </div>
      </div>
    </CaptureFrame>
  );
}

function renderStakeholderList(artifact: Record<string, unknown>) {
  const stakeholders = (artifact.stakeholders as Array<{ name: string; category: string; power?: string; interest?: string }>) || [];
  if (stakeholders.length === 0) return null;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
      <thead>
        <tr style={{ backgroundColor: '#1B2A4A', color: '#fff' }}>
          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Stakeholder</th>
          <th style={{ padding: '6px 8px', textAlign: 'center' }}>Ring</th>
          <th style={{ padding: '6px 8px', textAlign: 'center' }}>Power</th>
          <th style={{ padding: '6px 8px', textAlign: 'center' }}>Interest</th>
        </tr>
      </thead>
      <tbody>
        {stakeholders.slice(0, 12).map((s, i) => (
          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#F5F6FA' : '#fff' }}>
            <td style={{ padding: '5px 8px' }}>{s.name}</td>
            <td style={{ padding: '5px 8px', textAlign: 'center' }}>{s.category}</td>
            <td style={{ padding: '5px 8px', textAlign: 'center' }}>{s.power || ''}</td>
            <td style={{ padding: '5px 8px', textAlign: 'center' }}>{s.interest || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Step 3: User Research ─────────────────────────────────────────────
export function UserResearchRenderer({ data }: { data: StepData }) {
  const a = data.artifact;
  const questions = (a.interviewQuestions as string[]) || [];
  const insights = (a.insights as Array<{ finding: string; quote?: string }>) || [];

  return (
    <CaptureFrame>
      <StepHeader title="User Research" subtitle="Step 3" />
      <div style={{ display: 'flex', gap: 32, padding: '20px 32px' }}>
        {/* Left: Questions */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#3B82F6', marginBottom: 12 }}>Interview Questions</div>
          {questions.slice(0, 7).map((q, i) => (
            <div key={i} style={{ fontSize: 11, color: '#0F1B33', marginBottom: 8, paddingLeft: 12, borderLeft: '2px solid #3B82F6' }}>
              {q}
            </div>
          ))}
        </div>
        {/* Right: Insights */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#059669', marginBottom: 12 }}>Key Insights</div>
          {insights.slice(0, 6).map((ins, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#0F1B33' }}>{ins.finding}</div>
              {ins.quote && (
                <div style={{ fontSize: 10, color: '#6B7280', fontStyle: 'italic', marginTop: 3, paddingLeft: 8 }}>
                  &ldquo;{ins.quote}&rdquo;
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </CaptureFrame>
  );
}

// ── Step 4: Sense Making (Empathy Map) ────────────────────────────────
export function SenseMakingRenderer({ data }: { data: StepData }) {
  const stickyNotes = ((data.canvas?.stickyNotes as StickyNoteData[]) || []).filter(n => n.text?.trim());

  // Empathy zone config (from step-canvas-config)
  const zones = [
    { id: 'says', label: 'Says', color: '#8a9a5b', x: 0, y: 0, w: 280, h: 280 },
    { id: 'thinks', label: 'Thinks', color: '#a3b18a', x: 280, y: 0, w: 280, h: 280 },
    { id: 'feels', label: 'Feels', color: '#6b7f4e', x: 0, y: 280, w: 280, h: 280 },
    { id: 'does', label: 'Does', color: '#95a873', x: 280, y: 280, w: 280, h: 280 },
    { id: 'pains', label: 'Pains', color: '#c4856b', x: 560, y: 0, w: 200, h: 280 },
    { id: 'gains', label: 'Gains', color: '#6b9a7a', x: 560, y: 280, w: 200, h: 280 },
  ];

  // Canvas zone bounds from config - map sticky notes to zones by position
  const zoneMap: Record<string, { bounds: { x: number; y: number; width: number; height: number } }> = {
    says: { bounds: { x: -560, y: -860, width: 520, height: 420 } },
    thinks: { bounds: { x: -20, y: -860, width: 520, height: 420 } },
    feels: { bounds: { x: -560, y: -420, width: 520, height: 420 } },
    does: { bounds: { x: -20, y: -420, width: 520, height: 420 } },
    pains: { bounds: { x: 520, y: -860, width: 340, height: 420 } },
    gains: { bounds: { x: 520, y: -420, width: 340, height: 420 } },
  };

  // Assign sticky notes to zones by position
  function getZoneForNote(note: StickyNoteData): string | null {
    const nx = note.position.x + note.width / 2;
    const ny = note.position.y + note.height / 2;
    for (const [zoneId, zone] of Object.entries(zoneMap)) {
      const b = zone.bounds;
      if (nx >= b.x && nx <= b.x + b.width && ny >= b.y && ny <= b.y + b.height) {
        return zoneId;
      }
    }
    return null;
  }

  const notesByZone: Record<string, StickyNoteData[]> = {};
  for (const z of zones) notesByZone[z.id] = [];
  for (const note of stickyNotes) {
    const zone = getZoneForNote(note);
    if (zone && notesByZone[zone]) {
      notesByZone[zone].push(note);
    }
  }

  const mapLeft = 120;
  const mapTop = 100;

  return (
    <CaptureFrame>
      <StepHeader title="Research Sense Making" subtitle="Step 4 — Empathy Map" />
      <div style={{ position: 'relative', padding: '12px 32px' }}>
        {/* Empathy zones */}
        {zones.map((zone) => (
          <div
            key={zone.id}
            style={{
              position: 'absolute',
              left: mapLeft + zone.x,
              top: mapTop + zone.y,
              width: zone.w,
              height: zone.h,
              backgroundColor: zone.color + '20',
              border: `1px solid ${zone.color}40`,
              borderRadius: 4,
              padding: 8,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: zone.color, marginBottom: 4 }}>
              {zone.label}
            </div>
            {/* Render notes in this zone as mini cards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {notesByZone[zone.id].slice(0, 6).map((note) => (
                <div
                  key={note.id}
                  style={{
                    backgroundColor: '#ede0c0',
                    padding: '3px 6px',
                    borderRadius: 2,
                    fontSize: 9,
                    color: '#6b5020',
                    maxWidth: zone.w - 24,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                  }}
                >
                  {note.text.slice(0, 60)}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Fallback: if no canvas notes, show artifact themes */}
        {stickyNotes.length === 0 && renderSenseMakingFallback(data.artifact, mapLeft, mapTop)}
      </div>
    </CaptureFrame>
  );
}

function renderSenseMakingFallback(a: Record<string, unknown>, left: number, top: number) {
  const themes = (a.themes as Array<{ name: string; evidence: string[] }>) || [];
  const pains = (a.pains as string[]) || [];
  const gains = (a.gains as string[]) || [];

  return (
    <div style={{ position: 'absolute', left, top, width: 760 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#3B82F6', marginBottom: 12 }}>Themes</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {themes.slice(0, 4).map((t, i) => (
          <div key={i} style={{ backgroundColor: '#F5F6FA', borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6' }}>{t.name}</div>
            <div style={{ fontSize: 10, color: '#0F1B33', marginTop: 4 }}>
              {t.evidence.slice(0, 2).join(' | ')}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, backgroundColor: '#c4856b20', borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#c4856b' }}>Pains</div>
          {pains.slice(0, 4).map((p, i) => (
            <div key={i} style={{ fontSize: 10, marginTop: 4 }}>{p}</div>
          ))}
        </div>
        <div style={{ flex: 1, backgroundColor: '#6b9a7a20', borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b9a7a' }}>Gains</div>
          {gains.slice(0, 4).map((g, i) => (
            <div key={i} style={{ fontSize: 10, marginTop: 4 }}>{g}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 5: Persona ───────────────────────────────────────────────────
export function PersonaRenderer({ data }: { data: StepData }) {
  const templates = (data.canvas?.personaTemplates as PersonaTemplateData[]) || [];
  const t = templates[0];

  // Fallback to artifact fields
  const a = data.artifact;
  const name = t?.name || (a.name as string) || 'User';
  const age = t?.age || (a.age as string) || '';
  const job = t?.job || (a.role as string) || (a.job as string) || '';
  const archetype = t?.archetype || '';
  const quote = t?.quote || (a.quote as string) || '';
  const narrative = t?.narrative || (a.bio as string) || (a.narrative as string) || '';

  const empathyZones = [
    { label: 'Says', value: t?.empathySays || '', color: '#8a9a5b' },
    { label: 'Thinks', value: t?.empathyThinks || '', color: '#a3b18a' },
    { label: 'Feels', value: t?.empathyFeels || '', color: '#6b7f4e' },
    { label: 'Does', value: t?.empathyDoes || '', color: '#95a873' },
    { label: 'Pains', value: t?.empathyPains || '', color: '#c4856b' },
    { label: 'Gains', value: t?.empathyGains || '', color: '#6b9a7a' },
  ];

  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <CaptureFrame>
      <StepHeader title="Persona Development" subtitle="Step 5" />
      <div style={{ display: 'flex', gap: 24, padding: '20px 32px' }}>
        {/* Left: Persona card */}
        <div style={{
          width: 600,
          backgroundColor: '#f4f7ef',
          border: '1px solid #c5d1a8',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {/* Hero section */}
          <div style={{
            backgroundColor: '#6b7f4e',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 700,
              color: '#6b7f4e',
            }}>
              {initials}
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{name}</div>
              <div style={{ color: '#d4dcc4', fontSize: 12 }}>
                {[archetype, job, age ? `Age ${age}` : ''].filter(Boolean).join(' | ')}
              </div>
            </div>
          </div>

          {/* Empathy grid 3x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, padding: 12 }}>
            {empathyZones.map((z) => (
              <div
                key={z.label}
                style={{
                  backgroundColor: z.color + '15',
                  borderRadius: 6,
                  padding: 10,
                  minHeight: 80,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: z.color, marginBottom: 4 }}>
                  {z.label}
                </div>
                <div style={{ fontSize: 9, color: '#333', lineHeight: 1.4 }}>
                  {z.value.slice(0, 120)}
                </div>
              </div>
            ))}
          </div>

          {/* Narrative */}
          {narrative && (
            <div style={{ padding: '8px 16px', fontSize: 10, color: '#555', fontStyle: 'italic', lineHeight: 1.4 }}>
              {narrative.slice(0, 200)}
            </div>
          )}

          {/* Quote */}
          {quote && (
            <div style={{
              margin: '0 12px 12px',
              padding: '10px 14px',
              backgroundColor: '#fff',
              borderLeft: '3px solid #6b7f4e',
              borderRadius: 4,
              fontSize: 11,
              color: '#333',
              fontStyle: 'italic',
            }}>
              &ldquo;{quote}&rdquo;
            </div>
          )}
        </div>

        {/* Right: supplementary data from artifact */}
        <div style={{ flex: 1 }}>
          {renderPersonaSupplementary(data.artifact)}
        </div>
      </div>
    </CaptureFrame>
  );
}

function renderPersonaSupplementary(a: Record<string, unknown>) {
  const goals = (a.goals as string[]) || [];
  const pains = (a.pains as string[]) || [];
  const motivations = (a.motivations as string[]) || [];

  const sections = [
    { label: 'Goals', items: goals, color: '#059669' },
    { label: 'Pains', items: pains, color: '#EF4444' },
    { label: 'Motivations', items: motivations, color: '#8B5CF6' },
  ].filter(s => s.items.length > 0);

  return (
    <>
      {sections.map((s) => (
        <div key={s.label} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 6 }}>{s.label}</div>
          {s.items.slice(0, 4).map((item, i) => (
            <div key={i} style={{ fontSize: 10, color: '#0F1B33', marginBottom: 4, paddingLeft: 10, borderLeft: `2px solid ${s.color}40` }}>
              {item}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

// ── Step 6: Journey Map ───────────────────────────────────────────────
export function JourneyMapRenderer({ data }: { data: StepData }) {
  const stickyNotes = ((data.canvas?.stickyNotes as StickyNoteData[]) || []).filter(n => n.text?.trim());
  const gridColumns = (data.canvas?.gridColumns as GridColumnData[]) || [];

  const rowDefs = [
    { id: 'actions', label: 'Actions', color: '#DBEAFE' },
    { id: 'goals', label: 'Goals', color: '#D1FAE5' },
    { id: 'barriers', label: 'Barriers', color: '#FEE2E2' },
    { id: 'touchpoints', label: 'Touchpoints', color: '#FCE7F3' },
    { id: 'emotions', label: 'Emotions', color: '#F3F4F6' },
    { id: 'moments', label: 'Moments of Truth', color: '#FEF3C7' },
    { id: 'opportunities', label: 'Opportunities', color: '#FFEDD5' },
  ];

  // Use canvas grid columns if available, fallback to artifact stages
  const columns = gridColumns.length > 0
    ? gridColumns
    : ((data.artifact.stages as Array<{ name: string }>) || []).map((s, i) => ({
        id: `stage-${i + 1}`,
        label: s.name || `Stage ${i + 1}`,
        width: 240,
      }));

  const colCount = Math.min(columns.length, 8);
  const labelW = 120;
  const cellW = colCount > 0 ? Math.floor((W - labelW - 48) / colCount) : 160;
  const rowH = 80;

  // Group notes by cell
  const notesByCell: Record<string, StickyNoteData[]> = {};
  for (const note of stickyNotes) {
    if (note.cellAssignment) {
      const key = `${note.cellAssignment.row}:${note.cellAssignment.col}`;
      if (!notesByCell[key]) notesByCell[key] = [];
      notesByCell[key].push(note);
    }
  }

  return (
    <CaptureFrame>
      <StepHeader title="Customer Journey Map" subtitle="Step 6" />
      <div style={{ padding: '8px 24px', overflow: 'hidden' }}>
        {/* Column headers */}
        <div style={{ display: 'flex', marginLeft: labelW, marginBottom: 2 }}>
          {columns.slice(0, colCount).map((col) => (
            <div
              key={col.id}
              style={{
                width: cellW,
                textAlign: 'center',
                fontSize: 10,
                fontWeight: 700,
                padding: '4px 2px',
                backgroundColor: '#1B2A4A',
                color: '#fff',
                borderRight: '1px solid #E2E4EB',
              }}
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rowDefs.map((row) => (
          <div key={row.id} style={{ display: 'flex', borderBottom: '1px solid #E2E4EB' }}>
            {/* Row label */}
            <div style={{
              width: labelW,
              backgroundColor: row.color,
              padding: '4px 8px',
              fontSize: 9,
              fontWeight: 700,
              color: '#0F1B33',
              display: 'flex',
              alignItems: 'center',
              minHeight: rowH,
              borderRight: '1px solid #E2E4EB',
            }}>
              {row.label}
            </div>
            {/* Cells */}
            {columns.slice(0, colCount).map((col) => {
              const cellNotes = notesByCell[`${row.id}:${col.id}`] || [];
              return (
                <div
                  key={col.id}
                  style={{
                    width: cellW,
                    minHeight: rowH,
                    backgroundColor: row.color + '80',
                    borderRight: '1px solid #E2E4EB',
                    padding: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    overflow: 'hidden',
                  }}
                >
                  {cellNotes.slice(0, 3).map((note) => (
                    <div
                      key={note.id}
                      style={{
                        backgroundColor: getColorHex(note.color),
                        padding: '2px 4px',
                        borderRadius: 2,
                        fontSize: 8,
                        color: getTextColorHex(note.color),
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {note.text.slice(0, 50)}
                    </div>
                  ))}
                  {cellNotes.length > 3 && (
                    <div style={{ fontSize: 7, color: '#666' }}>+{cellNotes.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </CaptureFrame>
  );
}

function getColorHex(color?: string): string {
  const map: Record<string, string> = {
    yellow: '#ede0c0',
    pink: '#e8c8c0',
    blue: '#b8c8d0',
    green: '#c0d8c0',
    orange: '#e0d0b8',
    red: '#d8b8a8',
  };
  return map[color || 'yellow'] || map.yellow;
}

function getTextColorHex(color?: string): string {
  const map: Record<string, string> = {
    yellow: '#6b5020',
    pink: '#784040',
    blue: '#344858',
    green: '#344a2c',
    orange: '#6b4420',
    red: '#684038',
  };
  return map[color || 'yellow'] || map.yellow;
}

// ── Step 7: Reframe (HMW Card) ────────────────────────────────────────
export function ReframeRenderer({ data }: { data: StepData }) {
  const hmwCards = (data.canvas?.hmwCards as HmwCardData[]) || [];
  const a = data.artifact;
  const originalHmw = (a.originalHmw as string) || '';
  const card = hmwCards[0];

  // Fallback to artifact hmwStatements
  const hmwStatements = (a.hmwStatements as HmwCardData[]) || [];
  const displayCard = card || hmwStatements[0];

  const madLibFields = displayCard ? [
    { prefix: 'Given that', value: displayCard.givenThat || '', color: '#8a9a5b' },
    { prefix: 'How might we help', value: displayCard.persona || '', color: '#8B5CF6' },
    { prefix: 'to', value: displayCard.immediateGoal || '', color: '#F59E0B' },
    { prefix: 'so they can', value: displayCard.deeperGoal || '', color: '#059669' },
  ] : [];

  return (
    <CaptureFrame>
      <StepHeader title="Reframed Challenge" subtitle="Step 7" />
      <div style={{ padding: '20px 32px' }}>
        {originalHmw && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Original Challenge:</div>
            <div style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginTop: 4 }}>{originalHmw}</div>
          </div>
        )}

        {displayCard && (
          <div style={{
            backgroundColor: '#f4f7ef',
            border: '1.5px solid #c5d1a8',
            borderRadius: 12,
            padding: 24,
            maxWidth: 700,
          }}>
            {/* Header */}
            <div style={{
              backgroundColor: '#6b7f4e',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              display: 'inline-block',
              marginBottom: 16,
            }}>
              HOW MIGHT WE CARD
            </div>

            {/* Mad libs fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {madLibFields.map((f) => (
                <div key={f.prefix}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: f.color, marginBottom: 4 }}>{f.prefix}</div>
                  <div style={{
                    backgroundColor: '#fff',
                    border: '1px solid #c5d1a8',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: 12,
                    color: '#0F1B33',
                    minHeight: 40,
                  }}>
                    {f.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Full statement */}
            {displayCard.fullStatement && (
              <div style={{
                marginTop: 16,
                padding: '12px 16px',
                backgroundColor: '#fff',
                borderRadius: 6,
                border: '1px solid #c5d1a8',
                fontSize: 12,
                color: '#0F1B33',
                fontStyle: 'italic',
                lineHeight: 1.5,
              }}>
                {displayCard.fullStatement}
              </div>
            )}
          </div>
        )}
      </div>
    </CaptureFrame>
  );
}

// ── Step 8: Ideation ──────────────────────────────────────────────────
export function IdeationRenderer({ data }: { data: StepData }) {
  const mindMapNodes = (data.canvas?.mindMapNodes as MindMapNodeData[]) || [];
  const a = data.artifact;
  const clusters = (a.clusters as Array<{ theme: string; ideas: Array<{ title: string; description: string; isWildCard?: boolean }> }>) || [];
  const reframedHmw = (a.reframedHmw as string) || '';

  const clusterColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#14B8A6'];

  // If we have mind map nodes, group by theme (level 1)
  const themeNodes = mindMapNodes.filter(n => n.level === 1);
  const ideaNodes = mindMapNodes.filter(n => n.level >= 2);

  // Use clusters from artifact (more reliable than raw mind map nodes)
  const displayClusters = clusters.length > 0 ? clusters : themeNodes.map((theme) => ({
    theme: theme.label,
    ideas: ideaNodes
      .filter(() => true) // Would need parent-child linking; simplified
      .slice(0, 4)
      .map(n => ({ title: n.label, description: '', isWildCard: false })),
  }));

  return (
    <CaptureFrame>
      <StepHeader title="Ideation" subtitle="Step 8" />
      <div style={{ padding: '12px 32px' }}>
        {reframedHmw && (
          <div style={{
            backgroundColor: '#F5F6FA',
            borderRadius: 6,
            padding: '8px 16px',
            fontSize: 11,
            color: '#0F1B33',
            fontStyle: 'italic',
            marginBottom: 16,
          }}>
            {reframedHmw}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {displayClusters.slice(0, 6).map((cluster, ci) => {
            const color = clusterColors[ci % clusterColors.length];
            return (
              <div
                key={ci}
                style={{
                  backgroundColor: '#F5F6FA',
                  borderRadius: 8,
                  borderLeft: `4px solid ${color}`,
                  padding: 14,
                  minHeight: 180,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>
                  {cluster.theme}
                </div>
                {cluster.ideas.slice(0, 5).map((idea, ii) => (
                  <div
                    key={ii}
                    style={{
                      fontSize: 10,
                      color: '#0F1B33',
                      marginBottom: 5,
                      paddingLeft: 8,
                      borderLeft: '2px solid #E2E4EB',
                    }}
                  >
                    {idea.title}{idea.isWildCard ? ' *' : ''}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </CaptureFrame>
  );
}

// ── Step 9: Concept ───────────────────────────────────────────────────
export function ConceptRenderer({ data }: { data: StepData }) {
  const conceptCards = (data.canvas?.conceptCards as ConceptCardData[]) || [];
  const a = data.artifact;
  const concepts = (a.concepts as ConceptCardData[]) || [];
  const card = conceptCards[0] || concepts[0];

  if (!card) {
    // Fallback: use artifact root as single concept
    return <ConceptFallbackRenderer artifact={a} />;
  }

  const swotQuadrants = card.swot ? [
    { label: 'Strengths', items: card.swot.strengths || [], color: '#10B981' },
    { label: 'Weaknesses', items: card.swot.weaknesses || [], color: '#F59E0B' },
    { label: 'Opportunities', items: card.swot.opportunities || [], color: '#3B82F6' },
    { label: 'Threats', items: card.swot.threats || [], color: '#EF4444' },
  ] : [];

  const feasibilityDims = card.feasibility ? [
    { label: 'Technical', ...card.feasibility.technical, color: '#3B82F6' },
    { label: 'Business', ...card.feasibility.business, color: '#059669' },
    { label: 'User Desirability', ...card.feasibility.userDesirability, color: '#8B5CF6' },
  ] : [];

  return (
    <CaptureFrame>
      <StepHeader title={card.conceptName || 'Concept'} subtitle={`Step 9${card.ideaSource ? ` — from: ${card.ideaSource}` : ''}`} />
      <div style={{ padding: '12px 32px' }}>
        {/* Elevator pitch */}
        {card.elevatorPitch && (
          <div style={{
            backgroundColor: '#F5F6FA',
            borderRadius: 6,
            padding: '10px 16px',
            fontSize: 12,
            color: '#0F1B33',
            fontStyle: 'italic',
            marginBottom: 12,
          }}>
            {card.elevatorPitch}
          </div>
        )}

        {/* USP */}
        {card.usp && (
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6' }}>USP: </span>
            <span style={{ fontSize: 11, color: '#0F1B33' }}>{card.usp}</span>
          </div>
        )}

        {/* SWOT 2x2 */}
        {swotQuadrants.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {swotQuadrants.map((q) => (
              <div key={q.label} style={{ backgroundColor: '#F5F6FA', borderRadius: 6, padding: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: q.color, marginBottom: 4 }}>{q.label}</div>
                {q.items.slice(0, 3).map((item, i) => (
                  <div key={i} style={{ fontSize: 9, color: '#0F1B33', marginBottom: 2 }}>• {item}</div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Feasibility scores */}
        {feasibilityDims.length > 0 && (
          <div style={{ display: 'flex', gap: 16 }}>
            {feasibilityDims.map((dim) => (
              <div key={dim.label} style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: dim.color, marginBottom: 4 }}>{dim.label}</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <div
                      key={d}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: d <= dim.score ? dim.color : '#E2E4EB',
                      }}
                    />
                  ))}
                  <span style={{ fontSize: 12, fontWeight: 700, color: dim.color, marginLeft: 4 }}>{dim.score}/5</span>
                </div>
                {dim.rationale && (
                  <div style={{ fontSize: 9, color: '#6B7280' }}>{dim.rationale.slice(0, 80)}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </CaptureFrame>
  );
}

function ConceptFallbackRenderer({ artifact }: { artifact: Record<string, unknown> }) {
  const name = (artifact.name as string) || (artifact.conceptName as string) || 'Concept';
  const pitch = (artifact.elevatorPitch as string) || '';
  const usp = (artifact.usp as string) || '';

  return (
    <CaptureFrame>
      <StepHeader title={name} subtitle="Step 9 — Concept" />
      <div style={{ padding: '20px 32px' }}>
        {pitch && <div style={{ fontSize: 14, color: '#0F1B33', fontStyle: 'italic', marginBottom: 16 }}>{pitch}</div>}
        {usp && (
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>USP: </span>
            <span style={{ fontSize: 12, color: '#0F1B33' }}>{usp}</span>
          </div>
        )}
      </div>
    </CaptureFrame>
  );
}

// ── Step 10: Validate ─────────────────────────────────────────────────
export function ValidateRenderer({ data }: { data: StepData }) {
  const a = data.artifact;
  const confidenceAssessment = a.confidenceAssessment as Record<string, unknown> | undefined;
  const nextSteps = (a.recommendedNextSteps as string[]) || [];
  const narrativeIntro = (a.narrativeIntro as string) || (a.narrative as string) || '';

  return (
    <CaptureFrame>
      <StepHeader title="Validation & Synthesis" subtitle="Step 10" />
      <div style={{ display: 'flex', gap: 24, padding: '20px 32px' }}>
        {/* Confidence gauge */}
        {confidenceAssessment && (
          <div style={{ width: '100%' }}>
            {renderConfidenceGauge(confidenceAssessment)}
          </div>
        )}
      </div>

      {/* Narrative */}
      {narrativeIntro && (
        <div style={{ padding: '0 32px', fontSize: 12, color: '#0F1B33', fontStyle: 'italic', lineHeight: 1.5 }}>
          {narrativeIntro}
        </div>
      )}

      {/* Next steps */}
      {nextSteps.length > 0 && (
        <div style={{ padding: '16px 32px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1B2A4A', marginBottom: 10 }}>Recommended Next Steps</div>
          {nextSteps.slice(0, 5).map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: '#3B82F6',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 11, color: '#0F1B33' }}>{step}</div>
            </div>
          ))}
        </div>
      )}
    </CaptureFrame>
  );
}

function renderConfidenceGauge(ca: Record<string, unknown>) {
  const score = (ca.score as number) || 0;
  const rationale = (ca.rationale as string) || '';
  const quality = (ca.researchQuality as string) || '';
  const scoreColor = score >= 7 ? '#10B981' : score >= 4 ? '#F59E0B' : '#EF4444';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
        <span style={{ fontSize: 48, fontWeight: 700, color: scoreColor }}>{score}</span>
        <span style={{ fontSize: 16, color: '#6B7280' }}>/10</span>
      </div>
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>Confidence Score</div>

      {/* Gauge bar */}
      <div style={{ height: 8, backgroundColor: '#E2E4EB', borderRadius: 4, marginBottom: 8, width: '100%' }}>
        <div style={{
          height: 8,
          backgroundColor: scoreColor,
          borderRadius: 4,
          width: `${(score / 10) * 100}%`,
        }} />
      </div>

      {quality && (
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: quality === 'strong' ? '#10B981' : quality === 'moderate' ? '#F59E0B' : '#EF4444',
          marginBottom: 6,
        }}>
          Research Quality: {quality}
        </div>
      )}

      {rationale && (
        <div style={{ fontSize: 10, color: '#0F1B33', fontStyle: 'italic', lineHeight: 1.4 }}>
          {rationale}
        </div>
      )}
    </div>
  );
}

// ── Renderer registry ──────────────────────────────────────────────────
export const STEP_RENDERERS: Record<string, React.ComponentType<{ data: StepData }>> = {
  challenge: ChallengeRenderer,
  stakeholderMapping: StakeholderMapRenderer,
  userResearch: UserResearchRenderer,
  senseMaking: SenseMakingRenderer,
  persona: PersonaRenderer,
  journeyMapping: JourneyMapRenderer,
  reframe: ReframeRenderer,
  ideation: IdeationRenderer,
  concept: ConceptRenderer,
  validate: ValidateRenderer,
};

export const STEP_TITLES: Record<string, string> = {
  challenge: 'Challenge Definition',
  stakeholderMapping: 'Stakeholder Map',
  userResearch: 'User Research',
  senseMaking: 'Sense Making',
  persona: 'Persona',
  journeyMapping: 'Journey Map',
  reframe: 'Reframed Challenge',
  ideation: 'Ideation',
  concept: 'Concept',
  validate: 'Validation',
};

/** Ordered step keys for sequential rendering */
export const STEP_ORDER = [
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
] as const;
