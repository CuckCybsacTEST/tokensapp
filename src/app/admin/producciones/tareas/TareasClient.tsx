"use client";

import { useCallback, useEffect, useState } from "react";
import { FORMATS, ASPECT_RATIOS } from "@/features/producciones/shared";

// ── Types ──────────────────────────────────────────────────────────────────

type ProductionType = "VIDEO_REEL"|"VIDEO_TIKTOK"|"VIDEO_PROMO"|"VIDEO_RECAP"|"PHOTO_SESSION"|"PHOTO_PRODUCT"|"PHOTO_STAFF"|"DESIGN_GRAPHIC"|"OTHER";
type ProductionPriority = "LOW"|"MEDIUM"|"HIGH"|"URGENT";
type RecurrenceType = "DAILY"|"WEEKLY"|"BIWEEKLY"|"MONTHLY";
type TaskStatus = "PENDING"|"IN_PROGRESS"|"DONE"|"SKIPPED";

interface PersonRef { id: string; name: string; area?: string | null }
interface TaskAssignee { id: string; personId: string; person: PersonRef }
interface RecurringTask {
  id: string; name: string; description?: string | null;
  type: ProductionType; platform?: string | null; format?: string | null;
  aspectRatio?: string | null;
  deliverables?: string | null; recurrence: RecurrenceType;
  daysOfWeek?: string | null; dayOfMonth?: number | null;
  defaultPriority: ProductionPriority; active: boolean; notes?: string | null;
  defaultAssignees: TaskAssignee[];
  _count: { instances: number };
}
interface TaskInstance {
  id: string; taskId: string; scheduledFor: string; status: TaskStatus;
  notes?: string | null; completedAt?: string | null;
  completedBy?: { id: string; username: string; person?: { name: string } | null } | null;
  task: RecurringTask;
  production?: { id: string; title: string; status: string } | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ProductionType, string> = {
  VIDEO_REEL: "Reel", VIDEO_TIKTOK: "TikTok", VIDEO_PROMO: "Video Promo",
  VIDEO_RECAP: "Recap", PHOTO_SESSION: "Fotos", PHOTO_PRODUCT: "Foto Producto",
  PHOTO_STAFF: "Foto Personal", DESIGN_GRAPHIC: "Diseño", OTHER: "Otro",
};
const PRIORITY_LABELS: Record<ProductionPriority, string> = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", URGENT: "Urgente" };
const RECURRENCE_LABELS: Record<RecurrenceType, string> = { DAILY: "Diario", WEEKLY: "Semanal", BIWEEKLY: "Quincenal", MONTHLY: "Mensual" };
const STATUS_LABELS: Record<TaskStatus, string> = { PENDING: "Pendiente", IN_PROGRESS: "En curso", DONE: "Listo", SKIPPED: "Omitido" };
const STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  DONE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  SKIPPED: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 line-through",
};
const STATUS_DOT: Record<TaskStatus, string> = { PENDING: "bg-gray-400", IN_PROGRESS: "bg-yellow-500", DONE: "bg-green-500", SKIPPED: "bg-slate-400" };
const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const PRIORITY_COLORS: Record<ProductionPriority, string> = {
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const PLATFORMS = ["Instagram", "TikTok", "Facebook", "YouTube", "WhatsApp", "X (Twitter)", "LinkedIn", "Pinterest"];
const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "📸", TikTok: "🎵", Facebook: "👥", YouTube: "▶️",
  WhatsApp: "💬", "X (Twitter)": "🐦", LinkedIn: "💼", Pinterest: "📌",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getWeekStart(d: Date): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay(); // 0=dom
  start.setDate(start.getDate() - day + 1); // lunes
  return start;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
// Parsea un ISO string de fecha como fecha local evitando desfase UTC (ej: UTC-5 Perú)
function parseLocalDate(isoString: string): Date {
  const [y, m, d] = isoString.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fmtShort(d: Date) { return d.toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short" }); }

// ── Main Component ─────────────────────────────────────────────────────────

interface Props { userId: string; userRole: string }

export function TareasClient({ userId: _userId, userRole }: Props) {
  const [tab, setTab] = useState<"semana" | "plantillas">("semana");
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selectedInstance, setSelectedInstance] = useState<TaskInstance | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCoordPlus = userRole === "ADMIN" || userRole === "COORDINATOR";

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch("/api/admin/producciones/tareas");
      const json = await res.json();
      if (json.ok) setTasks(json.tasks);
    } catch { setError("Error al cargar tareas"); }
    setLoadingTasks(false);
  }, []);

  const loadInstances = useCallback(async () => {
    setLoadingInstances(true);
    try {
      const from = weekStart.toISOString();
      const to = addDays(weekStart, 6);
      to.setHours(23, 59, 59, 999);
      const res = await fetch(`/api/admin/producciones/tareas/instances?from=${from}&to=${to.toISOString()}`);
      const json = await res.json();
      if (json.ok) setInstances(json.instances);
    } catch { setError("Error al cargar instancias"); }
    setLoadingInstances(false);
  }, [weekStart]);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { loadInstances(); }, [loadInstances]);

  const updateInstanceStatus = async (instanceId: string, status: TaskStatus, notes?: string) => {
    await fetch(`/api/admin/producciones/tareas/instances/${instanceId}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });
    await loadInstances();
    setSelectedInstance(null);
  };

  const generateInstances = async (taskId: string) => {
    const res = await fetch(`/api/admin/producciones/tareas/${taskId}/generate`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ weeksAhead: 8 }),
    });
    const json = await res.json();
    if (json.ok) {
      await loadInstances();
      alert(`✓ ${json.created} instancias nuevas generadas (${json.total} en el rango)`);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!window.confirm("¿Eliminar esta tarea y todas sus instancias?")) return;
    await fetch(`/api/admin/producciones/tareas/${taskId}`, { method: "DELETE" });
    await loadTasks();
    await loadInstances();
  };

  // Vista detalle de instancia
  if (selectedInstance) {
    return (
      <InstanceDetail
        instance={selectedInstance}
        onBack={() => setSelectedInstance(null)}
        onUpdateStatus={updateInstanceStatus}
      />
    );
  }

  // Formulario de tarea
  if (showTaskForm || editingTask) {
    return (
      <TaskForm
        task={editingTask}
        onClose={() => { setShowTaskForm(false); setEditingTask(null); }}
        onSaved={() => { setShowTaskForm(false); setEditingTask(null); loadTasks(); loadInstances(); }}
      />
    );
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tareas Recurrentes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {tasks.filter(t => t.active).length} tarea{tasks.filter(t => t.active).length !== 1 ? "s" : ""} activa{tasks.filter(t => t.active).length !== 1 ? "s" : ""}
          </p>
        </div>
        {isCoordPlus && tab === "plantillas" && (
          <button onClick={() => setShowTaskForm(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors text-sm">
            + Nueva Tarea
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 w-fit mb-6">
        {(["semana", "plantillas"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
            {t === "semana" ? "📅 Esta semana" : "⚙️ Plantillas"}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {tab === "semana" ? (
        /* ── Vista Semana ─────────────────────────────────────────────── */
        <div>
          {/* Navegación de semana */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setWeekStart(d => addDays(d, -7))}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition">
              ← Semana anterior
            </button>
            <div className="flex-1 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
              {weekDays[0].toLocaleDateString("es-PE", { day: "2-digit", month: "long" })} — {weekDays[6].toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
            <button onClick={() => setWeekStart(d => addDays(d, 7))}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition">
              Semana siguiente →
            </button>
            <button onClick={() => setWeekStart(getWeekStart(new Date()))}
              className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm hover:bg-indigo-200 transition">
              Hoy
            </button>
          </div>

          {loadingInstances ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, idx) => {
                const isToday = isSameDay(day, new Date());
                const dayInstances = instances.filter(inst => isSameDay(parseLocalDate(inst.scheduledFor), day));
                return (
                  <div key={idx} className={`min-h-32 rounded-xl border-2 p-2 ${
                    isToday ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  }`}>
                    {/* Day header */}
                    <div className={`text-xs font-bold mb-2 ${isToday ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}>
                      <div>{DAYS_SHORT[day.getDay()]}</div>
                      <div className={`text-base leading-none ${isToday ? "text-indigo-700 dark:text-indigo-300" : "text-gray-700 dark:text-gray-200"}`}>
                        {day.getDate()}
                      </div>
                    </div>
                    {/* Instances */}
                    <div className="space-y-1">
                      {dayInstances.map(inst => (
                        <button key={inst.id} onClick={() => setSelectedInstance(inst)}
                          className={`w-full text-left rounded-lg px-2 py-1 text-[10px] leading-tight transition hover:opacity-80 ${STATUS_COLORS[inst.status]}`}>
                          <div className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[inst.status]}`} />
                            <span className="font-medium truncate">{inst.task.name}</span>
                          </div>
                        </button>
                      ))}
                      {dayInstances.length === 0 && (
                        <p className="text-[10px] text-gray-300 dark:text-gray-600 text-center py-2">—</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resumen de la semana */}
          {instances.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["PENDING", "IN_PROGRESS", "DONE", "SKIPPED"] as TaskStatus[]).map(s => {
                const count = instances.filter(i => i.status === s).length;
                return (
                  <div key={s} className={`rounded-xl p-3 ${STATUS_COLORS[s]} border border-current/10`}>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs font-medium">{STATUS_LABELS[s]}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── Vista Plantillas ────────────────────────────────────────── */
        <div>
          {loadingTasks ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-20 text-gray-400 dark:text-gray-500">
              <p className="text-4xl mb-3">⚙️</p>
              <p className="text-lg font-medium">No hay tareas configuradas</p>
              {isCoordPlus && <p className="text-sm mt-1">Crea la primera tarea recurrente</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${!task.active ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{task.name}</h3>
                        {!task.active && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded px-2 py-0.5">Inactiva</span>}
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded px-2 py-0.5">
                          {RECURRENCE_LABELS[task.recurrence]}
                        </span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded px-2 py-0.5">
                          {TYPE_LABELS[task.type]}
                        </span>
                        <span className={`text-xs rounded px-2 py-0.5 ${PRIORITY_COLORS[task.defaultPriority]}`}>
                          {PRIORITY_LABELS[task.defaultPriority]}
                        </span>
                      </div>

                      {/* Schedule summary */}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {task.recurrence === "WEEKLY" || task.recurrence === "BIWEEKLY"
                          ? `Cada ${(task.daysOfWeek || "1").split(",").map(d => DAYS_SHORT[parseInt(d)]).join(" y ")}`
                          : task.recurrence === "MONTHLY"
                          ? `Día ${task.dayOfMonth} de cada mes`
                          : "Todos los días"}
                        {task.platform ? ` · ${task.platform.split(",").join("/")}` : ""}
                        {task.format ? ` · ${task.format}` : ""}
                        {task.aspectRatio ? ` · ${task.aspectRatio}` : ""}
                      </p>

                      {task.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{task.description}</p>
                      )}

                      {task.defaultAssignees.length > 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Asignados: {task.defaultAssignees.map(a => a.person.name).join(", ")}
                        </p>
                      )}
                    </div>

                    {isCoordPlus && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button onClick={() => generateInstances(task.id)}
                          className="text-xs px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 transition whitespace-nowrap">
                          ↻ Generar instancias
                        </button>
                        <button onClick={() => setEditingTask(task)}
                          className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition">
                          ✎ Editar
                        </button>
                        {userRole === "ADMIN" && (
                          <button onClick={() => deleteTask(task.id)}
                            className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition">
                            🗑
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Instance Detail ────────────────────────────────────────────────────────

function InstanceDetail({ instance, onBack, onUpdateStatus }: {
  instance: TaskInstance;
  onBack: () => void;
  onUpdateStatus: (id: string, status: TaskStatus, notes?: string) => void;
}) {
  const [notes, setNotes] = useState(instance.notes || "");
  const [saving, setSaving] = useState(false);

  const update = async (status: TaskStatus) => {
    setSaving(true);
    await onUpdateStatus(instance.id, status, notes || undefined);
    setSaving(false);
  };

  const task = instance.task;
  const scheduledDate = parseLocalDate(instance.scheduledFor);

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 text-lg">←</button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{task.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {fmtShort(scheduledDate)} · <span className={`font-medium px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[instance.status]}`}>{STATUS_LABELS[instance.status]}</span>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Info de la tarea */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
          <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detalles de la tarea</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-400 text-xs">Tipo</span><p className="text-gray-800 dark:text-gray-200">{TYPE_LABELS[task.type]}</p></div>
            {task.platform && <div><span className="text-gray-400 text-xs">Plataforma</span><p className="text-gray-800 dark:text-gray-200">{task.platform.split(",").join(" · ")}</p></div>}
            {task.format && <div><span className="text-gray-400 text-xs">Formato</span><p className="text-gray-800 dark:text-gray-200">{task.format}</p></div>}
            {task.aspectRatio && <div><span className="text-gray-400 text-xs">Relación de aspecto</span><p className="font-mono font-semibold text-gray-800 dark:text-gray-200">{task.aspectRatio}</p></div>}
            {task.deliverables && <div className="col-span-2"><span className="text-gray-400 text-xs">Entregables</span><p className="text-gray-800 dark:text-gray-200">{task.deliverables}</p></div>}
          </div>
          {task.defaultAssignees.length > 0 && (
            <div>
              <span className="text-gray-400 text-xs">Equipo asignado</span>
              <p className="text-gray-800 dark:text-gray-200 text-sm">{task.defaultAssignees.map(a => a.person.name).join(", ")}</p>
            </div>
          )}
          {task.description && <p className="text-sm text-gray-600 dark:text-gray-400">{task.description}</p>}
        </div>

        {/* Completado por */}
        {instance.completedBy && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
            <p className="text-sm text-green-700 dark:text-green-400">
              ✓ Completado por <strong>{instance.completedBy.person?.name || instance.completedBy.username}</strong>
              {instance.completedAt && ` · ${new Date(instance.completedAt).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
            </p>
          </div>
        )}

        {/* Notas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Notas</h2>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Observaciones, detalles de entrega..."
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 resize-none" />
        </div>

        {/* Cambiar estado */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Actualizar estado</h2>
          <div className="flex flex-wrap gap-2">
            {(["PENDING", "IN_PROGRESS", "DONE", "SKIPPED"] as TaskStatus[]).map(s => (
              <button key={s} onClick={() => update(s)} disabled={saving || instance.status === s}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                  instance.status === s
                    ? "ring-2 ring-offset-1 ring-indigo-400 " + STATUS_COLORS[s]
                    : STATUS_COLORS[s] + " hover:opacity-80"
                }`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Task Form ──────────────────────────────────────────────────────────────

function TaskForm({ task, onClose, onSaved }: {
  task: RecurringTask | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(task?.name || "");
  const [description, setDescription] = useState(task?.description || "");
  const [type, setType] = useState<ProductionType>(task?.type || "PHOTO_SESSION");
  const [platforms, setPlatforms] = useState<string[]>(
    task?.platform ? task.platform.split(",").map(s => s.trim()).filter(Boolean) : []
  );
  const [format, setFormat] = useState(task?.format || "");
  const [aspectRatio, setAspectRatio] = useState(task?.aspectRatio || "");
  const [deliverables, setDeliverables] = useState(task?.deliverables || "");
  const [recurrence, setRecurrence] = useState<RecurrenceType>(task?.recurrence || "WEEKLY");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    task?.daysOfWeek ? task.daysOfWeek.split(",").map(Number) : [1]
  );
  const [dayOfMonth, setDayOfMonth] = useState(task?.dayOfMonth || 1);
  const [defaultPriority, setDefaultPriority] = useState<ProductionPriority>(task?.defaultPriority || "MEDIUM");
  const [active, setActive] = useState(task?.active ?? true);
  const [notes, setNotes] = useState(task?.notes || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (d: number) => {
    setDaysOfWeek(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    if ((recurrence === "WEEKLY" || recurrence === "BIWEEKLY") && daysOfWeek.length === 0) {
      setError("Selecciona al menos un día de la semana"); return;
    }
    setError(null);
    setLoading(true);

    const body = {
      name: name.trim(), description: description.trim() || null,
      type, platform: platforms.length ? platforms.join(",") : null,
      format: format || null, aspectRatio: aspectRatio || null,
      deliverables: deliverables.trim() || null, recurrence,
      daysOfWeek: (recurrence === "WEEKLY" || recurrence === "BIWEEKLY") ? daysOfWeek.join(",") : null,
      dayOfMonth: recurrence === "MONTHLY" ? dayOfMonth : null,
      defaultPriority, active, notes: notes.trim() || null,
    };

    try {
      const url = task ? `/api/admin/producciones/tareas/${task.id}` : "/api/admin/producciones/tareas";
      const method = task ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.ok) onSaved();
      else setError(json.message || "Error al guardar");
    } catch { setError("Error de conexión"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">← Volver</button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {task ? "Editar Tarea" : "Nueva Tarea Recurrente"}
        </h1>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Info básica */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Información básica</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              placeholder="Ej: Lounge Stories"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Pack de 30+ fotos para historias de Instagram"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value as ProductionType)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200">
                {(Object.entries(TYPE_LABELS) as [ProductionType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridad por defecto</label>
              <select value={defaultPriority} onChange={e => setDefaultPriority(e.target.value as ProductionPriority)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200">
                {(Object.entries(PRIORITY_LABELS) as [ProductionPriority, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Plataforma multi-toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plataforma</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => {
                const active = platforms.includes(p);
                return (
                  <button key={p} type="button"
                    onClick={() => setPlatforms(prev => active ? prev.filter(x => x !== p) : [...prev, p])}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                      active
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-400"
                    }`}>
                    <span>{PLATFORM_ICONS[p]}</span>{p}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Formato single-select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Formato</label>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map(f => (
                <button key={f} type="button" onClick={() => setFormat(prev => prev === f ? "" : f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    format === f
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-violet-400"
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          {/* Relación de aspecto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Relación de aspecto</label>
            <div className="flex flex-wrap gap-2">
              {ASPECT_RATIOS.map(r => (
                <button key={r} type="button" onClick={() => setAspectRatio(prev => prev === r ? "" : r)}
                  className={`px-3 py-2 rounded-lg text-sm font-mono font-semibold border transition ${
                    aspectRatio === r
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-teal-400"
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entregables</label>
            <input value={deliverables} onChange={e => setDeliverables(e.target.value)} placeholder="30+ fotos editadas"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100" />
          </div>
        </section>

        {/* Recurrencia */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Frecuencia</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recurrencia</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(RECURRENCE_LABELS) as [RecurrenceType, string][]).map(([k, v]) => (
                <button key={k} type="button" onClick={() => setRecurrence(k)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${recurrence === k ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {(recurrence === "WEEKLY" || recurrence === "BIWEEKLY") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Días de la semana</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map(d => (
                  <button key={d} type="button" onClick={() => toggleDay(d)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition ${daysOfWeek.includes(d) ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"}`}>
                    {DAYS_SHORT[d]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {recurrence === "MONTHLY" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Día del mes</label>
              <input type="number" min={1} max={28} value={dayOfMonth} onChange={e => setDayOfMonth(parseInt(e.target.value) || 1)}
                className="w-24 border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100" />
            </div>
          )}
        </section>

        {/* Extra */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 resize-none" />
          </div>
          {task && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)}
                className="w-4 h-4 accent-indigo-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Tarea activa</span>
            </label>
          )}
        </section>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 text-sm transition">
            {loading ? "Guardando..." : task ? "Guardar Cambios" : "Crear Tarea"}
          </button>
        </div>
      </form>
    </div>
  );
}
