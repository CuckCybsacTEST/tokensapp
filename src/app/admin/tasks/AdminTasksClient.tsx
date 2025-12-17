"use client";

import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ALLOWED_AREAS } from '@/lib/areas';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { DateTime } from 'luxon';

type Task = { id: string; label: string; completed?: boolean; sortOrder: number; priority?: number; startDay?: string | null; endDay?: string | null; area?: string | null; completedToday?: number; sumValueToday?: number; measureEnabled?: boolean; targetValue?: number | null; unitLabel?: string | null };
type TaskComment = { id: string; text: string; createdAt: string; username?: string; personCode?: string; personName?: string };

function AreaSection(props: {
  areaKey: string;
  allTasks: Task[];
  statusFilter: string;
  onUpdateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onCreateTaskInArea: (areaKey: string, refsKey: string) => Promise<void>;
  createRefs: React.MutableRefObject<Record<string, { label: HTMLInputElement | null; priority: HTMLSelectElement | null; start: HTMLInputElement | null; end: HTMLInputElement | null; measureEnabled: HTMLInputElement | null; targetValue: HTMLInputElement | null; unitLabel: HTMLInputElement | null; onlyDate: HTMLInputElement | null }>>;
  creatingRef: React.MutableRefObject<Set<string>>;
  todayYmd: () => string;
  load: () => Promise<void>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}) {
  const { areaKey, allTasks, statusFilter, onUpdateTask: updateTask, onDeleteTask: deleteTask, onCreateTaskInArea: createTaskInArea, createRefs, creatingRef, todayYmd, load, setTasks } = props;
  
  // If areaKey is empty ('Todos'), show ALL tasks. Otherwise filter by area.
  let groupTasks = areaKey === '' ? allTasks : allTasks.filter(t => (t.area || '') === areaKey);
  
  // Filter logic:
  // Pending: Active tasks (not archived) that have NOT been done today
  // Completed: Tasks that have been done today OR are archived
  if (statusFilter === 'pending') {
    groupTasks = groupTasks.filter(t => !t.completed && (!t.completedToday || t.completedToday === 0));
  } else if (statusFilter === 'completed') {
    groupTasks = groupTasks.filter(t => !!t.completed || (t.completedToday && t.completedToday > 0));
  }
  
  const label = areaKey === '' ? 'General' : areaKey;
  const canDrag = statusFilter === '__ALL';

  const dragItemId = useRef<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[]>(groupTasks.map(t => t.id));
  const commentsMetaRef = useRef<Record<string, { loading: boolean; loaded: boolean; items: TaskComment[]; error?: string }>>({});
  const [commentsVersion, setCommentsVersion] = useState(0); // bump to re-render
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setLocalOrder(groupTasks.map(t => t.id));
  }, [allTasks, areaKey, statusFilter]);

  // Persist a given order of IDs for this area
  const persistOrder = async (ids: string[]) => {
    try {
      const res = await fetch('/api/admin/tasks/reorder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ area: areaKey || null, ids }),
      });
      if (!res.ok) await load();
    } catch { await load(); }
  };

  const applyLocalOrder = (ids: string[]) => {
    setLocalOrder(ids);
    // optimistic UI across tasks of this area
    setTasks((old) => {
      const reorderedSet = new Set(ids);
      const kept = old.filter(t => (t.area || '') !== areaKey);
      const reordered = ids.map(id => old.find(t => t.id === id)!).filter(Boolean) as Task[];
      const unaffectedInArea = old.filter(t => (t.area || '') === areaKey && !reorderedSet.has(t.id));
      return [...kept, ...reordered, ...unaffectedInArea];
    });
  };

  const moveItem = (id: string, dir: 'up' | 'down') => {
    if (!canDrag) return;
    setLocalOrder((prev) => {
      const ids = prev.slice();
      const idx = ids.indexOf(id);
      if (idx === -1) return prev;
      const swapWith = dir === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= ids.length) return prev;
      [ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]];
      applyLocalOrder(ids);
      // persist asynchronously
      void persistOrder(ids);
      return ids;
    });
  };

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (!canDrag) return;
    dragItemId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', id); } catch {}
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canDrag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDrop = async (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    if (!canDrag) return;
    e.preventDefault();
    const sourceId = dragItemId.current || targetId;
    if (!sourceId || sourceId === targetId) return;
    setLocalOrder((prev) => {
      const ids = prev.slice();
      const from = ids.indexOf(sourceId);
      const to = ids.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      ids.splice(from, 1);
      ids.splice(to, 0, sourceId);
      applyLocalOrder(ids);
      void persistOrder(ids);
      return ids;
    });
  };

  const toggleComments = async (taskId: string) => {
    setOpenComments(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    const meta = commentsMetaRef.current[taskId];
    if (!meta || (!meta.loaded && !meta.loading)) {
      commentsMetaRef.current[taskId] = { loading: true, loaded: false, items: [] };
      setCommentsVersion(v => v + 1);
      try {
        const day = props.todayYmd();
        const r = await fetch(`/api/admin/tasks/comments?day=${encodeURIComponent(day)}&taskId=${encodeURIComponent(taskId)}`, { cache: 'no-store' });
        const j = await r.json().catch(()=> ({}));
        if (!r.ok || !j?.ok) throw new Error(j?.code || 'ERR');
        commentsMetaRef.current[taskId] = { loading: false, loaded: true, items: Array.isArray(j.comments) ? j.comments : [] };
      } catch (e: any) {
        commentsMetaRef.current[taskId] = { loading: false, loaded: true, items: [], error: e?.message || String(e) };
      } finally {
        setCommentsVersion(v => v + 1);
      }
    }
  };

  const formatTime = (iso: string) => {
    try { const d = new Date(iso); return d.toISOString().slice(11,16); } catch { return ''; }
  };

  return (
    <div key={`sec-${areaKey}`} className="mb-6">
  <div className="mb-2 font-semibold text-soft bg-slate-100 dark:bg-slate-700/50 rounded px-2 py-1 flex items-center justify-between">
        <span>{label}</span>
        {!canDrag && (
          <span className="text-xs text-soft">Para reordenar, cambia el filtro de estado a "Todas"</span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {groupTasks
          .sort((a, b) => (localOrder.indexOf(a.id)) - (localOrder.indexOf(b.id)))
          .map((t) => {
            return (
              <div
                key={t.id}
                className={`card p-3 ${canDrag ? 'cursor-move' : ''}`}
                draggable={canDrag}
                onDragStart={(e)=> onDragStart(e, t.id)}
                onDragOver={onDragOver}
                onDrop={(e)=> onDrop(e, t.id)}
              >
                {canDrag && (
                  <div className="mb-1 flex items-center justify-between text-xs text-soft">
                    <span className="hidden sm:inline">Arrastra para reordenar</span>
                    <div className="sm:hidden flex items-center gap-1">
                      <button
                        className="px-2 py-0.5 rounded border border-slate-500 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                        onClick={() => moveItem(t.id, 'up')}
                        aria-label="Mover arriba"
                      >▲</button>
                      <button
                        className="px-2 py-0.5 rounded border border-slate-500 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                        onClick={() => moveItem(t.id, 'down')}
                        aria-label="Mover abajo"
                      >▼</button>
                    </div>
                  </div>
                )}
                <div className="mb-2">
                  {/* Show area badge if in 'Todos' view and task has area */}
                  {areaKey === '' && t.area && (
                    <div className="mb-1">
                      <span className="text-[10px] uppercase font-bold text-white bg-slate-400 px-1.5 py-0.5 rounded">
                        {t.area}
                      </span>
                    </div>
                  )}
                  <input className="input-sm w-full" defaultValue={t.label} onBlur={(e)=>{
                    const v = e.target.value.trim(); if (v && v !== t.label) updateTask(t.id, { label: v });
                  }} />
                </div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-xs text-soft">
                    <label className="inline-flex items-center gap-1">
                      <input type="radio" name={`status-${t.id}`} checked={!(t.completed || t.completedToday > 0)} onChange={() => updateTask(t.id, { completed: false } as any)} />
                      <span>Pendiente</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input type="radio" name={`status-${t.id}`} checked={!!(t.completed || t.completedToday > 0)} onChange={() => updateTask(t.id, { completed: true } as any)} />
                      <span>Completada</span>
                    </label>
                  </div>
                  {/* Prioridad: control responsive */}
                  {/* Desktop/Tablet: select con etiquetas completas */}
                  <div className="hidden sm:block">
                    <select
                      className="input-xs w-40"
                      defaultValue={(t.priority ?? 0).toString()}
                      onChange={(e)=>{
                        const v = Math.floor(Number(e.target.value) || 0);
                        if (v !== (t.priority || 0)) updateTask(t.id, { priority: v } as any);
                      }}
                    >
                      <option value={2}>Alta</option>
                      <option value={1}>Media</option>
                      <option value={0}>Baja</option>
                    </select>
                  </div>
                  {/* Móvil: grupo compacto de botones */}
                  <div className="flex sm:hidden w-full justify-end">
                    <div className="inline-flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        className={`px-2 py-1 rounded border ${t.priority === 2 ? 'prio-high' : 'border-slate-500 dark:border-slate-600 text-soft'} hover:bg-danger-soft`}
                        onClick={()=> { if ((t.priority || 0) !== 2) updateTask(t.id, { priority: 2 } as any); }}
                        aria-label="Prioridad alta"
                        title="Prioridad alta"
                      >Alta</button>
                      <button
                        type="button"
                        className={`px-2 py-1 rounded border ${t.priority === 1 ? 'prio-medium' : 'border-slate-500 dark:border-slate-600 text-soft'} hover:bg-warning-soft`}
                        onClick={()=> { if ((t.priority || 0) !== 1) updateTask(t.id, { priority: 1 } as any); }}
                        aria-label="Prioridad media"
                        title="Prioridad media"
                      >Media</button>
                      <button
                        type="button"
                        className={`px-2 py-1 rounded border ${t.priority === 0 ? 'prio-low' : 'border-slate-500 dark:border-slate-600 text-soft'} hover:bg-success-soft`}
                        onClick={()=> { if ((t.priority || 0) !== 0) updateTask(t.id, { priority: 0 } as any); }}
                        aria-label="Prioridad baja"
                        title="Prioridad baja"
                      >Baja</button>
                    </div>
                  </div>
                </div>
                {/* Área select removed: las tarjetas ya están agrupadas por área */}
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-soft">Inicio</label>
                    <input className="mt-1 input-xs w-full" type="date" defaultValue={t.startDay || ''} onBlur={(e)=>{
                      const v = e.target.value.trim(); if ((t.startDay || '') !== v) updateTask(t.id, { startDay: v || null } as any);
                    }} />
                  </div>
                  <div>
                    <label className="text-xs text-soft">Vencimiento</label>
                    <input className="mt-1 input-xs w-full" type="date" defaultValue={t.endDay || ''} onBlur={(e)=>{
                      const v = e.target.value.trim(); if ((t.endDay || '') !== v) updateTask(t.id, { endDay: v || null } as any);
                    }} />
                  </div>
                  {typeof t.completedToday === 'number' && (
                    <div className="text-xs text-soft">Completadas hoy: <span className="font-mono">{t.completedToday}</span></div>
                  )}
                  {t.measureEnabled && (
                    <div className="text-xs text-soft">Avance hoy: <span className="font-mono">{Number(t.sumValueToday || 0)}</span> {t.unitLabel || ''}</div>
                  )}
                </div>
                {/* Medición (config admin) */}
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-soft">
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
                    className="w-24 input-xs"
                  />
                  <input
                    type="text"
                    placeholder="Unidad"
                    defaultValue={t.unitLabel ?? ''}
                    onBlur={(e) => {
                      const s = (e.target.value || '').toString().trim().slice(0, 30);
                      updateTask(t.id, { unitLabel: s.length === 0 ? null : s } as any);
                    }}
                    className="w-28 input-xs"
                    maxLength={30}
                  />
                </div>
                <div className="text-right">
                  <button className="text-red-500 hover:underline" onClick={()=> deleteTask(t.id)}>Eliminar</button>
                </div>
                <div className="mt-2 border-t pt-2">
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:underline"
                    onClick={()=> toggleComments(t.id)}
                  >{openComments[t.id] ? 'Ocultar comentarios' : 'Ver comentarios'}</button>
                  {openComments[t.id] && (() => {
                    const meta = commentsMetaRef.current[t.id];
                    if (!meta || meta.loading) return <div className="mt-2 text-xs text-soft">Cargando…</div>;
                    if (meta.error) return <div className="mt-2 text-xs text-danger">Error: {meta.error}</div>;
                    if (!meta.items.length) return <div className="mt-2 text-xs text-soft">(Sin comentarios)</div>;
                    return (
                      <ul className="mt-2 space-y-1 max-h-40 overflow-auto pr-1 text-xs">
                        {meta.items.map(c => (
                          <li key={c.id} className="p-1 rounded bg-slate-100 dark:bg-slate-700/50">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{c.personName || c.username || '—'}</span>
                              <span className="text-[10px] text-soft">{formatTime(c.createdAt)}</span>
                            </div>
                            <div className="whitespace-pre-wrap break-words">{c.text}</div>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        {/* Create card */}
        {(() => {
          const refsKey = `${areaKey}-new`;
          if (!createRefs.current[refsKey]) createRefs.current[refsKey] = { label: null, priority: null, start: null, end: null, measureEnabled: null, targetValue: null, unitLabel: null, onlyDate: null };
          return (
            <div key={`new-${areaKey}`} className="card border-dashed p-3">
              <div className="mb-2 font-medium text-soft/60">Nueva tarea</div>
              <div className="mb-2">
                <input ref={el => (createRefs.current[refsKey].label = el)} className="input-sm w-full" placeholder="Etiqueta de la tarea" />
              </div>
              <div className="mb-2 grid grid-cols-2 gap-2">
                <select ref={el => (createRefs.current[refsKey].priority = el)} className="input-sm w-full" defaultValue="">
                  <option value="">Prioridad</option>
                  <option value={2}>Rojo (Alta)</option>
                  <option value={1}>Amarillo (Media)</option>
                  <option value={0}>Verde (Baja)</option>
                </select>
                <div className="text-soft text-sm flex items-center">Área: <span className="ml-1 text-soft/60">{label}</span></div>
              </div>
              <div className="mb-2 grid grid-cols-2 gap-2">
                <input ref={el => (createRefs.current[refsKey].start = el)} className="input-sm w-full" type="date" defaultValue={todayYmd()} />
                <input ref={el => (createRefs.current[refsKey].end = el)} className="input-sm w-full" type="date" />
              </div>
              <div className="mb-2 flex items-center gap-2">
                <label className="inline-flex items-center gap-1 text-xs text-soft">
                  <input ref={el => (createRefs.current[refsKey].onlyDate = el)} type="checkbox" />
                  <span>Solo esta fecha</span>
                </label>
              </div>
              {/* Medición (opcional al crear) */}
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-soft">
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
                  className="w-24 input-xs"
                />
                <input
                  ref={el => (createRefs.current[refsKey].unitLabel = el)}
                  type="text"
                  placeholder="Unidad"
                  className="w-28 input-xs"
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
}

export function AdminTasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Card create inputs will use refs per slot; no global create form
  const creatingRef = useRef<Set<string>>(new Set());
  // Area filter: "" = Todos (global), or a specific area value from ALLOWED_AREAS
  const [areaFilter, setAreaFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("pending"); // pending | completed | __ALL
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(() => DateTime.now().setZone('America/Lima').toFormat('yyyy-MM-dd'));

  const load = useMemo(() => async () => {
    setLoading(true); setError(null);
    try {
      // Use selectedDay
      const r = await fetch(`/api/admin/tasks?day=${encodeURIComponent(selectedDay)}`, { cache: 'no-store' });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || 'Error cargando tareas');
      setTasks(j.tasks || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedDay]);

  useEffect(() => { load(); }, [load]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const socketInstance = io({
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket for tasks');
      socketInstance.emit('join-admin-tasks');
      console.log('Joined admin-tasks room');
    });

    socketInstance.on('task-status-updated', (data: any) => {
      console.log('Task status updated:', data);
      // If no day is specified (global update) or day matches current view
      if (!data.day || data.day === selectedDay) {
        setLastUpdate(new Date());
        // Refresh the tasks data
        load();
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [load]);

  // Initialize area from URL (?area=) and keep it in sync
  useEffect(() => {
    const a = (searchParams?.get('area') || '').toString();
    // Validate area: allow '' (Todos) or one of ALLOWED_AREAS; otherwise default ''
    const allowed = a === '' || (ALLOWED_AREAS as readonly string[]).includes(a);
    setAreaFilter(allowed ? a : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const changeArea = (a: string) => {
    setAreaFilter(a);
    const params = new URLSearchParams(Array.from(searchParams?.entries?.() || []));
    if (a === '') params.delete('area'); else params.set('area', a);
    const qs = params.toString();
    router.replace(`/admin/tasks${qs ? `?${qs}` : ''}`);
  };

  // Live updates now handled via WebSockets above

  // Helper for today in YYYY-MM-DD
  const todayYmd = () => selectedDay;

  async function createTaskInArea(areaKey: string, refsKey: string) {
    const labelEl = createRefs.current[refsKey]?.label;
    const prioEl = createRefs.current[refsKey]?.priority;
    const startEl = createRefs.current[refsKey]?.start;
    const endEl = createRefs.current[refsKey]?.end;
    const onlyDateEl = createRefs.current[refsKey]?.onlyDate;
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
    
    if (onlyDateEl?.checked && startVal) {
      payload.endDay = startVal;
    } else {
      const endVal = endEl?.value?.trim(); if (endVal) payload.endDay = endVal;
    }
    
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

  const renderAreaSection = (areaKey: string) => (
    <AreaSection
      key={`area-${areaKey || 'todos'}`}
      areaKey={areaKey}
      allTasks={tasks}
      statusFilter={statusFilter}
      onUpdateTask={updateTask}
      onDeleteTask={deleteTask}
      onCreateTaskInArea={createTaskInArea}
      createRefs={createRefs}
      creatingRef={creatingRef}
      todayYmd={todayYmd}
      load={load}
      setTasks={setTasks}
    />
  );

  return (
    <div className="max-w-3xl mx-auto p-4">
  <h1 className="text-2xl font-semibold mb-4">Tareas (Checklist)</h1>
  {lastUpdate && (
    <div className="text-xs text-soft mb-2">
      Última actualización: {lastUpdate.toLocaleTimeString('es-ES')}
    </div>
  )}

      {/* Tabs: Todos + cada área */}
      <div className="mb-3 overflow-x-auto">
  <div className="inline-flex items-center gap-1 border-b border-slate-300 dark:border-slate-600">
          {['', ...ALLOWED_AREAS].map((a) => {
            const active = areaFilter === a;
            const label = a === '' ? 'Todos' : a;
            return (
              <button
                key={`tab-${a || 'todos'}`}
                onClick={() => changeArea(a)}
                className={`${active ? 'border-b-2 border-accent text-accent' : 'text-soft hover:text-accent'} px-3 py-2`}
                aria-current={active ? 'page' : undefined}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-soft">Fecha:</label>
        <input 
          type="date" 
          className="input-sm" 
          value={selectedDay} 
          onChange={(e) => setSelectedDay(e.target.value)} 
        />
        <label className="text-sm text-soft ml-2">Estado:</label>
        <select
          className="input-sm w-48"
          value={statusFilter}
          onChange={(e)=> setStatusFilter(e.target.value)}
        >
          <option value="pending">Pendientes</option>
          <option value="completed">Completadas</option>
          <option value="__ALL">Todas</option>
        </select>
      </div>

      {loading ? (<div className="text-soft">Cargando…</div>) : error ? (<div className="alert-danger">{error}</div>) : (
        <div>
          {renderAreaSection(areaFilter)}
        </div>
      )}
    </div>
  );
}
