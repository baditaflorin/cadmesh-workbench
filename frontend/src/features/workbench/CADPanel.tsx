import { useMutation } from '@tanstack/react-query';
import { Box, GitMerge, Play } from 'lucide-react';
import { createJob } from '../../lib/api';
import type { BooleanOperation, Primitive, SceneSpec } from './types';

type CADPanelProps = {
  scene: SceneSpec;
  apiBaseUrl: string;
  onSceneChange: (scene: SceneSpec) => void;
  onToast: (message: string) => void;
};

const primitives: Primitive[] = ['box', 'cylinder', 'sphere'];
const operations: BooleanOperation[] = ['union', 'difference', 'intersection'];

export function CADPanel({ scene, apiBaseUrl, onSceneChange, onToast }: CADPanelProps) {
  const cadScene = scene.kind === 'cad' ? scene : undefined;
  const dimensions = cadScene?.dimensions ?? { width: 1.8, height: 1.1, depth: 1.3, radius: 0.55 };

  const mutation = useMutation({
    mutationFn: () =>
      createJob(
        {
          workflow: 'cad_boolean',
          name: 'browser boolean preview',
          parameters: {
            primitive: cadScene?.primitive ?? 'box',
            operation: cadScene?.operation ?? 'union',
            width: String(dimensions.width),
            height: String(dimensions.height),
            depth: String(dimensions.depth),
            radius: String(dimensions.radius),
          },
        },
        apiBaseUrl,
      ),
    onSuccess: (job) => onToast(`Backend job queued: ${job.id.slice(0, 8)}`),
    onError: (error) => onToast(error instanceof Error ? error.message : 'Backend job failed'),
  });

  function update(partial: Partial<Extract<SceneSpec, { kind: 'cad' }>>) {
    onSceneChange({
      kind: 'cad',
      primitive: cadScene?.primitive ?? 'box',
      operation: cadScene?.operation ?? 'union',
      dimensions,
      tint: cadScene?.tint ?? '#2e7d6b',
      summary: cadScene?.summary,
      ...partial,
    });
  }

  return (
    <section className="control-section">
      <div className="section-title">
        <Box size={18} aria-hidden="true" />
        <h2>Parametric CAD</h2>
      </div>

      <label>
        Primitive
        <select
          value={cadScene?.primitive ?? 'box'}
          onChange={(event) => update({ primitive: event.target.value as Primitive })}
        >
          {primitives.map((primitive) => (
            <option value={primitive} key={primitive}>
              {primitive}
            </option>
          ))}
        </select>
      </label>

      <label>
        Boolean
        <select
          value={cadScene?.operation ?? 'union'}
          onChange={(event) =>
            update({
              operation: event.target.value as BooleanOperation,
              summary: `${event.target.value} preview`,
            })
          }
        >
          {operations.map((operation) => (
            <option value={operation} key={operation}>
              {operation}
            </option>
          ))}
        </select>
      </label>

      <div className="grid-two">
        <label>
          Width
          <input
            type="number"
            min="0.2"
            step="0.1"
            value={dimensions.width}
            onChange={(event) => update({ dimensions: { ...dimensions, width: Number(event.target.value) } })}
          />
        </label>
        <label>
          Height
          <input
            type="number"
            min="0.2"
            step="0.1"
            value={dimensions.height}
            onChange={(event) =>
              update({ dimensions: { ...dimensions, height: Number(event.target.value) } })
            }
          />
        </label>
        <label>
          Depth
          <input
            type="number"
            min="0.2"
            step="0.1"
            value={dimensions.depth}
            onChange={(event) => update({ dimensions: { ...dimensions, depth: Number(event.target.value) } })}
          />
        </label>
        <label>
          Radius
          <input
            type="number"
            min="0.1"
            step="0.05"
            value={dimensions.radius}
            onChange={(event) =>
              update({ dimensions: { ...dimensions, radius: Number(event.target.value) } })
            }
          />
        </label>
      </div>

      <div className="button-row">
        <button
          type="button"
          onClick={() => update({ summary: `${cadScene?.operation ?? 'union'} recomputed` })}
        >
          <GitMerge size={17} aria-hidden="true" />
          Preview
        </button>
        <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          <Play size={17} aria-hidden="true" />
          Queue
        </button>
      </div>
    </section>
  );
}
