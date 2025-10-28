"use client";
import React, { useEffect, useMemo, useState } from 'react';

interface Props { prizes: any[]; }

type ValidityMode = 'byDays' | 'singleDay' | 'singleHour';

interface PayloadByDays { name: string; targetUrl?: string; includeQr: boolean; lazyQr: boolean; prizes: { prizeId: string; count: number }[]; validity: { mode: 'byDays'; expirationDays: number }; }
interface PayloadSingleDay { name: string; targetUrl?: string; includeQr: boolean; lazyQr: boolean; prizes: { prizeId: string; count: number }[]; validity: { mode: 'singleDay'; date: string }; }
interface PayloadSingleHour { name: string; targetUrl?: string; includeQr: boolean; lazyQr: boolean; prizes: { prizeId: string; count: number }[]; validity: { mode: 'singleHour'; date: string; hour: string; durationMinutes: number }; }

type StaticRequest = PayloadByDays | PayloadSingleDay | PayloadSingleHour;

const EXPIRATION_OPTIONS = [1,3,5,7,15,30];

export default function InlineStaticBatchPanel({ prizes }: Props) {
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [mode, setMode] = useState<ValidityMode>('byDays');
  const [expirationDays, setExpirationDays] = useState(7);
  const [singleDayDate, setSingleDayDate] = useState('');
  const [hourDate, setHourDate] = useState('');
  const [hourTime, setHourTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [includeQr, setIncludeQr] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const [postGen, setPostGen] = useState<null | { batchId: string; blobUrl: string; filename: string; displayName?: string }>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Derived
  // Solo mostrar premios activos con stock numérico disponible > 0 (evitar premios ya emitidos o ilimitados/null)
  const activePrizeList = useMemo(() => prizes.filter(p => p.active && typeof p.stock === 'number' && p.stock > 0), [prizes]);
  const totalRequested = useMemo(() => Object.entries(counts).reduce((a,[id,v]) => a + (v||0),0), [counts]);

  useEffect(() => { if (success||error) { const t = setTimeout(()=>{ setSuccess(null); setError(null); }, 4000); return () => clearTimeout(t);} }, [success,error]);
  useEffect(() => () => { if (postGen?.blobUrl) { try { URL.revokeObjectURL(postGen.blobUrl); } catch {} } }, [postGen?.blobUrl]);

  function setCount(prizeId: string, value: number) {
    setCounts(prev => ({ ...prev, [prizeId]: value }));
  }
  function fillMax() {
    const next: Record<string, number> = {};
    for (const p of activePrizeList) {
      if (typeof p.stock === 'number' && p.stock > 0) next[p.id] = p.stock;
    }
    setCounts(next);
  }
  function clearAll() { setCounts({}); }

  async function generate() {
    if (loading) return;
    const trimmedUrl = targetUrl.trim();
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) { setError('URL debe iniciar con http(s)://'); return; }
    if (totalRequested <= 0) { setError('Define cantidades'); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      let payload: StaticRequest;
      const base = {
        name: name || 'Lote estático',
        ...(trimmedUrl && { targetUrl: trimmedUrl }),
        includeQr,
        lazyQr: false,
        prizes: Object.entries(counts).filter(([,v]) => v>0).map(([prizeId,v]) => ({ prizeId, count: v }))
      };
      if (mode === 'byDays') {
        payload = { ...base, validity: { mode: 'byDays', expirationDays } } as PayloadByDays;
      } else if (mode === 'singleDay') {
        if (!singleDayDate) throw new Error('Selecciona fecha');
        payload = { ...base, validity: { mode: 'singleDay', date: singleDayDate } } as PayloadSingleDay;
      } else {
        if (!hourDate) throw new Error('Fecha ventana requerida');
        if (!/^[0-2]\d:[0-5]\d$/.test(hourTime)) throw new Error('Hora inválida');
        payload = { ...base, validity: { mode: 'singleHour', date: hourDate, hour: hourTime, durationMinutes } } as PayloadSingleHour;
      }
      const res = await fetch('/api/batch/generate-static', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const ct = res.headers.get('Content-Type') || '';
      if (!res.ok) {
        if (ct.includes('application/json')) {
          const j = await res.json().catch(()=>({}));
          setError(j.error || 'Error');
        } else setError('Error desconocido');
        return;
      }
      if (ct.includes('application/zip')) {
        const blob = await res.blob();
        let batchId: string | undefined; let totalTokens: number | undefined;
        try {
          const JSZipMod = await import('jszip');
          const zip = await JSZipMod.loadAsync(blob);
            const manifestFile = zip.file('manifest.json');
            if (manifestFile) {
              const txt = await manifestFile.async('text');
              const mf = JSON.parse(txt);
              batchId = mf.batchId; totalTokens = mf.meta?.totalTokens;
            }
        } catch {}
        const url = URL.createObjectURL(blob);
        setPostGen({ batchId: batchId || '', blobUrl: url, filename: `lote_static_${Date.now()}.zip`, displayName: name });
        setSuccess(`Lote estático generado${totalTokens ? ` (${totalTokens} tokens)` : ''}`);
      } else {
        setError('Respuesta inesperada');
      }
    } catch (e: any) {
      setError(e.message || 'Fallo red');
    } finally { setLoading(false); }
  }

  function downloadZip() {
    if (!postGen) return; const a = document.createElement('a'); a.href = postGen.blobUrl; a.download = postGen.filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(postGen.blobUrl); setPostGen(null);
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span className="text-sm font-medium">Lote Estático (interfaz interna)</span>
        <button type="button" className="text-[10px] underline" onClick={fillMax}>Rellenar máximos</button>
      </div>
      <div className="card-body grid gap-4 md:grid-cols-4">
        {postGen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="card w-[92%] max-w-md">
              <div className="card-header"><h3 className="text-sm font-medium">Lote estático listo</h3></div>
              <div className="card-body space-y-3 text-sm">
                <p>Puedes descargar el ZIP ahora.</p>
                <div className="flex gap-2">
                  <button className="btn !py-1 !px-3 text-xs" onClick={downloadZip}>Descargar ZIP</button>
                  <button className="btn-outline !py-1 !px-3 text-xs" onClick={() => { if (postGen.blobUrl) URL.revokeObjectURL(postGen.blobUrl); setPostGen(null); }}>Cerrar</button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="form-row">
          <label className="text-xs font-medium">Nombre</label>
          <input className="input" value={name} maxLength={120} placeholder="Ej: Campaña Octubre" onChange={e=>setName(e.target.value)} />
        </div>
        <div className="form-row md:col-span-2">
          <label className="text-xs font-medium">URL del Premio <span className="text-slate-500">(opcional)</span></label>
          <input className="input" value={targetUrl} placeholder="https://..." onChange={e=>setTargetUrl(e.target.value)} />
        </div>
        <div className="form-row">
          <label className="text-xs font-medium">Incluye QR</label>
          <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={includeQr} onChange={e=>setIncludeQr(e.target.checked)} /><span>Sí</span></label>
        </div>
        <div className="form-row md:col-span-4">
          <label className="text-xs font-medium">Modo de validez</label>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <label className="inline-flex items-center gap-1"><input type="radio" name="static-validity" value="byDays" checked={mode==='byDays'} onChange={()=>setMode('byDays')} /><span>Por días</span></label>
            <label className="inline-flex items-center gap-1"><input type="radio" name="static-validity" value="singleDay" checked={mode==='singleDay'} onChange={()=>{setMode('singleDay');}} /><span>Día específico</span></label>
            <label className="inline-flex items-center gap-1"><input type="radio" name="static-validity" value="singleHour" checked={mode==='singleHour'} onChange={()=>{setMode('singleHour');}} /><span>Ventana horaria</span></label>
          </div>
        </div>
        {mode==='byDays' && (
          <div className="form-row">
            <label className="text-xs font-medium">Expiración</label>
            <select className="input" value={expirationDays} onChange={e=>setExpirationDays(Number(e.target.value))}>{EXPIRATION_OPTIONS.map(d=> <option key={d} value={d}>{d} días</option>)}</select>
          </div>) }
        {mode==='singleDay' && (
          <div className="form-row">
            <label className="text-xs font-medium">Fecha</label>
            <input type="date" className="input" value={singleDayDate} onChange={e=>setSingleDayDate(e.target.value)} />
          </div>) }
        {mode==='singleHour' && (
          <>
            <div className="form-row"><label className="text-xs font-medium">Fecha ventana</label><input type="date" className="input" value={hourDate} onChange={e=>setHourDate(e.target.value)} /></div>
            <div className="form-row"><label className="text-xs font-medium">Hora inicio</label><input type="time" className="input" value={hourTime} onChange={e=>setHourTime(e.target.value)} /></div>
            <div className="form-row"><label className="text-xs font-medium">Duración</label><select className="input" value={durationMinutes} onChange={e=>setDurationMinutes(Number(e.target.value))}>{[15,30,45,60,90,120,180,240,360].map(m=> <option key={m} value={m}>{m} min</option>)}</select></div>
          </>) }
        <div className="md:col-span-4">
          <table className="w-full text-[11px] border-collapse">
            <thead><tr className="text-left"><th className="py-1 pr-2">Premio</th><th className="py-1 pr-2 w-20">Stock</th><th className="py-1 pr-2 w-28">Cantidad</th></tr></thead>
            <tbody>
              {activePrizeList.map(p => (
                <tr key={p.id} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="py-1 pr-2"><span className="inline-block h-2 w-2 rounded-full align-middle mr-1" style={{ background: p.color || '#999' }} />{p.label}</td>
                  <td className="py-1 pr-2 tabular-nums text-xs">{typeof p.stock === 'number' ? p.stock : '—'}</td>
                  <td className="py-1 pr-2">
                    <input type="number" min={0} max={p.stock || 999999} className="input h-6 text-xs" value={counts[p.id] ?? ''} onChange={e=> setCount(p.id, e.target.value === '' ? 0 : Number(e.target.value))} />
                  </td>
                </tr>
              ))}
              {activePrizeList.length === 0 && <tr><td colSpan={3} className="py-2 text-center italic text-slate-500">No hay premios con stock disponible</td></tr>}
            </tbody>
          </table>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] items-center">
            <span>Total solicitado: {totalRequested}</span>
            <button type="button" className="btn-outline !py-1 !px-2 text-[10px]" onClick={fillMax}>Usar stock completo</button>
            <button type="button" className="btn-outline !py-1 !px-2 text-[10px]" onClick={clearAll}>Limpiar</button>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Sólo se listan premios con stock &gt; 0. Los agotados o ilimitados no pueden usarse en lotes estáticos.</p>
        </div>
        <div className="col-span-full flex items-center gap-3">
          <button type="button" className="btn text-xs" disabled={loading || totalRequested<=0} onClick={generate}>{loading ? 'Generando…' : 'Generar Lote Estático'}</button>
          {error && <span className="text-[11px] text-rose-600">{error}</span>}
          {success && <span className="text-[11px] text-emerald-600">{success}</span>}
        </div>
        <p className="col-span-full text-[10px] text-slate-500">Los tokens muestran una interfaz interna con información del premio. Si se proporciona una URL, el usuario puede reclamar el premio haciendo clic en el botón. Si no se proporciona URL, se muestra un mensaje de premio disponible.</p>
      </div>
    </div>
  );
}
