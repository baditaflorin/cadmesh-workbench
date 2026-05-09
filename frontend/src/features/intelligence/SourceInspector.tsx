import { useEffect, useMemo, useRef, useState } from 'react';
import * as Comlink from 'comlink';
import { AlertTriangle, CheckCircle2, FileSearch, Info, RotateCcw, XCircle } from 'lucide-react';
import { appConfig } from '../../lib/config';
import { createPhotoPreviewMesh } from '../workbench/meshOps';
import type { SceneSpec } from '../workbench/types';
import type { AnalyzerWorkerAPI } from './analyzer.worker';
import type { AnalysisInputFile, AnalysisResult, DiagnosticIssue, SourceState } from './types';

type Mode = 'cad' | 'mesh' | 'photos';

type SourceInspectorProps = {
  onModeChange: (mode: Mode) => void;
  onSceneChange: (scene: SceneSpec) => void;
  onToast: (message: string) => void;
};

type Activity = {
  id: string;
  label: string;
  state: SourceState;
  route: string;
};

const cache = new Map<string, AnalysisResult>();

export function SourceInspector({ onModeChange, onSceneChange, onToast }: SourceInspectorProps) {
  const [state, setState] = useState<SourceState>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [isDebug] = useState(() => new URLSearchParams(window.location.search).get('debug') === '1');
  const tokenRef = useRef(0);
  const worker = useMemo(() => {
    const instance = new Worker(new URL('./analyzer.worker.ts', import.meta.url), { type: 'module' });
    return { instance, api: Comlink.wrap<AnalyzerWorkerAPI>(instance) };
  }, []);

  useEffect(() => {
    return () => {
      worker.instance.terminate();
    };
  }, [worker]);

  async function handleFiles(fileList: FileList | null) {
    const token = tokenRef.current + 1;
    tokenRef.current = token;
    const files = Array.from(fileList ?? []);
    setState(files.length === 0 ? 'loaded-empty' : 'loading');
    if (files.length === 0) {
      setResult(null);
      onToast('No source files selected');
      return;
    }

    try {
      const inputs = await Promise.all(files.map(fileToInput));
      const cacheKey = inputs.map((file) => `${file.name}:${file.bytes.byteLength}`).join('|');
      const cached = cache.get(cacheKey);
      const analysis =
        cached ??
        (await worker.api.analyze(inputs, {
          appVersion: appConfig.version,
          commit: appConfig.commit,
        }));
      cache.set(cacheKey, analysis);
      if (tokenRef.current !== token) return;

      setResult(analysis);
      setState(analysis.manifest.state);
      setActivity((items) =>
        [
          {
            id: analysis.manifest.sourceId,
            label: analysis.manifest.summary,
            state: analysis.manifest.state,
            route: analysis.manifest.route,
          },
          ...items,
        ].slice(0, 6),
      );
      applyRouteAndPreview(analysis);
      onToast(analysis.manifest.summary);
    } catch (error) {
      if (tokenRef.current !== token) return;
      setState('error-fatal');
      onToast(error instanceof Error ? error.message : 'Source analysis failed');
    }
  }

  function cancel() {
    tokenRef.current += 1;
    setState('cancelled');
    onToast('Source analysis cancelled');
  }

  function reset() {
    tokenRef.current += 1;
    setState('idle');
    setResult(null);
  }

  function applyRouteAndPreview(analysis: AnalysisResult) {
    const { manifest } = analysis;
    if (manifest.route === 'cad') onModeChange('cad');
    if (manifest.route === 'mesh') onModeChange('mesh');
    if (manifest.route === 'photos') onModeChange('photos');
    if (manifest.previewMesh) {
      onSceneChange({
        kind: 'mesh',
        mesh: manifest.previewMesh,
        tint: manifest.confidence.repairPlan < 0.7 ? '#d39c2f' : '#2e7d6b',
        summary: `${manifest.metrics.triangles ?? manifest.metrics.faces ?? 0} source triangles`,
      });
    } else if (manifest.kind === 'photo-set') {
      onSceneChange({
        kind: 'photo',
        mesh: createPhotoPreviewMesh(Number(manifest.inferred.imageCount ?? manifest.metrics.images ?? 4)),
        tint: manifest.state === 'error-recoverable' ? '#d39c2f' : '#2e7d6b',
        summary: `${manifest.metrics.images ?? manifest.inferred.imageCount ?? 0} image preflight`,
      });
    }
  }

  const manifest = result?.manifest;
  const health = stateHealth(state);

  return (
    <section className="control-section source-section">
      <div className="section-title">
        <FileSearch size={18} aria-hidden="true" />
        <h2>Source Inspector</h2>
      </div>

      <label>
        CAD, mesh, or photos
        <input
          type="file"
          multiple
          accept=".step,.stp,.stl,.ply,.obj,.off,.gltf,.glb,.json,image/*,.heic,.heif"
          onChange={(event) => void handleFiles(event.currentTarget.files)}
        />
        <span className="field-note">
          Auto-detects route, confidence, and repair/reconstruction readiness.
        </span>
      </label>

      <div className="button-row">
        <button type="button" onClick={cancel} disabled={state !== 'loading' && state !== 'in-progress'}>
          <XCircle size={17} aria-hidden="true" />
          Cancel
        </button>
        <button type="button" onClick={reset}>
          <RotateCcw size={17} aria-hidden="true" />
          Reset
        </button>
      </div>

      <div className={`state-pill ${health}`}>
        {health === 'ok' ? (
          <CheckCircle2 size={16} aria-hidden="true" />
        ) : health === 'warn' ? (
          <AlertTriangle size={16} aria-hidden="true" />
        ) : (
          <Info size={16} aria-hidden="true" />
        )}
        <span>{stateLabel(state)}</span>
      </div>

      {manifest ? (
        <div className="diagnostic-panel">
          <div className="diagnostic-head">
            <strong>{manifest.summary}</strong>
            <span>
              {manifest.format} · {manifest.route} · {Math.round(manifest.confidence.classification * 100)}%
            </span>
          </div>

          <dl className="stats compact">
            <div>
              <dt>Files</dt>
              <dd>{manifest.metrics.fileCount}</dd>
            </div>
            <div>
              <dt>Bytes</dt>
              <dd>{formatBytes(manifest.metrics.totalBytes)}</dd>
            </div>
            <div>
              <dt>Faces</dt>
              <dd>{manifest.metrics.triangles ?? manifest.metrics.faces ?? 0}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{manifest.provenance.generationMode.replace('-', ' ')}</dd>
            </div>
          </dl>

          <IssueList title="Anomalies" issues={manifest.anomalies} />
          <IssueList title="Suggested next steps" issues={manifest.suggestions} />

          {isDebug ? (
            <details className="debug-box" open>
              <summary>Debug manifest</summary>
              <pre>{result.stableJSON}</pre>
            </details>
          ) : null}
        </div>
      ) : null}

      {activity.length > 0 ? (
        <details className="activity-log">
          <summary>Activity</summary>
          <ol>
            {activity.map((item) => (
              <li key={item.id}>
                <span>{item.label}</span>
                <small>
                  {item.state} · {item.route}
                </small>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}

function IssueList({ title, issues }: { title: string; issues: DiagnosticIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="issue-list">
      <strong>{title}</strong>
      <ul>
        {issues.slice(0, 4).map((item) => (
          <li key={item.code}>
            <span>{item.message}</span>
            <small>
              {item.why} {item.next}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function fileToInput(file: File): Promise<AnalysisInputFile> {
  return {
    name: file.name,
    type: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
    lastModified: file.lastModified,
  };
}

function stateHealth(state: SourceState): 'ok' | 'warn' | 'neutral' {
  if (state === 'loaded-some' || state === 'loaded-many') return 'ok';
  if (state.startsWith('error') || state === 'loaded-too-many' || state === 'cancelled') return 'warn';
  return 'neutral';
}

function stateLabel(state: SourceState): string {
  return state.replace(/-/g, ' ');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}
