import { useEffect, useState } from 'react';
import { UiPath } from '@uipath/uipath-typescript/core';
import { Processes } from '@uipath/uipath-typescript/processes';
import { Tasks } from '@uipath/uipath-typescript/tasks';
import './App.css';

const sdk = new UiPath({
  baseUrl: window.location.origin,
  orgName: import.meta.env.VITE_UIPATH_ORG,
  tenantName: import.meta.env.VITE_UIPATH_TENANT,
  secret: import.meta.env.VITE_UIPATH_SECRET,
});

type Process = { name?: string; description?: string };
type Task = { title?: string; status?: string };

export default function App() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [processResult, taskResult] = await Promise.all([
          new Processes(sdk).getAll(),
          new Tasks(sdk).getAll(),
        ]);
        setProcesses(processResult.items ?? []);
        setTasks(taskResult.items ?? []);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto' }}>
      <h1>Hello UiPath</h1>
      <p style={{ color: '#666' }}>ustechservices / dev</p>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <>
          <Section title="Processes" count={processes.length}>
            {processes.length === 0
              ? <Empty label="No processes found" />
              : processes.map((p, i) => (
                  <Row key={i} primary={p.name ?? '(unnamed)'} secondary={p.description} />
                ))}
          </Section>

          <Section title="Tasks" count={tasks.length}>
            {tasks.length === 0
              ? <Empty label="No tasks found" />
              : tasks.map((t, i) => (
                  <Row key={i} primary={t.title ?? '(untitled)'} secondary={t.status} />
                ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '2rem' }}>
      <h2 style={{ borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
        {title} <span style={{ color: '#999', fontSize: '0.9rem' }}>({count})</span>
      </h2>
      {children}
    </div>
  );
}

function Row({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div style={{ padding: '0.6rem 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ fontWeight: 500 }}>{primary}</span>
      {secondary && <span style={{ color: '#888', marginLeft: '1rem', fontSize: '0.9rem' }}>{secondary}</span>}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p style={{ color: '#aaa', fontStyle: 'italic' }}>{label}</p>;
}
