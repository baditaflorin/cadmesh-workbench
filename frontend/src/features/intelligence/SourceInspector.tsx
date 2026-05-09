import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent as ReactClipboardEvent, DragEvent as ReactDragEvent } from 'react';
import * as Comlink from 'comlink';
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  FileInput,
  FileSearch,
  Info,
  Link,
  Printer,
  RotateCcw,
  Share2,
  Sparkles,
  Upload,
  XCircle,
} from 'lucide-react';
import { appConfig } from '../../lib/config';
import { deletePreference, loadPreference, savePreference } from '../../lib/storage';
import { createPhotoPreviewMesh } from '../workbench/meshOps';
import type { SceneSpec } from '../workbench/types';
import type { AnalyzerWorkerAPI } from './analyzer.worker';
import {
  copyText,
  decodeShareState,
  downloadText,
  encodeShareState,
  fileToInput,
  textToInput,
  urlToInput,
} from './io';
import {
  AUTO_RESTORE_KEY,
  WORKBENCH_STATE_KEY,
  createWorkbenchState,
  parseWorkbenchState,
  stateToAnalysis,
} from './state';
import type { AnalysisInputFile, AnalysisResult, DiagnosticIssue, SourceState } from './types';

type Mode = 'cad' | 'mesh' | 'photos';

type SourceInspectorProps = {
  scene: SceneSpec;
  onModeChange: (mode: Mode) => void;
  onSceneChange: (scene: SceneSpec) => void;
  onPhotoFilesChange: (files: File[]) => void;
  onToast: (message: string) => void;
};

type Activity = {
  id: string;
  label: string;
  state: SourceState;
  route: string;
};

const cache = new Map<string, AnalysisResult>();

export function SourceInspector({
  scene,
  onModeChange,
  onSceneChange,
  onPhotoFilesChange,
  onToast,
}: SourceInspectorProps) {
  const [state, setState] = useState<SourceState>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [url, setURL] = useState('');
  const [dragActive, setDragActive] = useState(false);
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

  useEffect(() => {
    if (!result) return;
    void savePreference(WORKBENCH_STATE_KEY, JSON.stringify(createWorkbenchState(scene, result)));
  }, [result, scene]);

  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    onPhotoFilesChange(files.filter((file) => file.type.startsWith('image/')));
    await analyzeInputs(
      files.map((file) => () => fileToInput(file)),
      files.length,
    );
  }

  async function analyzeInputs(inputLoaders: Array<() => Promise<AnalysisInputFile>>, count: number) {
    const token = tokenRef.current + 1;
    tokenRef.current = token;
    setState(count === 0 ? 'loaded-empty' : 'loading');
    if (count === 0) {
      setResult(null);
      onToast('No source files selected');
      return;
    }

    try {
      const inputs = await Promise.all(inputLoaders.map((load) => load()));
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

  async function analyzePastedText() {
    const text = pasteText.trim();
    if (!text) {
      onToast('Paste CAD, mesh, glTF, or manifest text first');
      return;
    }
    await analyzeInputs([async () => textToInput(text)], 1);
  }

  async function analyzeURL() {
    const trimmed = url.trim();
    if (!trimmed) {
      onToast('Enter a public URL first');
      return;
    }
    try {
      await analyzeInputs([() => urlToInput(trimmed)], 1);
    } catch (error) {
      onToast(
        error instanceof Error
          ? `${error.message} If the browser blocks CORS, download the file or paste its text.`
          : 'URL import failed. Download the file or paste its text.',
      );
    }
  }

  async function handlePaste(event: ReactClipboardEvent<HTMLElement>) {
    const files = Array.from(event.clipboardData.files);
    if (files.length > 0) {
      event.preventDefault();
      await handleFileArray(files);
      return;
    }
    const text = event.clipboardData.getData('text/plain');
    if (text.trim()) {
      event.preventDefault();
      setPasteText(text);
      await analyzeInputs([async () => textToInput(text)], 1);
    }
  }

  async function handleFileArray(files: File[]) {
    onPhotoFilesChange(files.filter((file) => file.type.startsWith('image/')));
    await analyzeInputs(
      files.map((file) => () => fileToInput(file)),
      files.length,
    );
  }

  async function handleDrop(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault();
    setDragActive(false);
    await handleFileArray(Array.from(event.dataTransfer.files));
  }

  async function loadSample(kind: 'step' | 'stl' | 'photo') {
    if (kind === 'step') {
      await analyzeInputs([async () => textToInput(sampleSTEP, 'sample-bracket.step')], 1);
      return;
    }
    if (kind === 'photo') {
      await analyzeInputs([async () => textToInput(samplePhotoManifest, 'sample.photogrammetry.json')], 1);
      return;
    }
    await analyzeInputs([async () => textToInput(sampleSTL, 'sample-benchy.stl')], 1);
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
    setPasteText('');
    setURL('');
    onPhotoFilesChange([]);
    void deletePreference(WORKBENCH_STATE_KEY);
  }

  async function restoreSavedState() {
    try {
      const hashState = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('state');
      const rawHash = hashState ? decodeShareState(hashState) : '';
      const autoRestore = (await loadPreference(AUTO_RESTORE_KEY)) !== 'false';
      const rawStored = autoRestore ? await loadPreference(WORKBENCH_STATE_KEY) : undefined;
      const raw = rawHash || rawStored;
      if (!raw) return;
      const restored = parseWorkbenchState(raw);
      const restoredAnalysis = stateToAnalysis(restored);
      onSceneChange(restored.scene);
      if (restored.scene.kind === 'mesh') onModeChange('mesh');
      if (restored.scene.kind === 'photo') onModeChange('photos');
      if (restored.scene.kind === 'cad') onModeChange('cad');
      if (restoredAnalysis) {
        setResult(restoredAnalysis);
        setState(restoredAnalysis.manifest.state);
        setActivity([
          {
            id: restoredAnalysis.manifest.sourceId,
            label: restoredAnalysis.manifest.summary,
            state: restoredAnalysis.manifest.state,
            route: restoredAnalysis.manifest.route,
          },
        ]);
      }
      onToast(rawHash ? 'Shared state restored' : 'Last session restored');
    } catch {
      onToast('Saved state could not be restored. Start fresh or import a state file.');
    }
  }

  useEffect(() => {
    queueMicrotask(() => void restoreSavedState());
    // Restore should only run once on initial mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const stateJSON = JSON.stringify(createWorkbenchState(scene, result), null, 2);

  return (
    <section
      className={`control-section source-section ${dragActive ? 'drag-active' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => void handleDrop(event)}
      onPaste={(event) => void handlePaste(event)}
    >
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

      <div className="drop-target">
        <Upload size={16} aria-hidden="true" />
        <span>Drop CAD, mesh, glTF, or photos here</span>
      </div>

      <label>
        Paste source text
        <textarea
          rows={3}
          value={pasteText}
          onChange={(event) => setPasteText(event.target.value)}
          placeholder="Paste STEP, STL, OBJ, OFF, glTF JSON, or a photogrammetry manifest"
        />
      </label>

      <div className="button-row">
        <button type="button" onClick={() => void analyzePastedText()} disabled={!pasteText.trim()}>
          <Clipboard size={17} aria-hidden="true" />
          Analyze Paste
        </button>
      </div>

      <label>
        Public URL
        <input
          value={url}
          onChange={(event) => setURL(event.target.value)}
          placeholder="https://example.com/model.stl"
        />
        <span className="field-note">
          Works when the server allows browser CORS; otherwise paste or download.
        </span>
      </label>

      <div className="button-row">
        <button type="button" onClick={() => void analyzeURL()} disabled={!url.trim()}>
          <Link size={17} aria-hidden="true" />
          Analyze URL
        </button>
      </div>

      <div className="button-row">
        <button type="button" onClick={() => void loadSample('step')}>
          <Sparkles size={17} aria-hidden="true" />
          STEP
        </button>
        <button type="button" onClick={() => void loadSample('stl')}>
          <Sparkles size={17} aria-hidden="true" />
          STL
        </button>
        <button type="button" onClick={() => void loadSample('photo')}>
          <Sparkles size={17} aria-hidden="true" />
          Photos
        </button>
      </div>

      <div className="button-row">
        <label className="file-button">
          <FileInput size={17} aria-hidden="true" />
          Import State
          <input
            type="file"
            accept=".cadmesh.json,application/json"
            onChange={(event) => void importState(event.currentTarget.files)}
          />
        </label>
      </div>

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

          <div className="button-row wrap-row">
            <button
              type="button"
              onClick={() => downloadText(`${manifest.sourceId}.diagnostic.json`, result.stableJSON)}
            >
              <Download size={17} aria-hidden="true" />
              JSON
            </button>
            <button
              type="button"
              onClick={() =>
                void copyText(result.stableJSON)
                  .then(() => onToast('Diagnostic JSON copied'))
                  .catch((error) => onToast(error instanceof Error ? error.message : 'Copy failed'))
              }
            >
              <Clipboard size={17} aria-hidden="true" />
              Copy
            </button>
            <button
              type="button"
              onClick={() => downloadText(`${manifest.sourceId}.cadmesh.json`, stateJSON)}
            >
              <FileInput size={17} aria-hidden="true" />
              State
            </button>
            <label className="file-button">
              <FileInput size={17} aria-hidden="true" />
              Import
              <input
                type="file"
                accept=".cadmesh.json,application/json"
                onChange={(event) => void importState(event.currentTarget.files)}
              />
            </label>
            <button type="button" onClick={() => shareState(stateJSON)}>
              <Share2 size={17} aria-hidden="true" />
              Share
            </button>
            <button type="button" onClick={() => window.print()}>
              <Printer size={17} aria-hidden="true" />
              Print
            </button>
          </div>

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

  async function importState(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    try {
      const imported = parseWorkbenchState(await file.text());
      const importedAnalysis = stateToAnalysis(imported);
      onSceneChange(imported.scene);
      if (imported.scene.kind === 'mesh') onModeChange('mesh');
      if (imported.scene.kind === 'photo') onModeChange('photos');
      if (imported.scene.kind === 'cad') onModeChange('cad');
      if (importedAnalysis) {
        setResult(importedAnalysis);
        setState(importedAnalysis.manifest.state);
      }
      await savePreference(WORKBENCH_STATE_KEY, JSON.stringify(imported));
      onToast('Workbench state imported');
    } catch {
      onToast('State import failed. Use a .cadmesh.json file exported by this app.');
    }
  }

  function shareState(text: string) {
    if (text.length > 24_000) {
      onToast('State is too large for a URL. Download a state file instead.');
      return;
    }
    const next = `${window.location.pathname}#state=${encodeShareState(text)}`;
    window.history.replaceState(null, '', next);
    void copyText(window.location.href)
      .then(() => onToast('Share URL copied'))
      .catch(() => onToast('Share URL added to the address bar'));
  }
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

const sampleSTEP = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('phase 3 sample bracket'),'2;1');
FILE_SCHEMA(('AP214'));
ENDSEC;
DATA;
#10=PRODUCT('sample-bracket','Bracket','',());
#20=SI_UNIT(.MILLI.,.METRE.);
ENDSEC;
END-ISO-10303-21;
`;

const sampleSTL = `solid phase3_sample
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 1 1 0
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 1 1 0
      vertex 0 1 0
    endloop
  endfacet
endsolid phase3_sample
`;

const samplePhotoManifest = JSON.stringify(
  {
    source: 'phase 3 sample orbit',
    images: Array.from({ length: 10 }, (_, index) => ({
      name: `orbit-${String(index + 1).padStart(2, '0')}.jpg`,
      bytes: 1_200_000,
      width: 1600,
      height: 1200,
      exif_orientation: 1,
    })),
  },
  null,
  2,
);
