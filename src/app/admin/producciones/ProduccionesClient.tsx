"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductionDetail } from "./ProductionDetail";
import { ProductionForm } from "./ProductionForm";

/* ── Types ── */
export type ProductionType = "VIDEO_REEL"|"VIDEO_TIKTOK"|"VIDEO_PROMO"|"VIDEO_RECAP"|"PHOTO_SESSION"|"PHOTO_PRODUCT"|"PHOTO_STAFF"|"DESIGN_GRAPHIC"|"OTHER";
export type ProductionStatus = "IDEA"|"BRIEFED"|"SCHEDULED"|"IN_PRODUCTION"|"IN_EDITING"|"IN_REVIEW"|"APPROVED"|"PUBLISHED"|"CANCELLED";
export type ProductionPriority = "LOW"|"MEDIUM"|"HIGH"|"URGENT";

export interface PersonRef { id: string; name: string; area?: string | null; jobTitle?: string | null }
export interface AssigneeRef { id: string; personId: string; person: PersonRef }
export interface UserRef { id: string; username: string; person?: { name: string } | null }
export interface ProductionLink { id: string; label: string; url: string; type: string; createdAt: string }
export interface ProductionComment { id: string; content: string; createdAt: string; author: UserRef }
export interface Production {
  id: string; title: string; type: ProductionType; status: ProductionStatus; priority: ProductionPriority;
  objective?: string|null; context?: string|null; message?: string|null; references?: string|null;
  targetAudience?: string|null; platform?: string|null; format?: string|null; duration?: string|null;
  deliverables?: string|null; deadline?: string|null; scheduledDate?: string|null; completedAt?: string|null;
  publishedAt?: string|null; publishUrl?: string|null; requestedBy?: UserRef|null; assignedTo?: AssigneeRef[];
  requestedById?: string|null; notes?: string|null; tags?: string|null;
  createdAt: string; updatedAt: string;
  comments?: ProductionComment[]; links?: ProductionLink[];
  _count?: { comments: number; links: number };
}

/* ── Labels / Colors ── */
export const TYPE_LABELS: Record<ProductionType, string> = {
  VIDEO_REEL: "Video / Reel", VIDEO_TIKTOK: "TikTok", VIDEO_PROMO: "Video Promo",
  VIDEO_RECAP: "Video Recap", PHOTO_SESSION: "Sesión de Fotos", PHOTO_PRODUCT: "Foto Producto",
  PHOTO_STAFF: "Foto Personal", DESIGN_GRAPHIC: "Diseño Gráfico", OTHER: "Otro",
};
export const STATUS_LABELS: Record<ProductionStatus, string> = {
  IDEA: "Idea", BRIEFED: "Con Brief", SCHEDULED: "Agendado", IN_PRODUCTION: "En Producción",
  IN_EDITING: "En Edición", IN_REVIEW: "En Revisión", APPROVED: "Aprobado", PUBLISHED: "Publicado", CANCELLED: "Cancelado",
};
export const PRIORITY_LABELS: Record<ProductionPriority, string> = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", URGENT: "Urgente" };
export const PRIORITY_COLORS: Record<ProductionPriority, string> = {
  LOW: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};
const STATUS_COLORS: Record<ProductionStatus, string> = {
  IDEA: "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700",
  BRIEFED: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
  SCHEDULED: "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800",
  IN_PRODUCTION: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  IN_EDITING: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  IN_REVIEW: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  APPROVED: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  PUBLISHED: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
  CANCELLED: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
};

const KANBAN_COLUMNS: ProductionStatus[] = ["IDEA","BRIEFED","SCHEDULED","IN_PRODUCTION","IN_EDITING","IN_REVIEW","APPROVED","PUBLISHED"];

/* ── Main Component ── */
export function ProduccionesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams?.get("view") || "board";

  const [productions, setProductions] = useState<Production[]>([]);
  const [persons, setPersons] = useState<PersonRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/producciones");
      const json = await res.json();
      if (json.ok) setProductions(json.productions);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadPersons = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/producciones/persons");
      const json = await res.json();
      if (json.ok) setPersons(json.persons);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); loadPersons(); }, [load, loadPersons]);

  const updateStatus = async (id: string, status: ProductionStatus) => {
    await fetch(`/api/admin/producciones/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta producción?")) return;
    await fetch(`/api/admin/producciones/${id}`, { method: "DELETE" });
    setSelectedId(null);
    await load();
  };

  const filtered = productions.filter(p => {
    if (filterType && p.type !== filterType) return false;
    if (filterPriority && p.priority !== filterPriority) return false;
    return true;
  });

  if (selectedId) {
    return (
      <ProductionDetail
        productionId={selectedId}
        persons={persons}
        onBack={() => { setSelectedId(null); load(); }}
        onDelete={handleDelete}
      />
    );
  }

  if (showForm) {
    return (
      <ProductionForm
        persons={persons}
        editingId={editingId}
        onClose={() => { setShowForm(false); setEditingId(null); }}
        onSaved={() => { setShowForm(false); setEditingId(null); load(); }}
      />
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Producción Multimedia</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {productions.length} produccion{productions.length !== 1 ? "es" : ""} registrada{productions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => { setEditingId(null); setShowForm(true); }}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors text-sm"
          >
            + Nueva Producción
          </button>
        </div>

        {/* Filters & View Toggle */}
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
            <option value="">Todos los tipos</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
            <option value="">Todas las prioridades</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="ml-auto flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <button onClick={() => router.push("?view=board")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${view === "board" ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
              Tablero
            </button>
            <button onClick={() => router.push("?view=list")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${view === "list" ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
              Lista
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : view === "board" ? (
        <KanbanBoard productions={filtered} onSelect={setSelectedId} onStatusChange={updateStatus} />
      ) : (
        <ListView productions={filtered} onSelect={setSelectedId} onEdit={id => { setEditingId(id); setShowForm(true); }} />
      )}
    </div>
  );
}

/* ── Kanban Board ── */
function KanbanBoard({ productions, onSelect, onStatusChange }: {
  productions: Production[]; onSelect: (id: string) => void; onStatusChange: (id: string, s: ProductionStatus) => void;
}) {
  const [dragOverCol, setDragOverCol] = useState<ProductionStatus | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {KANBAN_COLUMNS.map(status => {
        const items = productions.filter(p => p.status === status);
        return (
          <div key={status}
            className={`flex-shrink-0 w-64 rounded-xl border-2 transition-colors ${STATUS_COLORS[status]} ${dragOverCol === status ? "ring-2 ring-indigo-400" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragOverCol(status); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={e => { e.preventDefault(); setDragOverCol(null); const id = e.dataTransfer.getData("text/plain"); if (id) onStatusChange(id, status); }}
          >
            <div className="px-3 py-2 border-b border-inherit">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">{STATUS_LABELS[status]}</span>
                <span className="text-xs bg-white dark:bg-gray-700 rounded-full px-2 py-0.5 font-medium">{items.length}</span>
              </div>
            </div>
            <div className="p-2 space-y-2 min-h-[60px]">
              {items.map(p => (
                <div key={p.id} draggable
                  onDragStart={e => e.dataTransfer.setData("text/plain", p.id)}
                  onClick={() => onSelect(p.id)}
                  className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{p.title}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded px-1.5 py-0.5">{TYPE_LABELS[p.type]}</span>
                    <span className={`text-[10px] rounded px-1.5 py-0.5 ${PRIORITY_COLORS[p.priority]}`}>{PRIORITY_LABELS[p.priority]}</span>
                  </div>
                  {p.assignedTo && p.assignedTo.length > 0 && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 truncate">→ {p.assignedTo.map(a => a.person?.name).join(", ")}</p>
                  )}
                  {p.deadline && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      Límite: {new Date(p.deadline).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                    </p>
                  )}
                  {(p._count?.comments || p._count?.links) ? (
                    <div className="flex gap-2 mt-1.5 text-[10px] text-gray-400">
                      {p._count?.comments ? <span>💬 {p._count.comments}</span> : null}
                      {p._count?.links ? <span>🔗 {p._count.links}</span> : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── List View ── */
function ListView({ productions, onSelect, onEdit }: {
  productions: Production[]; onSelect: (id: string) => void; onEdit: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Título</th>
            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Tipo</th>
            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Estado</th>
            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Prioridad</th>
            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Asignado</th>
            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Límite</th>
            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productions.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay producciones registradas</td></tr>
          )}
          {productions.map(p => (
            <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td className="px-4 py-3">
                <button onClick={() => onSelect(p.id)} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline text-left">
                  {p.title}
                </button>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{TYPE_LABELS[p.type]}</td>
              <td className="px-4 py-3"><span className="text-xs bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1">{STATUS_LABELS[p.status]}</span></td>
              <td className="px-4 py-3"><span className={`text-xs rounded-full px-2 py-1 ${PRIORITY_COLORS[p.priority]}`}>{PRIORITY_LABELS[p.priority]}</span></td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.assignedTo?.length ? p.assignedTo.map(a => a.person?.name).join(", ") : "—"}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                {p.deadline ? new Date(p.deadline).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              </td>
              <td className="px-4 py-3">
                <button onClick={() => onEdit(p.id)} className="text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 mr-2">Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
