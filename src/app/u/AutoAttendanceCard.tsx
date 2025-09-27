"use client";
import React, { useCallback, useEffect, useState } from 'react';
import MarkAttendanceCard from './MarkAttendanceCard';

interface Props {
  initialLastType: 'IN' | 'OUT' | null; // último tipo conocido por el servidor para el business day
}

// Componente inteligente: decide la acción a mostrar según el último registro real.
// Si último fue IN -> mostrar salida. Si último fue OUT o no hay -> mostrar entrada.
export default function AutoAttendanceCard({ initialLastType }: Props) {
  const [lastType, setLastType] = useState<'IN'|'OUT'|null>(initialLastType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const nextAction: 'IN' | 'OUT' = lastType === 'IN' ? 'OUT' : 'IN';

  const refresh = useCallback(async ()=>{
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/attendance/me/recent', { cache: 'no-store' });
      if(r.status === 401){ return; }
      const j = await r.json().catch(()=>null);
      const last = j?.recent;
      if(last && (last.type === 'IN' || last.type === 'OUT')) setLastType(last.type);
      else setLastType(null);
    } catch(e: any){ setError('No se pudo actualizar'); }
    finally { setLoading(false); }
  },[]);

  // Refresco inicial cliente para asegurar consistencia (ej: usuario vuelve desde scanner con history.back)
  useEffect(()=>{ refresh(); }, [refresh]);

  return (
    <div className="relative">
      <MarkAttendanceCard nextAction={nextAction} />
      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
        <button onClick={refresh} disabled={loading} className="px-2 py-0.5 rounded border border-slate-300/60 dark:border-slate-600 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50">{loading? 'Actualizando…':'Actualizar estado'}</button>
        {lastType && <span>Último: {lastType}</span>}
        {!lastType && <span>Sin marcas hoy</span>}
        {error && <span className="text-red-500">{error}</span>}
      </div>
    </div>
  );
}
