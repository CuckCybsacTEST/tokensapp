"use client";

import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { ALLOWED_AREAS } from '@/lib/areas';

type Task = { id: string; label: string; completed?: boolean; sortOrder: number; priority?: number; startDay?: string | null; endDay?: string | null; area?: string | null; completedToday?: number; sumValueToday?: number; measureEnabled?: boolean; targetValue?: number | null; unitLabel?: string | null };

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Card create inputs will use refs per slot; no global create form
  const creatingRef = useRef<Set<string>>(new Set());
  // Area filter: "__ALL" shows grouped view, "" means Global, or a specific area value
  const [areaFilter, setAreaFilter] = useState<string>("__ALL");
  const [statusFilter, setStatusFilter] = useState<string>("pending"); // pending | completed | __ALL

  const load = useMemo(() => async () => {
    setLoading(true); setError(null);
    try {
      // Use UTC day to keep consistency with /u/checklist saves
      const ymd = new Date().toISOString().slice(0,10);
      const r = await fetch(`/api/admin/tasks?day=${encodeURIComponent(ymd)}`, { cache: 'no-store' });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || 'Error cargando tareas');
      setTasks(j.tasks || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live updates via SSE
  useEffect(() => {
    let closed = false;
    let es: EventSource | null = null;
    let t: any = null;
    const perTaskTimers = new Map<string, any>();

    const todayYmd = () => new Date().toISOString().slice(0,10);

    const refreshOneTask = async (taskId: string) => {
      try {
        const r = await fetch(`/api/admin/tasks?day=${encodeURIComponent(todayYmd())}`, { cache: 'no-store' });
        const j = await r.json();
        const list = Array.isArray(j?.tasks) ? j.tasks : [];
        const found = list.find((x: any) => String(x.id) === String(taskId));
        if (!found) return;
        const upd: Partial<Task> = {
          completedToday: Number(found.completedToday || 0),
          sumValueToday: Number(found.sumValueToday || 0),
        };
        // Merge only aggregates to avoid perceptible full rerender
        // Keep label/order/other fields intact
        setTasks(prev => prev.map(tk => tk.id === String(taskId) ? { ...tk, ...upd } : tk));
      } catch {
        // ignore on failure, fallback debounce full reload still exists
      }
    };

    const schedulePartial = (taskId: string) => {
      const key = String(taskId);
      const prevTimer = perTaskTimers.get(key);
      if (prevTimer) clearTimeout(prevTimer);
      const h = setTimeout(() => { if (!closed) refreshOneTask(key); }, 300);
      perTaskTimers.set(key, h);
    };
    try {
      es = new EventSource('/api/events/tasks');
      const debouncedReload = () => {
        if (t) clearTimeout(t);
        t = setTimeout(() => { if (!closed) load(); }, 400);
      };
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || '{}');
          if (data && data.type === 'task-updated') {
            if (data.taskId) schedulePartial(String(data.taskId));
            else debouncedReload();
          }
        } catch {}
      };
      es.onerror = () => { /* ignore */ };
    } catch {}
    return () => {
      closed = true;
      if (t) { clearTimeout(t); t = null; }
      perTaskTimers.forEach((h) => clearTimeout(h));
      if (es) es.close();
    };
  }, [load]);

  // Helper for today in YYYY-MM-DD
  const todayYmd = () => new Date().toISOString().slice(0,10);

  async function createTaskInArea(areaKey: string, refsKey: string) {
    const labelEl = createRefs.current[refsKey]?.label;
    const prioEl = createRefs.current[refsKey]?.priority;
    const startEl = createRefs.current[refsKey]?.start;
    const endEl = createRefs.current[refsKey]?.end;
    const measureChk = createRefs.current[refsKey]?.measureEnabled;
    const targetEl = createRefs.current[refsKey]?.targetValue;
    const unitEl = createRefs.current[refsKey]?.unitLabel;
    const label = labelEl?.value?.trim() || '';
    if (!label) { alert('Ingresa una etiqueta'); return; }
    const payload: any = { label };
    payload.area = areaKey === '' ? null : areaKey;
    const prioVal = prioEl?.value ?? '';
    if (prioVal !== '') payload.priority = Number(prioVal);
    const startVal = startEl?.value?.trim(); if (startVal) payload.startDay = startVal;
    const endVal = endEl?.value?.trim(); if (endVal) payload.endDay = endVal;
    // Measurement fields
    const isMeasurable = !!measureChk?.checked;
    payload.measureEnabled = isMeasurable;
    if (isMeasurable) {
      const rawTarget = targetEl?.value ?? '';
      payload.targetValue = rawTarget === '' ? null : Math.max(0, Math.floor(Number(rawTarget)) || 0);
      const rawUnit = (unitEl?.value || '').toString().trim().slice(0, 30);
      payload.unitLabel = rawUnit.length === 0 ? null : rawUnit;
    }
    try {
      creatingRef.current.add(refsKey);
      const r = await fetch('/api/admin/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.message || j?.error || `No se pudo crear (${r.status})`);
      // clear inputs
      if (labelEl) labelEl.value = '';
      if (prioEl) prioEl.value = '' as any;
      if (startEl) startEl.value = todayYmd();
      if (endEl) endEl.value = '';
      if (measureChk) (measureChk as any).checked = false;
      if (targetEl) targetEl.value = '' as any;
      if (unitEl) unitEl.value = '' as any;
      await load();
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      creatingRef.current.delete(refsKey);
    }
  }

  async function updateTask(id: string, patch: Partial<Task>) {
    try {
      const r = await fetch(`/api/admin/tasks/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || 'No se pudo actualizar');
      setTasks((prev) => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    } catch (e: any) {
      alert(e?.message || String(e));
    }
  }

  async function deleteTask(id: string) {
    if (!confirm('¿Eliminar tarea?')) return;
    try {
      const r = await fetch(`/api/admin/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
      // Some environments may return 204 No Content; avoid JSON parse crash
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error((j as any)?.error || `No se pudo eliminar (${r.status})`);
      setTasks((prev) => prev.filter(t => t.id !== id));
    } catch (e: any) {
      alert(e?.message || String(e));
    }
  }

  // Refs per-slot for create inputs
  const createRefs = useRef<Record<string, { label: HTMLInputElement | null; priority: HTMLSelectElement | null; start: HTMLInputElement | null; end: HTMLInputElement | null; measureEnabled: HTMLInputElement | null; targetValue: HTMLInputElement | null; unitLabel: HTMLInputElement | null }>>({});

  const renderAreaSection = (areaKey: string) => {
  let groupTasks = tasks.filter(t => (t.area || '') === areaKey);
  if (statusFilter === 'pending') groupTasks = groupTasks.filter(t => !t.completed);
  else if (statusFilter === 'completed') groupTasks = groupTasks.filter(t => !!t.completed);
    const label = areaKey === '' ? '(Todos)' : areaKey;
    return (
      <div key={`sec-${areaKey}`} className="mb-6">
        <div className="mb-2 font-semibold text-gray-100 bg-gray-800/60 rounded px-2 py-1">{label}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groupTasks.map((t) => {
              return (
                <div key={t.id} className="rounded border border-gray-700 bg-gray-900 p-3">
                  <div className="mb-2">
                    <input className="border border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-400 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" defaultValue={t.label} onBlur={(e)=>{
                      const v = e.target.value.trim(); if (v && v !== t.label) updateTask(t.id, { label: v });
                    }} />
                  </div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-xs">
                      <label className="inline-flex items-center gap-1">
                        <input type="radio" name={`status-${t.id}`} checked={!t.completed} onChange={() => updateTask(t.id, { completed: false } as any)} />
                        <span>Pendiente</span>
                      </label>
                      <label className="inline-flex items-center gap-1">
                        <input type="radio" name={`status-${t.id}`} checked={!!t.completed} onChange={() => updateTask(t.id, { completed: true } as any)} />
                        <span>Completada</span>
                      </label>
                    </div>
                    <select className="border border-gray-700 bg-gray-900 text-gray-100 rounded px-2 py-1 w-40 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" defaultValue={(t.priority ?? 0).toString()} onChange={(e)=>{
                      const v = Math.floor(Number(e.target.value) || 0);
                      if (v !== (t.priority || 0)) updateTask(t.id, { priority: v } as any);
                    }}>
                      <option value={2}>Rojo (Alta)</option>
                      <option value={1}>Amarillo (Media)</option>
                      <option value={0}>Verde (Baja)</option>
                    </select>
                  </div>
                  {/* Área select removed: las tarjetas ya están agrupadas por área */}
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400">Inicio</label>
                      <input className="mt-1 border border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-400 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" type="date" defaultValue={t.startDay || ''} onBlur={(e)=>{
                        const v = e.target.value.trim(); if ((t.startDay || '') !== v) updateTask(t.id, { startDay: v || null } as any);
                      }} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Vencimiento</label>
                      <input className="mt-1 border border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-400 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" type="date" defaultValue={t.endDay || ''} onBlur={(e)=>{
                        const v = e.target.value.trim(); if ((t.endDay || '') !== v) updateTask(t.id, { endDay: v || null } as any);
                      }} />
                    </div>
                    {typeof t.completedToday === 'number' && (
                      <div className="text-xs text-gray-400">Completadas hoy: <span className="font-mono">{t.completedToday}</span></div>
                    )}
                    {t.measureEnabled && (
                      <div className="text-xs text-gray-400">Avance hoy: <span className="font-mono">{Number(t.sumValueToday || 0)}</span> {t.unitLabel || ''}</div>
                    )}
                  </div>
                  {/* Medición (config admin) */}
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-300">
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={!!t.measureEnabled}
                        onChange={(e) => {
                          const v = e.target.checked;
                          updateTask(t.id, { measureEnabled: v } as any);
                        }}
                      />
                      <span>Tarea medible</span>
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      placeholder="Objetivo"
                      defaultValue={typeof t.targetValue === 'number' ? t.targetValue : ''}
                      onBlur={(e) => {
                        const raw = e.target.value;
                        const val = raw === '' ? null : Math.max(0, Math.floor(Number(raw)) || 0);
                        updateTask(t.id, { targetValue: val } as any);
                      }}
                      className="w-24 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Unidad"
                      defaultValue={t.unitLabel ?? ''}
                      onBlur={(e) => {
                        const s = (e.target.value || '').toString().trim().slice(0, 30);
                        updateTask(t.id, { unitLabel: s.length === 0 ? null : s } as any);
                      }}
                      className="w-28 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      maxLength={30}
                    />
                  </div>
                  <div className="text-right">
                    <button className="text-red-500 hover:underline" onClick={()=> deleteTask(t.id)}>Eliminar</button>
                  </div>
                </div>
              );
            })}
            {/* Create card */}
            {(() => {
              const refsKey = `${areaKey}-new`;
            if (!createRefs.current[refsKey]) createRefs.current[refsKey] = { label: null, priority: null, start: null, end: null, measureEnabled: null, targetValue: null, unitLabel: null };
              return (
              <div key={`new-${areaKey}`} className="rounded border border-dashed border-gray-700 bg-gray-900 p-3">
                <div className="mb-2 font-medium text-gray-300">Nueva tarea</div>
                <div className="mb-2">
                  <input ref={el => (createRefs.current[refsKey].label = el)} className="border border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-400 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="Etiqueta de la tarea" />
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <select ref={el => (createRefs.current[refsKey].priority = el)} className="border border-gray-700 bg-gray-900 text-gray-100 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" defaultValue="">
                    <option value="">Prioridad</option>
                    <option value={2}>Rojo (Alta)</option>
                    <option value={1}>Amarillo (Media)</option>
                    <option value={0}>Verde (Baja)</option>
                  </select>
                  <div className="text-gray-400 text-sm flex items-center">Área: <span className="ml-1 text-gray-200">{label}</span></div>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <input ref={el => (createRefs.current[refsKey].start = el)} className="border border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-400 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" type="date" defaultValue={todayYmd()} />
                  <input ref={el => (createRefs.current[refsKey].end = el)} className="border border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-400 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" type="date" />
                </div>
                {/* Medición (opcional al crear) */}
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-300">
                  <label className="inline-flex items-center gap-1">
                    <input
                      ref={el => (createRefs.current[refsKey].measureEnabled = el)}
                      type="checkbox"
                    />
                    <span>Tarea medible</span>
                  </label>
                  <input
                    ref={el => (createRefs.current[refsKey].targetValue = el)}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    placeholder="Objetivo"
                    className="w-24 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    ref={el => (createRefs.current[refsKey].unitLabel = el)}
                    type="text"
                    placeholder="Unidad"
                    className="w-28 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={30}
                  />
                </div>
                <div className="text-right">
                  <button className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50" onClick={()=> createTaskInArea(areaKey, refsKey)} disabled={creatingRef.current.has(refsKey)}>Crear</button>
                </div>
              </div>
              );
            })()}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Tareas (Checklist)</h1>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-300">Filtrar por área:</label>
        <select
          className="border border-gray-700 bg-gray-900 text-gray-100 rounded px-2 py-1 w-60 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          value={areaFilter}
          onChange={(e)=> setAreaFilter(e.target.value)}
        >
          <option value="__ALL">Todas las áreas (agrupado)</option>
          <option value="">(Todos)</option>
          {ALLOWED_AREAS.map(a => (<option key={a} value={a}>{a}</option>))}
        </select>
        <label className="text-sm text-gray-300 ml-4">Estado:</label>
        <select
          className="border border-gray-700 bg-gray-900 text-gray-100 rounded px-2 py-1 w-48 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          value={statusFilter}
          onChange={(e)=> setStatusFilter(e.target.value)}
        >
          <option value="pending">Pendientes</option>
          <option value="completed">Completadas</option>
          <option value="__ALL">Todas</option>
        </select>
      </div>

      {loading ? (<div>Cargando…</div>) : error ? (<div className="text-red-600">{error}</div>) : (
        <div>
          {areaFilter === "__ALL" ? (
            ALLOWED_AREAS.map((k) => renderAreaSection(k))
          ) : (
            renderAreaSection(areaFilter)
          )}
        </div>
      )}
    </div>
  );
}
