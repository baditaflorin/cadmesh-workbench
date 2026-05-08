import { useEffect, useMemo, useState } from 'react';
import * as Comlink from 'comlink';
import { Blend, Gauge, WandSparkles } from 'lucide-react';
import type { MeshWorkerAPI } from './meshOps.worker';
import type { MeshData, SceneSpec } from './types';

type MeshPanelProps = {
  onSceneChange: (scene: SceneSpec) => void;
  onToast: (message: string) => void;
};

export function MeshPanel({ onSceneChange, onToast }: MeshPanelProps) {
  const [mesh, setMesh] = useState<MeshData | null>(null);
  const [ratio, setRatio] = useState(0.55);
  const worker = useMemo(() => {
    const instance = new Worker(new URL('./meshOps.worker.ts', import.meta.url), { type: 'module' });
    return { instance, api: Comlink.wrap<MeshWorkerAPI>(instance) };
  }, []);

  useEffect(() => () => worker.instance.terminate(), [worker]);

  async function loadSample() {
    const sample = await worker.api.createSampleMesh();
    setMesh(sample);
    onSceneChange({
      kind: 'mesh',
      mesh: sample,
      tint: '#7f5af0',
      summary: `${sample.sourceTriangles} raw triangles`,
    });
  }

  async function repair() {
    const source = mesh ?? (await worker.api.createSampleMesh());
    const repaired = await worker.api.repairMesh(source);
    setMesh(repaired);
    onSceneChange({
      kind: 'mesh',
      mesh: repaired,
      tint: '#2e7d6b',
      summary: `${repaired.repairedTriangles} repaired triangles`,
    });
    onToast('Mesh repair pass completed');
  }

  async function decimate() {
    const source = mesh ?? (await worker.api.createSampleMesh());
    const decimated = await worker.api.decimateMesh(source, ratio);
    setMesh(decimated);
    onSceneChange({
      kind: 'mesh',
      mesh: decimated,
      tint: '#e4572e',
      summary: `${decimated.decimatedTriangles} decimated triangles`,
    });
    onToast('Decimation pass completed');
  }

  return (
    <section className="control-section">
      <div className="section-title">
        <Blend size={18} aria-hidden="true" />
        <h2>Mesh Repair</h2>
      </div>

      <label>
        Decimation
        <input
          type="range"
          min="0.15"
          max="1"
          step="0.05"
          value={ratio}
          onChange={(event) => setRatio(Number(event.target.value))}
        />
        <span className="field-note">{Math.round(ratio * 100)}%</span>
      </label>

      <div className="button-row">
        <button type="button" onClick={loadSample}>
          <Gauge size={17} aria-hidden="true" />
          Sample
        </button>
        <button type="button" onClick={repair}>
          <WandSparkles size={17} aria-hidden="true" />
          Repair
        </button>
        <button type="button" onClick={decimate}>
          <Blend size={17} aria-hidden="true" />
          Decimate
        </button>
      </div>

      <dl className="stats">
        <div>
          <dt>Source</dt>
          <dd>{mesh?.sourceTriangles ?? 0}</dd>
        </div>
        <div>
          <dt>Repaired</dt>
          <dd>{mesh?.repairedTriangles ?? 0}</dd>
        </div>
        <div>
          <dt>Decimated</dt>
          <dd>{mesh?.decimatedTriangles ?? 0}</dd>
        </div>
      </dl>
    </section>
  );
}
