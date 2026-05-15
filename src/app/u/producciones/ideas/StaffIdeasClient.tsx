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
  TIKTOK: "🎵", INSTAGRAM: "📸", FACEBOOK: "👥", YOUTUBE: "▶️", WEB: "🌐", OTHER: "💡",
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

function userName(u: IdeaAuthor) { return u.person?.name || u.username; }
function countReaction(reactions: IdeaReaction[], type: IdeaReactionType) {
  return reactions.filter(r => r.type === type).length;
}
function myReaction(reactions: IdeaReaction[], userId: string) {
  return reactions.find(r => r.userId === userId)?.type ?? null;
}

// ── Main Component ─────────────────────────────────────────────────────────

interface Props { userId: string; userRole: string }

export function StaffIdeasClient({ userId, userRole: _userRole }: Props) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | "ALL">("ALL");
  const [selected, setSelected] = useState<Idea | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/producciones/ideas${qs}`);
      const json = await res.json();
      if (json.ok) setIdeas(json.ideas);
      else setError("Error al cargar ideas");
    } catch { setError("Error de conexión"); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleReaction = async (ideaId: string, type: IdeaReactionType) => {
    await fetch(`/api/admin/producciones/ideas/${ideaId}/reactions`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type }),
    });
    await load();
    if (selected?.id === ideaId) {
      const res = await fetch(`/api/admin/producciones/ideas/${ideaId}`);
      const json = await res.json();
      if (json.ok) setSelected(json.idea);
    }
  };

  if (showForm) {
    return (
      <IdeaForm
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); }}
      />
    );
  }

  if (selected) {
    return (
      <IdeaDetail
        idea={selected}
        userId={userId}
        onBack={() => setSelected(null)}
        onReact={toggleReaction}
        onRefresh={async () => {
          const res = await fetch(`/api/admin/producciones/ideas/${selected.id}`);
          const json = await res.json();
          if (json.ok) setSelected(json.idea);
          load();
        }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Ideas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{ideas.length} idea{ideas.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
          + Nueva idea
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        {(["ALL", "PENDING", "APPROVED", "REJECTED", "CONVERTED"] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              statusFilter === s ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}>
            {s === "ALL" ? "Todas" : STATUS_LABELS[s as IdeaStatus]}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">💡</p>
          <p className="text-lg font-medium">No hay ideas</p>
          <p className="text-sm mt-1">¡Sé el primero en proponer una!</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ideas.map(idea => (
            <IdeaCard key={idea.id} idea={idea} userId={userId}
              onSelect={() => setSelected(idea)}
              onReact={toggleReaction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── IdeaCard ───────────────────────────────────────────────────────────────

function IdeaCard({ idea, userId, onSelect, onReact }: {
  idea: Idea; userId: string; onSelect: () => void;
  onReact: (id: string, type: IdeaReactionType) => void;
}) {
  const mine = myReaction(idea.reactions, userId);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3">
      <button onClick={onSelect} className="text-left">
        <div className="flex items-start gap-2 flex-wrap mb-1">
          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${SOURCE_COLORS[idea.sourceType]}`}>
            {SOURCE_ICONS[idea.sourceType]} {SOURCE_LABELS[idea.sourceType]}
          </span>
          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[idea.status]}`}>
            {STATUS_LABELS[idea.status]}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{idea.title}</h3>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Por <span className="font-medium text-gray-600 dark:text-gray-400">{userName(idea.submittedBy)}</span> · {new Date(idea.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}</p>
        {idea.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{idea.description}</p>
        )}
      </button>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["FIRE", "LIKE", "MEH"] as IdeaReactionType[]).map(type => (
            <button key={type} onClick={() => onReact(idea.id, type)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition ${
                mine === type ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}>
              {REACTION_EMOJIS[type]} {countReaction(idea.reactions, type) || ""}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">{idea.comments.length} 💬</span>
      </div>
    </div>
  );
}

// ── IdeaDetail ─────────────────────────────────────────────────────────────

function IdeaDetail({ idea, userId, onBack, onReact, onRefresh }: {
  idea: Idea; userId: string; onBack: () => void;
  onReact: (id: string, type: IdeaReactionType) => void;
  onRefresh: () => void;
}) {
  const [comment, setComment] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const mine = myReaction(idea.reactions, userId);

  const addComment = async () => {
    if (!comment.trim()) return;
    setCommenting(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/admin/producciones/ideas/${idea.id}/comments`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: comment }),
      });
      const json = await res.json();
      if (json.ok) { setComment(""); onRefresh(); }
      else setCommentError(json.message || "Error al comentar");
    } catch { setCommentError("Error de conexión"); }
    setCommenting(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        ← Volver
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${SOURCE_COLORS[idea.sourceType]}`}>
            {SOURCE_ICONS[idea.sourceType]} {SOURCE_LABELS[idea.sourceType]}
          </span>
          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[idea.status]}`}>
            {STATUS_LABELS[idea.status]}
          </span>
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{idea.title}</h2>
        {idea.description && <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{idea.description}</p>}
        {idea.sourceUrl && (
          <a href={idea.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline mb-3">
            🔗 Ver fuente
          </a>
        )}
        <p className="text-xs text-gray-400">Por {userName(idea.submittedBy)} · {new Date(idea.createdAt).toLocaleDateString("es-PE")}</p>

        {idea.production && (
          <div className="mt-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-sm text-indigo-700 dark:text-indigo-300">
            ✓ Convertida en producción: <strong>{idea.production.title}</strong>
          </div>
        )}

        {/* Reactions */}
        <div className="flex gap-2 mt-4">
          {(["FIRE", "LIKE", "MEH"] as IdeaReactionType[]).map(type => (
            <button key={type} onClick={() => onReact(idea.id, type)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                mine === type ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-300" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}>
              {REACTION_EMOJIS[type]} {countReaction(idea.reactions, type) || ""}
            </button>
          ))}
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
          Comentarios ({idea.comments.length})
        </h3>
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
          {idea.comments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Sin comentarios aún</p>
          ) : (
            idea.comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {userName(c.author)[0].toUpperCase()}
                </div>
                <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{userName(c.author)}</p>
                  <p className="text-sm text-gray-800 dark:text-gray-100 mt-0.5">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input value={comment} onChange={e => setComment(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); }}}
            placeholder="Escribe un comentario..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100" />
          <button onClick={addComment} disabled={commenting || !comment.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {commenting ? "..." : "Enviar"}
          </button>
        </div>
        {commentError && <p className="text-xs text-red-500 mt-2">{commentError}</p>}
      </div>
    </div>
  );
}

// ── IdeaForm ───────────────────────────────────────────────────────────────

const SOURCE_OPTIONS: IdeaSource[] = ["INSTAGRAM", "TIKTOK", "FACEBOOK", "YOUTUBE", "WEB", "OTHER"];

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
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null, sourceType, sourceUrl: sourceUrl.trim() || null }),
      });
      const json = await res.json();
      if (json.ok) onSaved();
      else setError(json.message || "Error al guardar");
    } catch { setError("Error de conexión"); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={onClose} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700">
        ← Volver
      </button>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Nueva Idea</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Describe brevemente la idea..."
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Cuéntanos más sobre esta idea..."
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fuente</label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_OPTIONS.map(s => (
                  <button key={s} type="button" onClick={() => setSourceType(s)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      sourceType === s ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                    }`}>
                    {SOURCE_ICONS[s]} {SOURCE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL de referencia</label>
              <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} type="url"
                placeholder="https://..."
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
              {loading ? "Enviando..." : "Enviar Idea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
