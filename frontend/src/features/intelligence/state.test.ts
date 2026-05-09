import { describe, expect, it } from 'vitest';
import { decodeShareState, encodeShareState, nameForText, textToInput } from './io';
import { WORKBENCH_STATE_SCHEMA_VERSION, createWorkbenchState, parseWorkbenchState } from './state';
import type { AnalysisResult } from './types';

const scene = {
  kind: 'mesh' as const,
  mesh: {
    positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
    indices: [0, 1, 2],
    sourceTriangles: 1,
    repairedTriangles: 1,
    decimatedTriangles: 1,
  },
  tint: '#2e7d6b',
  summary: 'fixture mesh',
};

const analysis: AnalysisResult = {
  stableJSON: '{"schemaVersion":"phase2-diagnostic/v1"}',
  manifest: {
    schemaVersion: 'phase2-diagnostic/v1',
    sourceId: 'fixture-1',
    state: 'loaded-some',
    kind: 'mesh',
    format: 'stl-ascii',
    route: 'mesh',
    confidence: {
      classification: 0.9,
      route: 0.9,
      repairPlan: 0.8,
      decimationPlan: 0.8,
      photoViability: 0,
    },
    summary: 'Fixture mesh',
    files: [{ name: 'fixture.stl', size: 12, type: 'model/stl', hash: 'abc' }],
    metrics: { totalBytes: 12, fileCount: 1, parseTimeMs: 0, triangles: 1 },
    inferred: { bounds: '0,0,0..1,1,0' },
    anomalies: [],
    suggestions: [],
    provenance: {
      app: 'cadmesh-workbench',
      appVersion: '0.3.0-test',
      commit: 'test',
      deterministic: true,
      generationMode: 'diagnostic',
      sourceChecksums: ['abc'],
      parameters: {},
    },
    evidence: ['fixture'],
    previewMesh: scene.mesh,
  },
};

describe('phase 3 state and input helpers', () => {
  it('round-trips workbench state through JSON validation', () => {
    const state = createWorkbenchState(scene, analysis);
    const parsed = parseWorkbenchState(JSON.stringify(state));

    expect(parsed.schemaVersion).toBe(WORKBENCH_STATE_SCHEMA_VERSION);
    expect(parsed.scene.kind).toBe('mesh');
    expect(parsed.analysis?.manifest.sourceId).toBe('fixture-1');
  });

  it('round-trips share state encoding', () => {
    const state = JSON.stringify(createWorkbenchState(scene, analysis));
    expect(decodeShareState(encodeShareState(state))).toBe(state);
  });

  it('infers pasted source filenames', () => {
    expect(nameForText('ISO-10303-21;')).toBe('pasted.step');
    expect(nameForText('solid thing\nendsolid')).toBe('pasted.stl');
    expect(nameForText('v 0 0 0\nf 1 1 1')).toBe('pasted.obj');
    expect(textToInput('OFF\n0 0 0').name).toBe('pasted.off');
  });
});
