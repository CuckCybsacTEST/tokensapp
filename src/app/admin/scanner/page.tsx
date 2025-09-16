"use client";

import { useEffect, useMemo, useState } from "react";

type Range = "today" | "week";
type MetricsResponse = {
  ok: boolean;
  range: Range;
  since: string;
  metrics: {
    total: number;
    uniquePersons: number;
    duplicatesBlocked: number;
    breakdown: { IN: number; OUT: number };
  };
};

type RecentScan = {
  id: string;
  scannedAt: string;
  type: string;
  deviceId?: string | null;
  personId: string;
  personName: string;
  personCode: string;
  personJobTitle?: string | null;
};

type EventItem = { id: string; type: string; message?: string | null; metadata?: string | null; createdAt: string; scanType?: 'IN' | 'OUT' | null };

export default function ScannerDashboardPage() {
  const [range, setRange] = useState<Range>("today");
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [personFilter, setPersonFilter] = useState("");
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeTasks, setActiveTasks] = useState<Array<{ id: string; label: string }>>([]);

  const metricsUrl = useMemo(() => `/api/scanner/metrics?range=${range}`, [range]);
  const recentUrl = useMemo(() => `/api/scanner/recent?range=${range}&limit=50${personFilter ? `&person=${encodeURIComponent(personFilter)}` : ""}`, [range, personFilter]);
  const eventsUrl = "/api/scanner/events?limit=10";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(metricsUrl)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j?.ok) {
          setError(j?.message || j?.code || "Error al cargar métricas");
          setData(null);
        } else {
          setData(j as MetricsResponse);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e?.message || e));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [metricsUrl]);

  useEffect(() => {
    let cancelled = false;
    fetch(recentUrl)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.ok) setRecentScans(j.scans || []);
      })
      .catch(() => {})
      .finally(() => {});
    return () => {
      cancelled = true;
    };
  }, [recentUrl]);

  useEffect(() => {
    let cancelled = false;
    fetch(eventsUrl)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.ok) setEvents(j.events || []);
      })
      .catch(() => {})
      .finally(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Load active tasks for supervisor reference
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/tasks/active')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.ok) setActiveTasks((j.tasks || []).map((t: any) => ({ id: t.id, label: t.label })));
      })
      .catch(() => {})
      .finally(() => {});
    return () => { cancelled = true; };
  }, []);

  const dupPct = useMemo(() => {
    if (!data) return "-";
    const total = data.metrics.total;
    const dup = data.metrics.duplicatesBlocked;
    if (total <= 0) return "0%";
    return `${Math.round((dup / total) * 100)}%`;
  }, [data]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Scanner — Panel</h1>
        <div className="flex items-center gap-3">
          <a
            href="/admin/users"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Registrar colaborador"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Registrar colaborador
          </a>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Rango:</label>
            <select
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={range}
              onChange={(e) => setRange((e.target.value as Range) || "today")}
            >
              <option value="today">Hoy</option>
              <option value="week">Semana</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Persona:</label>
            <input
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              placeholder="Código o parte del código"
              className="w-56 rounded-md border border-gray-300 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">Cargando…</div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">Error: {error}</div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard label="Escaneos hoy" value={data.metrics.total} />
            <StatCard label="Únicos hoy" value={data.metrics.uniquePersons} />
            <StatCard label="% duplicados bloqueados" value={dupPct} />
            <StatCard label="IN / OUT" value={`${data.metrics.breakdown.IN} / ${data.metrics.breakdown.OUT}`} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold">Últimos 10 eventos</h2>
              <ul className="space-y-2 text-sm">
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-[120px] justify-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor:
                          ev.type === 'SCAN_OK' ? '#ECFDF5' : ev.type === 'SCAN_DUPLICATE' ? '#FEF3C7' : '#FEE2E2',
                        color:
                          ev.type === 'SCAN_OK' ? '#065F46' : ev.type === 'SCAN_DUPLICATE' ? '#92400E' : '#991B1B',
                      }}
                    >
                      {ev.type}
                    </span>
                    {ev.scanType && (
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ev.scanType === 'IN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {ev.scanType}
                      </span>
                    )}
                    <span className="flex-1 truncate text-gray-700">{ev.message || '-'}</span>
                    <span className="text-xs text-gray-500">{new Date(ev.createdAt).toLocaleTimeString()}</span>
                  </li>
                ))}
                {events.length === 0 && <li className="text-gray-500">Sin eventos recientes</li>}
              </ul>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold">Escaneos recientes</h2>
              <div className="overflow-auto">
                <div className="overflow-x-auto">
                <table className="min-w-[1000px] w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs text-gray-600">
                      <th className="px-2 py-1">Hora</th>
                      <th className="px-2 py-1">Persona</th>
                      <th className="px-2 py-1">Cargo</th>
                      <th className="px-2 py-1">Código</th>
                      <th className="px-2 py-1">Tipo</th>
                      <th className="px-2 py-1">Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentScans.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="px-2 py-1 text-gray-700">{new Date(s.scannedAt).toLocaleTimeString()}</td>
                        <td className="px-2 py-1 text-gray-900">{s.personName}</td>
                        <td className="px-2 py-1 text-gray-700">{s.personJobTitle || '-'}</td>
                        <td className="px-2 py-1 text-gray-700">{s.personCode}</td>
                        <td className="px-2 py-1">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                            {s.type}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-gray-500">{s.deviceId || '-'}</td>
                      </tr>
                    ))}
                    {recentScans.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-2 py-4 text-center text-gray-500">Sin datos</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </div>

          {/* Mini panel: Tareas activas (solo lectura) */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Tareas activas (referencia)</h2>
            {activeTasks.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-gray-800">
                {activeTasks.map((t) => (
                  <li key={t.id}>{t.label}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No hay tareas activas configuradas.</p>
            )}
          </div>

          <p className="text-xs text-gray-500">Desde: {new Date(data.since).toLocaleString()}</p>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
