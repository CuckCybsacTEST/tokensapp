"use client";

import React, { useState, useTransition } from "react";

interface Props {
  // initialEnabled kept for backward compatibility but is optional now
  initialEnabled?: boolean;
}

export function TokensToggle({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(initialEnabled ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending] = useTransition();
  const [adminDisabled, setAdminDisabled] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [nextToggleTime, setNextToggleTime] = useState<Date | null>(null);
  const [timeActive, setTimeActive] = useState<string>("00:00:00");
  const [timeRemaining, setTimeRemaining] = useState<string>("00:00:00");
  const [scheduledEnabled, setScheduledEnabled] = useState<boolean | null>(null);
  const [lastChange, setLastChange] = useState<Date | null>(null);
  
  // Debug
  React.useEffect(() => {
    console.log('Modal state:', showConfirm ? 'showing' : 'hidden');
  }, [showConfirm]);

  // Función para formatear tiempo en horas:minutos:segundos
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return [hours, minutes, remainingSeconds]
      .map(v => v.toString().padStart(2, '0'))
      .join(':');
  };

  // Load status from server on mount
  React.useEffect(() => {
    let mounted = true;
    
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/system/tokens/status', { credentials: 'same-origin' });
        if (!res.ok) {
          if (res.status === 401) {
            setError('unauthorized - please sign in');
            window.location.href = '/admin/login';
            return;
          }
          throw new Error(await res.text());
        }
        const body = await res.json();
        if (!mounted) return;
        
        setEnabled(Boolean(body.tokensEnabled));
        if (typeof body.scheduledEnabled === 'boolean') {
          setScheduledEnabled(Boolean(body.scheduledEnabled));
        }
        setAdminDisabled(false); // Ya no usamos esta bandera
        
        // Establecer hora del servidor, última modificación y próxima actualización
        const serverTimeDate = new Date(body.serverTimeIso);
        const nextToggleDate = new Date(body.nextSchedule);
        setServerTime(serverTimeDate);
        setNextToggleTime(nextToggleDate);
        if (body.lastChangeIso) {
          const lc = new Date(body.lastChangeIso);
          if (!isNaN(lc.getTime())) setLastChange(lc);
        }
        
      } catch (e: any) {
        console.error('Failed to load tokens status', e);
        setError('No se pudo cargar el estado');
      } finally {
        setStatusLoaded(true);
      }
    };

    fetchStatus();
    
    // Actualizar status cada minuto
    const intervalId = setInterval(fetchStatus, 60000);
    return () => { 
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);
  
  // Actualizar temporizadores cada segundo
  React.useEffect(() => {
  if (!serverTime || !nextToggleTime) return;
    
    const updateTimers = () => {
      const now = new Date();

      // Calcular tiempo que llevan activos los tokens (si están activos)
      if (enabled) {
        const baseline = lastChange || serverTime || now;
        const activeSeconds = Math.max(0, Math.floor((now.getTime() - baseline.getTime()) / 1000));
        setTimeActive(formatTime(activeSeconds));
      } else {
        setTimeActive("00:00:00");
      }

      // Calcular tiempo que falta para la próxima actualización
      const diffSeconds = Math.max(0, Math.floor((nextToggleTime.getTime() - now.getTime()) / 1000));
      setTimeRemaining(formatTime(diffSeconds));
    };
    
    updateTimers(); // Actualizar inmediatamente
    const timerId = setInterval(updateTimers, 1000);
    
    return () => clearInterval(timerId);
  }, [enabled, serverTime, nextToggleTime]);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    setError(null);
    try {
      const res = await fetch(`/api/system/tokens/toggle`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError('unauthorized - please sign in');
          window.location.href = '/admin/login';
          return;
        }
        if (res.status === 403) throw new Error('forbidden');
        const t = await res.json().catch(()=>null);
        throw new Error(t?.error || (await res.text()));
      }
      const body = await res.json().catch(()=>null);
      if (body) {
        setEnabled(Boolean(body.tokensEnabled));
        if (typeof body.scheduledEnabled === 'boolean') {
          setScheduledEnabled(Boolean(body.scheduledEnabled));
        }
        
        // Actualizar los tiempos si hay información disponible
        if (body.nextSchedule) {
          setNextToggleTime(new Date(body.nextSchedule));
        }
        if (body.serverTimeIso) {
          setServerTime(new Date(body.serverTimeIso));
        }
        if (body.lastChangeIso) {
          const lc = new Date(body.lastChangeIso);
          if (!isNaN(lc.getTime())) setLastChange(lc);
        } else {
          // Fallback: consider now as last change in absence of server-provided timestamp
          setLastChange(new Date());
        }
      }
  // Evitamos router.refresh() para no provocar un remount que genera un glitch visual
    } catch (e: any) {
      setEnabled(!next);
      setError(e?.message || 'Error al actualizar');
    }
  }

  const common = [
    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm",
    "transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500",
    "cursor-pointer select-none",
  ].join(" ");
  const cls = enabled
    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/30 dark:text-rose-300";

  // Formatear la hora actual del servidor para mostrarla
  const formattedServerTime = serverTime 
    ? `${String(serverTime.getHours()).padStart(2, '0')}:${String(serverTime.getMinutes()).padStart(2, '0')}:${String(serverTime.getSeconds()).padStart(2, '0')}`
    : "--:--:--";

  return (
    <div className="flex flex-col gap-4">
      {/* Botón principal */}
      <div className="flex flex-col items-center my-6">
        <div className="relative mb-5">
          <div className={`pointer-events-none absolute -inset-1 bg-gradient-to-r ${enabled ? 'from-red-500 to-rose-500' : 'from-emerald-500 to-teal-500'} rounded-full opacity-70 blur-sm transition-opacity duration-300 will-change-[opacity]`}></div>
          <button
            onClick={toggle}
            disabled={isPending}
            className={`
              relative px-8 py-5 rounded-full text-2xl font-medium transition-all 
              flex items-center justify-center min-w-[240px]
              ${enabled
                ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 hover:shadow-red-600/30 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-600/30 text-white"
              }
              ${isPending ? "opacity-70 cursor-not-allowed" : ""}
            `}
          >
            {isPending ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </span>
            ) : enabled ? (
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Desactivar Tokens
              </span>
            ) : (
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Activar Tokens
              </span>
            )}
          </button>
        </div>
        <p className={`text-sm font-medium ${enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {enabled ? 'Sistema Activo - Los tokens están funcionando' : 'Sistema Inactivo - Los tokens están desactivados'}
          {scheduledEnabled !== null && (
            <span className="ml-2 opacity-70">
              {scheduledEnabled === enabled ? '(según horario)' : '(override manual temporal)'}
            </span>
          )}
        </p>
      </div>

      {/* Temporizadores e información de tiempo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        {/* Hora del servidor */}
        <div className="flex flex-col items-center md:items-start p-3 bg-white dark:bg-slate-700/30 rounded-md shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400 mb-1">Hora del Servidor</div>
          <div className="text-2xl font-mono flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-slate-400"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            {formattedServerTime}
          </div>
        </div>
        
        {/* Tiempo activo */}
        <div className="flex flex-col items-center p-3 bg-white dark:bg-slate-700/30 rounded-md shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400 mb-1">
            {enabled ? "Tiempo Activo" : "Inactivo"}
          </div>
          <div className={`text-2xl font-mono flex items-center ${enabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-slate-400"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            {enabled ? timeActive : "--:--:--"}
          </div>
        </div>
        
        {/* Tiempo restante */}
        <div className="flex flex-col items-center md:items-center p-3 bg-white dark:bg-slate-700/30 rounded-md shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400 mb-1">
            {enabled 
              ? "Tiempo hasta desactivación" 
              : "Tiempo hasta activación"
            }
          </div>
          <div className={`text-2xl font-mono flex items-center ${enabled ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-slate-400"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path><path d="M12 7v5l3 3"></path></svg>
            {timeRemaining}
          </div>
        </div>
      </div>

      {error && (
        <div className="w-full p-4 mb-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800/30">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-red-700 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowConfirm(false)} />
          <div className="relative z-10 max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-800 transform transition-all border border-slate-200 dark:border-slate-700">
            <div className="flex items-center mb-4">
              <div className="mr-4 flex-shrink-0 bg-red-100 rounded-full p-2 dark:bg-red-900/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">Confirmar desactivación</div>
            </div>
            <div className="mt-3 text-sm text-slate-600 dark:text-slate-300 border-l-4 border-amber-400 pl-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded mb-4">
              <p>¿Estás seguro de que quieres desactivar los tokens?</p>
              <p className="mt-2 font-medium">Los usuarios no podrán utilizar tokens hasta que vuelvan a ser activados.</p>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button 
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600" 
                onClick={() => setShowConfirm(false)}
              >
                Cancelar
              </button>
              <button 
                className="px-4 py-2 rounded-lg bg-red-600 text-white shadow-sm hover:bg-red-700 transition-colors flex items-center" 
                onClick={async () => {
                  setShowConfirm(false);
                  setError(null);
                  try {
                    // Solo cambiamos a un toggle simple, sin usar admin-disable
                    const r = await fetch(`/api/system/tokens/toggle`, { 
                      method: 'POST', 
                      credentials: 'same-origin', 
                      headers: { 'Content-Type':'application/json' }, 
                      body: JSON.stringify({ enabled: false }) 
                    });
                    if (!r.ok) {
                      if (r.status === 401) {
                        setError('unauthorized - please sign in');
                        window.location.href = '/admin/login';
                        return;
                      }
                      if (r.status === 403) throw new Error('forbidden');
                      const t = await r.json().catch(()=>null);
                      throw new Error(t?.error || (await r.text()));
                    }
                    const body = await r.json().catch(()=>null);
                    setEnabled(false);
                    setAdminDisabled(false); // Ya no usamos esta bandera
                    if (body && body.nextSchedule) {
                      setNextToggleTime(new Date(body.nextSchedule));
                    }
                    if (body && body.serverTimeIso) {
                      setServerTime(new Date(body.serverTimeIso));
                    }
                    // Evitamos router.refresh() para no provocar un remount que genera un glitch visual
                  } catch (e:any) {
                    setError(e?.message || 'Error al desactivar tokens');
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Confirmar desactivación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
