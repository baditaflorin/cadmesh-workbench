import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ImagePlus, Play, ScanSearch } from 'lucide-react';
import { createPhotoJob } from '../../lib/api';
import { createPhotoPreviewMesh } from '../workbench/meshOps';
import type { SceneSpec } from '../workbench/types';

type PhotoPanelProps = {
  apiBaseUrl: string;
  sourceFiles: File[];
  onSceneChange: (scene: SceneSpec) => void;
  onToast: (message: string) => void;
};

export function PhotoPanel({ apiBaseUrl, sourceFiles, onSceneChange, onToast }: PhotoPanelProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState('preview');
  const files = selectedFiles.length > 0 ? selectedFiles : sourceFiles;

  const mutation = useMutation({
    mutationFn: () => createPhotoJob(files, { name: 'photo scan', quality }, apiBaseUrl),
    onSuccess: (job) => onToast(`Photo job queued: ${job.id.slice(0, 8)}`),
    onError: (error) => onToast(error instanceof Error ? error.message : 'Photo job failed'),
  });

  function preview() {
    const mesh = createPhotoPreviewMesh(files.length || 4);
    onSceneChange({
      kind: 'photo',
      mesh,
      tint: '#d39c2f',
      summary: `${files.length || 4} image preview`,
    });
  }

  return (
    <section className="control-section">
      <div className="section-title">
        <ScanSearch size={18} aria-hidden="true" />
        <h2>Photogrammetry</h2>
      </div>

      <label>
        Photos
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => setSelectedFiles(Array.from(event.currentTarget.files ?? []))}
        />
        <span className="field-note">{files.length} selected</span>
      </label>

      <label>
        Quality
        <select value={quality} onChange={(event) => setQuality(event.target.value)}>
          <option value="preview">preview</option>
          <option value="balanced">balanced</option>
          <option value="high">high</option>
        </select>
      </label>

      <div className="button-row">
        <button type="button" onClick={preview}>
          <ImagePlus size={17} aria-hidden="true" />
          Preview
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || files.length === 0}
        >
          <Play size={17} aria-hidden="true" />
          Queue
        </button>
      </div>
    </section>
  );
}
