import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, PlugZap, Server, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { listJobs, listTools } from '../../lib/api';
import { loadPreference, savePreference } from '../../lib/storage';

type BackendPanelProps = {
  apiBaseUrl: string;
  onApiBaseUrlChange: (url: string) => void;
  onToast: (message: string) => void;
};

export function BackendPanel({ apiBaseUrl, onApiBaseUrlChange, onToast }: BackendPanelProps) {
  const [draft, setDraft] = useState(apiBaseUrl);

  useEffect(() => {
    void loadPreference('apiBaseUrl').then((value) => {
      if (value) {
        setDraft(value);
        onApiBaseUrlChange(value);
      }
    });
  }, [onApiBaseUrlChange]);

  const toolsQuery = useQuery({
    queryKey: ['tools', apiBaseUrl],
    queryFn: () => listTools(apiBaseUrl),
    enabled: false,
  });
  const jobsQuery = useQuery({
    queryKey: ['jobs', apiBaseUrl],
    queryFn: () => listJobs(apiBaseUrl),
    enabled: false,
  });

  async function saveURL() {
    onApiBaseUrlChange(draft);
    await savePreference('apiBaseUrl', draft);
    onToast('Backend URL saved');
  }

  async function check() {
    await saveURL();
    await Promise.all([toolsQuery.refetch(), jobsQuery.refetch()]);
  }

  return (
    <section className="control-section backend-section">
      <div className="section-title">
        <Server size={18} aria-hidden="true" />
        <h2>Backend</h2>
      </div>

      <label>
        API URL
        <input value={draft} onChange={(event) => setDraft(event.target.value)} spellCheck={false} />
      </label>

      <div className="button-row">
        <button type="button" onClick={check} disabled={toolsQuery.isFetching || jobsQuery.isFetching}>
          <PlugZap size={17} aria-hidden="true" />
          Check
        </button>
      </div>

      <ul className="tool-list">
        {(toolsQuery.data ?? []).map((tool) => (
          <li key={tool.name}>
            {tool.available ? (
              <CheckCircle2 className="ok" size={16} aria-hidden="true" />
            ) : (
              <XCircle className="missing" size={16} aria-hidden="true" />
            )}
            <span>{tool.name}</span>
          </li>
        ))}
      </ul>

      <dl className="stats compact">
        <div>
          <dt>Jobs</dt>
          <dd>{jobsQuery.data?.length ?? 0}</dd>
        </div>
        <div>
          <dt>Tools</dt>
          <dd>{toolsQuery.data?.filter((tool) => tool.available).length ?? 0}</dd>
        </div>
      </dl>

      {(jobsQuery.data ?? []).length > 0 ? (
        <ul className="job-list">
          {(jobsQuery.data ?? []).slice(0, 3).map((job) => (
            <li key={job.id}>
              <AlertTriangle size={15} aria-hidden="true" />
              <span>
                {job.name} · {job.status} · {job.result_mode ?? 'pending'}
              </span>
              {job.warnings?.[0] ? <small>{job.warnings[0]}</small> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
