"use client";

import { useCallback, useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type IdeaSource = "TIKTOK" | "INSTAGRAM" | "FACEBOOK" | "YOUTUBE" | "WEB" | "OTHER";
type IdeaStatus = "PENDING" | "APPROVED" | "REJECTED" | "CONVERTED";
type IdeaReactionType = "FIRE" | "LIKE" | "MEH";

interface IdeaAuthor { id: string; username: string; person?: { name: string } | null }
interface IdeaComment { id: string; content: string; createdAt: string; author: IdeaAuthor }
interface IdeaReaction { userId: string; type: IdeaReactionType }
interface Idea {
  id: string;
  title: string;
  description?: string | null;
  sourceType: IdeaSource;
  sourceUrl?: string | null;
  status: IdeaStatus;
  submittedBy: IdeaAuthor;
  reactions: IdeaReaction[];
  comments: IdeaComment[];
  production?: { id: string; title: string; status: string } | null;
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<IdeaSource, string> = {
  TIKTOK: "TikTok", INSTAGRAM: "Instagram", FACEBOOK: "Facebook",
  YOUTUBE: "YouTube", WEB: "Web", OTHER: "Otro",
};
const SOURCE_ICONS: Record<IdeaSource, string> = {
  TIKTOK: "🎵", INSTAGRAM: "📸", FACEBOOK: "👥",
  YOUTUBE: "▶️", WEB: "🌐", OTHER: "💡",
};
const SOURCE_COLORS: Record<IdeaSource, string> = {
  TIKTOK: "bg-black text-white",
  INSTAGRAM: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
  FACEBOOK: "bg-blue-600 text-white",
  YOUTUBE: "bg-red-600 text-white",
  WEB: "bg-slate-600 text-white",
  OTHER: "bg-gray-500 text-white",
};
const STATUS_LABELS: Record<IdeaStatus, string> = {
  PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Descartada", CONVERTED: "Convertida",
};
const STATUS_COLORS: Record<IdeaStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
  CONVERTED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
};
const REACTION_EMOJIS: Record<IdeaReactionType, string> = { FIRE: "🔥", LIKE: "👍", MEH: "😑" };

// ── Helpers ────────────────────────────────────────────────────────────────

function userName(u: IdeaAuthor) { return u.person?.name || u.username; }
function countReaction(reactions: IdeaReaction[], type: IdeaReactionType) {
  return reactions.filter(r => r.type === type).length;
}

// ── Main Component ─────────────────────────────────────────────────────────

interface Props { userId: string; userRole: string }

export function IdeasClient({ userId, userRole }: Props) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<IdeaStatus | "">("");
  const [filterSource, setFilterSource] = useState<IdeaSource | "">("");
  const [showForm, setShowForm] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  const isCoordPlus = userRole === "ADMIN" || userRole === "COORDINATOR";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterSource) params.set("sourceType", filterSource);
      const res = await fetch(`/api/admin/producciones/ideas?${params}`);
      const json = await res.json();
      if (json.ok) setIdeas(json.ideas);
      else setError(json.message || "Error al cargar");
    } catch {
      setError("Error de conexión");
    }
    setLoading(false);
  }, [filterStatus, filterSource]);

  useEffect(() => { load(); }, [load]);

  const react = async (ideaId: string, type: IdeaReactionType) => {
    await fetch(`/api/admin/producciones/ideas/${ideaId}/reactions`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ type }),
    });
    await load();
  };

  const changeStatus = async (ideaId: string, status: IdeaStatus) => {
    await fetch(`/api/admin/producciones/ideas/${ideaId}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const convert = async (idea: Idea) => {
    const res = await fetch(`/api/admin/producciones/ideas/${idea.id}/convert`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "OTHER" }),
    });
    const json = await res.json();
    if (json.ok) {
      await load();
      // Redirigir a la producción creada
      window.location.href = `/admin/producciones?id=${json.production.id}`;
    }
  };

  const deleteIdea = async (ideaId: string) => {
    if (!window.confirm("¿Eliminar esta idea definitivamente?")) return;
    await fetch(`/api/admin/producciones/ideas/${ideaId}`, { method: "DELETE" });
    if (selectedIdea?.id === ideaId) setSelectedIdea(null);
    await load();
  };

  const filteredCount = ideas.length;

  if (selectedIdea) {
    return (
      <IdeaDetail
        idea={selectedIdea}
        userId={userId}
        isCoordPlus={isCoordPlus}
        isAdmin={userRole === "ADMIN"}
        onBack={() => { setSelectedIdea(null); load(); }}
        onReact={react}
        onChangeStatus={changeStatus}
        onConvert={convert}
        onDelete={deleteIdea}
        onRefresh={load}
      />
    );
  }

  if (showForm) {
    return (
      <IdeaForm
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); }}
      />
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ideas Multimedia</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filteredCount} idea{filteredCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors text-sm"
          >
            + Nueva Idea
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
            <option value="">Todos los estados</option>
            {(Object.entries(STATUS_LABELS) as [IdeaStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value as any)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
            <option value="">Todas las fuentes</option>
            {(Object.entries(SOURCE_LABELS) as [IdeaSource, string][]).map(([k, v]) => (
              <option key={k} value={k}>{SOURCE_ICONS[k]} {v}</option>
            ))}
          </select>
          {(filterStatus || filterSource) && (
            <button onClick={() => { setFilterStatus(""); setFilterSource(""); }}
              className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 px-2 py-1.5">
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex justify-between">
          <span>{error}</span>
          <button onClick={load} className="ml-4 underline">Reintentar</button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">💡</p>
          <p className="text-lg font-medium">No hay ideas todavía</p>
          <p className="text-sm mt-1">¡Sé el primero en proponer una!</p>
        </div>
      ) : (
        /* Grid de cards */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ideas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              userId={userId}
              isCoordPlus={isCoordPlus}
              isAdmin={userRole === "ADMIN"}
              onSelect={() => setSelectedIdea(idea)}
              onReact={react}
              onChangeStatus={changeStatus}
              onConvert={convert}
              onDelete={deleteIdea}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Idea Card ──────────────────────────────────────────────────────────────

function IdeaCard({ idea, userId, isCoordPlus, isAdmin, onSelect, onReact, onChangeStatus, onConvert, onDelete }: {
  idea: Idea; userId: string; isCoordPlus: boolean; isAdmin: boolean;
  onSelect: () => void;
  onReact: (id: string, t: IdeaReactionType) => void;
  onChangeStatus: (id: string, s: IdeaStatus) => void;
  onConvert: (idea: Idea) => void;
  onDelete: (id: string) => void;
}) {
  const myReaction = idea.reactions.find(r => r.userId === userId)?.type;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Top */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SOURCE_COLORS[idea.sourceType]}`}>
            {SOURCE_ICONS[idea.sourceType]} {SOURCE_LABELS[idea.sourceType]}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[idea.status]}`}>
            {STATUS_LABELS[idea.status]}
          </span>
        </div>
      </div>

      {/* Title + description */}
      <button onClick={onSelect} className="text-left">
        <h3 className="font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors leading-snug">
          {idea.title}
        </h3>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Por <span className="font-medium text-gray-600 dark:text-gray-400">{userName(idea.submittedBy)}</span> · {new Date(idea.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}</p>
        {idea.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{idea.description}</p>
        )}
        {idea.sourceUrl && (
          <a href={idea.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:underline mt-1 block truncate"
            onClick={e => e.stopPropagation()}>
            🔗 {idea.sourceUrl}
          </a>
        )}
      </button>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
        {/* Reactions */}
        <div className="flex gap-1">
          {(["FIRE", "LIKE", "MEH"] as IdeaReactionType[]).map(type => {
            const count = countReaction(idea.reactions, type);
            const ismine = myReaction === type;
            return (
              <button key={type} onClick={() => onReact(idea.id, type)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-xs transition ${
                  ismine ? "bg-indigo-100 dark:bg-indigo-900/40 ring-1 ring-indigo-400" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}>
                {REACTION_EMOJIS[type]}{count > 0 && <span className="font-medium">{count}</span>}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-gray-400">{idea.comments.length} 💬</span>
      </div>

      {/* Admin actions */}
      {(isCoordPlus || isAdmin) && idea.status !== "CONVERTED" && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-100 dark:border-gray-700">
          {idea.status === "PENDING" && (
            <>
              <button onClick={() => onChangeStatus(idea.id, "APPROVED")}
                className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 transition">
                ✓ Aprobar
              </button>
              <button onClick={() => onChangeStatus(idea.id, "REJECTED")}
                className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 transition">
                ✗ Descartar
              </button>
            </>
          )}
          {idea.status === "APPROVED" && (
            <button onClick={() => onConvert(idea)}
              className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-200 transition">
              → Convertir a Producción
            </button>
          )}
          {idea.status === "REJECTED" && (
            <button onClick={() => onChangeStatus(idea.id, "PENDING")}
              className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 transition">
              ↩ Recuperar
            </button>
          )}
          {isAdmin && (
            <button onClick={() => onDelete(idea.id)}
              className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:bg-gray-700 dark:text-gray-500 transition ml-auto">
              🗑
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Idea Detail ────────────────────────────────────────────────────────────

function IdeaDetail({ idea, userId, isCoordPlus, isAdmin, onBack, onReact, onChangeStatus, onConvert, onDelete, onRefresh }: {
  idea: Idea; userId: string; isCoordPlus: boolean; isAdmin: boolean;
  onBack: () => void;
  onReact: (id: string, t: IdeaReactionType) => void;
  onChangeStatus: (id: string, s: IdeaStatus) => void;
  onConvert: (idea: Idea) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const myReaction = idea.reactions.find(r => r.userId === userId)?.type;

  const addComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    await fetch(`/api/admin/producciones/ideas/${idea.id}/comments`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: comment.trim() }),
    });
    setComment("");
    setSending(false);
    onRefresh();
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-lg">←</button>
        <div className="flex-1">
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SOURCE_COLORS[idea.sourceType]}`}>
              {SOURCE_ICONS[idea.sourceType]} {SOURCE_LABELS[idea.sourceType]}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[idea.status]}`}>
              {STATUS_LABELS[idea.status]}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{idea.title}</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Por {userName(idea.submittedBy)} · {new Date(idea.createdAt).toLocaleString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Descripción */}
        {idea.description && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Descripción</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{idea.description}</p>
          </div>
        )}

        {/* Fuente */}
        {idea.sourceUrl && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Referencia</h2>
            <a href={idea.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all">
              {idea.sourceUrl}
            </a>
          </div>
        )}

        {/* Producción vinculada */}
        {idea.production && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4">
            <h2 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Convertida a producción</h2>
            <a href={`/admin/producciones`} className="text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:underline">
              {idea.production.title}
            </a>
          </div>
        )}

        {/* Reacciones */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Reacciones</h2>
          <div className="flex gap-3">
            {(["FIRE", "LIKE", "MEH"] as IdeaReactionType[]).map(type => {
              const count = countReaction(idea.reactions, type);
              const ismine = myReaction === type;
              return (
                <button key={type} onClick={() => onReact(idea.id, type)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                    ismine ? "bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-400 text-indigo-700 dark:text-indigo-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}>
                  <span className="text-xl">{REACTION_EMOJIS[type]}</span>
                  <span>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Acciones de estado (coordinadores+) */}
        {isCoordPlus && idea.status !== "CONVERTED" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Acciones</h2>
            <div className="flex flex-wrap gap-2">
              {idea.status === "PENDING" && (
                <>
                  <button onClick={() => onChangeStatus(idea.id, "APPROVED")}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
                    ✓ Aprobar idea
                  </button>
                  <button onClick={() => onChangeStatus(idea.id, "REJECTED")}
                    className="px-4 py-2 rounded-lg border border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                    ✗ Descartar
                  </button>
                </>
              )}
              {idea.status === "APPROVED" && (
                <button onClick={() => onConvert(idea)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
                  → Convertir a Producción
                </button>
              )}
              {idea.status === "REJECTED" && (
                <button onClick={() => onChangeStatus(idea.id, "PENDING")}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  ↩ Recuperar como pendiente
                </button>
              )}
              {isAdmin && (
                <button onClick={() => { onDelete(idea.id); onBack(); }}
                  className="ml-auto px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                  🗑 Eliminar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Comentarios */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Comentarios {idea.comments.length > 0 ? `(${idea.comments.length})` : ""}
          </h2>
          {idea.comments.length > 0 ? (
            <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
              {idea.comments.map(c => (
                <div key={c.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{userName(c.author)}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(c.createdAt).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Sin comentarios aún</p>
          )}
          <div className="flex gap-2">
            <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Escribe un comentario..."
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
              className="flex-1 text-sm border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100" />
            <button onClick={addComment} disabled={sending || !comment.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50 transition">
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Idea Form (nueva idea) ─────────────────────────────────────────────────

function IdeaForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState<IdeaSource>("INSTAGRAM");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/producciones/ideas", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), description: description.trim() || null,
          sourceType, sourceUrl: sourceUrl.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.ok) onSaved();
      else setError(json.message || "Error al crear");
    } catch { setError("Error de conexión"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">← Volver</button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Idea</h1>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título de la idea *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Ej: Reel de detrás de cámaras tipo TikTok casero"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción (opcional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="¿De qué trata? ¿Cómo podría aplicarse a nosotros?"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 resize-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">¿De dónde viene la idea? *</label>
              <select value={sourceType} onChange={e => setSourceType(e.target.value as IdeaSource)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200">
                {(Object.entries(SOURCE_LABELS) as [IdeaSource, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{SOURCE_ICONS[k]} {v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link de referencia (opcional)</label>
              <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} type="url"
                placeholder="https://www.tiktok.com/..."
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100" />
            </div>
          </div>
        </div>

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
            {loading ? "Enviando..." : "Enviar Idea"}
          </button>
        </div>
      </form>
    </div>
  );
}
