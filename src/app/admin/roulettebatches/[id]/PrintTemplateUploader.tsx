"use client";
import React, { useState } from 'react';

export default function PrintTemplateUploader({ batchId }: { batchId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<string>('{"dpi":300,"cols":1,"rows":8,"qr":{"xMm":10,"yMm":10,"widthMm":30}}');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadedTemplateId, setUploadedTemplateId] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metaObj, setMetaObj] = useState<any | null>(null);

  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setMessage('Selecciona un archivo');
    if (!/image\/(png|jpeg|jpg)/.test(file.type)) return setMessage('Formato no soportado. Usa PNG o JPG');
    if (file.size > MAX_BYTES) return setMessage('El archivo excede el tamaño máximo (5 MB)');
    if (metaError) return setMessage('Corrige el JSON de meta antes de subir');
    setLoading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('meta', meta);
      const res = await fetch('/api/print/template', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setMessage('Template cargado: ' + (data.templateId || data.filePath));
      if (data.templateId) setUploadedTemplateId(data.templateId);
    } catch (err: any) {
      setMessage('Upload failed: ' + err?.message);
    } finally {
      setLoading(false);
    }
  }

  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    if (!uploadedTemplateId) return setMessage('No hay template seleccionado');
    setDownloading(true);
    setMessage(null);
    try {
      // Usar el nuevo endpoint centralizado para la impresión
      const url = `/api/print/control/pdf?batchId=${encodeURIComponent(batchId)}&templateId=${encodeURIComponent(uploadedTemplateId)}`;
      const res = await fetch(url, { method: 'GET', credentials: 'include' });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Server error: ${res.status} ${body}`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `batch-${batchId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      setMessage('PDF descargado');
    } catch (err: any) {
      setMessage('PDF failed: ' + (err?.message || err));
    } finally {
      setDownloading(false);
    }
  }

  function onFileChange(f: File | null) {
    setFile(f);
    setMessage(null);
    if (!f) {
      setPreviewUrl(null);
      return;
    }
    if (!/image\/(png|jpeg|jpg)/.test(f.type)) {
      setMessage('Formato no soportado. Usa PNG o JPG');
      setPreviewUrl(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setMessage('El archivo excede el tamaño máximo (5 MB)');
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }

  function onMetaChange(s: string) {
    setMeta(s);
    setMessage(null);
    try {
      const parsed = JSON.parse(s);
      // basic validation
      if (parsed.dpi && typeof parsed.dpi !== 'number') throw new Error('dpi debe ser número');
      if (parsed.cols && typeof parsed.cols !== 'number') throw new Error('cols debe ser número');
      if (parsed.rows && typeof parsed.rows !== 'number') throw new Error('rows debe ser número');
      if (!parsed.qr || typeof parsed.qr !== 'object') throw new Error('qr faltante');
      const q = parsed.qr;
      if (typeof q.xMm !== 'number' || typeof q.yMm !== 'number' || typeof q.widthMm !== 'number') throw new Error('qr.xMm, qr.yMm y qr.widthMm deben ser números');
      setMetaError(null);
      setMetaObj(parsed);
    } catch (err: any) {
      setMetaError(err?.message || 'JSON inválido');
      setMetaObj(null);
    }
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, marginTop: 12 }}>
      <h4>Subir template de impresión</h4>
      <form onSubmit={upload}>
        <div>
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Meta (JSON)</label>
          <textarea rows={6} value={meta} onChange={(e) => onMetaChange(e.target.value)} style={{ width: '100%' }} />
          {metaError && <div style={{ color: 'crimson', marginTop: 6, fontSize: 12 }}>{metaError}</div>}
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={loading}>{loading ? 'Subiendo...' : 'Subir template'}</button>
        </div>
        {message && <div style={{ marginTop: 8 }}>{message}</div>}
        {previewUrl && (
          <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
            <img src={previewUrl} alt="preview" style={{ maxWidth: 400, display: 'block' }} id="template-preview-img" />
            {/* overlay QR box if metaObj available */}
            {metaObj && (
              <PreviewOverlay imgId="template-preview-img" meta={metaObj} />
            )}
          </div>
        )}
        {/* Post-upload actions */}
        {uploadedTemplateId && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, marginBottom: 6 }}>Template cargado: {uploadedTemplateId}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={downloadPdf} disabled={downloading}>{downloading ? 'Generando PDF...' : 'Generar PDF (usar este template)'} </button>
              <a href={`/api/print/control/pdf?batchId=${batchId}&templateId=${uploadedTemplateId}`} className="btn-outline !px-3 !py-1 text-xs" target="_blank" rel="noreferrer">Abrir en nueva pestaña</a>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

function PreviewOverlay({ imgId, meta }: { imgId: string; meta: any }) {
  const dpi = meta.dpi || 300;
  const qr = meta.qr || { xMm: 0, yMm: 0, widthMm: 30 };
  // compute px position from mm
  const mmToPx = (mm: number) => Math.round((mm * dpi) / 25.4);
  const [style, setStyle] = React.useState<any>({ display: 'none' });
  React.useEffect(() => {
    const img = document.getElementById(imgId) as HTMLImageElement | null;
    if (!img) return;
    function update() {
      if (!img) return;
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      const rect = img.getBoundingClientRect();
      const scaleX = rect.width / naturalW;
      const scaleY = rect.height / naturalH;
      const left = mmToPx(qr.xMm) * scaleX;
      const top = mmToPx(qr.yMm) * scaleY;
      const w = mmToPx(qr.widthMm) * scaleX;
      setStyle({ position: 'absolute', left, top, width: w, height: w, border: '2px dashed rgba(0,0,0,0.6)', boxSizing: 'border-box', pointerEvents: 'none' });
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [imgId, meta]);
  return <div style={style} />;
}
