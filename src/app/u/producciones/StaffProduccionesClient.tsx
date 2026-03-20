"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

/* ── Types (shared with admin) ── */
type ProductionType = "VIDEO_REEL"|"VIDEO_TIKTOK"|"VIDEO_PROMO"|"VIDEO_RECAP"|"PHOTO_SESSION"|"PHOTO_PRODUCT"|"PHOTO_STAFF"|"DESIGN_GRAPHIC"|"OTHER";
type ProductionStatus = "IDEA"|"BRIEFED"|"SCHEDULED"|"IN_PRODUCTION"|"IN_EDITING"|"IN_REVIEW"|"APPROVED"|"PUBLISHED"|"CANCELLED";
type ProductionPriority = "LOW"|"MEDIUM"|"HIGH"|"URGENT";

interface PersonRef { id: string; name: string; area: string | null }
interface AssigneeRef { id: string; personId: string; person: PersonRef }
interface Production {
  id: string; title: string; type: ProductionType; status: ProductionStatus; priority: ProductionPriority;
  objective?: string|null; context?: string|null; message?: string|null;
  deadline?: string|null; scheduledDate?: string|null; completedAt?: string|null;
  publishedAt?: string|null; publishUrl?: string|null;
  assignedTo?: AssigneeRef[];
  requestedBy?: { id: string; username: string; person?: { name: string } | null } | null;
  tags?: string|null; createdAt: string;
  _count?: { comments: number; links: number };
}

const TYPE_LABELS: Record<ProductionType, string> = {
  VIDEO_REEL: "Reel", VIDEO_TIKTOK: "TikTok", VIDEO_PROMO: "Video Promo",
  VIDEO_RECAP: "Recap", PHOTO_SESSION: "Fotos", PHOTO_PRODUCT: "Foto Producto",
  PHOTO_STAFF: "Foto Personal", DESIGN_GRAPHIC: "Diseño", OTHER: "Otro",
};
const STATUS_LABELS: Record<ProductionStatus, string> = {
  IDEA: "Idea", BRIEFED: "Con Brief", SCHEDULED: "Agendado", IN_PRODUCTION: "En Producción",
  IN_EDITING: "En Edición", IN_REVIEW: "En Revisión", APPROVED: "Aprobado", PUBLISHED: "Publicado", CANCELLED: "Cancelado",
};
const PRIORITY_LABELS: Record<ProductionPriority, string> = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", URGENT: "Urgente" };
const PRIORITY_COLORS: Record<ProductionPriority, string> = {
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};
const STATUS_DOT: Record<ProductionStatus, string> = {
  IDEA: "bg-gray-400", BRIEFED: "bg-indigo-400", SCHEDULED: "bg-cyan-400",
  IN_PRODUCTION: "bg-yellow-500", IN_EDITING: "bg-purple-500", IN_REVIEW: "bg-amber-500",
  APPROVED: "bg-green-500", PUBLISHED: "bg-emerald-600", CANCELLED: "bg-red-500",
};

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook", "Web", "WhatsApp"];

interface Props {
  userId: string;
  userRole: string;
  personId: string;
  personName: string;
  isStaffPlus: boolean;
  persons: PersonRef[];
}

export default function StaffProduccionesClient({ userId, userRole, personId, personName, isStaffPlus, persons }: Props) {
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ProductionStatus | "">("");
  const [filterType, setFilterType] = useState<ProductionType | "">("");
  const [filterPriority, setFilterPriority] = useState<ProductionPriority | "">("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/producciones");
      const json = await res.json();
      if (json.ok) setProductions(json.productions);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const mine = productions.filter(p => p.assignedTo?.some(a => a.person.id === personId) || p.requestedBy?.id === userId);
  const base = tab === "mine" ? mine : productions;

  // Apply filters
  const visible = base.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterType && p.type !== filterType) return false;
    if (filterPriority && p.priority !== filterPriority) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const hasFilters = !!(filterStatus || filterType || filterPriority || search);
  const clearFilters = () => { setFilterStatus(""); setFilterType(""); setFilterPriority(""); setSearch(""); };

  // Counts for badges
  const myPending = mine.filter(p => !["APPROVED", "PUBLISHED", "CANCELLED"].includes(p.status)).length;
  const allPending = productions.filter(p => !["APPROVED", "PUBLISHED", "CANCELLED"].includes(p.status)).length;

  if (selectedId) {
    return (
      <StaffDetailView
        productionId={selectedId}
        userId={userId}
        personId={personId}
        isStaffPlus={isStaffPlus}
        persons={persons}
        onBack={() => { setSelectedId(null); load(); }}
      />
    );
  }

  if (showForm) {
    return (
      <StaffCreateForm
        persons={persons}
        isStaffPlus={isStaffPlus}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-slate-100">Producción Multimedia</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Solicitudes, seguimiento y entregables
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition whitespace-nowrap"
        >
          + Nueva
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
        <button onClick={() => setTab("mine")}
          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === "mine" ? "bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
          Mis producciones {myPending > 0 && <span className="ml-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{myPending}</span>}
        </button>
        <button onClick={() => setTab("all")}
          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === "all" ? "bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
          Todas {allPending > 0 && <span className="ml-1.5 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{allPending}</span>}
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título..."
          className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />
        <div className="flex gap-2 flex-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ProductionStatus | "")}
            className="text-xs border rounded-lg px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
            <option value="">Estado: Todos</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value as ProductionType | "")}
            className="text-xs border rounded-lg px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
            <option value="">Tipo: Todos</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as ProductionPriority | "")}
            className="text-xs border rounded-lg px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
            <option value="">Prioridad: Todas</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 py-1">
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <div className="text-4xl">🎬</div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {tab === "mine" ? "No tienes producciones asignadas o solicitadas" : "No hay producciones registradas aún"}
          </p>
          <button onClick={() => setShowForm(true)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            Crear primera solicitud →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(p => (
            <button key={p.id} onClick={() => setSelectedId(p.id)}
              className="w-full text-left rounded-xl border bg-white dark:bg-slate-800 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 mt-1 w-2.5 h-2.5 rounded-full ${STATUS_DOT[p.status]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{p.title}</h3>
                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${PRIORITY_COLORS[p.priority]}`}>{PRIORITY_LABELS[p.priority]}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="bg-slate-100 dark:bg-slate-700 rounded px-1.5 py-0.5">{TYPE_LABELS[p.type]}</span>
                    <span className="bg-slate-100 dark:bg-slate-700 rounded px-1.5 py-0.5">{STATUS_LABELS[p.status]}</span>
                    {p.assignedTo && p.assignedTo.length > 0 && <span>→ {p.assignedTo.map(a => a.person.name).join(", ")}</span>}
                    {p.deadline && (
                      <span className="text-orange-600 dark:text-orange-400">
                        Límite: {new Date(p.deadline).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </div>
                  {(p._count?.comments || p._count?.links) ? (
                    <div className="flex gap-2 mt-1.5 text-[10px] text-slate-400">
                      {p._count?.comments ? <span>💬 {p._count.comments}</span> : null}
                      {p._count?.links ? <span>🔗 {p._count.links}</span> : null}
                    </div>
                  ) : null}
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {new Date(p.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="pt-4 text-center">
        <Link href="/u" className="text-sm text-slate-500 dark:text-slate-400 hover:underline">← Volver al inicio</Link>
      </div>
    </div>
  );
}

/* ── Staff Create Form ── */
function StaffCreateForm({ persons, isStaffPlus, onClose, onSaved }: {
  persons: PersonRef[]; isStaffPlus: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ProductionType>("VIDEO_REEL");
  const [priority, setPriority] = useState<ProductionPriority>("MEDIUM");
  const [objective, setObjective] = useState("");
  const [context, setContext] = useState("");
  const [message, setMessage] = useState("");
  const [references, setReferences] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [platform, setPlatform] = useState("");
  const [format, setFormat] = useState("");
  const [duration, setDuration] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [deadline, setDeadline] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert("El título es obligatorio");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/producciones", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), type, priority, objective, context, message, references,
          targetAudience, platform, format, duration, deliverables,
          deadline: deadline || null, scheduledDate: scheduledDate || null,
          assignedToIds, notes, tags,
        }),
      });
      const json = await res.json();
      if (json.ok) onSaved(); else alert(json.message || "Error al crear");
    } catch { alert("Error de red"); }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">← Volver</button>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nueva Solicitud de Producción</h1>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Basic */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Información básica</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              placeholder="Ej: Reel ambiente noche viernes" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo *</label>
              <select value={type} onChange={e => setType(e.target.value as ProductionType)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prioridad</label>
              <select value={priority} onChange={e => setPriority(e.target.value as ProductionPriority)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100">
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Brief */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Brief Creativo</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Objetivo</label>
            <textarea value={objective} onChange={e => setObjective(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              placeholder="¿Qué queremos lograr?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contexto</label>
            <textarea value={context} onChange={e => setContext(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              placeholder="Situación actual, por qué se necesita" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mensaje a comunicar</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              placeholder="¿Qué debe entender/sentir el público?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Público objetivo</label>
            <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              placeholder="Ej: Jóvenes 18-30, clientes actuales" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Referencias / Inspiración</label>
            <textarea value={references} onChange={e => setReferences(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              placeholder="Links de referencia, videos similares..." />
          </div>
        </section>

        {/* Specs */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Formato y Especificaciones</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Plataforma(s)</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(pl => {
                const sel = platform.split(",").map(s => s.trim()).filter(Boolean).includes(pl);
                return (
                  <button key={pl} type="button"
                    onClick={() => {
                      const cur = platform.split(",").map(s => s.trim()).filter(Boolean);
                      setPlatform(sel ? cur.filter(x => x !== pl).join(",") : [...cur, pl].join(","));
                    }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${sel ? "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300" : "border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400"}`}>
                    {pl}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Formato</label>
              <input value={format} onChange={e => setFormat(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                placeholder="Ej: Vertical 9:16" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duración</label>
              <input value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                placeholder="Ej: 30s, 60s" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Entregables esperados</label>
            <input value={deliverables} onChange={e => setDeliverables(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              placeholder="Ej: 1 reel editado + 3 stories" />
          </div>
        </section>

        {/* Dates & Assignment */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fechas y Asignación</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha límite</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha producción</label>
              <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100" />
            </div>
          </div>
          {isStaffPlus && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asignar a</label>
              <select value={assignedToIds[0] || ""} onChange={e => setAssignedToIds(e.target.value ? [e.target.value] : [])}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100">
                <option value="">Sin asignar</option>
                {persons.map(p => <option key={p.id} value={p.id}>{p.name}{p.area ? ` (${p.area})` : ""}</option>)}
              </select>
            </div>
          )}
        </section>

        {/* Notes & Tags */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notas</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tags</label>
            <input value={tags} onChange={e => setTags(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              placeholder="producto, menú, evento (separados por coma)" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas adicionales</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              placeholder="Observaciones, consideraciones..." />
          </div>
        </section>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm transition">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 text-sm transition">
            {loading ? "Creando..." : "Crear Solicitud"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Staff Detail View ── */
function StaffDetailView({ productionId, userId, personId, isStaffPlus, persons, onBack }: {
  productionId: string; userId: string; personId: string; isStaffPlus: boolean; persons: PersonRef[]; onBack: () => void;
}) {
  const [prod, setProd] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkType, setLinkType] = useState("DELIVERABLE");
  const [sendingLink, setSendingLink] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/admin/producciones/${productionId}`);
      const json = await res.json();
      if (json.ok) setProd(json.production);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [productionId]);

  const STATUS_FLOW: ProductionStatus[] = ["IDEA","BRIEFED","SCHEDULED","IN_PRODUCTION","IN_EDITING","IN_REVIEW","APPROVED","PUBLISHED"];

  // Staff can't approve or publish — those require admin/coordinator
  const nextStatus = (): ProductionStatus | null => {
    if (!prod) return null;
    const idx = STATUS_FLOW.indexOf(prod.status as ProductionStatus);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
    const next = STATUS_FLOW[idx + 1];
    // STAFF can't approve or publish
    if (!isStaffPlus && (next === "APPROVED" || next === "PUBLISHED")) return null;
    return next;
  };

  const advanceStatus = async () => {
    const next = nextStatus();
    if (!next) return;
    const res = await fetch(`/api/admin/producciones/${productionId}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const json = await res.json();
    if (!json.ok) alert(json.message || "No se pudo cambiar el estado");
    await load();
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setSendingComment(true);
    try {
      await fetch(`/api/admin/producciones/${productionId}/comments`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: comment.trim() }),
      });
      setComment("");
      await load();
    } catch { /* ignore */ }
    setSendingComment(false);
  };

  const addLink = async () => {
    if (!linkLabel.trim() || !linkUrl.trim()) return;
    setSendingLink(true);
    try {
      const res = await fetch(`/api/admin/producciones/${productionId}/links`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: linkLabel.trim(), url: linkUrl.trim(), type: linkType }),
      });
      const json = await res.json();
      if (json.ok) { setLinkLabel(""); setLinkUrl(""); await load(); }
      else alert(json.message || "Error");
    } catch { /* ignore */ }
    setSendingLink(false);
  };

  const removeLink = async (linkId: string) => {
    if (!confirm("¿Eliminar este link?")) return;
    await fetch(`/api/admin/producciones/${productionId}/links?linkId=${linkId}`, { method: "DELETE" });
    await load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>;
  if (!prod) return <div className="p-6 text-center text-slate-500">Producción no encontrada</div>;

  const currentIdx = STATUS_FLOW.indexOf(prod.status as ProductionStatus);
  const next = nextStatus();
  const isAssignedToMe = prod.assignedTo?.some((a: AssigneeRef) => a.person?.id === personId || a.personId === personId);
  const isMyRequest = prod.requestedById === userId;
  const canChangeStatus = (isStaffPlus || isAssignedToMe) && next !== null;

  const LINK_TYPE_LABELS: Record<string, string> = { REFERENCE: "Referencia", DELIVERABLE: "Entregable", PUBLISHED: "Publicado" };
  const LINK_TYPE_COLORS: Record<string, string> = {
    REFERENCE: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    DELIVERABLE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    PUBLISHED: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-lg mt-0.5">←</button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{prod.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded px-1.5 py-0.5">{TYPE_LABELS[prod.type as ProductionType]}</span>
              <span className={`text-[11px] rounded px-1.5 py-0.5 ${PRIORITY_COLORS[prod.priority as ProductionPriority]}`}>{PRIORITY_LABELS[prod.priority as ProductionPriority]}</span>
              <span className="text-[11px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded px-1.5 py-0.5 font-medium">{STATUS_LABELS[prod.status as ProductionStatus]}</span>
            </div>
          </div>
        </div>
        {canChangeStatus && (
          <button onClick={advanceStatus}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition whitespace-nowrap">
            → {STATUS_LABELS[next!]}
          </button>
        )}
      </div>

      {/* Status Timeline */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 overflow-x-auto">
        <div className="flex items-center gap-1">
          {STATUS_FLOW.map((s, i) => {
            const isCurrent = prod.status === s;
            const isPast = currentIdx >= 0 && i < currentIdx;
            return (
              <div key={s} className="flex items-center">
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition ${
                  isCurrent ? "bg-indigo-600 text-white" :
                  isPast ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" :
                  "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                }`}>
                  {isPast ? "✓ " : ""}{STATUS_LABELS[s]}
                </div>
                {i < STATUS_FLOW.length - 1 && <div className={`w-3 h-0.5 mx-0.5 ${isPast ? "bg-green-300 dark:bg-green-700" : "bg-slate-200 dark:bg-slate-600"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Brief */}
      {(prod.objective || prod.context || prod.message || prod.targetAudience || prod.references) && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Brief Creativo</h2>
          {prod.objective && <div><p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Objetivo</p><p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{prod.objective}</p></div>}
          {prod.context && <div><p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Contexto</p><p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{prod.context}</p></div>}
          {prod.message && <div><p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Mensaje</p><p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{prod.message}</p></div>}
          {prod.targetAudience && <div><p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Público</p><p className="text-sm text-slate-800 dark:text-slate-200">{prod.targetAudience}</p></div>}
          {prod.references && <div><p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Referencias</p><p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{prod.references}</p></div>}
        </section>
      )}

      {/* Info sidebar inline */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Detalles</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div><p className="text-[11px] text-slate-500 dark:text-slate-400">Solicitado por</p><p className="text-slate-800 dark:text-slate-200">{prod.requestedBy?.person?.name || prod.requestedBy?.username || "—"}</p></div>
          <div><p className="text-[11px] text-slate-500 dark:text-slate-400">Asignado a</p><p className="text-slate-800 dark:text-slate-200">{prod.assignedTo?.name || "Sin asignar"}</p></div>
          {prod.platform && <div><p className="text-[11px] text-slate-500 dark:text-slate-400">Plataforma</p><p className="text-slate-800 dark:text-slate-200">{prod.platform}</p></div>}
          {prod.format && <div><p className="text-[11px] text-slate-500 dark:text-slate-400">Formato</p><p className="text-slate-800 dark:text-slate-200">{prod.format}</p></div>}
          {prod.duration && <div><p className="text-[11px] text-slate-500 dark:text-slate-400">Duración</p><p className="text-slate-800 dark:text-slate-200">{prod.duration}</p></div>}
          {prod.deliverables && <div><p className="text-[11px] text-slate-500 dark:text-slate-400">Entregables</p><p className="text-slate-800 dark:text-slate-200">{prod.deliverables}</p></div>}
          {prod.deadline && <div><p className="text-[11px] text-slate-500 dark:text-slate-400">Fecha límite</p><p className="text-orange-600 dark:text-orange-400 font-medium">{new Date(prod.deadline).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</p></div>}
          {prod.scheduledDate && <div><p className="text-[11px] text-slate-500 dark:text-slate-400">Fecha producción</p><p className="text-slate-800 dark:text-slate-200">{new Date(prod.scheduledDate).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</p></div>}
          {prod.publishUrl && <div className="col-span-2"><p className="text-[11px] text-slate-500 dark:text-slate-400">Publicación</p><a href={prod.publishUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline break-all text-sm">{prod.publishUrl}</a></div>}
        </div>
        {prod.tags && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {prod.tags.split(",").map((t: string) => t.trim()).filter(Boolean).map((t: string) => (
              <span key={t} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-2 py-0.5">{t}</span>
            ))}
          </div>
        )}
      </section>

      {/* Links / Entregables */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Links y Entregables</h2>
        {prod.links?.length > 0 ? (
          <div className="space-y-2 mb-4">
            {prod.links.map((link: any) => (
              <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 group">
                <span className={`text-[10px] rounded px-1.5 py-0.5 font-medium ${LINK_TYPE_COLORS[link.type] || "bg-slate-100 text-slate-600"}`}>
                  {LINK_TYPE_LABELS[link.type] || link.type}
                </span>
                <a href={link.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline truncate flex-1">{link.label}</a>
                <button onClick={() => removeLink(link.id)}
                  className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">✕</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">No hay links agregados aún</p>
        )}
        <div className="flex gap-2 flex-wrap items-end">
          <select value={linkType} onChange={e => setLinkType(e.target.value)}
            className="text-xs border rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200">
            <option value="REFERENCE">Referencia</option>
            <option value="DELIVERABLE">Entregable</option>
            <option value="PUBLISHED">Publicado</option>
          </select>
          <input value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="Nombre"
            className="text-sm border rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 flex-1 min-w-[100px]" />
          <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://drive.google.com/..."
            className="text-sm border rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 flex-1 min-w-[160px]" />
          <button onClick={addLink} disabled={sendingLink}
            className="px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-600 text-white text-sm hover:bg-slate-700 dark:hover:bg-slate-500 disabled:opacity-50 transition whitespace-nowrap">
            + Link
          </button>
        </div>
      </section>

      {/* Comments */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Comentarios {prod.comments?.length ? `(${prod.comments.length})` : ""}
        </h2>
        {prod.comments?.length > 0 ? (
          <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
            {prod.comments.map((c: any) => (
              <div key={c.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{c.author?.person?.name || c.author?.username}</span>
                  <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{c.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">Sin comentarios aún</p>
        )}
        <div className="flex gap-2">
          <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Escribe un comentario..."
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
            className="flex-1 text-sm border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100" />
          <button onClick={addComment} disabled={sendingComment || !comment.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50 transition">
            Enviar
          </button>
        </div>
      </section>

      {prod.notes && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Notas</h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{prod.notes}</p>
        </section>
      )}

      {/* Back */}
      <div className="text-center pt-2">
        <button onClick={onBack} className="text-sm text-slate-500 dark:text-slate-400 hover:underline">← Volver a la lista</button>
      </div>
    </div>
  );
}
