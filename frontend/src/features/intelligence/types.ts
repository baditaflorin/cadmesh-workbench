import type { MeshData } from '../workbench/types';

export type SourceState =
  | 'idle'
  | 'loading'
  | 'loaded-empty'
  | 'loaded-some'
  | 'loaded-many'
  | 'loaded-too-many'
  | 'error-recoverable'
  | 'error-fatal'
  | 'in-progress'
  | 'cancelled';

export type InputKind = 'cad' | 'mesh' | 'photo-set' | 'unsupported' | 'unknown';
export type Route = 'cad' | 'mesh' | 'photos' | 'review';

export type InputFormat =
  | 'step'
  | 'stl-ascii'
  | 'stl-binary'
  | 'ply'
  | 'obj'
  | 'gltf'
  | 'glb'
  | 'off'
  | 'image-set'
  | 'photogrammetry-manifest'
  | 'unknown';

export type DiagnosticIssue = {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  why: string;
  next: string;
};

export type Confidence = {
  classification: number;
  route: number;
  repairPlan: number;
  decimationPlan: number;
  photoViability: number;
};

export type Bounds = {
  min: [number, number, number];
  max: [number, number, number];
};

export type SourceFileSummary = {
  name: string;
  size: number;
  type: string;
  hash: string;
};

export type DiagnosticManifest = {
  schemaVersion: 'phase2-diagnostic/v1';
  sourceId: string;
  state: SourceState;
  kind: InputKind;
  format: InputFormat;
  route: Route;
  confidence: Confidence;
  summary: string;
  files: SourceFileSummary[];
  metrics: {
    totalBytes: number;
    fileCount: number;
    vertices?: number;
    faces?: number;
    triangles?: number;
    components?: number;
    images?: number;
    textureDependencies?: number;
    parseTimeMs: number;
  };
  inferred: Record<string, string | number | boolean>;
  anomalies: DiagnosticIssue[];
  suggestions: DiagnosticIssue[];
  provenance: {
    app: 'cadmesh-workbench';
    appVersion: string;
    commit: string;
    deterministic: true;
    generationMode: 'diagnostic' | 'preview-only' | 'native-required' | 'unsupported';
    sourceChecksums: string[];
    parameters: Record<string, string>;
  };
  evidence: string[];
  previewMesh?: MeshData;
};

export type AnalysisInputFile = {
  name: string;
  type: string;
  bytes: Uint8Array;
  lastModified?: number;
};

export type AnalyzeOptions = {
  appVersion: string;
  commit: string;
};

export type AnalysisResult = {
  manifest: DiagnosticManifest;
  stableJSON: string;
};
