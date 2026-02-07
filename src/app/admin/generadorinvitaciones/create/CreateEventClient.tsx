"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export function CreateEventClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("20:00");
  const [location, setLocation] = useState("");
  const [maxGuests, setMaxGuests] = useState("");
  const [templateUrl, setTemplateUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUploadTemplate(file: File) {
    setUploading(true); setErr(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/invitations/upload-template", {
        method: "POST",
        body: formData,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.code || "Error subiendo plantilla");

      setTemplateUrl(j.url);
      setTemplatePreview(URL.createObjectURL(file));
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUploadTemplate(file);
  }

  async function handleCreate() {
    setCreating(true); setErr(null);
    try {
      if (!name.trim()) throw new Error('El nombre del evento es obligatorio');
      if (!date) throw new Error('La fecha es obligatoria');

      const payload: any = {
        name: name.trim(),
        date,
        timeSlot,
      };
      if (description.trim()) payload.description = description.trim();
      if (location.trim()) payload.location = location.trim();
      if (maxGuests && parseInt(maxGuests)) payload.maxGuests = parseInt(maxGuests);
      if (templateUrl.trim()) payload.templateUrl = templateUrl.trim();

      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.code || `Error ${res.status}`);

      router.push(`/admin/generadorinvitaciones/${j.event.id}`);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <a href="/admin/generadorinvitaciones" className="text-blue-600 hover:underline text-sm">← Volver</a>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Crear Evento Especial</h1>
        </div>

        {err && <div className="border border-red-700 bg-red-950/30 text-red-200 rounded p-3 text-sm">{err}</div>}

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-800 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Nombre del Evento *
            </label>
            <input
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Apertura Box VIP, Re-apertura Nivel 3..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Descripción
            </label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
              placeholder="Detalle del evento (opcional)"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                Fecha *
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                Hora de llegada *
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
              >
                <option value="18:00">18:00</option>
                <option value="19:00">19:00</option>
                <option value="20:00">20:00</option>
                <option value="21:00">21:00</option>
                <option value="22:00">22:00</option>
                <option value="23:00">23:00</option>
                <option value="00:00">00:00</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                Ubicación
              </label>
              <input
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Box 3, Nivel 3, Terraza..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                Máximo de invitados
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                placeholder="Sin límite"
                value={maxGuests}
                onChange={(e) => setMaxGuests(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Plantilla de tarjeta (imagen 1080×1920)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {templatePreview || templateUrl ? (
              <div className="flex items-start gap-4">
                <img
                  src={templatePreview || templateUrl}
                  alt="Plantilla"
                  className="w-20 h-36 object-cover rounded border border-slate-300 dark:border-slate-600"
                />
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">✅ Plantilla subida</p>
                  <p className="text-[10px] text-slate-400 break-all">{templateUrl}</p>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    Cambiar imagen
                  </button>
                  <button
                    type="button"
                    className="text-sm text-rose-500 hover:underline ml-3"
                    onClick={() => { setTemplateUrl(""); setTemplatePreview(null); }}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/5 transition-colors disabled:opacity-50"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <div className="space-y-2">
                    <div className="animate-spin text-2xl">⏳</div>
                    <p className="text-sm text-blue-500 font-medium">Subiendo y optimizando...</p>
                    <p className="text-xs text-slate-400">Se redimensiona a 1080×1920 automáticamente</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-3xl">🎨</div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Subir plantilla de tarjeta</p>
                    <p className="text-xs text-slate-400">PNG, JPG o WebP · Máx 10MB · Se optimiza a 1080×1920</p>
                  </div>
                )}
              </button>
            )}

            <p className="text-xs text-slate-500 mt-1">
              El QR se imprimirá en la zona central (460×460px). Si no se sube plantilla, se usará fondo oscuro por defecto. Se puede cambiar después.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              disabled={creating}
              onClick={handleCreate}
            >
              {creating ? 'Creando...' : 'Crear Evento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
