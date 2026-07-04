"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as QRCode from "qrcode";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

type Referrer = {
  id: string;
  name: string;
  slug: string;
  code: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  dni: string | null;
  commissionAmount: number;
  approvalStatus: ApprovalStatus;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    reservations: number;
  };
};

type ReferrerFormData = {
  name: string;
  slug: string;
  email: string;
  phone: string;
};

type SystemConfigState = {
  birthdayReferrerCommissionAmount: number;
};

const emptyForm: ReferrerFormData = {
  name: "",
  slug: "",
  email: "",
  phone: "",
};

function approvalTone(status: ApprovalStatus) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
  if (status === "REJECTED") return "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200";
  return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
}

function approvalLabel(status: ApprovalStatus) {
  if (status === "APPROVED") return "Aprobado";
  if (status === "REJECTED") return "Rechazado";
  return "Pendiente";
}

export default function AdminReferrersPage() {
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [config, setConfig] = useState<SystemConfigState>({ birthdayReferrerCommissionAmount: 10 });
  const [formData, setFormData] = useState<ReferrerFormData>(emptyForm);
  const [qrModal, setQrModal] = useState<{ open: boolean; slug: string; name: string } | null>(null);

  const pendingCount = useMemo(() => referrers.filter((item) => item.approvalStatus === "PENDING").length, [referrers]);
  const approvedCount = useMemo(() => referrers.filter((item) => item.approvalStatus === "APPROVED").length, [referrers]);
  const activeCount = useMemo(() => referrers.filter((item) => item.active).length, [referrers]);

  useEffect(() => {
    void Promise.all([loadReferrers(), loadConfig()]).finally(() => setLoading(false));
  }, []);

  async function loadReferrers() {
    try {
      const res = await fetch("/api/admin/birthdays/referrers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error loading referrers");
      setReferrers(data.referrers || []);
    } catch (err: any) {
      setError(err.message || "Error loading referrers");
    }
  }

  async function loadConfig() {
    try {
      const res = await fetch("/api/admin/system/config");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error loading config");
      setConfig({ birthdayReferrerCommissionAmount: Number(data.config?.birthdayReferrerCommissionAmount || 10) });
    } catch (err: any) {
      setError(err.message || "Error loading config");
    }
  }

  function generateLink(slug: string) {
    return `${process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "")}/reservatucumple/${slug}`;
  }

  async function handleSaveConfig() {
    setSavingConfig(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthdayReferrerCommissionAmount: config.birthdayReferrerCommissionAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error saving config");
      setConfig({ birthdayReferrerCommissionAmount: Number(data.config?.birthdayReferrerCommissionAmount || 10) });
      await loadReferrers();
    } catch (err: any) {
      setError(err.message || "Error saving config");
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = editingId ? `/api/admin/birthdays/referrers/${editingId}` : "/api/admin/birthdays/referrers";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, commissionAmount: config.birthdayReferrerCommissionAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error saving referrer");
      await loadReferrers();
      setShowCreateForm(false);
      setEditingId(null);
      setFormData(emptyForm);
    } catch (err: any) {
      setError(err.message || "Error saving referrer");
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(referrer: Referrer) {
    setEditingId(referrer.id);
    setFormData({
      name: referrer.name,
      slug: referrer.slug,
      email: referrer.email || "",
      phone: referrer.phone || referrer.whatsapp || "",
    });
    setShowCreateForm(true);
  }

  async function handleApproval(id: string, approvalStatus: ApprovalStatus) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/birthdays/referrers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error updating approval");
      await loadReferrers();
    } catch (err: any) {
      setError(err.message || "Error updating approval");
    }
  }

  async function handleToggleActive(referrer: Referrer) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/birthdays/referrers/${referrer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !referrer.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error updating referrer");
      await loadReferrers();
    } catch (err: any) {
      setError(err.message || "Error updating referrer");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de que quieres eliminar este referrer?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/birthdays/referrers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error deleting referrer");
      await loadReferrers();
    } catch (err: any) {
      setError(err.message || "Error deleting referrer");
    }
  }

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <QRModal open={!!qrModal?.open} slug={qrModal?.slug || ""} name={qrModal?.name || ""} onClose={() => setQrModal(null)} />

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Referrers</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Aprueba registros públicos, activa links y controla la comisión global del programa.</p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setEditingId(null);
            setFormData(emptyForm);
          }}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
        >
          Nuevo Referrer
        </button>
      </div>

      {error ? <div className="mb-4 rounded-lg border border-red-400 bg-red-100 p-4 text-red-700 dark:border-red-700 dark:bg-red-900 dark:text-red-300">{error}</div> : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Pendientes" value={pendingCount} tone="amber" />
          <StatCard label="Aprobados" value={approvedCount} tone="green" />
          <StatCard label="Activos" value={activeCount} tone="blue" />
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Comisión global</div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Se muestra en el registro público y se asigna a nuevos referrers.</p>
          <div className="mt-3 flex gap-3">
            <input
              type="number"
              step="0.01"
              min="0"
              value={config.birthdayReferrerCommissionAmount}
              onChange={(e) => setConfig({ birthdayReferrerCommissionAmount: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border p-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button onClick={handleSaveConfig} disabled={savingConfig} className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
              {savingConfig ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>

      {showCreateForm ? (
        <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{editingId ? "Editar Referrer" : "Crear Nuevo Referrer"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input value={formData.name} onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))} placeholder="Nombre" className="rounded-lg border p-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" required />
              <input value={formData.slug} onChange={(e) => setFormData((current) => ({ ...current, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="Slug" className="rounded-lg border p-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" required />
              <input type="email" value={formData.email} onChange={(e) => setFormData((current) => ({ ...current, email: e.target.value }))} placeholder="Email" className="rounded-lg border p-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              <input type="tel" value={formData.phone} onChange={(e) => setFormData((current) => ({ ...current, phone: e.target.value }))} placeholder="Teléfono / WhatsApp" className="rounded-lg border p-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">Comisión global aplicada a este registro: S/ {config.birthdayReferrerCommissionAmount.toFixed(2)}</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="submit" disabled={submitting} className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-60">{submitting ? "Guardando..." : editingId ? "Actualizar" : "Crear"}</button>
              <button type="button" onClick={() => { setShowCreateForm(false); setEditingId(null); setFormData(emptyForm); }} className="rounded-lg bg-gray-500 px-6 py-2 font-medium text-white hover:bg-gray-600">Cancelar</button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="space-y-4 md:hidden">
        {referrers.map((referrer) => (
          <ReferrerCard key={referrer.id} referrer={referrer} generateLink={generateLink} onEdit={handleEdit} onApproval={handleApproval} onToggleActive={handleToggleActive} onDelete={handleDelete} onOpenQr={() => setQrModal({ open: true, slug: referrer.slug, name: referrer.name })} />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">Referrer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">Reservas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">Link</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {referrers.map((referrer) => (
                <tr key={referrer.id} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-gray-900 dark:text-white">{referrer.name}</div>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">/{referrer.slug}</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">DNI: {referrer.dni || "-"} · WhatsApp: {referrer.whatsapp || referrer.phone || "-"}</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Comisión asignada: S/ {referrer.commissionAmount.toFixed(2)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ${approvalTone(referrer.approvalStatus)}`}>{approvalLabel(referrer.approvalStatus)}</span>
                      <span className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ${referrer.active ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>{referrer.active ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{referrer._count.reservations}</td>
                  <td className="px-4 py-4 text-sm">
                    <button onClick={() => navigator.clipboard.writeText(generateLink(referrer.slug))} className="mr-3 text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Copiar</button>
                    <button onClick={() => setQrModal({ open: true, slug: referrer.slug, name: referrer.name })} className="text-green-600 transition-colors hover:text-green-800 dark:text-green-400 dark:hover:text-green-300">QR</button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2 text-sm">
                      <button onClick={() => handleEdit(referrer)} className="rounded-lg bg-indigo-50 px-3 py-2 font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-200">Editar</button>
                      {referrer.approvalStatus === 'PENDING' ? (
                        <>
                          <button onClick={() => handleApproval(referrer.id, 'APPROVED')} className="rounded-lg bg-emerald-50 px-3 py-2 font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200">Aprobar</button>
                          <button onClick={() => handleApproval(referrer.id, 'REJECTED')} className="rounded-lg bg-rose-50 px-3 py-2 font-medium text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-200">Rechazar</button>
                        </>
                      ) : null}
                      {referrer.approvalStatus === 'APPROVED' ? (
                        <button onClick={() => handleToggleActive(referrer)} className={`rounded-lg px-3 py-2 font-medium ${referrer.active ? 'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-200' : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-200'}`}>{referrer.active ? 'Desactivar' : 'Activar'}</button>
                      ) : null}
                      <button onClick={() => handleDelete(referrer.id)} disabled={referrer._count.reservations > 0} className="rounded-lg bg-red-50 px-3 py-2 font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-200">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {referrers.length === 0 ? <div className="p-10 text-center text-gray-500 dark:text-gray-400">No hay referrers registrados aún.</div> : null}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'green' | 'blue' }) {
  const toneClass = tone === 'amber' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200' : tone === 'green' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' : 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200';
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{label}</div>
      <div className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function ReferrerCard(props: {
  referrer: Referrer;
  generateLink: (slug: string) => string;
  onEdit: (referrer: Referrer) => void;
  onApproval: (id: string, approvalStatus: ApprovalStatus) => void;
  onToggleActive: (referrer: Referrer) => void;
  onDelete: (id: string) => void;
  onOpenQr: () => void;
}) {
  const { referrer } = props;
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">{referrer.name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">/{referrer.slug}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">DNI: {referrer.dni || '-'} · WhatsApp: {referrer.whatsapp || referrer.phone || '-'}</div>
        </div>
        <div className="flex flex-col gap-2">
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${approvalTone(referrer.approvalStatus)}`}>{approvalLabel(referrer.approvalStatus)}</span>
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${referrer.active ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>{referrer.active ? 'Activo' : 'Inactivo'}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Reservas:</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-white">{referrer._count.reservations}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Comisión:</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-white">S/ {referrer.commissionAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => navigator.clipboard.writeText(props.generateLink(referrer.slug))} className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">Copiar link</button>
        <button onClick={props.onOpenQr} className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-200">Ver QR</button>
        <button onClick={() => props.onEdit(referrer)} className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">Editar</button>
        {referrer.approvalStatus === 'PENDING' ? <button onClick={() => props.onApproval(referrer.id, 'APPROVED')} className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">Aprobar</button> : null}
        {referrer.approvalStatus === 'PENDING' ? <button onClick={() => props.onApproval(referrer.id, 'REJECTED')} className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">Rechazar</button> : null}
        {referrer.approvalStatus === 'APPROVED' ? <button onClick={() => props.onToggleActive(referrer)} className={`rounded-lg px-3 py-2 text-sm font-medium ${referrer.active ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200' : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200'}`}>{referrer.active ? 'Desactivar' : 'Activar'}</button> : null}
        <button onClick={() => props.onDelete(referrer.id)} disabled={referrer._count.reservations > 0} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-200">Eliminar</button>
      </div>
    </div>
  );
}

function QRModal({ open, slug, name, onClose }: { open: boolean; slug: string; name: string; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const url = typeof window !== "undefined" ? `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/reservatucumple/${slug}` : "";
  const hasGenerated = useRef(false);

  useEffect(() => {
    if (open && url && !hasGenerated.current) {
      QRCode.toDataURL(url, { width: 256, margin: 2 }).then(setQrDataUrl).catch(console.error);
      hasGenerated.current = true;
    }
    if (!open) {
      setQrDataUrl("");
      hasGenerated.current = false;
    }
  }, [open, url]);

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qr(${slug}).png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-sm flex-col items-center rounded-lg bg-white p-4 shadow-xl dark:bg-gray-900 sm:p-6">
        <div className="mb-3 text-center text-lg font-bold text-gray-900 dark:text-white">QR de {name}</div>
        {qrDataUrl ? <img src={qrDataUrl} alt={`QR para ${slug}`} className="mb-3 h-56 w-56 rounded-lg border" /> : <div className="mb-3 h-56 w-56 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />}
        <div className="mb-4 break-all px-2 text-center text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{url}</div>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <button onClick={downloadQR} disabled={!qrDataUrl} className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400 sm:text-base">📥 Descargar QR</button>
          <button onClick={onClose} className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 sm:text-base">Cerrar</button>
        </div>
      </div>
    </div>
  );
}