import { Suspense, lazy, useMemo, useState } from 'react';
import {
  Box,
  Camera,
  CircleDollarSign,
  Download,
  GitBranch,
  Hammer,
  Images,
  RefreshCw,
  Triangle,
} from 'lucide-react';
import { ErrorBoundary } from './lib/ErrorBoundary';
import { Toast } from './lib/Toast';
import { appConfig } from './lib/config';
import { BackendPanel } from './features/backend/BackendPanel';
import { SourceInspector } from './features/intelligence/SourceInspector';
import { CADPanel } from './features/workbench/CADPanel';
import { MeshPanel } from './features/workbench/MeshPanel';
import { PhotoPanel } from './features/photogrammetry/PhotoPanel';
import type { SceneSpec } from './features/workbench/types';

const ThreeViewport = lazy(() => import('./features/viewer/ThreeViewport'));

type Mode = 'cad' | 'mesh' | 'photos';

const defaultScene: SceneSpec = {
  kind: 'cad',
  primitive: 'box',
  operation: 'union',
  dimensions: { width: 1.8, height: 1.1, depth: 1.3, radius: 0.55 },
  tint: '#2e7d6b',
};

const modes: Array<{ id: Mode; label: string; icon: typeof Box }> = [
  { id: 'cad', label: 'CAD', icon: Box },
  { id: 'mesh', label: 'Mesh', icon: Triangle },
  { id: 'photos', label: 'Photos', icon: Images },
];

export function App() {
  const [mode, setMode] = useState<Mode>('cad');
  const [scene, setScene] = useState<SceneSpec>(defaultScene);
  const [toast, setToast] = useState<string | null>(null);
  const [exportNonce, setExportNonce] = useState(0);
  const [apiBaseUrl, setApiBaseUrl] = useState(appConfig.apiBaseUrl);

  const panel = useMemo(() => {
    if (mode === 'mesh') {
      return <MeshPanel onSceneChange={setScene} onToast={setToast} />;
    }
    if (mode === 'photos') {
      return <PhotoPanel apiBaseUrl={apiBaseUrl} onSceneChange={setScene} onToast={setToast} />;
    }
    return <CADPanel scene={scene} apiBaseUrl={apiBaseUrl} onSceneChange={setScene} onToast={setToast} />;
  }, [apiBaseUrl, mode, scene]);

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <header className="topbar">
          <a
            className="brand"
            href="https://github.com/baditaflorin/cadmesh-workbench"
            aria-label="Open repository"
          >
            <span className="brand-mark">
              <Hammer size={20} aria-hidden="true" />
            </span>
            <span>
              <strong>cadmesh-workbench</strong>
              <small>
                v{appConfig.version} · {appConfig.commit}
              </small>
            </span>
          </a>

          <nav className="mode-tabs" aria-label="Workbench mode">
            {modes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={mode === item.id ? 'active' : ''}
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  title={item.label}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="top-actions">
            <a href="https://github.com/baditaflorin/cadmesh-workbench" title="Star on GitHub">
              <GitBranch size={18} aria-hidden="true" />
              <span>Star</span>
            </a>
            <a href="https://www.paypal.com/paypalme/florinbadita" title="Support on PayPal">
              <CircleDollarSign size={18} aria-hidden="true" />
              <span>Support</span>
            </a>
          </div>
        </header>

        <main className="workspace">
          <aside className="tool-pane" aria-label="Workbench controls">
            <SourceInspector onModeChange={setMode} onSceneChange={setScene} onToast={setToast} />
            {panel}
            <BackendPanel apiBaseUrl={apiBaseUrl} onApiBaseUrlChange={setApiBaseUrl} onToast={setToast} />
          </aside>

          <section className="viewport-pane" aria-label="3D workbench viewport">
            <div className="viewport-toolbar">
              <div>
                <strong>
                  {scene.kind === 'mesh'
                    ? 'Repaired mesh'
                    : scene.kind === 'photo'
                      ? 'Photo mesh'
                      : 'Parametric CAD'}
                </strong>
                <span>{scene.summary ?? 'Live preview'}</span>
              </div>
              <div className="icon-row">
                <button type="button" onClick={() => setScene(defaultScene)} title="Reset scene">
                  <RefreshCw size={18} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setExportNonce((value) => value + 1)} title="Export GLB">
                  <Download size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
            <Suspense
              fallback={
                <div className="viewport-fallback">
                  <Camera size={32} aria-hidden="true" />
                </div>
              }
            >
              <ThreeViewport scene={scene} exportNonce={exportNonce} onToast={setToast} />
            </Suspense>
          </section>
        </main>
      </div>
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ErrorBoundary>
  );
}
