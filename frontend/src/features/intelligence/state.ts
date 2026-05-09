import { z } from 'zod';
import type { SceneSpec } from '../workbench/types';
import type { AnalysisResult, DiagnosticManifest } from './types';

export const WORKBENCH_STATE_SCHEMA_VERSION = 'phase3-workbench-state/v1';
export const WORKBENCH_STATE_KEY = 'workbenchState';
export const AUTO_RESTORE_KEY = 'autoRestoreWorkbenchState';

const meshSchema = z.object({
  positions: z.array(z.number()),
  indices: z.array(z.number()),
  sourceTriangles: z.number(),
  repairedTriangles: z.number(),
  decimatedTriangles: z.number(),
});

const sceneSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('cad'),
    primitive: z.enum(['box', 'cylinder', 'sphere']),
    operation: z.enum(['union', 'difference', 'intersection']),
    dimensions: z.object({
      width: z.number(),
      height: z.number(),
      depth: z.number(),
      radius: z.number(),
    }),
    tint: z.string(),
    summary: z.string().optional(),
  }),
  z.object({
    kind: z.literal('mesh'),
    mesh: meshSchema,
    tint: z.string(),
    summary: z.string().optional(),
  }),
  z.object({
    kind: z.literal('photo'),
    mesh: meshSchema,
    tint: z.string(),
    summary: z.string().optional(),
  }),
]);

const issueSchema = z.object({
  code: z.string(),
  severity: z.enum(['info', 'warning', 'error']),
  message: z.string(),
  why: z.string(),
  next: z.string(),
});

const manifestSchema = z
  .object({
    schemaVersion: z.literal('phase2-diagnostic/v1'),
    sourceId: z.string(),
    state: z.string(),
    kind: z.string(),
    format: z.string(),
    route: z.enum(['cad', 'mesh', 'photos', 'review']),
    confidence: z.object({
      classification: z.number(),
      route: z.number(),
      repairPlan: z.number(),
      decimationPlan: z.number(),
      photoViability: z.number(),
    }),
    summary: z.string(),
    files: z.array(
      z.object({
        name: z.string(),
        size: z.number(),
        type: z.string(),
        hash: z.string(),
      }),
    ),
    metrics: z.record(z.string(), z.number()).and(
      z.object({
        totalBytes: z.number(),
        fileCount: z.number(),
        parseTimeMs: z.number(),
      }),
    ),
    inferred: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    anomalies: z.array(issueSchema),
    suggestions: z.array(issueSchema),
    provenance: z.object({
      app: z.literal('cadmesh-workbench'),
      appVersion: z.string(),
      commit: z.string(),
      deterministic: z.literal(true),
      generationMode: z.enum(['diagnostic', 'preview-only', 'native-required', 'unsupported']),
      sourceChecksums: z.array(z.string()),
      parameters: z.record(z.string(), z.string()),
    }),
    evidence: z.array(z.string()),
    previewMesh: meshSchema.optional(),
  })
  .passthrough();

const analysisResultSchema = z.object({
  manifest: manifestSchema,
  stableJSON: z.string(),
});

export const workbenchStateSchema = z.object({
  schemaVersion: z.literal(WORKBENCH_STATE_SCHEMA_VERSION),
  savedAt: z.string(),
  scene: sceneSchema,
  analysis: analysisResultSchema.optional(),
});

export type WorkbenchState = z.infer<typeof workbenchStateSchema>;

export function createWorkbenchState(scene: SceneSpec, analysis?: AnalysisResult | null): WorkbenchState {
  return {
    schemaVersion: WORKBENCH_STATE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    scene,
    analysis: analysis ?? undefined,
  };
}

export function parseWorkbenchState(text: string): WorkbenchState {
  const parsed = JSON.parse(text) as unknown;
  return workbenchStateSchema.parse(parsed);
}

export function stateToAnalysis(state: WorkbenchState): AnalysisResult | null {
  if (!state.analysis) return null;
  return {
    manifest: state.analysis.manifest as DiagnosticManifest,
    stableJSON: state.analysis.stableJSON,
  };
}
