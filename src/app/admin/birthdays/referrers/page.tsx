"use client";

import { useEffect, useState, useRef } from "react";
import * as QRCode from "qrcode";

type Referrer = {
  id: string;
  name: string;
  slug: string;
  code: string;
  email: string | null;
  phone: string | null;
  commissionAmount: number;
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
  commissionAmount: number;
};

export default function AdminReferrersPage() {
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ReferrerFormData>({
    name: '',
    slug: '',
    email: '',
    phone: '',
    commissionAmount: 10.00,
  });

  const [qrModal, setQrModal] = useState<{ open: boolean; slug: string; name: string } | null>(null);

  // Load referrers
  const loadReferrers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/birthdays/referrers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error loading referrers');
      setReferrers(data.referrers || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferrers();
  }, []);

  // Generate link
  const generateLink = (slug: string) => {
    return `${process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/reservatucumple/${slug}`;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingId ? `/api/admin/birthdays/referrers/${editingId}` : '/api/admin/birthdays/referrers';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error saving referrer');
      await loadReferrers();
      setShowCreateForm(false);
      setEditingId(null);
      setFormData({ name: '', slug: '', email: '', phone: '', commissionAmount: 10.00 });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = (referrer: Referrer) => {
    setEditingId(referrer.id);
    setFormData({
      name: referrer.name,
      slug: referrer.slug,
      email: referrer.email || '',
      phone: referrer.phone || '',
      commissionAmount: referrer.commissionAmount,
    });
    setShowCreateForm(true);
  };

  // Handle toggle active
  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/admin/birthdays/referrers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error updating referrer');
      await loadReferrers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este referrer?')) return;
    try {
      const res = await fetch(`/api/admin/birthdays/referrers/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error deleting referrer');
      await loadReferrers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Modal QR */}
      <QRModal
        open={!!qrModal?.open}
        slug={qrModal?.slug || ""}
        name={qrModal?.name || ""}
        onClose={() => setQrModal(null)}
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestión de Referrers
        </h1>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setEditingId(null);
            setFormData({ name: '', slug: '', email: '', phone: '', commissionAmount: 10.00 });
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          Nuevo Referrer
        </button>
      </div>
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Editar Referrer' : 'Crear Nuevo Referrer'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="ana-garcia"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Solo letras minúsculas, números y guiones
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto de Comisión (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.commissionAmount}
                  onChange={(e) => setFormData({ ...formData, commissionAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
              >
                {submitting ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingId(null);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Referrers List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Reservas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Comisión (S/)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Link
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {referrers.map((referrer) => (
                <tr key={referrer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {referrer.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {referrer.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {referrer.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {referrer._count.reservations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    S/ {referrer.commissionAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      referrer.active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {referrer.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => navigator.clipboard.writeText(generateLink(referrer.slug))}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Copiar link"
                    >
                      📋 Copiar
                    </button>
                    <button
                      onClick={() => setQrModal({ open: true, slug: referrer.slug, name: referrer.name })}
                      className="ml-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      title="Ver QR"
                    >
                      🧾 QR
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(referrer)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(referrer.id, referrer.active)}
                      className={`${
                        referrer.active
                          ? 'text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300'
                          : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                      }`}
                    >
                      {referrer.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleDelete(referrer.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      disabled={referrer._count.reservations > 0}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {referrers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No hay referrers registrados aún.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Modal para mostrar QR
function QRModal({ open, slug, name, onClose }: { open: boolean; slug: string; name: string; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const url = typeof window !== "undefined" ? `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/reservatucumple/${slug}` : '';
  const hasGenerated = useRef(false);

  useEffect(() => {
    if (open && url && !hasGenerated.current) {
      QRCode.toDataURL(url, { width: 256, margin: 2 })
        .then(setQrDataUrl)
        .catch(console.error);
      hasGenerated.current = true;
    }
    if (!open) {
      setQrDataUrl("");
      hasGenerated.current = false;
    }
  }, [open, url]);

  const downloadQR = () => {
    if (!qrDataUrl) return;

    // Convertir dataURL a blob
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qr(${slug}).png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-xs flex flex-col items-center">
        <div className="mb-2 text-lg font-bold text-gray-900 dark:text-white">QR de {name}</div>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`QR para ${slug}`} className="mb-2 w-48 h-48 border rounded" />
        ) : (
          <div className="w-48 h-48 bg-gray-200 animate-pulse rounded mb-2"></div>
        )}
        <div className="text-xs text-gray-500 break-all mb-4">{url}</div>
        <div className="flex gap-2 w-full">
          <button
            onClick={downloadQR}
            disabled={!qrDataUrl}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            📥 Descargar QR
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
