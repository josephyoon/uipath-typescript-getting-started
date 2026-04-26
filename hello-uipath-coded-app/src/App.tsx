import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core';
import { Processes } from '@uipath/uipath-typescript/processes';
import { Tasks } from '@uipath/uipath-typescript/tasks';

const authConfig: UiPathSDKConfig = {
  clientId: import.meta.env.VITE_UIPATH_CLIENT_ID,
  orgName: import.meta.env.VITE_UIPATH_ORG_NAME,
  tenantName: import.meta.env.VITE_UIPATH_TENANT_NAME,
  baseUrl: import.meta.env.VITE_UIPATH_BASE_URL,
  redirectUri: window.location.origin + window.location.pathname,
  scope: import.meta.env.VITE_UIPATH_SCOPE,
};

type Process = { name?: string; description?: string };
type Task = { title?: string; status?: string };

function Dashboard() {
  const { sdk, logout } = useAuth();
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
  }, [sdk]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Hello UiPath</h1>
        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-900">
          Sign out
        </button>
      </header>
      <main className="max-w-3xl mx-auto p-8">
        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
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
      </main>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, error, login } = useAuth();

  if (isLoading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-sm w-full bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-semibold mb-2">Hello UiPath</h1>
          <p className="text-gray-500 mb-6">Sign in to view your processes and tasks.</p>
          <button
            onClick={login}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign in with UiPath
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-medium border-b pb-2 mb-2">
        {title} <span className="text-gray-400 text-sm">({count})</span>
      </h2>
      {children}
    </div>
  );
}

function Row({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div className="py-2 border-b border-gray-100 flex items-center gap-3">
      <span className="font-medium text-sm">{primary}</span>
      {secondary && <span className="text-gray-400 text-xs">{secondary}</span>}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-gray-400 italic text-sm">{label}</p>;
}

export default function App() {
  return (
    <AuthProvider config={authConfig}>
      <AppContent />
    </AuthProvider>
  );
}
