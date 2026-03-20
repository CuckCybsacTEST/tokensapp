"use client";

import { useEffect, useState } from "react";
import type { PersonRef, Production, ProductionType, ProductionPriority, ProductionStatus } from "./ProduccionesClient";
import { TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "./ProduccionesClient";

interface Props {
  persons: PersonRef[];
  editingId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook", "Web", "WhatsApp"];

export function ProductionForm({ persons, editingId, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!editingId);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<ProductionType>("VIDEO_REEL");
  const [priority, setPriority] = useState<ProductionPriority>("MEDIUM");
  const [status, setStatus] = useState<ProductionStatus>("IDEA");
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
  const [publishUrl, setPublishUrl] = useState("");

  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/producciones/${editingId}`);
        const json = await res.json();
        if (json.ok && json.production) {
          const p: Production = json.production;
          setTitle(p.title); setType(p.type); setPriority(p.priority); setStatus(p.status);
          setObjective(p.objective || ""); setContext(p.context || ""); setMessage(p.message || "");
          setReferences(p.references || ""); setTargetAudience(p.targetAudience || "");
          setPlatform(p.platform || ""); setFormat(p.format || ""); setDuration(p.duration || "");
          setDeliverables(p.deliverables || ""); setNotes(p.notes || ""); setTags(p.tags || "");
          setPublishUrl(p.publishUrl || "");
          setDeadline(p.deadline ? p.deadline.slice(0, 10) : "");
          setScheduledDate(p.scheduledDate ? p.scheduledDate.slice(0, 10) : "");
          setAssignedToIds(p.assignedTo?.map(a => a.person.id) || []);
        }
      } catch { /* ignore */ }
      setLoadingData(false);
    })();
  }, [editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert("El título es obligatorio");
    setLoading(true);

    const body = {
      title: title.trim(), type, priority, status, objective, context, message, references,
      targetAudience, platform, format, duration, deliverables,
      deadline: deadline || null, scheduledDate: scheduledDate || null,
      assignedToIds, notes, tags, publishUrl,
    };

    try {
      const url = editingId ? `/api/admin/producciones/${editingId}` : "/api/admin/producciones";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.ok) { onSaved(); } else { alert(json.message || "Error al guardar"); }
    } catch { alert("Error de red"); }
    setLoading(false);
  };

  if (loadingData) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ← Volver
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {editingId ? "Editar Producción" : "Nueva Producción"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Información básica</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
              placeholder="Ej: Reel ambiente viernes noche" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
              <select value={type} onChange={e => setType(e.target.value as ProductionType)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridad</label>
              <select value={priority} onChange={e => setPriority(e.target.value as ProductionPriority)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100">
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value as ProductionStatus)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Brief Creativo */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Brief Creativo</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objetivo</label>
            <textarea value={objective} onChange={e => setObjective(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
              placeholder="¿Qué queremos lograr con esta producción?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contexto</label>
            <textarea value={context} onChange={e => setContext(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
              placeholder="Background, situación actual, por qué necesitamos esto" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensaje a comunicar</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
              placeholder="¿Qué queremos que el público entienda/sienta?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Público objetivo</label>
            <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
              placeholder="Ej: Jóvenes 18-30, clientes actuales, followers Instagram" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Referencias / Inspiración</label>
            <textarea value={references} onChange={e => setReferences(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
              placeholder="Links de referencia, videos similares, mood boards..." />
          </div>
        </section>

        {/* Formato y Specs */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Formato y Especificaciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plataforma(s)</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(pl => {
                  const selected = platform.split(",").map(s => s.trim()).filter(Boolean).includes(pl);
                  return (
                    <button key={pl} type="button"
                      onClick={() => {
                        const current = platform.split(",").map(s => s.trim()).filter(Boolean);
                        setPlatform(selected ? current.filter(x => x !== pl).join(",") : [...current, pl].join(","));
                      }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${selected ? "bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300" : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400"}`}>
                      {pl}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Formato</label>
              <input value={format} onChange={e => setFormat(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
                placeholder="Ej: Vertical 9:16, Horizontal 16:9, Cuadrado" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duración</label>
              <input value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
                placeholder="Ej: 15s, 30s, 60s, 3min" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entregables esperados</label>
              <input value={deliverables} onChange={e => setDeliverables(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
                placeholder="Ej: 1 reel editado + 3 stories + fotos raw" />
            </div>
          </div>
        </section>

        {/* Fechas y Asignación */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Fechas y Asignación</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha límite</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de producción</label>
              <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asignar a (máx 3)</label>
              <select multiple value={assignedToIds} onChange={e => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                if (selected.length <= 3) setAssignedToIds(selected);
              }}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100" size={4}>
                {persons.map(p => (
                  <option key={p.id} value={p.id} disabled={assignedToIds.length >= 3 && !assignedToIds.includes(p.id)}>
                    {p.name}{p.area ? ` (${p.area})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Selecciona hasta 3 personas. Mantén Ctrl para múltiples.</p>
            </div>
          </div>
        </section>

        {/* Publicación & notas */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Publicación y Notas</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL de publicación</label>
            <input value={publishUrl} onChange={e => setPublishUrl(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
              placeholder="https://instagram.com/reel/..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
            <input value={tags} onChange={e => setTags(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
              placeholder="producto, menú, nuevo, evento (separados por coma)" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas internas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
              placeholder="Notas adicionales, observaciones..." />
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 text-sm transition">
            {loading ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear Producción"}
          </button>
        </div>
      </form>
    </div>
  );
}
