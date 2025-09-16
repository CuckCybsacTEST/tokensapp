"use client";
import React, { useState, useEffect } from 'react';

export default function PrintPdfButton({ batchId, templateId }: { batchId: string; templateId?: string }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function downloadPdf() {
    setLoading(true);
    try {
      // default params; client can override via query if needed
      const qs = new URLSearchParams({ maxTokens: '2000', chunkSize: '100' });
      // Usar el nuevo endpoint centralizado para la impresión
      const apiUrl = `/api/print/control/pdf?batchId=${batchId}`;
      if (templateId) qs.set('templateId', templateId);
      const res = await fetch(`${apiUrl}&${qs.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      const ct = res.headers.get('Content-Type') || '';
      if (!res.ok) {
        if (ct.includes('application/json')) {
          const j = await res.json().catch(() => ({}));
          setToast({ type: 'error', msg: j.error || 'Error generando PDF' });
        } else {
          setToast({ type: 'error', msg: `Error: ${res.status}` });
        }
        return;
      }

      if (!ct.includes('application/pdf')) {
        const j = await res.json().catch(() => ({}));
        setToast({ type: 'error', msg: j.error || 'Respuesta inesperada (no PDF)' });
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Try to get filename from content-disposition
      const cd = res.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename\*=UTF-8''(.+)$|filename="?([^";]+)"?/);
      let filename = `batch_${batchId}.pdf`;
      if (m) {
        filename = decodeURIComponent((m[1] || m[2] || filename));
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setToast({ type: 'success', msg: 'PDF descargado' });
    } catch (e: any) {
      setToast({ type: 'error', msg: e?.message || 'Fallo de red' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-md border px-4 py-2 text-xs shadow-lg backdrop-blur-sm ${toast.type === 'success' ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-800/70 dark:text-emerald-100' : 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-800/70 dark:text-rose-100'}`}>
          {toast.msg}
        </div>
      )}
      <button
        type="button"
        className="btn-outline !px-3 !py-1 text-xs"
        onClick={downloadPdf}
        disabled={loading}
        title="Descargar PDF de impresión"
      >
        {loading ? 'Imprimiendo…' : 'Imprimir (PDF)'}
      </button>
    </>
  );
}
