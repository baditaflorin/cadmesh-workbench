import { useEffect, useState } from 'react';
import { RotateCcw, Settings } from 'lucide-react';
import { AUTO_RESTORE_KEY, WORKBENCH_STATE_KEY } from '../intelligence/state';
import { deletePreference, loadPreference, savePreference } from '../../lib/storage';

type SettingsPanelProps = {
  onToast: (message: string) => void;
  onClearState: () => void;
};

export function SettingsPanel({ onToast, onClearState }: SettingsPanelProps) {
  const [autoRestore, setAutoRestore] = useState(true);

  useEffect(() => {
    void loadPreference(AUTO_RESTORE_KEY).then((value) => setAutoRestore(value !== 'false'));
  }, []);

  async function updateAutoRestore(next: boolean) {
    setAutoRestore(next);
    await savePreference(AUTO_RESTORE_KEY, String(next));
    onToast(next ? 'Session restore enabled' : 'Session restore disabled');
  }

  async function clearState() {
    await deletePreference(WORKBENCH_STATE_KEY);
    onClearState();
    onToast('Saved workbench state cleared');
  }

  return (
    <section className="control-section settings-section">
      <div className="section-title">
        <Settings size={18} aria-hidden="true" />
        <h2>Settings</h2>
      </div>

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={autoRestore}
          onChange={(event) => void updateAutoRestore(event.currentTarget.checked)}
        />
        Restore last session
      </label>

      <div className="button-row">
        <button type="button" onClick={() => void clearState()}>
          <RotateCcw size={17} aria-hidden="true" />
          Clear State
        </button>
      </div>
    </section>
  );
}
