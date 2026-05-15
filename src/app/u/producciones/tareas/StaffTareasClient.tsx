"use client";

import { useCallback, useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type ProductionType = "VIDEO_REEL"|"VIDEO_TIKTOK"|"VIDEO_PROMO"|"VIDEO_RECAP"|"PHOTO_SESSION"|"PHOTO_PRODUCT"|"PHOTO_STAFF"|"DESIGN_GRAPHIC"|"OTHER";
type ProductionPriority = "LOW"|"MEDIUM"|"HIGH"|"URGENT";
type TaskStatus = "PENDING"|"IN_PROGRESS"|"DONE"|"SKIPPED";

interface PersonRef { id: string; name: string; area?: string | null }
interface TaskAssignee { id: string; personId: string; person: PersonRef }
interface RecurringTask {
  id: string; name: string; description?: string | null;
  type: ProductionType; platform?: string | null; format?: string | null;
  aspectRatio?: string | null; deliverables?: string | null;
  defaultPriority: ProductionPriority; active: boolean; notes?: string | null;
  defaultAssignees: TaskAssignee[];
}
interface TaskInstance {
  id: string; taskId: string; scheduledFor: string; status: TaskStatus;
  notes?: string | null; completedAt?: string | null;
  completedBy?: { id: string; username: string; person?: { name: string } | null } | null;
  task: RecurringTask;
}

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ProductionType, string> = {
  VIDEO_REEL: "Reel", VIDEO_TIKTOK: "TikTok", VIDEO_PROMO: "Video Promo",
  VIDEO_RECAP: "Recap", PHOTO_SESSION: "Fotos", PHOTO_PRODUCT: "Foto Producto",
  PHOTO_STAFF: "Foto Personal", DESIGN_GRAPHIC: "Diseño", OTHER: "Otro",
};
const PRIORITY_LABELS: Record<ProductionPriority, string> = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", URGENT: "Urgente" };
const PRIORITY_COLORS: Record<ProductionPriority, string> = {
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};
const STATUS_LABELS: Record<TaskStatus, string> = { PENDING: "Pendiente", IN_PROGRESS: "En curso", DONE: "Listo", SKIPPED: "Omitido" };
const STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  DONE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  SKIPPED: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 line-through",
};
const STATUS_DOT: Record<TaskStatus, string> = {
  PENDING: "bg-gray-400", IN_PROGRESS: "bg-yellow-500", DONE: "bg-green-500", SKIPPED: "bg-slate-400",
};
const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// ── Helpers ────────────────────────────────────────────────────────────────

function getWeekStart(d: Date): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() - day + 1); // lunes
  return start;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtShort(d: Date) {
  return d.toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short" });
}

// ── Main Component ─────────────────────────────────────────────────────────

interface Props { userId: string; userRole: string }

export function StaffTareasClient({ userId: _userId, userRole: _userRole }: Props) {
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selectedInstance, setSelectedInstance] = useState<TaskInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInstances = useCallback(async () => {
    setLoadingInstances(true);
    try {
      const from = weekStart.toISOString();
      const to = addDays(weekStart, 6);
      to.setHours(23, 59, 59, 999);
      const res = await fetch(`/api/admin/producciones/tareas/instances?from=${from}&to=${to.toISOString()}`);
      const json = await res.json();
      if (json.ok) setInstances(json.instances);
      else setError("Error al cargar tareas");
    } catch { setError("Error de conexión"); }
    setLoadingInstances(false);
  }, [weekStart]);

  useEffect(() => { loadInstances(); }, [loadInstances]);

  const updateInstanceStatus = async (instanceId: string, status: TaskStatus, notes?: string) => {
    await fetch(`/api/admin/producciones/tareas/instances/${instanceId}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });
    await loadInstances();
    setSelectedInstance(null);
  };

  if (selectedInstance) {
    return (
      <InstanceDetail
        instance={selectedInstance}
        onBack={() => setSelectedInstance(null)}
        onUpdateStatus={updateInstanceStatus}
      />
    );
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const activeDays = weekDays.filter(day =>
    instances.some(inst => isSameDay(new Date(inst.scheduledFor), day))
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tareas de la semana</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {instances.length} tarea{instances.length !== 1 ? "s" : ""} esta semana
        </p>
      </div>

      {/* Navegación de semana */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button onClick={() => setWeekStart(d => addDays(d, -7))}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition">
          ← Anterior
        </button>
        <div className="flex-1 text-center text-sm font-medium text-gray-700 dark:text-gray-300 min-w-0">
          {weekDays[0].toLocaleDateString("es-PE", { day: "2-digit", month: "long" })}
          {" — "}
          {weekDays[6].toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}
        </div>
        <button onClick={() => setWeekStart(d => addDays(d, 7))}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition">
          Siguiente →
        </button>
        <button onClick={() => setWeekStart(getWeekStart(new Date()))}
          className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm hover:bg-indigo-200 transition">
          Hoy
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loadingInstances ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : activeDays.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-lg font-medium">Sin tareas esta semana</p>
          <p className="text-sm mt-1">No hay instancias generadas para este período.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const dayInstances = instances.filter(inst => isSameDay(new Date(inst.scheduledFor), day));
            return (
              <div key={day.toISOString()} className={`rounded-xl border-2 overflow-hidden ${
                isToday
                  ? "border-indigo-400 dark:border-indigo-500"
                  : "border-gray-200 dark:border-gray-700"
              }`}>
                {/* Day header */}
                <div className={`px-4 py-2 flex items-center gap-3 ${
                  isToday
                    ? "bg-indigo-50 dark:bg-indigo-900/20"
                    : "bg-gray-50 dark:bg-gray-800/60"
                }`}>
                  <div className={`font-bold text-sm ${isToday ? "text-indigo-700 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300"}`}>
                    {DAYS_SHORT[day.getDay()]} {day.getDate()} de {day.toLocaleDateString("es-PE", { month: "long" })}
                    {isToday && <span className="ml-2 text-xs font-medium bg-indigo-600 text-white px-2 py-0.5 rounded-full">Hoy</span>}
                  </div>
                  <div className="ml-auto flex gap-1">
                    {(["PENDING", "IN_PROGRESS", "DONE", "SKIPPED"] as TaskStatus[]).map(s => {
                      const c = dayInstances.filter(i => i.status === s).length;
                      return c > 0 ? (
                        <span key={s} className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[s]}`}>
                          {c}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Instances */}
                <div className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                  {dayInstances.map(inst => (
                    <button key={inst.id} onClick={() => setSelectedInstance(inst)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[inst.status]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{inst.task.name}</p>
                          <div className="flex gap-2 flex-wrap mt-0.5">
                            {inst.task.platform && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">{inst.task.platform.split(",").join(" · ")}</span>
                            )}
                            {inst.task.format && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">{inst.task.format}</span>
                            )}
                            <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[inst.task.defaultPriority]}`}>
                              {PRIORITY_LABELS[inst.task.defaultPriority]}
                            </span>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-lg font-medium flex-shrink-0 ${STATUS_COLORS[inst.status]}`}>
                          {STATUS_LABELS[inst.status]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resumen semanal */}
      {instances.length > 0 && !loadingInstances && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["PENDING", "IN_PROGRESS", "DONE", "SKIPPED"] as TaskStatus[]).map(s => {
            const count = instances.filter(i => i.status === s).length;
            return (
              <div key={s} className={`rounded-xl p-3 ${STATUS_COLORS[s]}`}>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs font-medium">{STATUS_LABELS[s]}</div>
              </div>
            );
          })}
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
  const scheduledDate = new Date(instance.scheduledFor);

  return (
    <div className="space-y-4">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        ← Volver
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{task.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {fmtShort(scheduledDate)} ·{" "}
              <span className={`font-medium px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[instance.status]}`}>
                {STATUS_LABELS[instance.status]}
              </span>
            </p>
          </div>
        </div>

        {/* Detalles */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <span className="text-xs text-gray-400">Tipo</span>
            <p className="text-gray-800 dark:text-gray-200">{TYPE_LABELS[task.type]}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Prioridad</span>
            <p><span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.defaultPriority]}`}>{PRIORITY_LABELS[task.defaultPriority]}</span></p>
          </div>
          {task.platform && (
            <div>
              <span className="text-xs text-gray-400">Plataforma</span>
              <p className="text-gray-800 dark:text-gray-200">{task.platform.split(",").join(" · ")}</p>
            </div>
          )}
          {task.format && (
            <div>
              <span className="text-xs text-gray-400">Formato</span>
              <p className="text-gray-800 dark:text-gray-200">{task.format}</p>
            </div>
          )}
          {task.aspectRatio && (
            <div>
              <span className="text-xs text-gray-400">Relación de aspecto</span>
              <p className="font-mono font-semibold text-gray-800 dark:text-gray-200">{task.aspectRatio}</p>
            </div>
          )}
          {task.deliverables && (
            <div className="col-span-2">
              <span className="text-xs text-gray-400">Entregables</span>
              <p className="text-gray-800 dark:text-gray-200">{task.deliverables}</p>
            </div>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{task.description}</p>
        )}

        {task.defaultAssignees.length > 0 && (
          <div className="mb-4">
            <span className="text-xs text-gray-400">Equipo asignado</span>
            <p className="text-sm text-gray-800 dark:text-gray-200">{task.defaultAssignees.map(a => a.person.name).join(", ")}</p>
          </div>
        )}

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-1">Notas / observaciones</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Escribe notas sobre esta tarea..."
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 resize-none" />
        </div>

        {/* Status actions */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-xs text-gray-400 mb-2">Cambiar estado:</p>
          <div className="flex flex-wrap gap-2">
            {(["PENDING", "IN_PROGRESS", "DONE", "SKIPPED"] as TaskStatus[]).map(s => (
              <button key={s} onClick={() => update(s)} disabled={saving}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 border-2 ${
                  instance.status === s ? "border-indigo-500 " + STATUS_COLORS[s] : "border-transparent " + STATUS_COLORS[s] + " hover:border-gray-300 dark:hover:border-gray-500"
                }`}>
                {saving && instance.status !== s ? "..." : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {instance.completedBy && (
          <p className="mt-3 text-xs text-gray-400">
            Completado por {instance.completedBy.person?.name || instance.completedBy.username}
            {instance.completedAt && ` · ${new Date(instance.completedAt).toLocaleDateString("es-PE")}`}
          </p>
        )}
      </div>
    </div>
  );
}
