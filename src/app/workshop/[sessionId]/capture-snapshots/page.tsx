'use client';

/**
 * One-off retroactive snapshot capture page.
 * Visit /workshop/{sessionId}/capture-snapshots to capture all completed steps.
 * DELETE THIS FILE after use.
 */

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { captureSingleStep } from '@/lib/capture/capture-single-step';
import type { StepData } from '@/components/workshop/presentation-capture/step-renderers';

const CAMEL_TO_KEBAB: Record<string, string> = {
  challenge: 'challenge',
  stakeholderMapping: 'stakeholder-mapping',
  userResearch: 'user-research',
  senseMaking: 'sense-making',
  persona: 'persona',
  journeyMapping: 'journey-mapping',
  reframe: 'reframe',
  ideation: 'ideation',
  concept: 'concept',
  validate: 'validate',
};

export default function CaptureSnapshotsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [log, setLog] = useState<string[]>([]);
  const [workshopId, setWorkshopId] = useState<string | null>(null);
  const started = useRef(false);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        // Resolve workshopId from session via layout API
        addLog('Resolving workshop ID...');
        const resolveRes = await fetch(`/api/workshops/resolve-session?sessionId=${sessionId}`);
        let wid: string;
        if (resolveRes.ok) {
          const data = await resolveRes.json();
          wid = data.workshopId;
        } else {
          // Hardcoded fallback for known workshop
          wid = 'ws_bnxx0gehwkyvr2wamenwgws3';
          addLog('Using hardcoded workshopId fallback');
        }
        setWorkshopId(wid);
        addLog(`Workshop ID: ${wid}`);

        // 2. Fetch canvas data for all steps
        addLog('Fetching canvas data...');
        const canvasRes = await fetch(`/api/build-pack/canvas-data?workshopId=${wid}`);
        if (!canvasRes.ok) {
          addLog(`ERROR: canvas-data failed: ${canvasRes.status}`);
          return;
        }
        const canvasData = await canvasRes.json();
        const stepsData = canvasData.steps as Record<string, StepData>;
        const stepKeys = Object.keys(stepsData).filter((k) => stepsData[k]?.artifact);
        addLog(`Found ${stepKeys.length} steps with data: ${stepKeys.join(', ')}`);

        // 3. Capture each step
        for (const camelKey of stepKeys) {
          const kebabKey = CAMEL_TO_KEBAB[camelKey];
          if (!kebabKey) {
            addLog(`Skipping unknown key: ${camelKey}`);
            continue;
          }

          addLog(`Capturing ${camelKey}...`);
          try {
            const imageBase64 = await captureSingleStep(kebabKey, stepsData[camelKey]);
            if (!imageBase64) {
              addLog(`  No renderer for ${camelKey}, skipping`);
              continue;
            }
            addLog(`  Captured (${Math.round(imageBase64.length / 1024)}KB), uploading...`);

            const uploadRes = await fetch('/api/upload-step-snapshot', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64, workshopId: wid, stepId: kebabKey }),
            });
            const uploadData = await uploadRes.json();
            if (uploadRes.ok) {
              addLog(`  Uploaded: ${uploadData.snapshotUrl?.slice(0, 80)}...`);
            } else {
              addLog(`  Upload failed: ${uploadData.error}`);
            }
          } catch (err) {
            addLog(`  ERROR capturing ${camelKey}: ${err}`);
          }
        }

        addLog('');
        addLog('DONE! Go back to the workshop and expand the sidebar to see eye icons.');
        addLog('You may need to refresh the page for the layout to pick up new snapshot URLs.');
      } catch (err) {
        addLog(`FATAL ERROR: ${err}`);
      }
    })();
  }, [sessionId]);

  return (
    <div style={{ padding: 32, fontFamily: 'monospace', fontSize: 14 }}>
      <h1 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
        Retroactive Snapshot Capture
      </h1>
      <div style={{ background: '#111', color: '#0f0', padding: 16, borderRadius: 8, maxHeight: '80vh', overflow: 'auto' }}>
        {log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        {log.length === 0 && <div>Starting...</div>}
      </div>
    </div>
  );
}
