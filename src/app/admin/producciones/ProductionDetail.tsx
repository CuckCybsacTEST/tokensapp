"use client";

import { useEffect, useState } from "react";
import type { PersonRef, Production, ProductionComment, ProductionLink, ProductionStatus } from "./ProduccionesClient";
import { TYPE_LABELS, STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from "./ProduccionesClient";

const STATUS_FLOW: ProductionStatus[] = ["IDEA","BRIEFED","SCHEDULED","IN_PRODUCTION","IN_EDITING","IN_REVIEW","APPROVED","PUBLISHED"];

interface Props {
  productionId: string;
  persons: PersonRef[];
  onBack: () => void;
  onDelete: (id: string) => void;
}

export function ProductionDetail({ productionId, persons, onBack, onDelete }: Props) {
  const [production, setProduction] = useState<Production | null>(null);
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
      if (json.ok) setProduction(json.production);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [productionId]);

  const advanceStatus = async () => {
    if (!production) return;
    const idx = STATUS_FLOW.indexOf(production.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];
    await fetch(`/api/admin/producciones/${productionId}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
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

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );
  if (!production) return <div className="p-6 text-center text-gray-500">Producción no encontrada</div>;

  const currentIdx = STATUS_FLOW.indexOf(production.status);
  const canAdvance = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1;

  const LINK_TYPE_LABELS: Record<string, string> = { REFERENCE: "Referencia", DELIVERABLE: "Entregable", PUBLISHED: "Publicado" };
  const LINK_TYPE_COLORS: Record<string, string> = {
    REFERENCE: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    DELIVERABLE: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    PUBLISHED: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-lg">←</button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{production.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded px-2 py-0.5">{TYPE_LABELS[production.type]}</span>
              <span className={`text-xs rounded px-2 py-0.5 ${PRIORITY_COLORS[production.priority]}`}>{PRIORITY_LABELS[production.priority]}</span>
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded px-2 py-0.5 font-medium">{STATUS_LABELS[production.status]}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canAdvance && (
            <button onClick={advanceStatus}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
              Avanzar → {STATUS_LABELS[STATUS_FLOW[currentIdx + 1]]}
            </button>
          )}
          <button onClick={() => onDelete(production.id)}
            className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition">
            Eliminar
          </button>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STATUS_FLOW.map((s, i) => {
            const isCurrent = production.status === s;
            const isPast = currentIdx >= 0 && i < currentIdx;
            const isCancelled = production.status === "CANCELLED";
            return (
              <div key={s} className="flex items-center">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  isCancelled ? "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400" :
                  isCurrent ? "bg-indigo-600 text-white" :
                  isPast ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                  "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                }`}>
                  {isPast && !isCancelled && "✓ "}{STATUS_LABELS[s]}
                </div>
                {i < STATUS_FLOW.length - 1 && <div className={`w-4 h-0.5 mx-0.5 ${isPast ? "bg-green-300 dark:bg-green-700" : "bg-gray-200 dark:bg-gray-600"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brief */}
          {(production.objective || production.context || production.message || production.targetAudience || production.references) && (
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Brief Creativo</h2>
              {production.objective && <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Objetivo</p><p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{production.objective}</p></div>}
              {production.context && <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Contexto</p><p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{production.context}</p></div>}
              {production.message && <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Mensaje</p><p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{production.message}</p></div>}
              {production.targetAudience && <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Público objetivo</p><p className="text-sm text-gray-800 dark:text-gray-200">{production.targetAudience}</p></div>}
              {production.references && <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Referencias</p><p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{production.references}</p></div>}
            </section>
          )}

          {/* Links (Entregables) */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Links y Entregables</h2>
            {production.links && production.links.length > 0 ? (
              <div className="space-y-2 mb-4">
                {production.links.map((link: ProductionLink) => (
                  <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 group">
                    <span className={`text-[10px] rounded px-1.5 py-0.5 font-medium ${LINK_TYPE_COLORS[link.type] || "bg-gray-100 text-gray-600"}`}>
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
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">No hay links agregados aún</p>
            )}
            <div className="flex gap-2 flex-wrap items-end">
              <select value={linkType} onChange={e => setLinkType(e.target.value)}
                className="text-xs border rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200">
                <option value="REFERENCE">Referencia</option>
                <option value="DELIVERABLE">Entregable</option>
                <option value="PUBLISHED">Publicado</option>
              </select>
              <input value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="Nombre del link"
                className="text-sm border rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 flex-1 min-w-[120px]" />
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://drive.google.com/..."
                className="text-sm border rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 flex-1 min-w-[200px]" />
              <button onClick={addLink} disabled={sendingLink}
                className="px-3 py-1.5 rounded-lg bg-gray-800 dark:bg-gray-600 text-white text-sm hover:bg-gray-700 dark:hover:bg-gray-500 disabled:opacity-50 transition whitespace-nowrap">
                + Link
              </button>
            </div>
          </section>

          {/* Comentarios */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
              Comentarios {production.comments?.length ? `(${production.comments.length})` : ""}
            </h2>
            {production.comments && production.comments.length > 0 ? (
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {production.comments.map((c: ProductionComment) => (
                  <div key={c.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{c.author?.person?.name || c.author?.username}</span>
                      <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
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
              <button onClick={addComment} disabled={sendingComment || !comment.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50 transition">
                Enviar
              </button>
            </div>
          </section>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Detalles</h2>
            <InfoRow label="Solicitado por" value={production.requestedBy?.person?.name || production.requestedBy?.username || "—"} />
            <InfoRow label="Asignado a" value={production.assignedTo?.length ? production.assignedTo.map(a => a.person.name).join(", ") : "Sin asignar"} />
            {production.platform && <InfoRow label="Plataforma(s)" value={production.platform} />}
            {production.format && <InfoRow label="Formato" value={production.format} />}
            {production.duration && <InfoRow label="Duración" value={production.duration} />}
            {production.deliverables && <InfoRow label="Entregables" value={production.deliverables} />}
            <InfoRow label="Creado" value={new Date(production.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })} />
            {production.deadline && <InfoRow label="Fecha límite" value={new Date(production.deadline).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })} highlight />}
            {production.scheduledDate && <InfoRow label="Fecha producción" value={new Date(production.scheduledDate).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })} />}
            {production.completedAt && <InfoRow label="Completado" value={new Date(production.completedAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })} />}
            {production.publishedAt && <InfoRow label="Publicado" value={new Date(production.publishedAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })} />}
            {production.publishUrl && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">URL publicación</p>
                <a href={production.publishUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all">{production.publishUrl}</a>
              </div>
            )}
          </section>

          {production.tags && (
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {production.tags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                  <span key={t} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2.5 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {production.notes && (
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Notas</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{production.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-sm ${highlight ? "text-orange-600 dark:text-orange-400 font-medium" : "text-gray-800 dark:text-gray-200"}`}>{value}</p>
    </div>
  );
}
