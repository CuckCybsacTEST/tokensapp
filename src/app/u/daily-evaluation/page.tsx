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
}

interface DailyEvaluation {
  id: string;
  businessDay: string;
  rating: Rating | null;
  comment: string | null;
  closedAt: string | null;
  closedByUserId: string | null;
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

function getBusinessDay(): string {
  const now = new Date();
  const limaOffset = -5;
  const utcHour = now.getUTCHours();
  const limaHour = (utcHour + limaOffset + 24) % 24;
  const d = limaHour < 10 ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;
  return d.toISOString().split('T')[0];
}

function shiftDay(dayStr: string, delta: number): string {
  const d = new Date(dayStr + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

export default function DailyEvaluationPage() {
  const [selectedDay, setSelectedDay] = useState('');
  const [loading, setLoading] = useState(true);

  // Data for selected day
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [evaluation, setEvaluation] = useState<DailyEvaluation | null>(null);

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

  // Initialize to today's business day
  useEffect(() => {
    setSelectedDay(getBusinessDay());
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedDay) return;
    setLoading(true);
    setSummary(null);
    setEvaluation(null);
    setEvalRating('REGULAR');
    setEvalComment('');
    setPersonRatingsMap(new Map());
    try {
      const [summaryRes, evalRes, ratingsRes] = await Promise.all([
        fetch(`/api/admin/daily-evaluation/summary?day=${selectedDay}`),
        fetch(`/api/admin/daily-evaluation?day=${selectedDay}`),
        fetch(`/api/admin/daily-evaluation/ratings?day=${selectedDay}`),
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (evalRes.ok) {
        const evalData = await evalRes.json();
        if (evalData.evaluation) {
          setEvaluation(evalData.evaluation);
          setEvalRating(evalData.evaluation.rating);
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
      }
    } catch (err) {
      console.error('Error loading daily evaluation data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDay]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Initialize person ratings from attendance when summary loads
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
        const data = await res.json();
        setEvaluation(data.evaluation);
        setCloseMsg(action === 'close' ? 'Jornada cerrada' : 'Jornada reabierta');
      } else {
        const err = await res.json();
        setCloseMsg(err.error || 'Error');
      }
    } catch {
      setCloseMsg('Error de conexión');
    } finally {
      setClosingDay(false);
      setTimeout(() => setCloseMsg(''), 3000);
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
        setRatingsMsg('Calificaciones guardadas');
      } else {
        setRatingsMsg('Error al guardar');
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
  const isClosed = !!evaluation?.closedAt;

  return (
    <div className="space-y-6">
      {/* Header + Date Picker */}
      <div className="flex flex-col gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Resumen de Jornada</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedDay(shiftDay(selectedDay, -1))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            &#8592;
          </button>
          <input
            type="date"
            value={selectedDay}
            onChange={(e) => e.target.value && setSelectedDay(e.target.value)}
            className="flex-1 min-w-[140px] max-w-[180px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setSelectedDay(shiftDay(selectedDay, 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            &#8594;
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDay(getBusinessDay())}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-slate-500 dark:text-slate-400">Cargando datos del {selectedDay}...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Day label + status badges */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl sm:text-2xl flex-shrink-0">{isToday ? '📋' : '📊'}</span>
              <h2 className="text-base sm:text-xl font-semibold text-slate-800 dark:text-slate-200 truncate">
                {isToday ? 'Jornada de Hoy' : 'Jornada'} — {selectedDay}
              </h2>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto flex-shrink-0">
              {isClosed && (
                <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-500">
                  🔒 Cerrada
                </span>
              )}
              {evaluation?.rating && (
                <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${getRatingOption(evaluation.rating as Rating).color}`}>
                  {getRatingOption(evaluation.rating as Rating).emoji} {getRatingOption(evaluation.rating as Rating).label}
                </span>
              )}
            </div>
          </div>

          {/* Prizes of the day (from batches) */}
          {summary && summary.dayPrizes.length > 0 && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">
                Premios del Día ({summary.dayPrizes.length} premios · {summary.totalTokensInBatches} tokens)
              </h3>
              <div className="flex flex-wrap gap-2">
                {summary.dayPrizes.map(p => (
                  <span key={p.id} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Delivered Prizes */}
          {summary && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">
                Premios Entregados — Total: {summary.totalDelivered}
              </h3>
              {summary.deliveredPrizes.length === 0 ? (
                <p className="text-sm text-slate-500">{isToday ? 'No se han entregado premios aún.' : 'No se entregaron premios.'}</p>
              ) : (
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {summary.deliveredPrizes.map(p => (
                    <div key={p.label} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-700/50">
                      <span className="text-sm truncate">{p.label}</span>
                      <span className="font-bold text-sm ml-2">{p.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Birthday Reservations */}
          {summary && (
            <div className="rounded-lg border border-pink-200 dark:border-pink-700 bg-white dark:bg-slate-800 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎂</span>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Cumpleaños — {summary.birthdays?.total ?? 0} reserva(s)
                  </h3>
                </div>
                {summary.birthdays && summary.birthdays.total > 0 && (
                  <div className="flex items-center gap-3 text-xs sm:text-sm sm:ml-auto">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {summary.birthdays.arrived}/{summary.birthdays.total} llegaron
                    </span>
                    <span className="text-slate-500">
                      {summary.birthdays.arrivedGuests}/{summary.birthdays.totalGuests} invitados
                    </span>
                  </div>
                )}
              </div>
              {!summary.birthdays || summary.birthdays.total === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No hay reservas de cumpleaños para este día.</p>
              ) : (
                <div className="space-y-2">
                  {summary.birthdays.reservations.map(r => (
                    <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2 rounded bg-pink-50 dark:bg-pink-900/10">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-sm font-medium w-12 text-center text-pink-700 dark:text-pink-300 flex-shrink-0">{r.timeSlot}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{r.celebrantName}</div>
                          {r.packName && <div className="text-xs text-slate-500">{r.packName}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-14 sm:pl-0 sm:ml-auto flex-shrink-0">
                        <span className="text-xs text-slate-500">
                          {r.guestArrivals}/{r.guestsPlanned} inv.
                        </span>
                        {r.hostArrived ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            ✅ Llegó
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            ⏳ Esperando
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Special Guests */}
          {summary && (
            <div className="rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎟️</span>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Invitados Especiales — {summary.specialGuests?.total ?? 0} invitado(s)
                  </h3>
                </div>
                {summary.specialGuests && summary.specialGuests.total > 0 && (
                  <div className="flex items-center gap-3 text-xs sm:text-sm sm:ml-auto">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {summary.specialGuests.arrived}/{summary.specialGuests.total} llegaron
                    </span>
                    {summary.specialGuests.lastArrivalAt && (
                      <span className="text-slate-500">
                        Último: {formatTime(summary.specialGuests.lastArrivalAt)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {!summary.specialGuests || summary.specialGuests.total === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No hay invitados especiales para este día.</p>
              ) : (
                <div className="space-y-2">
                  {summary.specialGuests.events.map(ev => (
                    <div key={ev.id} className="text-xs font-medium text-violet-700 dark:text-violet-300 mb-1">
                      {ev.name} ({ev.timeSlot}) — {ev.arrivedGuests}/{ev.totalGuests} llegaron
                    </div>
                  ))}
                  {summary.specialGuests.guests.map(g => (
                    <div key={g.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2 rounded bg-violet-50 dark:bg-violet-900/10">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-sm font-medium w-12 text-center text-violet-700 dark:text-violet-300 flex-shrink-0">{g.eventTime}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{g.guestName}</div>
                          <div className="text-xs text-slate-500">{g.eventName}{g.guestCategory ? ` · ${g.guestCategory}` : ''}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-14 sm:pl-0 sm:ml-auto flex-shrink-0">
                        {g.status === 'arrived' ? (
                          <>
                            <span className="text-xs text-slate-500">{formatTime(g.arrivedAt)}</span>
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              ✅ Llegó
                            </span>
                          </>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            ⏳ Esperando
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attendance */}
          {summary && summary.attendance.length > 0 && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4">
              <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">
                Asistencia — {summary.attendance.length} colaboradores
              </h3>
              {/* Mobile: card layout */}
              <div className="sm:hidden space-y-2">
                {summary.attendance.map(a => (
                  <div key={a.person.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{a.person.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{a.person.area || '-'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{formatTime(a.firstIn)} → {formatTime(a.lastOut)}</div>
                    </div>
                    {a.missingExit ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 flex-shrink-0">
                        Sin salida
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex-shrink-0">
                        Completo
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {/* Desktop: table layout */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-600">
                      <th className="text-left py-2 px-1 text-slate-600 dark:text-slate-400">Nombre</th>
                      <th className="text-left py-2 px-1 text-slate-600 dark:text-slate-400">Área</th>
                      <th className="text-center py-2 px-1 text-slate-600 dark:text-slate-400">Entrada</th>
                      <th className="text-center py-2 px-1 text-slate-600 dark:text-slate-400">Salida</th>
                      <th className="text-center py-2 px-1 text-slate-600 dark:text-slate-400">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.attendance.map(a => (
                      <tr key={a.person.id} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="py-2 px-1 font-medium">{a.person.name}</td>
                        <td className="py-2 px-1 text-slate-500">{a.person.area || '-'}</td>
                        <td className="py-2 px-1 text-center">{formatTime(a.firstIn)}</td>
                        <td className="py-2 px-1 text-center">{formatTime(a.lastOut)}</td>
                        <td className="py-2 px-1 text-center">
                          {a.missingExit ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              Sin salida
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              Completo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== CLOSE DAY SECTION ===== */}
          <div className="border-t border-slate-200 dark:border-slate-700"></div>

          {!isClosed ? (
            <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 text-center space-y-3">
              <div className="text-3xl">🔓</div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-200">Jornada Abierta</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Cierra la jornada para habilitar las evaluaciones. No es posible evaluar mientras la jornada está en curso.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => handleCloseDay('close')}
                  disabled={closingDay}
                  className="px-6 py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {closingDay ? 'Cerrando...' : '🔒 Cerrar Jornada'}
                </button>
              </div>
              {closeMsg && (
                <p className={`text-sm font-medium ${closeMsg.includes('Error') || closeMsg.includes('Solo') ? 'text-red-600' : 'text-green-600'}`}>
                  {closeMsg}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Reopen button (small, secondary) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  🔒 Cerrada el {new Date(evaluation!.closedAt!).toLocaleString('es-PE')}
                </span>
                <div className="flex items-center gap-2 sm:ml-auto">
                  <button
                    onClick={() => handleCloseDay('reopen')}
                    disabled={closingDay}
                    className="px-3 py-1 rounded border border-slate-300 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {closingDay ? '...' : 'Reabrir jornada'}
                  </button>
                  {closeMsg && (
                    <span className={`text-xs font-medium ${closeMsg.includes('Error') || closeMsg.includes('Solo') ? 'text-red-600' : 'text-green-600'}`}>
                      {closeMsg}
                    </span>
                  )}
                </div>
              </div>

              {/* ===== EVALUATION GENERAL ===== */}
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
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Comentario / Observaciones
                  </label>
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
                    <span className={`text-xs sm:text-sm font-medium text-center sm:text-left ${evalMsg.includes('Error') || evalMsg.includes('debe') ? 'text-red-600' : 'text-green-600'}`}>
                      {evalMsg}
                    </span>
                  )}
                </div>
              </div>

              {/* ===== INDIVIDUAL RATINGS ===== */}
              {summary && summary.attendance.length > 0 && (
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
                              {a.missingExit && (
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠️ Sin salida</span>
                              )}
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
                      <span className={`text-xs sm:text-sm font-medium text-center sm:text-left ${ratingsMsg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                        {ratingsMsg}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
