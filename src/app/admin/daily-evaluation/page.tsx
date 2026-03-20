'use client';

import React, { useState, useEffect, useCallback } from 'react';

type Rating = 'MALO' | 'REGULAR' | 'BUENO' | 'MUY_BUENO';

interface PersonInfo {
  id: string;
  name: string;
  code: string;
  area: string | null;
}

interface AttendanceEntry {
  person: PersonInfo;
  firstIn: string | null;
  lastOut: string | null;
  missingExit: boolean;
}

interface DeliveredPrize {
  label: string;
  count: number;
}

interface DayPrize {
  id: string;
  label: string;
}

interface ReusableGroupPrize {
  label: string;
  total: number;
  daySales: number;
}

interface ReusableGroup {
  id: string;
  name: string;
  color: string | null;
  totalTokens: number;
  activeTokens: number;
  daySales: number;
  prizes: ReusableGroupPrize[];
}

interface SummaryData {
  attendance: AttendanceEntry[];
  deliveredPrizes: DeliveredPrize[];
  totalDelivered: number;
  dayPrizes: DayPrize[];
  totalTokensInBatches: number;
  birthdays: {
    total: number;
    arrived: number;
    totalGuests: number;
    arrivedGuests: number;
    reservations: {
      id: string;
      celebrantName: string;
      timeSlot: string;
      status: string;
      guestsPlanned: number;
      guestArrivals: number;
      hostArrived: boolean;
      packName: string | null;
    }[];
  };
  specialGuests: {
    total: number;
    arrived: number;
    lastArrivalAt: string | null;
    events: {
      id: string;
      name: string;
      timeSlot: string;
      totalGuests: number;
      arrivedGuests: number;
    }[];
    guests: {
      id: string;
      guestName: string;
      guestCategory: string | null;
      status: string;
      arrivedAt: string | null;
      eventName: string;
      eventTime: string;
    }[];
  };
  reusableGroups: ReusableGroup[];
}

interface DailyEvaluation {
  id: string;
  businessDay: string;
  rating: Rating | null;
  comment: string | null;
  closedAt: string | null;
  closedByUserId: string | null;
  closedByName?: string | null;
  evaluatedByName?: string | null;
}

interface PersonRating {
  id: string;
  personId: string;
  rating: Rating;
  note: string | null;
  person: PersonInfo;
}

const RATING_OPTIONS: { value: Rating; label: string; color: string; emoji: string }[] = [
  { value: 'MALO', label: 'Malo', color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700', emoji: '😞' },
  { value: 'REGULAR', label: 'Regular', color: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700', emoji: '😐' },
  { value: 'BUENO', label: 'Bueno', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700', emoji: '😊' },
  { value: 'MUY_BUENO', label: 'Muy Bueno', color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700', emoji: '🤩' },
];

function getRatingOption(val: Rating) {
  return RATING_OPTIONS.find(r => r.value === val) || RATING_OPTIONS[1];
}

function formatTime(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function toLimaDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function getBusinessDay(): string {
  const now = new Date();
  const limaHour = Number(now.toLocaleString('en-US', { timeZone: 'America/Lima', hour: 'numeric', hour12: false }));
  const d = limaHour < 10 ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;
  return toLimaDateStr(d);
}

function shiftDay(dayStr: string, delta: number): string {
  const d = new Date(dayStr + 'T12:00:00Z');
  d.setDate(d.getDate() + delta);
  return toLimaDateStr(d);
}

export default function AdminDailyEvaluationPage() {
  const [selectedDay, setSelectedDay] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [evaluation, setEvaluation] = useState<DailyEvaluation | null>(null);
  const [dayBrief, setDayBrief] = useState<{ title?: string | null; show?: string | null; promos?: string | null; notes?: string | null } | null>(null);

  // Form state
  const [evalRating, setEvalRating] = useState<Rating>('REGULAR');
  const [evalComment, setEvalComment] = useState('');
  const [personRatingsMap, setPersonRatingsMap] = useState<Map<string, { rating: Rating; note: string }>>(new Map());
  const [savingEval, setSavingEval] = useState(false);
  const [savingRatings, setSavingRatings] = useState(false);
  const [closingDay, setClosingDay] = useState(false);
  const [evalMsg, setEvalMsg] = useState('');
  const [ratingsMsg, setRatingsMsg] = useState('');
  const [closeMsg, setCloseMsg] = useState('');
  const [ratingsLocked, setRatingsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'recursos' | 'resultados'>('recursos');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.role) setUserRole(d.role); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedDay(getBusinessDay());
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedDay) return;
    setLoading(true);
    setSummary(null);
    setEvaluation(null);
    setDayBrief(null);
    setEvalRating('REGULAR');
    setEvalComment('');
    setPersonRatingsMap(new Map());
    setRatingsLocked(false);
    try {
      const [summaryRes, evalRes, ratingsRes, briefRes] = await Promise.all([
        fetch(`/api/admin/daily-evaluation/summary?day=${selectedDay}`),
        fetch(`/api/admin/daily-evaluation?day=${selectedDay}`),
        fetch(`/api/admin/daily-evaluation/ratings?day=${selectedDay}`),
        fetch(`/api/admin/day-brief?day=${selectedDay}`),
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (evalRes.ok) {
        const evalData = await evalRes.json();
        if (evalData.evaluation) {
          setEvaluation(evalData.evaluation);
          setEvalRating(evalData.evaluation.rating || 'REGULAR');
          setEvalComment(evalData.evaluation.comment || '');
        }
      }
      if (ratingsRes.ok) {
        const rData = await ratingsRes.json();
        const map = new Map<string, { rating: Rating; note: string }>();
        for (const r of (rData.ratings || []) as PersonRating[]) {
          map.set(r.personId, { rating: r.rating as Rating, note: r.note || '' });
        }
        setPersonRatingsMap(map);
        setRatingsLocked(map.size > 0);
      }
      if (briefRes.ok) {
        const bData = await briefRes.json();
        if (bData.brief) setDayBrief(bData.brief);
      }
    } catch (err) {
      console.error('Error loading daily evaluation data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDay]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!summary) return;
    setPersonRatingsMap(prev => {
      const next = new Map(prev);
      for (const a of summary.attendance) {
        if (!next.has(a.person.id)) {
          next.set(a.person.id, { rating: 'REGULAR', note: '' });
        }
      }
      return next;
    });
  }, [summary]);

  const handleCloseDay = async (action: 'close' | 'reopen') => {
    setClosingDay(true);
    setCloseMsg('');
    try {
      const res = await fetch('/api/admin/daily-evaluation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDay: selectedDay, action }),
      });
      if (res.ok) {
        setCloseMsg(action === 'close' ? 'Jornada cerrada' : 'Jornada reabierta');
        fetchData();
      } else {
        const err = await res.json();
        setCloseMsg(err.error || 'Error');
      }
    } catch {
      setCloseMsg('Error de conexión');
    } finally {
      setClosingDay(false);
      setTimeout(() => setCloseMsg(''), 4000);
    }
  };

  const handleSaveEvaluation = async () => {
    setSavingEval(true);
    setEvalMsg('');
    try {
      const res = await fetch('/api/admin/daily-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDay: selectedDay, rating: evalRating, comment: evalComment }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvaluation(data.evaluation);
        setEvalMsg('Evaluación guardada');
      } else {
        const err = await res.json();
        setEvalMsg(err.error || 'Error al guardar');
      }
    } catch {
      setEvalMsg('Error de conexión');
    } finally {
      setSavingEval(false);
      setTimeout(() => setEvalMsg(''), 3000);
    }
  };

  const handleSaveRatings = async () => {
    setSavingRatings(true);
    setRatingsMsg('');
    try {
      const ratings = Array.from(personRatingsMap.entries()).map(([personId, data]) => ({
        personId,
        rating: data.rating,
        note: data.note || undefined,
      }));
      const res = await fetch('/api/admin/daily-evaluation/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDay: selectedDay, ratings }),
      });
      if (res.ok) {
        setRatingsLocked(true);
        setRatingsMsg('Calificaciones guardadas');
      } else {
        const err = await res.json();
        setRatingsMsg(err.error || 'Error al guardar');
      }
    } catch {
      setRatingsMsg('Error de conexión');
    } finally {
      setSavingRatings(false);
      setTimeout(() => setRatingsMsg(''), 3000);
    }
  };

  const updatePersonRating = (personId: string, field: 'rating' | 'note', value: string) => {
    setPersonRatingsMap(prev => {
      const next = new Map(prev);
      const existing = next.get(personId) || { rating: 'REGULAR' as Rating, note: '' };
      if (field === 'rating') {
        next.set(personId, { ...existing, rating: value as Rating });
      } else {
        next.set(personId, { ...existing, note: value });
      }
      return next;
    });
  };

  const isToday = selectedDay === getBusinessDay();
  const isFutureDay = selectedDay > getBusinessDay();
  const isClosed = !!evaluation?.closedAt;
  const isAdmin = userRole === 'ADMIN';
  const isEvalFinalized = !!evaluation?.rating;

  // Computed metrics
  const attendanceByArea = summary ? (() => {
    const map = new Map<string, number>();
    for (const a of summary.attendance) {
      const area = a.person.area || 'Sin área';
      map.set(area, (map.get(area) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  })() : [];

  const missingExitCount = summary?.attendance.filter(a => a.missingExit).length || 0;
  const totalReusableSales = summary?.reusableGroups?.reduce((s, g) => s + g.daySales, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header + Date Picker */}
      <div className="flex flex-col gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">📊 Panel de Jornada</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setSelectedDay(shiftDay(selectedDay, -1))} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">&#8592;</button>
          <input type="date" value={selectedDay} onChange={(e) => e.target.value && setSelectedDay(e.target.value)} className="flex-1 min-w-[140px] max-w-[180px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => setSelectedDay(shiftDay(selectedDay, 1))} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">&#8594;</button>
          {!isToday && (
            <button onClick={() => setSelectedDay(getBusinessDay())} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">Hoy</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
            <p className="text-slate-500 dark:text-slate-400">Cargando datos del {selectedDay}...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ===== STATUS HEADER ===== */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl flex-shrink-0">{isClosed ? '🔒' : '🔓'}</span>
              <h2 className="text-base sm:text-xl font-semibold text-slate-800 dark:text-slate-200 truncate">
                {isToday ? 'Jornada de Hoy' : 'Jornada'} — {selectedDay}
              </h2>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto flex-shrink-0 flex-wrap">
              {isClosed ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-500">
                  🔒 Cerrada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  🔓 Abierta
                </span>
              )}
              {evaluation?.rating && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getRatingOption(evaluation.rating as Rating).color}`}>
                  {getRatingOption(evaluation.rating as Rating).emoji} {getRatingOption(evaluation.rating as Rating).label}
                </span>
              )}
            </div>
          </div>

          {/* ===== BRIEF DEL DÍA ===== */}
          {dayBrief && (dayBrief.title || dayBrief.show || dayBrief.promos || dayBrief.notes) && (
            <div className="rounded-xl border border-cyan-200 dark:border-cyan-800 bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-900/10 dark:to-sky-900/10 p-3 sm:p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                <h3 className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                  Brief del Día
                </h3>
                <a
                  href={`/admin/day-brief?day=${selectedDay}`}
                  className="ml-auto px-2 py-0.5 rounded text-[10px] font-medium text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors"
                >
                  Editar
                </a>
              </div>
              {dayBrief.title && (
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{dayBrief.title}</p>
              )}
              {dayBrief.show && (
                <div>
                  <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">🎤 Shows / Eventos</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {dayBrief.show.split(/\n|;|•/).filter(Boolean).map((s, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {dayBrief.promos && (
                <div>
                  <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">🏷️ Promos</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {dayBrief.promos.split(/\n|;|•/).filter(Boolean).map((p, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border border-sky-200 dark:border-sky-700">
                        {p.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {dayBrief.notes && (
                <div>
                  <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">📋 Notas</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 whitespace-pre-line">{dayBrief.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ===== TAB BAR ===== */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700/50 p-1">
            <button
              onClick={() => setActiveTab('recursos')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'recursos'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              📋 Recursos
            </button>
            <button
              onClick={() => setActiveTab('resultados')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'resultados'
                  ? isClosed || isFutureDay
                    ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'bg-red-600 text-white shadow-sm'
                  : isClosed || isFutureDay
                    ? 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-semibold animate-pulse'
              }`}
            >
              {isClosed ? '📊 Resultados' : isFutureDay ? '📊 Resultados' : '🔒 Cerrar Jornada'}
            </button>
          </div>

          {/* ===== TAB CONTENT ===== */}
          {summary && (
            <>
              {/* ===== TAB: RECURSOS ===== */}
              {activeTab === 'recursos' && (
                <div className="space-y-4">
                  {/* Prize tags */}
                  {summary.dayPrizes.length > 0 && (
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 p-3 sm:p-4">
                      <h3 className="text-sm font-semibold mb-3 text-emerald-700 dark:text-emerald-300">
                        🎰 Premios Ruleta — {summary.dayPrizes.length} premios del día
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {summary.dayPrizes.map(p => (
                          <span key={p.id} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                            {p.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attendance by Area */}
                  {attendanceByArea.length > 0 && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4">
                      <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">
                        Asistencia por Área — {summary.attendance.length} colaboradores
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                        {attendanceByArea.map(([area, count]) => (
                          <div key={area} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                            <span className="text-sm truncate">{area}</span>
                            <span className="font-bold text-sm ml-2 text-blue-700 dark:text-blue-300">{count}</span>
                          </div>
                        ))}
                      </div>
                      <details className="group">
                        <summary className="cursor-pointer text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                          Ver detalle completo ▾
                        </summary>
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-600">
                                <th className="text-left py-2 px-1 text-slate-600 dark:text-slate-400 text-xs">Nombre</th>
                                <th className="text-left py-2 px-1 text-slate-600 dark:text-slate-400 text-xs">Área</th>
                                <th className="text-center py-2 px-1 text-slate-600 dark:text-slate-400 text-xs">Entrada</th>
                                <th className="text-center py-2 px-1 text-slate-600 dark:text-slate-400 text-xs">Salida</th>
                                <th className="text-center py-2 px-1 text-slate-600 dark:text-slate-400 text-xs">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {summary.attendance.map(a => (
                                <tr key={a.person.id} className="border-b border-slate-100 dark:border-slate-700">
                                  <td className="py-1.5 px-1 font-medium text-xs">{a.person.name}</td>
                                  <td className="py-1.5 px-1 text-xs text-slate-500">{a.person.area || '-'}</td>
                                  <td className="py-1.5 px-1 text-center text-xs">{formatTime(a.firstIn)}</td>
                                  <td className="py-1.5 px-1 text-center text-xs">{formatTime(a.lastOut)}</td>
                                  <td className="py-1.5 px-1 text-center">
                                    {a.missingExit ? (
                                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Sin salida</span>
                                    ) : (
                                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">✓</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Reusable Token Groups */}
                  {summary.reusableGroups && summary.reusableGroups.length > 0 && (
                    <div className="rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                          🔄 Tokens Reutilizables — {totalReusableSales} ventas del día
                        </h3>
                        <a href="/admin/reusable-tokens" className="px-3 py-1 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors">
                          Ver QR&apos;s
                        </a>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {summary.reusableGroups.map(g => (
                          <div key={g.id} className="rounded-lg border border-slate-200 dark:border-slate-600 p-3" style={g.color ? { borderLeftColor: g.color, borderLeftWidth: '4px' } : {}}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium truncate">{g.name}</span>
                              <span className="text-xs font-bold text-purple-700 dark:text-purple-300">{g.daySales} ventas</span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {g.activeTokens} activos / {g.totalTokens} total
                            </div>
                            {g.prizes.length > 0 && (
                              <div className="mt-2 space-y-0.5">
                                {g.prizes.map(p => (
                                  <div key={p.label} className="flex items-center justify-between text-[10px]">
                                    <span className="truncate text-slate-600 dark:text-slate-400">{p.label}</span>
                                    <span className="font-medium text-purple-600 dark:text-purple-400 ml-1">{p.daySales}/{p.total}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Birthdays (all reservations) */}
                  <div className="rounded-lg border border-pink-200 dark:border-pink-700 bg-white dark:bg-slate-800 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-pink-700 dark:text-pink-300">
                        🎂 Cumpleaños — {summary.birthdays?.total ?? 0} reserva(s)
                      </h3>
                      {summary.birthdays && summary.birthdays.total > 0 && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 sm:ml-auto">
                          {summary.birthdays.arrived}/{summary.birthdays.total} llegaron · {summary.birthdays.arrivedGuests}/{summary.birthdays.totalGuests} invitados
                        </span>
                      )}
                    </div>
                    {!summary.birthdays || summary.birthdays.total === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No hay reservas de cumpleaños para este día.</p>
                    ) : (
                      <div className="space-y-2">
                        {summary.birthdays.reservations.map(r => (
                          <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2.5 rounded bg-pink-50 dark:bg-pink-900/10">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="text-sm font-medium w-12 text-center text-pink-700 dark:text-pink-300 flex-shrink-0">{r.timeSlot}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{r.celebrantName}</div>
                                {r.packName && <div className="text-xs text-slate-500">{r.packName}</div>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pl-14 sm:pl-0 sm:ml-auto flex-shrink-0">
                              <span className="text-xs text-slate-500">{r.guestArrivals}/{r.guestsPlanned} inv.</span>
                              {r.hostArrived ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">✅ Llegó</span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">⏳ Esperando</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Special Guests (all) */}
                  <div className="rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                        🎟️ Invitados Especiales — {summary.specialGuests?.total ?? 0}
                      </h3>
                      {summary.specialGuests && summary.specialGuests.arrived > 0 && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 sm:ml-auto">
                          {summary.specialGuests.arrived} llegaron
                          {summary.specialGuests.lastArrivalAt && ` · Último: ${formatTime(summary.specialGuests.lastArrivalAt)}`}
                        </span>
                      )}
                    </div>
                    {!summary.specialGuests || summary.specialGuests.total === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No hay invitados especiales para este día.</p>
                    ) : (
                      <div className="space-y-2">
                        {summary.specialGuests.events.map(ev => (
                          <div key={ev.id} className="text-xs font-medium text-violet-700 dark:text-violet-300">
                            {ev.name} ({ev.timeSlot}) — {ev.arrivedGuests}/{ev.totalGuests} llegaron
                          </div>
                        ))}
                        {summary.specialGuests.guests.map(g => (
                          <div key={g.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2 rounded bg-violet-50 dark:bg-violet-900/10">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium w-12 text-center text-violet-700 dark:text-violet-300 flex-shrink-0">{g.eventTime}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{g.guestName}</div>
                                <div className="text-xs text-slate-500">{g.eventName}{g.guestCategory ? ` · ${g.guestCategory}` : ''}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pl-14 sm:pl-0 sm:ml-auto flex-shrink-0">
                              {g.status === 'arrived' ? (
                                <>
                                  <span className="text-xs text-slate-500">{formatTime(g.arrivedAt)}</span>
                                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">✅</span>
                                </>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">⏳</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== TAB: RESULTADOS ===== */}
              {activeTab === 'resultados' && (
                <div className="space-y-4">
                  {/* Closure Info */}
                  {isClosed && evaluation && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 p-4 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex-1 space-y-1">
                          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Datos del Cierre</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            📅 Cerrada el <span className="font-medium">{new Date(evaluation.closedAt!).toLocaleString('es-PE')}</span>
                          </p>
                          {evaluation.closedByName && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              👤 Cerrada por <span className="font-semibold text-slate-800 dark:text-slate-200">{evaluation.closedByName}</span>
                            </p>
                          )}
                          {evaluation.evaluatedByName && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              ✏️ Evaluada por <span className="font-semibold text-slate-800 dark:text-slate-200">{evaluation.evaluatedByName}</span>
                            </p>
                          )}
                          {evaluation.comment && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 italic">💬 &ldquo;{evaluation.comment}&rdquo;</p>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleCloseDay('reopen')}
                              disabled={closingDay}
                              className="px-4 py-2 rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                            >
                              {closingDay ? '...' : '🔓 Reabrir Jornada'}
                            </button>
                          </div>
                        )}
                      </div>
                      {closeMsg && (
                        <p className={`text-sm font-medium ${closeMsg.includes('Error') || closeMsg.includes('Solo') ? 'text-red-600' : 'text-green-600'}`}>{closeMsg}</p>
                      )}
                    </div>
                  )}

                  {/* Open Day — Close Button */}
                  {!isClosed && !isFutureDay && (
                    <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 text-center space-y-3">
                      <div className="text-3xl">🔓</div>
                      <h3 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-200">Jornada Abierta</h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        Cierra la jornada para poder evaluar. Los datos de abajo son en tiempo real.
                      </p>
                      <button
                        onClick={() => handleCloseDay('close')}
                        disabled={closingDay}
                        className="px-6 py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {closingDay ? 'Cerrando...' : '🔒 Cerrar Jornada'}
                      </button>
                      {closeMsg && (
                        <p className={`text-sm font-medium ${closeMsg.includes('Error') || closeMsg.includes('Solo') ? 'text-red-600' : 'text-green-600'}`}>{closeMsg}</p>
                      )}
                    </div>
                  )}

                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 p-3 text-center">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{summary.attendance.length}</div>
                      <div className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-medium">Asistencia</div>
                      {missingExitCount > 0 && <div className="text-[10px] text-amber-600 mt-0.5">{missingExitCount} sin salida</div>}
                    </div>
                    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3 text-center">
                      <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{summary.totalDelivered}</div>
                      <div className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium">Premios Ruleta</div>
                    </div>
                    <div className="rounded-xl border border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-900/10 p-3 text-center">
                      <div className="text-2xl font-bold text-pink-700 dark:text-pink-300">{summary.birthdays?.total ?? 0}</div>
                      <div className="text-[10px] sm:text-xs text-pink-600 dark:text-pink-400 font-medium">Cumpleaños</div>
                      {(summary.birthdays?.arrived ?? 0) > 0 && <div className="text-[10px] text-emerald-600 mt-0.5">{summary.birthdays.arrived} llegaron</div>}
                    </div>
                    <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/10 p-3 text-center">
                      <div className="text-2xl font-bold text-violet-700 dark:text-violet-300">{summary.specialGuests?.total ?? 0}</div>
                      <div className="text-[10px] sm:text-xs text-violet-600 dark:text-violet-400 font-medium">Invitados VIP</div>
                      {(summary.specialGuests?.arrived ?? 0) > 0 && <div className="text-[10px] text-emerald-600 mt-0.5">{summary.specialGuests.arrived} llegaron</div>}
                    </div>
                    <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 p-3 text-center">
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{totalReusableSales}</div>
                      <div className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 font-medium">Ventas Reutiliz.</div>
                    </div>
                  </div>

                  {/* Delivered Prizes */}
                  <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-800 p-3 sm:p-4">
                    <h3 className="text-sm font-semibold mb-3 text-amber-700 dark:text-amber-300">
                      🏆 Premios Entregados — {summary.totalDelivered} entregados · {summary.totalTokensInBatches} pulseras
                    </h3>
                    {summary.deliveredPrizes.length > 0 ? (
                      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {summary.deliveredPrizes.map(p => (
                          <div key={p.label} className="flex items-center justify-between p-2 rounded bg-amber-50 dark:bg-amber-900/10">
                            <span className="text-xs truncate">{p.label}</span>
                            <span className="font-bold text-sm ml-2 text-amber-700 dark:text-amber-300">{p.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">{isToday ? 'No se han entregado premios aún.' : 'No se entregaron premios.'}</p>
                    )}
                  </div>

                  {/* Birthday Arrivals */}
                  {summary.birthdays && summary.birthdays.total > 0 && (
                    <div className="rounded-lg border border-pink-200 dark:border-pink-700 bg-white dark:bg-slate-800 p-3 sm:p-4">
                      <h3 className="text-sm font-semibold mb-3 text-pink-700 dark:text-pink-300">
                        🎂 Llegadas Cumpleaños — {summary.birthdays.arrived}/{summary.birthdays.total} cumpleañeros · {summary.birthdays.arrivedGuests}/{summary.birthdays.totalGuests} invitados
                      </h3>
                      {summary.birthdays.reservations.filter(r => r.hostArrived).length > 0 ? (
                        <div className="space-y-2">
                          {summary.birthdays.reservations.filter(r => r.hostArrived).map(r => (
                            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2.5 rounded bg-green-50 dark:bg-green-900/10">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <span className="text-sm font-medium w-12 text-center text-pink-700 dark:text-pink-300 flex-shrink-0">{r.timeSlot}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{r.celebrantName}</div>
                                  {r.packName && <div className="text-xs text-slate-500">{r.packName}</div>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pl-14 sm:pl-0 sm:ml-auto flex-shrink-0">
                                <span className="text-xs text-slate-500">{r.guestArrivals}/{r.guestsPlanned} inv. llegaron</span>
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">✅ Llegó</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Ningún cumpleañero ha marcado llegada aún.</p>
                      )}
                    </div>
                  )}

                  {/* Special Guest Arrivals */}
                  {summary.specialGuests && summary.specialGuests.total > 0 && (
                    <div className="rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 p-3 sm:p-4">
                      <h3 className="text-sm font-semibold mb-3 text-violet-700 dark:text-violet-300">
                        🎟️ Llegadas Invitados Especiales — {summary.specialGuests.arrived}/{summary.specialGuests.total}
                      </h3>
                      {summary.specialGuests.guests.filter(g => g.status === 'arrived').length > 0 ? (
                        <div className="space-y-2">
                          {summary.specialGuests.guests.filter(g => g.status === 'arrived').map(g => (
                            <div key={g.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2 rounded bg-green-50 dark:bg-green-900/10">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium w-12 text-center text-violet-700 dark:text-violet-300 flex-shrink-0">{g.eventTime}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{g.guestName}</div>
                                  <div className="text-xs text-slate-500">{g.eventName}{g.guestCategory ? ` · ${g.guestCategory}` : ''}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pl-14 sm:pl-0 sm:ml-auto flex-shrink-0">
                                <span className="text-xs text-slate-500">{formatTime(g.arrivedAt)}</span>
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">✅</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Ningún invitado especial ha marcado llegada aún.</p>
                      )}
                    </div>
                  )}

                  {/* Evaluation Section (only when closed) */}
                  {isClosed && (
                    <>
                      <div className="relative flex items-center gap-3 pt-2">
                        <div className="flex-1 h-px bg-blue-200 dark:bg-blue-800" />
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                          {isEvalFinalized ? '✅' : '✏️'} Evaluaciones
                        </span>
                        <div className="flex-1 h-px bg-blue-200 dark:bg-blue-800" />
                      </div>

                      {/* General evaluation */}
                      {isEvalFinalized ? (
                        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 p-3 sm:p-4 space-y-3">
                          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            Evaluación General de la Jornada
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border ${getRatingOption(evaluation!.rating!).color}`}>
                              {getRatingOption(evaluation!.rating!).emoji} {getRatingOption(evaluation!.rating!).label}
                            </span>
                            {evaluation?.evaluatedByName && (
                              <span className="text-xs text-slate-500">por {evaluation.evaluatedByName}</span>
                            )}
                          </div>
                          {evaluation?.comment && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 italic">&ldquo;{evaluation.comment}&rdquo;</p>
                          )}
                          <p className="text-xs text-green-600 dark:text-green-400">✅ Evaluación finalizada. Para editar, reabra la jornada.</p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4 space-y-4">
                          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            Evaluación General de la Jornada
                          </h3>
                          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                            {RATING_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setEvalRating(opt.value)}
                                className={`px-3 sm:px-4 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
                                  evalRating === opt.value
                                    ? opt.color + ' ring-2 ring-offset-1 ring-blue-400'
                                    : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                }`}
                              >
                                {opt.emoji} {opt.label}
                              </button>
                            ))}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Comentario / Observaciones</label>
                            <textarea
                              value={evalComment}
                              onChange={(e) => setEvalComment(e.target.value)}
                              rows={3}
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Notas sobre la jornada..."
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <button
                              onClick={handleSaveEvaluation}
                              disabled={savingEval}
                              className="w-full sm:w-auto px-5 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {savingEval ? 'Guardando...' : 'Guardar Evaluación General'}
                            </button>
                            {evalMsg && (
                              <span className={`text-xs sm:text-sm font-medium ${evalMsg.includes('Error') || evalMsg.includes('debe') || evalMsg.includes('finalizada') ? 'text-red-600' : 'text-green-600'}`}>{evalMsg}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Individual ratings */}
                      {summary.attendance.length > 0 && (
                        ratingsLocked ? (
                          <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 p-3 sm:p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              Evaluación Individual — {summary.attendance.length} colaboradores
                            </h3>
                            <div className="space-y-1.5">
                              {summary.attendance.map(a => {
                                const pr = personRatingsMap.get(a.person.id) || { rating: 'REGULAR' as Rating, note: '' };
                                return (
                                  <div key={a.person.id} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800/50">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm truncate">{a.person.name}</div>
                                      <div className="text-xs text-slate-500">{a.person.area || '-'}</div>
                                      {pr.note && <div className="text-xs text-slate-500 italic mt-0.5">{pr.note}</div>}
                                    </div>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRatingOption(pr.rating).color}`}>
                                      {getRatingOption(pr.rating).emoji} {getRatingOption(pr.rating).label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-xs text-green-600 dark:text-green-400">✅ Calificaciones guardadas. Para editar, reabra la jornada.</p>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              Evaluación Individual — {summary.attendance.length} colaboradores
                            </h3>
                            <div className="space-y-2">
                              {summary.attendance.map(a => {
                                const pr = personRatingsMap.get(a.person.id) || { rating: 'REGULAR' as Rating, note: '' };
                                return (
                                  <div key={a.person.id} className="flex flex-col gap-2 p-2.5 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                                    <div className="flex items-start sm:items-center gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{a.person.name}</div>
                                        <div className="text-xs text-slate-500">{a.person.area || '-'} · {formatTime(a.firstIn)} - {formatTime(a.lastOut)}</div>
                                        {a.missingExit && <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠️ Sin salida</span>}
                                      </div>
                                      <div className="flex gap-1 flex-shrink-0">
                                        {RATING_OPTIONS.map(opt => (
                                          <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => updatePersonRating(a.person.id, 'rating', opt.value)}
                                            className={`w-8 h-8 sm:w-auto sm:h-auto sm:px-2 sm:py-1 flex items-center justify-center rounded text-xs font-medium border transition-all ${
                                              pr.rating === opt.value
                                                ? opt.color + ' ring-1 ring-blue-400'
                                                : 'bg-white dark:bg-slate-600 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-500 hover:bg-slate-100'
                                            }`}
                                            title={opt.label}
                                          >
                                            {opt.emoji}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <input
                                      type="text"
                                      value={pr.note}
                                      onChange={(e) => updatePersonRating(a.person.id, 'note', e.target.value)}
                                      placeholder="Nota..."
                                      className="w-full rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                              <button
                                onClick={handleSaveRatings}
                                disabled={savingRatings}
                                className="w-full sm:w-auto px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {savingRatings ? 'Guardando...' : 'Guardar Calificaciones'}
                              </button>
                              {ratingsMsg && (
                                <span className={`text-xs sm:text-sm font-medium ${ratingsMsg.includes('Error') || ratingsMsg.includes('guardadas') ? 'text-red-600' : 'text-green-600'}`}>{ratingsMsg}</span>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

